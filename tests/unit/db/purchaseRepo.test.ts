import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { PurchaseRepo } from '../../../src/main/db/purchaseRepo';
import { SupplierRepo } from '../../../src/main/db/supplierRepo';
import { CreatePurchaseInput, CreatePurchaseReturnInput } from '../../../src/shared/types/models';

describe('Combined Milestone 5: PurchaseRepo & Procurement Integrity', () => {
  let db: Database.Database;
  let purchaseRepo: PurchaseRepo;
  let supplierRepo: SupplierRepo;

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

    purchaseRepo = new PurchaseRepo(db);
    supplierRepo = new SupplierRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should generate sequential, collision-free purchase numbers', () => {
    const num1 = purchaseRepo.getNextPurchaseNumber();
    expect(num1).toBe('PUR-1001');

    purchaseRepo.createPurchase({
      supplier_id: 1,
      supplier_invoice_number: 'INV-TEST-001',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 2, unit_cost_paise: 500000, tax_rate_percent: 12 }],
    });

    const num2 = purchaseRepo.getNextPurchaseNumber();
    expect(num2).toBe('PUR-1002');
  });

  it('2. should atomically create purchase, increase stock, log movements, and adjust supplier balance', () => {
    // Product 1 initial stock: 8
    const prodBefore = db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as {
      stock_quantity: number;
    };
    expect(prodBefore.stock_quantity).toBe(8);

    const supBefore = supplierRepo.getById(1)!;
    expect(supBefore.balance_paise).toBe(0);

    const input: CreatePurchaseInput = {
      supplier_id: 1,
      supplier_invoice_number: 'SUP-BLL-991',
      purchase_date: '2026-10-25',
      items: [
        {
          product_id: 1,
          quantity: 5,
          unit_cost_paise: 600000, // ₹6,000 base
          tax_rate_percent: 12,    // 12% GST
        },
      ],
      discount_amount_paise: 0,
      initial_payment: {
        amount_paise: 1000000, // Partial initial payment: ₹10,000
        payment_mode: 'BANK_TRANSFER',
        reference_number: 'NEFT-12345',
      },
    };

    const purchase = purchaseRepo.createPurchase(input);

    expect(purchase.purchase_number).toBe('PUR-1001');
    expect(purchase.supplier_invoice_number).toBe('SUP-BLL-991');
    expect(purchase.taxable_amount_paise).toBe(3000000); // 5 * 600000 = 3000000 paise (₹30,000)
    expect(purchase.total_tax_paise).toBe(360000);       // 12% = 360000 paise (₹3,600)
    expect(purchase.total_amount_paise).toBe(3360000);    // ₹33,600
    expect(purchase.paid_amount_paise).toBe(1000000);     // ₹10,000
    expect(purchase.balance_amount_paise).toBe(2360000);  // ₹23,600 remaining
    expect(purchase.payment_status).toBe('PARTIALLY_PAID');

    // Check inventory stock increased from 8 to 13
    const prodAfter = db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as {
      stock_quantity: number;
    };
    expect(prodAfter.stock_quantity).toBe(13);

    // Check auditable stock movement record
    const movement = db
      .prepare(
        "SELECT * FROM stock_movements WHERE reference_table = 'purchases' AND reference_id = ?"
      )
      .get(purchase.id) as any;
    expect(movement).toBeDefined();
    expect(movement.movement_type).toBe('PURCHASE_RECEIPT');
    expect(movement.quantity_change).toBe(5);
    expect(movement.balance_quantity_after).toBe(13);

    // Check supplier balance updated to unpaid amount
    const supAfter = supplierRepo.getById(1)!;
    expect(supAfter.balance_paise).toBe(2360000);
  });

  it('3. should enforce duplicate supplier invoice uniqueness per supplier', () => {
    purchaseRepo.createPurchase({
      supplier_id: 1,
      supplier_invoice_number: 'INV-DUP-100',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 1, unit_cost_paise: 100000, tax_rate_percent: 12 }],
    });

    // Re-entering same invoice number for supplier 1 should throw
    expect(() => {
      purchaseRepo.createPurchase({
        supplier_id: 1,
        supplier_invoice_number: 'INV-DUP-100',
        purchase_date: '2026-10-25',
        items: [{ product_id: 1, quantity: 1, unit_cost_paise: 100000, tax_rate_percent: 12 }],
      });
    }).toThrow(/already been entered/);

    // Same invoice number for a DIFFERENT supplier (supplier 2) should succeed
    const pur2 = purchaseRepo.createPurchase({
      supplier_id: 2,
      supplier_invoice_number: 'INV-DUP-100',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 1, unit_cost_paise: 100000, tax_rate_percent: 12 }],
    });
    expect(pur2.id).toBeDefined();
  });

  it('4. should process purchase return, reduce stock, log movements, and credit supplier balance', () => {
    const purchase = purchaseRepo.createPurchase({
      supplier_id: 1,
      supplier_invoice_number: 'INV-RET-01',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 4, unit_cost_paise: 500000, tax_rate_percent: 12 }],
    });

    const stockBeforeReturn = (
      db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any
    ).stock_quantity;
    const supBalanceBefore = supplierRepo.getById(1)!.balance_paise;

    const returnInput: CreatePurchaseReturnInput = {
      purchase_id: purchase.id,
      return_date: '2026-10-26',
      reason: 'Defective grips on 2 units',
      items: [
        {
          purchase_item_id: purchase.items![0].id,
          quantity: 2,
        },
      ],
    };

    const ret = purchaseRepo.createReturn(returnInput);

    expect(ret.return_number).toBe('PR-1001');
    expect(ret.grand_total_paise).toBe(1120000); // 2 * 500000 + 12% = 1120000 paise (₹11,200)

    // Stock should decrease by 2
    const stockAfter = (
      db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any
    ).stock_quantity;
    expect(stockAfter).toBe(stockBeforeReturn - 2);

    // Stock movement should be recorded
    const movement = db
      .prepare(
        "SELECT * FROM stock_movements WHERE reference_table = 'purchase_returns' AND reference_id = ?"
      )
      .get(ret.id) as any;
    expect(movement.movement_type).toBe('PURCHASE_RETURN');
    expect(movement.quantity_change).toBe(-2);

    // Supplier balance should be credited
    const supBalanceAfter = supplierRepo.getById(1)!.balance_paise;
    expect(supBalanceAfter).toBe(supBalanceBefore - 1120000);
  });

  it('5. should strictly reject returning more items than purchased or remaining in stock', () => {
    const purchase = purchaseRepo.createPurchase({
      supplier_id: 1,
      supplier_invoice_number: 'INV-OVER-RET',
      purchase_date: '2026-10-25',
      items: [{ product_id: 1, quantity: 2, unit_cost_paise: 500000, tax_rate_percent: 12 }],
    });

    // Trying to return 3 units when only 2 were purchased
    expect(() => {
      purchaseRepo.createReturn({
        purchase_id: purchase.id,
        return_date: '2026-10-26',
        reason: 'Too many',
        items: [{ purchase_item_id: purchase.items![0].id, quantity: 3 }],
      });
    }).toThrow(/remaining returnable/);
  });
});
