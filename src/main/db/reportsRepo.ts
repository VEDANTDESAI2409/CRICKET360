import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  ReportDateFilter,
  SalesReportSummary,
  PurchaseReportSummary,
  ProfitLossReport,
  InventoryValuationReport,
  TaxSummaryReport,
  PaymentRegisterSummary,
} from '../../shared/types/models';

export class ReportsRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  getSalesReport(filter: ReportDateFilter): SalesReportSummary {
    const { start_date, end_date } = filter;

    // 1. Sales Invoices
    const invoices = this.db
      .prepare(`
        SELECT *
        FROM sales_invoices
        WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'CANCELLED'
        ORDER BY invoice_date ASC, id ASC
      `)
      .all(start_date, end_date) as any[];

    // 2. Sales Returns
    const returnsRow = this.db
      .prepare(`
        SELECT COALESCE(SUM(grand_total_paise), 0) AS total_returns
        FROM sales_returns
        WHERE return_date >= ? AND return_date <= ?
      `)
      .get(start_date, end_date) as { total_returns: number };

    const returnsAmountPaise = returnsRow?.total_returns || 0;

    let grossSalesPaise = 0;
    let totalDiscountsPaise = 0;
    let taxableAmountPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    let totalTaxPaise = 0;
    let roundOffPaise = 0;

    const dailyMap = new Map<string, { count: number; netSales: number }>();

    for (const inv of invoices) {
      grossSalesPaise += inv.taxable_amount_paise + inv.total_tax_paise + inv.discount_amount_paise;
      totalDiscountsPaise += inv.discount_amount_paise;
      taxableAmountPaise += inv.taxable_amount_paise;
      cgstPaise += inv.cgst_amount_paise;
      sgstPaise += inv.sgst_amount_paise;
      igstPaise += inv.igst_amount_paise;
      totalTaxPaise += inv.total_tax_paise;
      roundOffPaise += inv.round_off_paise;

      const cur = dailyMap.get(inv.invoice_date) || { count: 0, netSales: 0 };
      cur.count += 1;
      cur.netSales += inv.grand_total_paise;
      dailyMap.set(inv.invoice_date, cur);
    }

    const netSalesPaise = Math.max(0, grossSalesPaise - totalDiscountsPaise - returnsAmountPaise);

    // Payments Breakdown for these invoices
    const paymentRows = this.db
      .prepare(`
        SELECT payment_mode, SUM(amount_paise) AS total_amount
        FROM payments
        WHERE payment_date >= ? AND payment_date <= ? AND party_type = 'CUSTOMER' AND (payment_type IS NULL OR payment_type = 'INVOICE_PAYMENT' OR payment_type = 'CUSTOMER_RECEIPT')
        GROUP BY payment_mode
      `)
      .all(start_date, end_date) as Array<{ payment_mode: string; total_amount: number }>;

    const paymentBreakdown: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
    };

    for (const p of paymentRows) {
      paymentBreakdown[p.payment_mode] = p.total_amount;
    }

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date,
      invoiceCount: val.count,
      netSalesPaise: val.netSales,
    }));

    return {
      startDate: start_date,
      endDate: end_date,
      totalInvoicesCount: invoices.length,
      grossSalesPaise,
      totalDiscountsPaise,
      returnsAmountPaise,
      netSalesPaise,
      taxableAmountPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalTaxPaise,
      roundOffPaise,
      paymentBreakdown,
      dailyTrend,
    };
  }

  getPurchaseReport(filter: ReportDateFilter): PurchaseReportSummary {
    const { start_date, end_date } = filter;

    const purchases = this.db
      .prepare(`
        SELECT *
        FROM purchases
        WHERE purchase_date >= ? AND purchase_date <= ? AND status != 'CANCELLED'
      `)
      .all(start_date, end_date) as any[];

    const returnsRow = this.db
      .prepare(`
        SELECT COALESCE(SUM(grand_total_paise), 0) AS total_returns
        FROM purchase_returns
        WHERE return_date >= ? AND return_date <= ?
      `)
      .get(start_date, end_date) as { total_returns: number };

    const returnsAmountPaise = returnsRow?.total_returns || 0;

    let totalInwardCostPaise = 0;
    let totalTaxPaidPaise = 0;
    let unpaidDuesPaise = 0;

    for (const p of purchases) {
      totalInwardCostPaise += p.total_amount_paise || (p.subtotal_paise + p.total_tax_paise);
      totalTaxPaidPaise += p.total_tax_paise || 0;
      unpaidDuesPaise += p.balance_amount_paise || 0;
    }

    const netPurchasesPaise = Math.max(0, totalInwardCostPaise - returnsAmountPaise);

    return {
      startDate: start_date,
      endDate: end_date,
      totalPurchasesCount: purchases.length,
      totalInwardCostPaise,
      returnsAmountPaise,
      netPurchasesPaise,
      totalTaxPaidPaise,
      unpaidDuesPaise,
    };
  }

  getProfitLossReport(filter: ReportDateFilter): ProfitLossReport {
    const { start_date, end_date } = filter;

    // 1. Net Revenue
    const salesReport = this.getSalesReport(filter);
    const grossRevenuePaise = salesReport.grossSalesPaise;
    const discountsPaise = salesReport.totalDiscountsPaise;
    const returnsPaise = salesReport.returnsAmountPaise;
    const netRevenuePaise = salesReport.netSalesPaise;

    // 2. Cost of Goods Sold (COGS) based on weighted landed cost of sold items
    const soldItems = this.db
      .prepare(`
        SELECT
          sii.quantity,
          sii.returned_quantity,
          p.purchase_cost_paise AS prod_cost,
          pv.purchase_cost_paise AS var_cost
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        JOIN products p ON sii.product_id = p.id
        LEFT JOIN product_variants pv ON sii.variant_id = pv.id
        WHERE si.invoice_date >= ? AND si.invoice_date <= ? AND si.status != 'CANCELLED'
      `)
      .all(start_date, end_date) as Array<{
        quantity: number;
        returned_quantity: number;
        prod_cost: number;
        var_cost: number | null;
      }>;

    let cogsPaise = 0;
    for (const it of soldItems) {
      const unitCost = it.var_cost !== null && it.var_cost > 0 ? it.var_cost : it.prod_cost;
      const netSoldQty = Math.max(0, it.quantity - (it.returned_quantity || 0));
      cogsPaise += netSoldQty * unitCost;
    }

    const grossProfitPaise = netRevenuePaise - cogsPaise;
    const grossMarginPercent = netRevenuePaise > 0 ? (grossProfitPaise / netRevenuePaise) * 100 : 0;

    // 3. Operating Expenses
    const expensesByCategory = this.db
      .prepare(`
        SELECT ec.name AS categoryName, COALESCE(SUM(e.amount_paise), 0) AS amountPaise
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.expense_date >= ? AND e.expense_date <= ? AND e.payment_status = 'PAID'
        GROUP BY ec.id, ec.name
        ORDER BY amountPaise DESC
      `)
      .all(start_date, end_date) as Array<{ categoryName: string; amountPaise: number }>;

    const operatingExpensesPaise = expensesByCategory.reduce((sum, e) => sum + e.amountPaise, 0);

    const netOperatingProfitPaise = grossProfitPaise - operatingExpensesPaise;
    const netMarginPercent = netRevenuePaise > 0 ? (netOperatingProfitPaise / netRevenuePaise) * 100 : 0;

    return {
      startDate: start_date,
      endDate: end_date,
      costingMethod: 'WEIGHTED_LANDED_COST',
      grossRevenuePaise,
      discountsPaise,
      returnsPaise,
      netRevenuePaise,
      cogsPaise,
      grossProfitPaise,
      grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
      operatingExpensesPaise,
      expensesByCategory,
      netOperatingProfitPaise,
      netMarginPercent: Number(netMarginPercent.toFixed(2)),
    };
  }

  getInventoryValuationReport(): InventoryValuationReport {
    // 1. Standalone products or products without variants
    const standaloneProducts = this.db
      .prepare(`
        SELECT
          p.id, p.name, p.category_id, c.name AS category_name,
          p.stock_quantity, p.min_stock_level,
          p.purchase_cost_paise, p.selling_price_paise
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1 AND p.id NOT IN (SELECT DISTINCT product_id FROM product_variants)
      `)
      .all() as any[];

    // 2. Variant products
    const variantProducts = this.db
      .prepare(`
        SELECT
          pv.id, p.name || ' (' || pv.variant_name || ')' AS name,
          p.category_id, c.name AS category_name,
          pv.stock_quantity, p.min_stock_level,
          pv.purchase_cost_paise, pv.selling_price_paise
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
      `)
      .all() as any[];

    const allItems = [...standaloneProducts, ...variantProducts];

    let totalStockUnits = 0;
    let totalCostValuationPaise = 0;
    let totalRetailValuationPaise = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const catMap = new Map<string, { units: number; cost: number; retail: number }>();

    for (const item of allItems) {
      const units = Math.max(0, item.stock_quantity || 0);
      const costVal = units * (item.purchase_cost_paise || 0);
      const retailVal = units * (item.selling_price_paise || 0);

      totalStockUnits += units;
      totalCostValuationPaise += costVal;
      totalRetailValuationPaise += retailVal;

      if (units === 0) {
        outOfStockCount += 1;
      } else if (units <= (item.min_stock_level || 5)) {
        lowStockCount += 1;
      }

      const catName = item.category_name || 'General';
      const cur = catMap.get(catName) || { units: 0, cost: 0, retail: 0 };
      cur.units += units;
      cur.cost += costVal;
      cur.retail += retailVal;
      catMap.set(catName, cur);
    }

    const potentialGrossProfitPaise = totalRetailValuationPaise - totalCostValuationPaise;

    const categoryBreakdown = Array.from(catMap.entries()).map(([categoryName, data]) => ({
      categoryName,
      units: data.units,
      costValuationPaise: data.cost,
      retailValuationPaise: data.retail,
    }));

    return {
      totalStockUnits,
      totalCostValuationPaise,
      totalRetailValuationPaise,
      potentialGrossProfitPaise,
      categoryBreakdown,
      lowStockCount,
      outOfStockCount,
    };
  }

  getTaxReport(filter: ReportDateFilter): TaxSummaryReport {
    const { start_date, end_date } = filter;

    // B2B Invoices (Customers with valid GSTIN)
    const b2bInvoices = this.db
      .prepare(`
        SELECT
          customer_name_snapshot AS customerName,
          customer_gstin_snapshot AS gstin,
          invoice_number AS invoiceNumber,
          invoice_date AS invoiceDate,
          taxable_amount_paise AS taxableAmountPaise,
          cgst_amount_paise AS cgstPaise,
          sgst_amount_paise AS sgstPaise,
          igst_amount_paise AS igstPaise,
          grand_total_paise AS totalPaise
        FROM sales_invoices
        WHERE invoice_date >= ? AND invoice_date <= ?
          AND status != 'CANCELLED'
          AND customer_gstin_snapshot IS NOT NULL
          AND length(trim(customer_gstin_snapshot)) >= 15
        ORDER BY invoice_date ASC, id ASC
      `)
      .all(start_date, end_date) as any[];

    // B2C Intra-State (is_inter_state = 0, no GSTIN)
    const b2cIntraRow = this.db
      .prepare(`
        SELECT
          COALESCE(SUM(taxable_amount_paise), 0) AS taxable,
          COALESCE(SUM(total_tax_paise), 0) AS tax
        FROM sales_invoices
        WHERE invoice_date >= ? AND invoice_date <= ?
          AND status != 'CANCELLED'
          AND is_inter_state = 0
          AND (customer_gstin_snapshot IS NULL OR length(trim(customer_gstin_snapshot)) < 15)
      `)
      .get(start_date, end_date) as { taxable: number; tax: number };

    // B2C Inter-State (is_inter_state = 1, no GSTIN)
    const b2cInterRow = this.db
      .prepare(`
        SELECT
          COALESCE(SUM(taxable_amount_paise), 0) AS taxable,
          COALESCE(SUM(total_tax_paise), 0) AS tax
        FROM sales_invoices
        WHERE invoice_date >= ? AND invoice_date <= ?
          AND status != 'CANCELLED'
          AND is_inter_state = 1
          AND (customer_gstin_snapshot IS NULL OR length(trim(customer_gstin_snapshot)) < 15)
      `)
      .get(start_date, end_date) as { taxable: number; tax: number };

    // HSN Summary from sales invoice items
    const hsnRows = this.db
      .prepare(`
        SELECT
          sii.hsn_code_snapshot AS hsnCode,
          COALESCE(h.description, 'Sports goods and accessories') AS description,
          sii.tax_rate_percent AS taxRatePercent,
          SUM(sii.quantity) AS totalQuantity,
          SUM(sii.taxable_amount_paise) AS taxableAmountPaise,
          SUM(sii.cgst_amount_paise) AS cgstPaise,
          SUM(sii.sgst_amount_paise) AS sgstPaise,
          SUM(sii.igst_amount_paise) AS igstPaise,
          SUM(sii.cgst_amount_paise + sii.sgst_amount_paise + sii.igst_amount_paise) AS totalTaxPaise
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        LEFT JOIN hsn_codes h ON sii.hsn_code_snapshot = h.hsn_code
        WHERE si.invoice_date >= ? AND si.invoice_date <= ? AND si.status != 'CANCELLED'
        GROUP BY sii.hsn_code_snapshot, sii.tax_rate_percent
        ORDER BY totalTaxPaise DESC
      `)
      .all(start_date, end_date) as any[];

    // Total Output Tax from sales
    const outputTaxRow = this.db
      .prepare(`
        SELECT COALESCE(SUM(total_tax_paise), 0) AS total_tax
        FROM sales_invoices
        WHERE invoice_date >= ? AND invoice_date <= ? AND status != 'CANCELLED'
      `)
      .get(start_date, end_date) as { total_tax: number };

    // Total Input Tax (ITC) from purchases
    const inputTaxRow = this.db
      .prepare(`
        SELECT COALESCE(SUM(total_tax_paise), 0) AS total_tax
        FROM purchases
        WHERE purchase_date >= ? AND purchase_date <= ? AND status != 'CANCELLED'
      `)
      .get(start_date, end_date) as { total_tax: number };

    return {
      startDate: start_date,
      endDate: end_date,
      b2bSales: b2bInvoices,
      b2cIntraStateTaxablePaise: b2cIntraRow?.taxable || 0,
      b2cIntraStateTaxPaise: b2cIntraRow?.tax || 0,
      b2cInterStateTaxablePaise: b2cInterRow?.taxable || 0,
      b2cInterStateTaxPaise: b2cInterRow?.tax || 0,
      hsnSummary: hsnRows,
      totalOutputTaxPaise: outputTaxRow?.total_tax || 0,
      totalInputTaxPaise: inputTaxRow?.total_tax || 0,
    };
  }

  getPaymentsSummaryReport(filter: ReportDateFilter): PaymentRegisterSummary {
    const { start_date, end_date } = filter;

    // Customer Inflows
    const inflows = this.db
      .prepare(`
        SELECT payment_mode, SUM(amount_paise) AS total_amount
        FROM payments
        WHERE payment_date >= ? AND payment_date <= ?
          AND party_type = 'CUSTOMER'
          AND (payment_type IS NULL OR payment_type != 'REFUND')
        GROUP BY payment_mode
      `)
      .all(start_date, end_date) as Array<{ payment_mode: string; total_amount: number }>;

    const inflowsByMode: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
    };

    let totalInflowsPaise = 0;
    for (const row of inflows) {
      inflowsByMode[row.payment_mode] = row.total_amount;
      totalInflowsPaise += row.total_amount;
    }

    // Outflows: Supplier payments + Refunds + Paid Expenses
    const supplierOutflows = this.db
      .prepare(`
        SELECT payment_mode, SUM(amount_paise) AS total_amount
        FROM payments
        WHERE payment_date >= ? AND payment_date <= ?
          AND (party_type = 'SUPPLIER' OR payment_type = 'REFUND')
        GROUP BY payment_mode
      `)
      .all(start_date, end_date) as Array<{ payment_mode: string; total_amount: number }>;

    const expenseOutflows = this.db
      .prepare(`
        SELECT payment_mode, SUM(amount_paise) AS total_amount
        FROM expenses
        WHERE expense_date >= ? AND expense_date <= ?
          AND payment_status = 'PAID'
        GROUP BY payment_mode
      `)
      .all(start_date, end_date) as Array<{ payment_mode: string; total_amount: number }>;

    const outflowsByMode: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
    };

    let totalOutflowsPaise = 0;
    for (const row of supplierOutflows) {
      outflowsByMode[row.payment_mode] = (outflowsByMode[row.payment_mode] || 0) + row.total_amount;
      totalOutflowsPaise += row.total_amount;
    }

    for (const row of expenseOutflows) {
      outflowsByMode[row.payment_mode] = (outflowsByMode[row.payment_mode] || 0) + row.total_amount;
      totalOutflowsPaise += row.total_amount;
    }

    const netCashFlowPaise = totalInflowsPaise - totalOutflowsPaise;

    return {
      startDate: start_date,
      endDate: end_date,
      totalInflowsPaise,
      totalOutflowsPaise,
      netCashFlowPaise,
      inflowsByMode,
      outflowsByMode,
    };
  }

  exportCsv(reportType: string, filter?: ReportDateFilter): { csvContent: string; filename: string } {
    const today = new Date().toISOString().slice(0, 10);
    const dateFilter: ReportDateFilter = filter || {
      start_date: today.slice(0, 7) + '-01',
      end_date: today,
    };

    switch (reportType.toLowerCase()) {
      case 'sales': {
        const data = this.getSalesReport(dateFilter);
        const filename = `cricket360_sales_summary_${dateFilter.start_date}_to_${dateFilter.end_date}.csv`;
        let csv = 'Cricket360 Sales Summary Report\n';
        csv += `Period,${dateFilter.start_date} to ${dateFilter.end_date}\n\n`;
        csv += 'Metric,Amount (INR)\n';
        csv += `Total Invoices,${data.totalInvoicesCount}\n`;
        csv += `Gross Sales,${(data.grossSalesPaise / 100).toFixed(2)}\n`;
        csv += `Discounts,${(data.totalDiscountsPaise / 100).toFixed(2)}\n`;
        csv += `Returns,${(data.returnsAmountPaise / 100).toFixed(2)}\n`;
        csv += `Net Sales,${(data.netSalesPaise / 100).toFixed(2)}\n`;
        csv += `Taxable Amount,${(data.taxableAmountPaise / 100).toFixed(2)}\n`;
        csv += `Total Tax Collected,${(data.totalTaxPaise / 100).toFixed(2)}\n\n`;

        csv += 'Daily Sales Breakdown\nDate,Invoice Count,Net Sales (INR)\n';
        for (const row of data.dailyTrend) {
          csv += `${row.date},${row.invoiceCount},${(row.netSalesPaise / 100).toFixed(2)}\n`;
        }
        return { csvContent: csv, filename };
      }

      case 'profit_loss': {
        const data = this.getProfitLossReport(dateFilter);
        const filename = `cricket360_profit_and_loss_${dateFilter.start_date}_to_${dateFilter.end_date}.csv`;
        let csv = 'Cricket360 Profit & Loss Statement\n';
        csv += `Period,${dateFilter.start_date} to ${dateFilter.end_date}\n`;
        csv += `Costing Method,${data.costingMethod}\n\n`;
        csv += 'Account Head,Amount (INR)\n';
        csv += `Gross Revenue,${(data.grossRevenuePaise / 100).toFixed(2)}\n`;
        csv += `Less: Discounts,${(data.discountsPaise / 100).toFixed(2)}\n`;
        csv += `Less: Sales Returns,${(data.returnsPaise / 100).toFixed(2)}\n`;
        csv += `Net Revenue,${(data.netRevenuePaise / 100).toFixed(2)}\n`;
        csv += `Less: Cost of Goods Sold (COGS),${(data.cogsPaise / 100).toFixed(2)}\n`;
        csv += `Gross Profit,${(data.grossProfitPaise / 100).toFixed(2)}\n`;
        csv += `Gross Margin %,${data.grossMarginPercent}%\n`;
        csv += `Less: Operating Expenses,${(data.operatingExpensesPaise / 100).toFixed(2)}\n`;
        csv += `Net Operating Profit,${(data.netOperatingProfitPaise / 100).toFixed(2)}\n`;
        csv += `Net Margin %,${data.netMarginPercent}%\n\n`;

        csv += 'Operating Expenses by Category\nCategory,Amount (INR)\n';
        for (const exp of data.expensesByCategory) {
          csv += `"${exp.categoryName}",${(exp.amountPaise / 100).toFixed(2)}\n`;
        }
        return { csvContent: csv, filename };
      }

      case 'tax': {
        const data = this.getTaxReport(dateFilter);
        const filename = `cricket360_gstr1_tax_summary_${dateFilter.start_date}_to_${dateFilter.end_date}.csv`;
        let csv = 'Cricket360 GST / Tax Summary Report\n';
        csv += `Period,${dateFilter.start_date} to ${dateFilter.end_date}\n\n`;
        csv += `Total Output Tax (Sales),${(data.totalOutputTaxPaise / 100).toFixed(2)}\n`;
        csv += `Total Input Tax Credit (Purchases),${(data.totalInputTaxPaise / 100).toFixed(2)}\n`;
        csv += `B2C Intra-State Taxable,${(data.b2cIntraStateTaxablePaise / 100).toFixed(2)}\n`;
        csv += `B2C Intra-State Tax,${(data.b2cIntraStateTaxPaise / 100).toFixed(2)}\n`;
        csv += `B2C Inter-State Taxable,${(data.b2cInterStateTaxablePaise / 100).toFixed(2)}\n`;
        csv += `B2C Inter-State Tax,${(data.b2cInterStateTaxPaise / 100).toFixed(2)}\n\n`;

        csv += 'HSN Summary\nHSN Code,Description,Tax Rate %,Qty,Taxable (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR)\n';
        for (const h of data.hsnSummary) {
          csv += `"${h.hsnCode}","${h.description}",${h.taxRatePercent}%,${h.totalQuantity},${(h.taxableAmountPaise / 100).toFixed(2)},${(h.cgstPaise / 100).toFixed(2)},${(h.sgstPaise / 100).toFixed(2)},${(h.igstPaise / 100).toFixed(2)},${(h.totalTaxPaise / 100).toFixed(2)}\n`;
        }
        return { csvContent: csv, filename };
      }

      default: {
        const data = this.getInventoryValuationReport();
        const filename = `cricket360_inventory_valuation_${today}.csv`;
        let csv = 'Cricket360 Inventory Valuation Report\n';
        csv += `As of Date,${today}\n\n`;
        csv += `Total Stock Units,${data.totalStockUnits}\n`;
        csv += `Total Cost Valuation (INR),${(data.totalCostValuationPaise / 100).toFixed(2)}\n`;
        csv += `Total Retail Valuation (INR),${(data.totalRetailValuationPaise / 100).toFixed(2)}\n`;
        csv += `Potential Gross Profit (INR),${(data.potentialGrossProfitPaise / 100).toFixed(2)}\n\n`;

        csv += 'Category Valuation Breakdown\nCategory,Units,Cost Valuation (INR),Retail Valuation (INR)\n';
        for (const c of data.categoryBreakdown) {
          csv += `"${c.categoryName}",${c.units},${(c.costValuationPaise / 100).toFixed(2)},${(c.retailValuationPaise / 100).toFixed(2)}\n`;
        }
        return { csvContent: csv, filename };
      }
    }
  }
}
