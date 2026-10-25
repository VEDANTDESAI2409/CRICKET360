import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BillingRepo } from '../../../src/main/db/billingRepo';
import { ReturnsRepo } from '../../../src/main/db/returnsRepo';
import { ExpenseRepo } from '../../../src/main/db/expenseRepo';
import { ReportsRepo } from '../../../src/main/db/reportsRepo';

describe('Milestone 6: ReportsRepo & Financial Statement Reconciliation', () => {
  let db: Database.Database;
  let billingRepo: BillingRepo;
  let returnsRepo: ReturnsRepo;
  let expenseRepo: ExpenseRepo;
  let reportsRepo: ReportsRepo;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

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
    expenseRepo = new ExpenseRepo(db);
    reportsRepo = new ReportsRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should generate a reconciled Sales Report accounting for discounts, returns, and payment modes', () => {
    // 1. Create a sale of 2 Ton bats (Product 1: selling price 1150000 paise each = 2300000 paise total)
    const inv = billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'UPI', amount_paise: 2300000 }],
    });

    // 2. Return 1 bat
    returnsRepo.create({
      invoice_id: inv.id,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Exchange',
      items: [{ sales_invoice_item_id: inv.items![0].id, quantity: 1, restock: true }],
    });

    const report = reportsRepo.getSalesReport({
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    });

    expect(report.totalInvoicesCount).toBe(1);
    expect(report.grossSalesPaise).toBe(2300000);
    expect(report.returnsAmountPaise).toBe(1150000);
    expect(report.netSalesPaise).toBe(1150000);
    expect(report.paymentBreakdown.UPI).toBe(2300000);
  });

  it('2. should calculate Gross Margin and Net Operating Profit accurately using weighted landed cost', () => {
    // Product 1 purchase cost: 750000 paise, selling price: 1150000 paise
    // Net profit per unit = 1150000 - 750000 = 400000 paise
    billingRepo.createInvoice({
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2, unit_price_paise: 1150000 }],
      payments: [{ mode: 'CASH', amount_paise: 2300000 }],
    });

    // Record operating expense of 100000 paise (Rent: ₹1,000)
    expenseRepo.create({
      category_id: 1,
      expense_date: '2026-10-25',
      amount_paise: 100000,
      payment_mode: 'BANK_TRANSFER',
      payment_status: 'PAID',
    });

    const pnl = reportsRepo.getProfitLossReport({
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    });

    expect(pnl.costingMethod).toBe('WEIGHTED_LANDED_COST');
    expect(pnl.netRevenuePaise).toBe(2300000);
    expect(pnl.cogsPaise).toBe(1500000); // 2 * 750000
    expect(pnl.grossProfitPaise).toBe(800000); // 2300000 - 1500000
    expect(pnl.operatingExpensesPaise).toBe(100000);
    expect(pnl.netOperatingProfitPaise).toBe(700000); // 800000 - 100000
    expect(pnl.grossMarginPercent).toBeCloseTo(34.78, 1);
    expect(pnl.netMarginPercent).toBeCloseTo(30.43, 1);
  });

  it('3. should generate live inventory valuation report', () => {
    const val = reportsRepo.getInventoryValuationReport();
    expect(val.totalStockUnits).toBeGreaterThan(0);
    expect(val.totalCostValuationPaise).toBeGreaterThan(0);
    expect(val.totalRetailValuationPaise).toBeGreaterThan(val.totalCostValuationPaise);
    expect(val.potentialGrossProfitPaise).toBe(val.totalRetailValuationPaise - val.totalCostValuationPaise);
    expect(val.categoryBreakdown.length).toBeGreaterThan(0);
  });

  it('4. should export reports into formatted CSV text', () => {
    const csvSales = reportsRepo.exportCsv('sales', {
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    });
    expect(csvSales.filename).toContain('.csv');
    expect(csvSales.csvContent).toContain('Cricket360 Sales Summary Report');
    expect(csvSales.csvContent).toContain('Net Sales');

    const csvPnl = reportsRepo.exportCsv('profit_loss', {
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    });
    expect(csvPnl.csvContent).toContain('WEIGHTED_LANDED_COST');
    expect(csvPnl.csvContent).toContain('Gross Profit');
  });
});
