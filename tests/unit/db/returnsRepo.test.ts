import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BillingRepo } from '../../../src/main/db/billingRepo';
import { ReturnsRepo } from '../../../src/main/db/returnsRepo';

describe('Milestone 6: ReturnsRepo & Sales Returns / Refunds Integrity', () => {
  let db: Database.Database;
  let billingRepo: BillingRepo;
  let returnsRepo: ReturnsRepo;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run migrations 001 through 006
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_transactions_foundation.sql',
      '003_catalog_and_inventory.sql',
      '004_pos_and_gst_billing.sql',
      '005_procurement_and_accounts.sql',
      '006_returns_expenses_and_controls.sql',
    ];

    for (const file of migrationFiles) {
      const sqlPath = path.resolve('src/main/db/migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      db.exec(sql);
    }

    billingRepo = new BillingRepo(db);
    returnsRepo = new ReturnsRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should generate collision-free sequential return numbers', () => {
    const num1 = returnsRepo.getNextReturnNumber();
    expect(num1).toBe('SR-1001');

    // Create an invoice first
    const invoice = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    const returnItem = invoice.items![0];

    // Create a return
    returnsRepo.create({
      invoice_id: invoice.id,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Wrong size',
      items: [{ sales_invoice_item_id: returnItem.id, quantity: 1, restock: true }],
    });

    const num2 = returnsRepo.getNextReturnNumber();
    expect(num2).toBe('SR-1002');
  });

  it('2. should correctly process a partial return, restore physical stock, and log SALE_RETURN movement', () => {
    // Initial stock for product 1 is 8
    const stockBefore = (db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any).stock_quantity;
    expect(stockBefore).toBe(8);

    // Bill 3 items
    const invoice = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 3, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 3450000 }],
    });

    // Stock should be 8 - 3 = 5
    const stockAfterSale = (db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any).stock_quantity;
    expect(stockAfterSale).toBe(5);

    const invItem = invoice.items![0];

    // Return 1 item with restock = true
    const returnRecord = returnsRepo.create({
      invoice_id: invoice.id,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Handle grip damaged',
      items: [{ sales_invoice_item_id: invItem.id, quantity: 1, restock: true }],
    });

    expect(returnRecord.return_number).toBe('SR-1001');
    expect(returnRecord.grand_total_paise).toBe(1150000);

    // Restocked: stock should now be 5 + 1 = 6
    const stockAfterReturn = (db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any).stock_quantity;
    expect(stockAfterReturn).toBe(6);

    // Verify stock_movements entry
    const movement = db.prepare(`
      SELECT * FROM stock_movements
      WHERE movement_type = 'SALE_RETURN' AND product_id = 1
      ORDER BY id DESC LIMIT 1
    `).get() as any;
    expect(movement).toBeDefined();
    expect(movement.quantity_change).toBe(1);
    expect(movement.balance_quantity_after).toBe(6);

    // Verify returned_quantity on sales_invoice_items
    const updatedInvItem = db.prepare('SELECT returned_quantity FROM sales_invoice_items WHERE id = ?').get(invItem.id) as any;
    expect(updatedInvItem.returned_quantity).toBe(1);

    // Partial return: status should still be COMPLETED
    const updatedInvoice = db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(invoice.id) as any;
    expect(updatedInvoice.status).toBe('COMPLETED');
  });

  it('3. should update invoice status to RETURNED when all items are fully returned', () => {
    const invoice = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    const invItem = invoice.items![0];

    // Full return of all 2 units
    returnsRepo.create({
      invoice_id: invoice.id,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Complete order returned',
      items: [{ sales_invoice_item_id: invItem.id, quantity: 2, restock: true }],
    });

    const updatedInvoice = db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(invoice.id) as any;
    expect(updatedInvoice.status).toBe('RETURNED');
  });

  it('4. should reject returns that exceed the remaining returnable quantity', () => {
    const invoice = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    const invItem = invoice.items![0];

    // Try returning 3 units when only 2 were purchased
    expect(() => {
      returnsRepo.create({
        invoice_id: invoice.id,
        return_date: '2026-10-25',
        refund_mode: 'CASH',
        reason: 'Excess return',
        items: [{ sales_invoice_item_id: invItem.id, quantity: 3, restock: true }],
      });
    }).toThrow(/Maximum returnable quantity is 2/);
  });

  it('5. should NOT increment physical stock when restock is false (e.g. damaged write-off)', () => {
    const invoice = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    const stockBeforeReturn = (db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any).stock_quantity;
    const invItem = invoice.items![0];

    // Return with restock = false
    returnsRepo.create({
      invoice_id: invoice.id,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Cracked bat - discarded',
      items: [{ sales_invoice_item_id: invItem.id, quantity: 1, restock: false }],
    });

    const stockAfterReturn = (db.prepare('SELECT stock_quantity FROM products WHERE id = 1').get() as any).stock_quantity;
    // Stock remains unchanged since item was not accepted back into inventory
    expect(stockAfterReturn).toBe(stockBeforeReturn);
  });

  it('6. should adjust customer balance and record audit trail when refund mode is STORE_CREDIT', () => {
    // Setup customer with outstanding balance
    db.prepare('UPDATE customers SET balance_paise = 500000 WHERE id = 2').run();

    const invoice = billingRepo.createInvoice({
      customer_id: 2,
      items: [{ product_id: 1, quantity: 1, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 1150000 }],
    });

    const invItem = invoice.items![0];

    const ret = returnsRepo.create({
      invoice_id: invoice.id,
      return_date: '2026-10-25',
      refund_mode: 'STORE_CREDIT',
      reason: 'Exchange for store credit',
      items: [{ sales_invoice_item_id: invItem.id, quantity: 1, restock: true }],
    });

    // Customer balance: 500000 - 1150000 = -650000 (credit)
    const custAfter = (db.prepare('SELECT balance_paise FROM customers WHERE id = 2').get() as any).balance_paise;
    expect(custAfter).toBe(500000 - 1150000);

    // Verify audit log
    const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'SALES_RETURN' AND entity_id = ?").get(String(ret.id)) as any;
    expect(audit).toBeDefined();
    expect(JSON.parse(audit.details_json).returnNumber).toBe('SR-1001');
  });
});
