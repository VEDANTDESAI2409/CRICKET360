import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { ReportDateFilter } from '../../shared/types/models';

export class ExportImportService {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  exportProductsCsv(): { csvContent: string; filename: string } {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `cricket360_products_export_${today}.csv`;

    const products = this.db
      .prepare(`
        SELECT
          p.sku,
          p.name,
          COALESCE(p.barcode, '') AS barcode,
          c.name AS category_name,
          b.name AS brand_name,
          u.symbol AS unit_symbol,
          COALESCE(p.hsn_code, '9506') AS hsn_code,
          p.purchase_cost_paise,
          p.selling_price_paise,
          p.mrp_paise,
          p.stock_quantity,
          p.min_stock_level,
          p.reorder_level
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        JOIN units u ON p.unit_id = u.id
        WHERE p.is_active = 1
        ORDER BY p.name ASC
      `)
      .all() as any[];

    let csv = 'SKU,Product Name,Barcode,Category,Brand,Unit,HSN Code,Purchase Cost (INR),Selling Price (INR),MRP (INR),Stock Qty,Min Stock,Reorder Level\n';

    for (const p of products) {
      csv += `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.barcode}","${p.category_name}","${p.brand_name}","${p.unit_symbol}","${p.hsn_code}",${(p.purchase_cost_paise / 100).toFixed(2)},${(p.selling_price_paise / 100).toFixed(2)},${(p.mrp_paise / 100).toFixed(2)},${p.stock_quantity},${p.min_stock_level},${p.reorder_level}\n`;
    }

    return { csvContent: csv, filename };
  }

  importProductsCsv(csvContent: string): { importedCount: number; errors: string[] } {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      return { importedCount: 0, errors: ['CSV content is empty or contains only headers.'] };
    }

    const errors: string[] = [];
    let importedCount = 0;

    // Helper to parse CSV line respecting quotes
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (insideQuote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (c === ',' && !insideQuote) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const categories = this.db.prepare('SELECT id, name FROM categories').all() as Array<{ id: number; name: string }>;
    const brands = this.db.prepare('SELECT id, name FROM brands').all() as Array<{ id: number; name: string }>;
    const units = this.db.prepare('SELECT id, symbol FROM units').all() as Array<{ id: number; symbol: string }>;

    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const brandMap = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));
    const unitMap = new Map(units.map((u) => [u.symbol.toLowerCase(), u.id]));

    const defaultCatId = categories[0]?.id || 1;
    const defaultBrandId = brands[0]?.id || 1;
    const defaultUnitId = units[0]?.id || 1;

    const transaction = this.db.transaction(() => {
      for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
        const rawLine = lines[lineIdx];
        const cols = parseLine(rawLine);
        if (cols.length < 5) continue;

        const sku = cols[0];
        const name = cols[1];
        const barcode = cols[2] || null;
        const categoryName = cols[3] || '';
        const brandName = cols[4] || '';
        const unitSymbol = cols[5] || '';
        const hsn = cols[6] || '9506';
        const purchaseCostInr = parseFloat(cols[7]) || 0;
        const sellingPriceInr = parseFloat(cols[8]) || 0;
        const mrpInr = parseFloat(cols[9]) || sellingPriceInr;
        const stockQty = parseInt(cols[10], 10) || 0;
        const minStock = parseInt(cols[11], 10) || 2;
        const reorderLevel = parseInt(cols[12], 10) || 5;

        if (!sku || !name) {
          errors.push(`Row ${lineIdx + 1}: SKU and Product Name are required.`);
          continue;
        }

        const catId = catMap.get(categoryName.toLowerCase()) || defaultCatId;
        const brandId = brandMap.get(brandName.toLowerCase()) || defaultBrandId;
        const unitId = unitMap.get(unitSymbol.toLowerCase()) || defaultUnitId;

        const purchaseCostPaise = Math.round(purchaseCostInr * 100);
        const sellingPricePaise = Math.round(sellingPriceInr * 100);
        const mrpPaise = Math.round(mrpInr * 100);

        try {
          const existing = this.db
            .prepare('SELECT id FROM products WHERE sku = ?')
            .get(sku) as { id: number } | undefined;

          if (existing) {
            this.db.prepare(`
              UPDATE products SET
                name = ?, barcode = ?, category_id = ?, brand_id = ?, unit_id = ?,
                hsn_code = ?, purchase_cost_paise = ?, selling_price_paise = ?,
                mrp_paise = ?, min_stock_level = ?, reorder_level = ?
              WHERE id = ?
            `).run(
              name, barcode, catId, brandId, unitId, hsn,
              purchaseCostPaise, sellingPricePaise, mrpPaise, minStock, reorderLevel,
              existing.id
            );
          } else {
            const ins = this.db.prepare(`
              INSERT INTO products (
                sku, name, barcode, category_id, brand_id, unit_id, hsn_code,
                purchase_cost_paise, selling_price_paise, mrp_paise, stock_quantity,
                min_stock_level, reorder_level, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `).run(
              sku, name, barcode, catId, brandId, unitId, hsn,
              purchaseCostPaise, sellingPricePaise, mrpPaise, stockQty,
              minStock, reorderLevel
            );

            if (stockQty > 0) {
              this.db.prepare(`
                INSERT INTO stock_movements (
                  product_id, movement_type, quantity_change, balance_quantity_after, notes
                ) VALUES (?, 'OPENING_STOCK', ?, ?, 'CSV Product Import')
              `).run(Number(ins.lastInsertRowid), stockQty, stockQty);
            }
          }
          importedCount += 1;
        } catch (err) {
          errors.push(`Row ${lineIdx + 1} (${sku}): ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      try {
        this.db
          .prepare(
            `INSERT INTO audit_logs (action, entity_type, entity_id, details_json, username_snapshot)
             VALUES ('DATA_IMPORT', 'products', 'csv_bulk', ?, 'system')`
          )
          .run(JSON.stringify({ importedCount, errorCount: errors.length }));
      } catch {
        // Table may not exist in early test migrations
      }
    });

    transaction();
    return { importedCount, errors };
  }

  exportCustomersCsv(): { csvContent: string; filename: string } {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `cricket360_customers_export_${today}.csv`;

    const customers = this.db
      .prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC')
      .all() as any[];

    let csv = 'Customer Name,Phone,Email,GSTIN,Address,State Code,Credit Limit (INR),Outstanding Balance (INR)\n';

    for (const c of customers) {
      csv += `"${c.name.replace(/"/g, '""')}","${c.phone || ''}","${c.email || ''}","${c.gstin || ''}","${(c.address || '').replace(/"/g, '""')}","${c.state_code || '27'}",${((c.credit_limit_paise || 0) / 100).toFixed(2)},${((c.balance_paise || 0) / 100).toFixed(2)}\n`;
    }

    return { csvContent: csv, filename };
  }

  exportSalesCsv(filter?: ReportDateFilter): { csvContent: string; filename: string } {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = filter?.start_date || today.slice(0, 7) + '-01';
    const endDate = filter?.end_date || today;
    const filename = `cricket360_sales_invoices_${startDate}_to_${endDate}.csv`;

    const invoices = this.db
      .prepare(`
        SELECT
          si.invoice_number,
          si.invoice_date,
          si.customer_name_snapshot,
          COALESCE(si.customer_gstin_snapshot, '') AS gstin,
          si.place_of_supply,
          si.is_inter_state,
          si.taxable_amount_paise,
          si.cgst_amount_paise,
          si.sgst_amount_paise,
          si.igst_amount_paise,
          si.discount_amount_paise,
          si.grand_total_paise,
          si.paid_amount_paise,
          si.balance_amount_paise,
          si.payment_status,
          si.status
        FROM sales_invoices si
        WHERE si.invoice_date >= ? AND si.invoice_date <= ?
        ORDER BY si.invoice_date DESC, si.id DESC
      `)
      .all(startDate, endDate) as any[];

    let csv = 'Invoice Number,Date,Customer,GSTIN,POS,Type,Taxable (INR),CGST (INR),SGST (INR),IGST (INR),Discount (INR),Grand Total (INR),Paid (INR),Balance (INR),Payment Status,Invoice Status\n';

    for (const i of invoices) {
      csv += `"${i.invoice_number}","${i.invoice_date}","${i.customer_name_snapshot.replace(/"/g, '""')}","${i.gstin}","${i.place_of_supply}","${i.is_inter_state ? 'Inter-State' : 'Intra-State'}",${(i.taxable_amount_paise / 100).toFixed(2)},${(i.cgst_amount_paise / 100).toFixed(2)},${(i.sgst_amount_paise / 100).toFixed(2)},${(i.igst_amount_paise / 100).toFixed(2)},${(i.discount_amount_paise / 100).toFixed(2)},${(i.grand_total_paise / 100).toFixed(2)},${(i.paid_amount_paise / 100).toFixed(2)},${(i.balance_amount_paise / 100).toFixed(2)},"${i.payment_status}","${i.status}"\n`;
    }

    return { csvContent: csv, filename };
  }
}
