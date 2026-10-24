import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BillingRepo } from '../../../src/main/db/billingRepo';
import { CreateInvoiceInput } from '../../../src/shared/types/models';

describe('Milestone 4: BillingRepo & POS Transaction Integrity', () => {
  let db: Database.Database;
  let repo: BillingRepo;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run migrations 001, 002, 003, and 004
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_transactions_foundation.sql',
      '003_catalog_and_inventory.sql',
      '004_pos_and_gst_billing.sql',
    ];

    for (const file of migrationFiles) {
      const sqlPath = path.resolve('src/main/db/migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      db.exec(sql);
    }

    repo = new BillingRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should generate sequential, collision-free invoice numbers', () => {
    const num1 = repo.getNextInvoiceNumber();
    expect(num1).toBe('CR360-1001');

    // Create invoice
    repo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 1150000 }],
    });

    // Next should be 1002
    const num2 = repo.getNextInvoiceNumber();
    expect(num2).toBe('CR360-1002');
  });

  it('2. should atomically create invoice, deduct stock, log movements, and record payments', () => {
    // Product 1 initial stock: 8 units
    const prodBefore = db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as {
      stock_quantity: number;
    };
    expect(prodBefore.stock_quantity).toBe(8);

    const input: CreateInvoiceInput = {
      customer_id: 1,
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price_paise: 1150000,
          discount_amount_paise: 10000, // ₹100 discount
        },
      ],
      payments: [{ mode: 'UPI', amount_paise: 2290000, reference_number: 'UPI123456789' }],
      notes: 'Counter sale - Test bill',
    };

    const invoice = repo.createInvoice(input);

    expect(invoice.id).toBeDefined();
    expect(invoice.invoice_number).toBe('CR360-1001');
    expect(invoice.status).toBe('COMPLETED');
    expect(invoice.payment_status).toBe('PAID');
    expect(invoice.items?.length).toBe(1);
    expect(invoice.payments?.length).toBe(1);

    // Stock should be decremented from 8 to 6
    const prodAfter = db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as {
      stock_quantity: number;
    };
    expect(prodAfter.stock_quantity).toBe(6);

    // Stock movement should be recorded
    const movements = db
      .prepare("SELECT * FROM stock_movements WHERE reference_id = ? AND movement_type = 'SALE_INVOICE'")
      .all(invoice.id) as any[];
    expect(movements.length).toBe(1);
    expect(movements[0].quantity_change).toBe(-2);
    expect(movements[0].balance_quantity_after).toBe(6);
  });

  it('3. should handle multi-variant sales and update both variant and parent stock', () => {
    // Add variant to Product 1
    const vRes = db
      .prepare(`
        INSERT INTO product_variants (
          product_id, variant_name, sku, size, purchase_cost_paise,
          selling_price_paise, mrp_paise, stock_quantity, tax_rate_percent, is_active
        ) VALUES (1, 'Short Handle (SH)', 'BAT-SS-TON-SH', 'SH', 750000, 1150000, 1299900, 5, 12.0, 1)
      `)
      .run();
    const variantId = vRes.lastInsertRowid as number;

    // Synchronize parent product stock
    db.prepare('UPDATE products SET has_variants = 1, stock_quantity = 5 WHERE id = 1').run();

    const invoice = repo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, variant_id: variantId, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CARD', amount_paise: 2300000, reference_number: 'CARD-AUTH-999' }],
    });

    expect(invoice.status).toBe('COMPLETED');

    // Variant stock should be 5 - 2 = 3
    const varRow = db.prepare('SELECT stock_quantity FROM product_variants WHERE id = ?').get(variantId) as {
      stock_quantity: number;
    };
    expect(varRow.stock_quantity).toBe(3);

    // Parent product cumulative stock should also be 3
    const parentRow = db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as {
      stock_quantity: number;
    };
    expect(parentRow.stock_quantity).toBe(3);
  });

  it('4. should apply inter-state IGST when customer state differs from shop state', () => {
    // Customer 3 is seeded with state_code = '24' (Gujarat), shop is '27' (Maharashtra)
    const invoice = repo.createInvoice({
      customer_id: 3,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 112000 }], // 12% GST
      payments: [{ mode: 'CASH', amount_paise: 112000 }],
    });

    expect(invoice.is_inter_state).toBe(1);
    expect(invoice.cgst_amount_paise).toBe(0);
    expect(invoice.sgst_amount_paise).toBe(0);
    expect(invoice.igst_amount_paise).toBe(12000); // 12% IGST
    expect(invoice.total_tax_paise).toBe(12000);
  });

  it('5. should record multi-tender split payments (Cash + UPI)', () => {
    // Grand total: ₹2,000 (200000 paise). Paid: ₹1,500 Cash + ₹500 UPI
    const invoice = repo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 200000 }],
      payments: [
        { mode: 'CASH', amount_paise: 150000 },
        { mode: 'UPI', amount_paise: 50000, reference_number: 'UPI-REF-888' },
      ],
    });

    expect(invoice.payments?.length).toBe(2);
    expect(invoice.paid_amount_paise).toBe(200000);
    expect(invoice.payment_status).toBe('PAID');
    expect(invoice.payments?.[0].payment_mode).toBe('CASH');
    expect(invoice.payments?.[1].payment_mode).toBe('UPI');
  });

  it('6. should reject sales when stock is insufficient and rollback transaction', () => {
    // Product 5 has initial stock 1
    const initialMovementsCount = (
      db.prepare('SELECT COUNT(*) as count FROM stock_movements').get() as { count: number }
    ).count;

    expect(() => {
      repo.createInvoice({
        customer_id: 1,
        items: [{ product_id: 5, quantity: 5, unit_price_paise: 185000 }], // Requested 5, only 1 available!
        payments: [{ mode: 'CASH', amount_paise: 925000 }],
      });
    }).toThrow(/Insufficient stock/);

    // Verify nothing was inserted into sales_invoices or stock_movements
    const invoiceCount = (
      db.prepare('SELECT COUNT(*) as count FROM sales_invoices').get() as { count: number }
    ).count;
    expect(invoiceCount).toBe(0);

    const afterMovementsCount = (
      db.prepare('SELECT COUNT(*) as count FROM stock_movements').get() as { count: number }
    ).count;
    expect(afterMovementsCount).toBe(initialMovementsCount);
  });

  it('7. should cancel invoice, restore stock, and write audit movement records', () => {
    const invoice = repo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    // Stock after sale is 8 - 2 = 6
    const stockAfterSale = (
      db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as { stock_quantity: number }
    ).stock_quantity;
    expect(stockAfterSale).toBe(6);

    // Cancel invoice
    const cancelled = repo.cancelInvoice(invoice.id, 'Customer requested order cancellation');

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellation_reason).toBe('Customer requested order cancellation');

    // Stock should be restored to 8
    const stockAfterCancel = (
      db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as { stock_quantity: number }
    ).stock_quantity;
    expect(stockAfterCancel).toBe(8);

    // Should have compensatory stock movement
    const returnMovement = db
      .prepare("SELECT * FROM stock_movements WHERE reference_id = ? AND movement_type = 'SALE_RETURN'")
      .get(invoice.id) as any;
    expect(returnMovement).toBeDefined();
    expect(returnMovement.quantity_change).toBe(2);
    expect(returnMovement.balance_quantity_after).toBe(8);
  });

  it('8. should reject cancellation without reason or on already cancelled invoice', () => {
    const invoice = repo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 1150000 }],
    });

    expect(() => repo.cancelInvoice(invoice.id, '')).toThrow(/mandatory cancellation reason/);

    repo.cancelInvoice(invoice.id, 'First cancellation');

    expect(() => repo.cancelInvoice(invoice.id, 'Duplicate cancellation')).toThrow(/already CANCELLED/);
  });
});
