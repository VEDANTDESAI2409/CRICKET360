import Database from 'better-sqlite3';
import {
  DashboardMetrics,
  LowStockAlertItem,
  RecentTransactionItem,
  DaySalesSummary,
} from '../../shared/types/models';

/**
 * Returns today's local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves aggregate store metrics derived directly from local SQLite.
 */
export function getDashboardMetrics(db: Database.Database): DashboardMetrics {
  const today = getLocalDateString();

  // 1. Total Active Products
  const prodRow = db
    .prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1')
    .get() as { count: number };

  // 2. Total Categories & Brands
  const catRow = db
    .prepare('SELECT COUNT(*) as count FROM categories WHERE is_active = 1')
    .get() as { count: number };
  const brandRow = db
    .prepare('SELECT COUNT(*) as count FROM brands WHERE is_active = 1')
    .get() as { count: number };

  // 3. Stock Quantity & Stock Valuation (in paise)
  const stockRow = db
    .prepare(`
      SELECT 
        COALESCE(SUM(stock_quantity), 0) as totalStock,
        COALESCE(SUM(stock_quantity * purchase_cost_paise), 0) as totalValuation
      FROM products 
      WHERE is_active = 1
    `)
    .get() as { totalStock: number; totalValuation: number };

  // 4. Today's Sales (Completed sales invoices only, excluding cancellations)
  let todaySalesPaise = 0;
  try {
    const saleRow = db
      .prepare(`
        SELECT COALESCE(SUM(grand_total_paise), 0) as total 
        FROM sales_invoices 
        WHERE invoice_date = ? AND status = 'COMPLETED'
      `)
      .get(today) as { total: number } | undefined;
    if (saleRow) todaySalesPaise = saleRow.total;
  } catch {
    // sales_invoices table might not exist in old migrations
  }

  // 5. Today's Purchases (Received purchases only, excluding cancellations)
  let todayPurchasesPaise = 0;
  try {
    const purchRow = db
      .prepare(`
        SELECT COALESCE(SUM(grand_total_paise), 0) as total 
        FROM purchases 
        WHERE purchase_date = ? AND status = 'RECEIVED'
      `)
      .get(today) as { total: number } | undefined;
    if (purchRow) todayPurchasesPaise = purchRow.total;
  } catch {
    // purchases table might not exist in old migrations
  }

  // 6. Stock Health Distribution (Out of Stock, Low Stock, In Stock)
  const outOfStockRow = db
    .prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity = 0')
    .get() as { count: number };

  const lowStockRow = db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE is_active = 1 AND stock_quantity > 0 AND stock_quantity <= min_stock_level
    `)
    .get() as { count: number };

  const inStockRow = db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE is_active = 1 AND stock_quantity > min_stock_level
    `)
    .get() as { count: number };

  return {
    totalActiveProducts: prodRow.count,
    totalCategories: catRow.count,
    totalBrands: brandRow.count,
    totalStockQuantity: stockRow.totalStock,
    totalStockValuationPaise: stockRow.totalValuation,
    todaySalesPaise,
    todayPurchasesPaise,
    outOfStockCount: outOfStockRow.count,
    lowStockCount: lowStockRow.count,
    inStockCount: inStockRow.count,
  };
}

/**
 * Returns low stock and out-of-stock items requiring inventory replenishment.
 */
export function getLowStockAlerts(
  db: Database.Database,
  limit: number = 15
): LowStockAlertItem[] {
  try {
    return db
      .prepare(`
        SELECT 
          p.id, 
          p.name, 
          p.sku, 
          COALESCE(c.name, 'Uncategorized') as categoryName,
          COALESCE(b.name, 'Generic') as brandName,
          p.stock_quantity as stockQuantity,
          p.min_stock_level as minStockLevel,
          p.reorder_level as reorderLevel,
          p.mrp_paise as mrpPaise,
          p.selling_price_paise as sellingPricePaise,
          CASE 
            WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN p.stock_quantity <= p.min_stock_level THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = 1 AND p.stock_quantity <= p.min_stock_level
        ORDER BY p.stock_quantity ASC, p.name ASC
        LIMIT ?
      `)
      .all(limit) as LowStockAlertItem[];
  } catch (err) {
    console.error('Error fetching low stock alerts:', err);
    return [];
  }
}

/**
 * Returns recent transactions (sales invoices and purchases) for activity feeds.
 */
export function getRecentTransactions(
  db: Database.Database,
  limit: number = 10
): RecentTransactionItem[] {
  try {
    const rows = db
      .prepare(`
        SELECT 
          id,
          invoice_number as referenceNumber,
          customer_name_snapshot as partyName,
          invoice_date as transactionDate,
          grand_total_paise as totalAmountPaise,
          status,
          'SALE' as type
        FROM sales_invoices
        WHERE status != 'CANCELLED'
        ORDER BY id DESC
        LIMIT ?
      `)
      .all(limit) as RecentTransactionItem[];
    return rows;
  } catch {
    return [];
  }
}

/**
 * Returns 7-day rolling sales summary (including today) for chart visualization.
 */
export function getWeeklySalesSummary(db: Database.Database): DaySalesSummary[] {
  const days: DaySalesSummary[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayName = dayNames[d.getDay()];

    let salesAmountPaise = 0;
    let invoiceCount = 0;

    try {
      const row = db
        .prepare(`
          SELECT 
            COALESCE(SUM(grand_total_paise), 0) as total,
            COUNT(*) as count
          FROM sales_invoices
          WHERE invoice_date = ? AND status = 'COMPLETED'
        `)
        .get(dateStr) as { total: number; count: number } | undefined;

      if (row) {
        salesAmountPaise = row.total;
        invoiceCount = row.count;
      }
    } catch {
      // Table may not exist yet
    }

    days.push({
      dayName,
      date: dateStr,
      salesAmountPaise,
      invoiceCount,
    });
  }

  return days;
}
