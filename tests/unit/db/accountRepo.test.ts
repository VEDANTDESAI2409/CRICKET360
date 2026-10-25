import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { AccountRepo } from '../../../src/main/db/accountRepo';
import { SupplierRepo } from '../../../src/main/db/supplierRepo';
import { PurchaseRepo } from '../../../src/main/db/purchaseRepo';
import { BillingRepo } from '../../../src/main/db/billingRepo';

describe('Combined Milestone 5: AccountRepo & Ledger Integrity', () => {
  let db: Database.Database;
  let accountRepo: AccountRepo;
  let supplierRepo: SupplierRepo;
  let purchaseRepo: PurchaseRepo;
  let billingRepo: BillingRepo;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    const migrationFiles = [
      '001_initial_schema.sql',
      '002_transactions_foundation.sql',
      '003_catalog_and_inventory.sql',
      '004_pos_and_gst_billing.sql',
      '005_procurement_and_accounts.sql',
    ];

    for (const file of migrationFiles) {
      const sqlPath = path.resolve('src/main/db/migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      db.exec(sql);
    }

    accountRepo = new AccountRepo(db);
    supplierRepo = new SupplierRepo(db);
    purchaseRepo = new PurchaseRepo(db);
    billingRepo = new BillingRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should create, update, and search customers with full details', () => {
    const cust = accountRepo.createCustomer({
      name: 'Rohan Sharma Cricket Club',
      phone: '+91 99887 76655',
      email: 'rohan@cricketclub.org',
      gstin: '27AAAAA0000A1Z5',
      address: 'Shivaji Park, Dadar West, Mumbai',
      state_code: '27',
      credit_limit_paise: 5000000, // ₹50,000 credit limit
      notes: 'Local academy team',
    });

    expect(cust.id).toBeDefined();
    expect(cust.name).toBe('Rohan Sharma Cricket Club');
    expect(cust.email).toBe('rohan@cricketclub.org');
    expect(cust.credit_limit_paise).toBe(5000000);
    expect(cust.balance_paise).toBe(0);

    // Update customer
    const updated = accountRepo.updateCustomer({
      id: cust.id,
      name: 'Rohan Sharma Cricket Academy',
      credit_limit_paise: 10000000,
    });
    expect(updated.name).toBe('Rohan Sharma Cricket Academy');
    expect(updated.credit_limit_paise).toBe(10000000);

    // Search customer
    const searchResults = accountRepo.searchCustomers('Rohan');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe(cust.id);
  });

  it('2. should manage customer credit balance on POS sales, record partial payments, and prevent over-allocation', () => {
    const cust = accountRepo.createCustomer({
      name: 'Virender Sehwag Fan Club',
      phone: '+91 98220 11223',
    });

    // Create credit invoice in POS (no immediate payment)
    const invoice = billingRepo.createInvoice({
      customer_id: cust.id,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 1120000 }], // ₹11,200
      payments: [], // Unpaid credit sale
    });

    expect(invoice.balance_amount_paise).toBe(1120000);
    expect(invoice.payment_status).toBe('UNPAID');

    // Customer balance should reflect Accounts Receivable
    const custAfterSale = accountRepo.getCustomerById(cust.id)!;
    expect(custAfterSale.balance_paise).toBe(1120000);

    // Reject payment exceeding invoice balance
    expect(() => {
      accountRepo.recordCustomerPayment({
        customer_id: cust.id,
        invoice_id: invoice.id,
        amount_paise: 1500000, // ₹15,000 > ₹11,200
        payment_date: '2026-10-25',
        payment_mode: 'UPI',
      });
    }).toThrow(/exceeds invoice outstanding balance/);

    // Record valid partial payment of ₹5,000 (500000 paise)
    const pay1 = accountRepo.recordCustomerPayment({
      customer_id: cust.id,
      invoice_id: invoice.id,
      amount_paise: 500000,
      payment_date: '2026-10-25',
      payment_mode: 'UPI',
      reference_number: 'UPI-REF-001',
    });

    expect(pay1.amount_paise).toBe(500000);
    expect(pay1.payment_type).toBe('CUSTOMER_RECEIPT');

    // Verify invoice balance decreased
    const invAfterPay1 = billingRepo.getInvoiceById(invoice.id)!;
    expect(invAfterPay1.paid_amount_paise).toBe(500000);
    expect(invAfterPay1.balance_amount_paise).toBe(620000); // ₹6,200 remaining
    expect(invAfterPay1.payment_status).toBe('PARTIALLY_PAID');

    // Verify customer balance decreased
    const custAfterPay1 = accountRepo.getCustomerById(cust.id)!;
    expect(custAfterPay1.balance_paise).toBe(620000);

    // Record remaining payment of ₹6,200
    accountRepo.recordCustomerPayment({
      customer_id: cust.id,
      invoice_id: invoice.id,
      amount_paise: 620000,
      payment_date: '2026-10-25',
      payment_mode: 'CASH',
    });

    const invFullyPaid = billingRepo.getInvoiceById(invoice.id)!;
    expect(invFullyPaid.balance_amount_paise).toBe(0);
    expect(invFullyPaid.payment_status).toBe('PAID');

    const custFullyCleared = accountRepo.getCustomerById(cust.id)!;
    expect(custFullyCleared.balance_paise).toBe(0);
  });

  it('3. should generate accurate, chronological customer ledger statement', () => {
    const cust = accountRepo.createCustomer({
      name: 'Pune Cricket Club',
      phone: '+91 98230 44556',
    });

    billingRepo.createInvoice({
      customer_id: cust.id,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 1000000 }],
      payments: [],
    });

    accountRepo.recordCustomerPayment({
      customer_id: cust.id,
      amount_paise: 400000,
      payment_date: '2026-10-25',
      payment_mode: 'BANK_TRANSFER',
    });

    const statement = accountRepo.getCustomerLedger(cust.id);
    expect(statement.totalSalesPaise).toBe(1000000);
    expect(statement.totalPaidPaise).toBe(400000);
    expect(statement.outstandingBalancePaise).toBe(600000);
    expect(statement.entries.length).toBe(2);
    expect(statement.entries[0].type).toBe('INVOICE');
    expect(statement.entries[0].running_balance_paise).toBe(1000000);
    expect(statement.entries[1].type).toBe('PAYMENT');
    expect(statement.entries[1].running_balance_paise).toBe(600000);
  });

  it('4. should record supplier payments with purchase bill allocation and prevent over-allocation', () => {
    const purchase = purchaseRepo.createPurchase({
      supplier_id: 1,
      supplier_invoice_number: 'SUP-PAY-TEST',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 2, unit_cost_paise: 500000, tax_rate_percent: 12 }],
      // Total = 2 * 500000 + 12% = 1120000 paise (₹11,200)
    });

    const sup = supplierRepo.getById(1)!;
    expect(sup.balance_paise).toBe(1120000);

    // Reject payment exceeding purchase balance
    expect(() => {
      accountRepo.recordSupplierPayment({
        supplier_id: 1,
        purchase_id: purchase.id,
        amount_paise: 2000000, // ₹20,000 > ₹11,200
        payment_date: '2026-10-25',
        payment_mode: 'BANK_TRANSFER',
      });
    }).toThrow(/exceeds purchase outstanding balance/);

    // Record valid payment of ₹11,200
    const pay = accountRepo.recordSupplierPayment({
      supplier_id: 1,
      purchase_id: purchase.id,
      amount_paise: 1120000,
      payment_date: '2026-10-25',
      payment_mode: 'BANK_TRANSFER',
      reference_number: 'RTGS-998811',
    });

    expect(pay.amount_paise).toBe(1120000);
    expect(pay.payment_type).toBe('SUPPLIER_PAYOUT');

    // Supplier balance should now be 0
    const supAfter = supplierRepo.getById(1)!;
    expect(supAfter.balance_paise).toBe(0);

    // Purchase should be PAID
    const purAfter = purchaseRepo.getById(purchase.id)!;
    expect(purAfter.balance_amount_paise).toBe(0);
    expect(purAfter.payment_status).toBe('PAID');
  });

  it('5. should query unified payment ledger across customer receipts and supplier payouts', () => {
    // 1 Customer payment
    accountRepo.recordCustomerPayment({
      customer_id: 1,
      amount_paise: 250000,
      payment_date: '2026-10-25',
      payment_mode: 'CASH',
    });

    // 1 Supplier payout
    accountRepo.recordSupplierPayment({
      supplier_id: 1,
      amount_paise: 800000,
      payment_date: '2026-10-25',
      payment_mode: 'CHEQUE',
    });

    const allPayments = accountRepo.getAllPayments();
    expect(allPayments.length).toBeGreaterThanOrEqual(2);

    const custPayments = accountRepo.getAllPayments({ party_type: 'CUSTOMER' });
    expect(custPayments.every((p) => p.party_type === 'CUSTOMER')).toBe(true);

    const supPayments = accountRepo.getAllPayments({ party_type: 'SUPPLIER' });
    expect(supPayments.every((p) => p.party_type === 'SUPPLIER')).toBe(true);
  });
});
