import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  getDashboardMetrics,
  getLowStockAlerts,
  getRecentTransactions,
  getWeeklySalesSummary,
  getLocalDateString,
} from '../../../src/main/db/dashboardRepo';

describe('Milestone 2: Dashboard SQLite Repository & Aggregate Calculations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run schema migrations 001 and 002
    const m001 = fs.readFileSync(
      path.resolve(__dirname, '../../../src/main/db/migrations/001_initial_schema.sql'),
      'utf-8'
    );
    db.exec(m001);

    const m002 = fs.readFileSync(
      path.resolve(__dirname, '../../../src/main/db/migrations/002_transactions_foundation.sql'),
      'utf-8'
    );
    db.exec(m002);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should calculate active products, categories, stock, and valuation correctly', () => {
    const metrics = getDashboardMetrics(db);

    // Initial seeded migration has 6 products, 5 categories, 8 brands
    expect(metrics.totalActiveProducts).toBe(6);
    expect(metrics.totalCategories).toBe(5);
    expect(metrics.totalBrands).toBe(8);

    // Initial stock quantities: 8 + 2 + 0 + 5 + 1 + 6 = 22 units
    expect(metrics.totalStockQuantity).toBe(22);

    // Stock valuation = sum of stock_quantity * purchase_cost_paise:
    // (8 * 750000) + (2 * 180000) + (0 * 150000) + (5 * 420000) + (1 * 120000) + (6 * 220000)
    // = 6000000 + 360000 + 0 + 2100000 + 120000 + 1320000 = 9900000 paise (Rs 99,000.00)
    expect(metrics.totalStockValuationPaise).toBe(9900000);

    // Stock distribution
    expect(metrics.outOfStockCount).toBe(1); // Kookaburra gloves (0 stock)
    expect(metrics.lowStockCount).toBe(2); // SG Club Ball (2 <= 5) and DSC Shoes (1 <= 3)
    expect(metrics.inStockCount).toBe(3); // SS Bat (8 > 3), Helmet (5 > 2), Pads (6 > 2)
  });

  it('2. should accurately compute today sales and exclude cancelled transactions', () => {
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

    // Initially 0 sales
    let metrics = getDashboardMetrics(db);
    expect(metrics.todaySalesPaise).toBe(0);

    // Insert 1 completed invoice today for Rs 1,500.00 (150,000 paise)
    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot,
        taxable_amount_paise, grand_total_paise, paid_amount_paise, status
      ) VALUES ('INV-2026-001', ?, 'Walk-in Customer', 130000, 150000, 150000, 'COMPLETED')
    `).run(today);

    // Insert 1 cancelled invoice today for Rs 3,000.00 (300,000 paise)
    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot,
        taxable_amount_paise, grand_total_paise, paid_amount_paise, status
      ) VALUES ('INV-2026-002', ?, 'Cancelled Buyer', 260000, 300000, 0, 'CANCELLED')
    `).run(today);

    // Insert 1 completed invoice yesterday for Rs 5,000.00 (500,000 paise)
    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot,
        taxable_amount_paise, grand_total_paise, paid_amount_paise, status
      ) VALUES ('INV-2026-003', ?, 'Yesterday Buyer', 440000, 500000, 500000, 'COMPLETED')
    `).run(yesterday);

    metrics = getDashboardMetrics(db);

    // Only the completed invoice for today should be counted (150,000 paise)
    expect(metrics.todaySalesPaise).toBe(150000);
  });

  it('3. should accurately compute today purchases and exclude cancelled purchases', () => {
    const today = getLocalDateString();

    let metrics = getDashboardMetrics(db);
    expect(metrics.todayPurchasesPaise).toBe(0);

    // Insert 1 received purchase today for Rs 25,000.00 (2,500,000 paise)
    db.prepare(`
      INSERT INTO purchases (
        purchase_number, supplier_invoice_number, supplier_id,
        purchase_date, grand_total_paise, paid_amount_paise, status
      ) VALUES ('PO-2026-001', 'SUP-INV-99', 1, ?, 2500000, 2500000, 'RECEIVED')
    `).run(today);

    // Insert 1 cancelled purchase today for Rs 10,000.00 (1,000,000 paise)
    db.prepare(`
      INSERT INTO purchases (
        purchase_number, supplier_invoice_number, supplier_id,
        purchase_date, grand_total_paise, paid_amount_paise, status
      ) VALUES ('PO-2026-002', 'SUP-INV-100', 1, ?, 1000000, 0, 'CANCELLED')
    `).run(today);

    metrics = getDashboardMetrics(db);
    expect(metrics.todayPurchasesPaise).toBe(2500000);
  });

  it('4. should retrieve low stock and out-of-stock alert items accurately', () => {
    const alerts = getLowStockAlerts(db);

    // In initial seed, items with stock <= min_stock_level:
    // 1. Kookaburra Gloves: stock 0, min 2 => OUT_OF_STOCK
    // 2. DSC Shoes: stock 1, min 3 => LOW_STOCK
    // 3. SG Club Ball: stock 2, min 5 => LOW_STOCK
    expect(alerts.length).toBe(3);

    // Ordered by stock quantity ASC
    expect(alerts[0].sku).toBe('GLV-KOOK-KAH-01');
    expect(alerts[0].status).toBe('OUT_OF_STOCK');
    expect(alerts[0].stockQuantity).toBe(0);

    expect(alerts[1].sku).toBe('SHOE-DSC-INT-01');
    expect(alerts[1].status).toBe('LOW_STOCK');
    expect(alerts[1].stockQuantity).toBe(1);

    expect(alerts[2].sku).toBe('BALL-SG-CLUB-01');
    expect(alerts[2].status).toBe('LOW_STOCK');
    expect(alerts[2].stockQuantity).toBe(2);
  });

  it('5. should fetch recent transactions and exclude cancelled records', () => {
    const today = getLocalDateString();

    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot, grand_total_paise, status
      ) VALUES ('INV-101', ?, 'Rohit Sharma', 350000, 'COMPLETED')
    `).run(today);

    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot, grand_total_paise, status
      ) VALUES ('INV-102', ?, 'Cancelled Buyer', 100000, 'CANCELLED')
    `).run(today);

    const recents = getRecentTransactions(db, 10);
    expect(recents.length).toBe(1);
    expect(recents[0].referenceNumber).toBe('INV-101');
    expect(recents[0].partyName).toBe('Rohit Sharma');
    expect(recents[0].totalAmountPaise).toBe(350000);
    expect(recents[0].type).toBe('SALE');
  });

  it('6. should construct rolling 7-day sales time series correctly', () => {
    const today = getLocalDateString();

    // Add sales today
    db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, invoice_date, customer_name_snapshot, grand_total_paise, status
      ) VALUES ('INV-701', ?, 'Virat Kohli', 850000, 'COMPLETED')
    `).run(today);

    const weekly = getWeeklySalesSummary(db);

    expect(weekly.length).toBe(7);
    const todaySummary = weekly[6];
    expect(todaySummary.date).toBe(today);
    expect(todaySummary.salesAmountPaise).toBe(850000);
    expect(todaySummary.invoiceCount).toBe(1);

    // Days without sales have 0 paise and 0 count
    expect(weekly[0].salesAmountPaise).toBe(0);
    expect(weekly[0].invoiceCount).toBe(0);
  });
});
