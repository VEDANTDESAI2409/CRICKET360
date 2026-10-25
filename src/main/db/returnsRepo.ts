import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  SalesReturn,
  SalesReturnItem,
  CreateSalesReturnInput,
  SalesReturnFilterQuery,
  SalesInvoice,
  SalesInvoiceItem,
} from '../../shared/types/models';

export class ReturnsRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  getNextReturnNumber(): string {
    const prefixRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'sales_return_prefix'")
      .get() as { value: string } | undefined;
    const nextNumRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'next_sales_return_number'")
      .get() as { value: string } | undefined;

    const prefix = prefixRow ? prefixRow.value : 'SR-';
    const nextNum = nextNumRow ? parseInt(nextNumRow.value, 10) : 1001;

    let candidate = `${prefix}${nextNum}`;
    let counter = nextNum;

    while (
      this.db
        .prepare('SELECT id FROM sales_returns WHERE return_number = ?')
        .get(candidate)
    ) {
      counter += 1;
      candidate = `${prefix}${counter}`;
    }

    return candidate;
  }

  getAll(filters?: SalesReturnFilterQuery): SalesReturn[] {
    let sql = `
      SELECT sr.*, si.invoice_number
      FROM sales_returns sr
      JOIN sales_invoices si ON sr.invoice_id = si.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ` AND (sr.return_number LIKE ? OR si.invoice_number LIKE ? OR sr.customer_name_snapshot LIKE ?)`;
      params.push(q, q, q);
    }

    if (filters?.customer_id) {
      sql += ` AND sr.customer_id = ?`;
      params.push(filters.customer_id);
    }

    if (filters?.start_date) {
      sql += ` AND sr.return_date >= ?`;
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      sql += ` AND sr.return_date <= ?`;
      params.push(filters.end_date);
    }

    sql += ` ORDER BY sr.id DESC`;

    const rows = this.db.prepare(sql).all(...params) as SalesReturn[];
    return rows;
  }

  getById(id: number): SalesReturn | null {
    const returnRow = this.db
      .prepare(`
        SELECT sr.*, si.invoice_number
        FROM sales_returns sr
        JOIN sales_invoices si ON sr.invoice_id = si.id
        WHERE sr.id = ?
      `)
      .get(id) as SalesReturn | undefined;

    if (!returnRow) return null;

    const items = this.db
      .prepare('SELECT * FROM sales_return_items WHERE sales_return_id = ? ORDER BY id ASC')
      .all(id) as SalesReturnItem[];

    return {
      ...returnRow,
      items,
    };
  }

  create(input: CreateSalesReturnInput, userId?: number): SalesReturn {
    if (!input.items || input.items.length === 0) {
      throw new Error('Return must contain at least one line item.');
    }

    const transaction = this.db.transaction(() => {
      // 1. Fetch sales invoice
      const invoice = this.db
        .prepare('SELECT * FROM sales_invoices WHERE id = ?')
        .get(input.invoice_id) as SalesInvoice | undefined;

      if (!invoice) {
        throw new Error(`Sales invoice #${input.invoice_id} not found.`);
      }

      if (invoice.status === 'CANCELLED') {
        throw new Error(`Cannot process return for cancelled invoice ${invoice.invoice_number}.`);
      }

      const invoiceItems = this.db
        .prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?')
        .all(input.invoice_id) as SalesInvoiceItem[];

      const itemMap = new Map<number, SalesInvoiceItem>();
      for (const it of invoiceItems) {
        itemMap.set(it.id, it);
      }

      const returnNumber = this.getNextReturnNumber();

      let totalTaxablePaise = 0;
      let totalCgstPaise = 0;
      let totalSgstPaise = 0;
      let totalIgstPaise = 0;
      let grandTotalPaise = 0;

      interface PreparedItem {
        invoiceItemId: number;
        productId: number;
        variantId: number | null;
        productNameSnapshot: string;
        variantNameSnapshot: string | null;
        skuSnapshot: string;
        quantity: number;
        unitPricePaise: number;
        discountPaise: number;
        taxablePaise: number;
        taxRatePercent: number;
        cgstPaise: number;
        sgstPaise: number;
        igstPaise: number;
        totalPaise: number;
        restock: boolean;
      }

      const preparedList: PreparedItem[] = [];

      for (const itemInput of input.items) {
        if (itemInput.quantity <= 0) {
          throw new Error('Return item quantity must be greater than zero.');
        }

        const invItem = itemMap.get(itemInput.sales_invoice_item_id);
        if (!invItem) {
          throw new Error(`Invoice item #${itemInput.sales_invoice_item_id} does not exist on invoice ${invoice.invoice_number}.`);
        }

        const returnableQty = invItem.quantity - (invItem as any).returned_quantity;
        if (itemInput.quantity > returnableQty) {
          throw new Error(
            `Cannot return ${itemInput.quantity} units of "${invItem.product_name_snapshot}". Maximum returnable quantity is ${returnableQty}.`
          );
        }

        // Calculate proportional amounts
        const propTotal = Math.round((invItem.total_amount_paise * itemInput.quantity) / invItem.quantity);
        const propDiscount = Math.round((invItem.discount_amount_paise * itemInput.quantity) / invItem.quantity);
        const propCgst = Math.round((invItem.cgst_amount_paise * itemInput.quantity) / invItem.quantity);
        const propSgst = Math.round((invItem.sgst_amount_paise * itemInput.quantity) / invItem.quantity);
        const propIgst = Math.round((invItem.igst_amount_paise * itemInput.quantity) / invItem.quantity);
        const propTaxable = propTotal - (propCgst + propSgst + propIgst);

        totalTaxablePaise += propTaxable;
        totalCgstPaise += propCgst;
        totalSgstPaise += propSgst;
        totalIgstPaise += propIgst;
        grandTotalPaise += propTotal;

        preparedList.push({
          invoiceItemId: invItem.id,
          productId: invItem.product_id,
          variantId: invItem.variant_id || null,
          productNameSnapshot: invItem.product_name_snapshot,
          variantNameSnapshot: invItem.variant_name_snapshot || null,
          skuSnapshot: invItem.sku_snapshot,
          quantity: itemInput.quantity,
          unitPricePaise: invItem.unit_price_paise,
          discountPaise: propDiscount,
          taxablePaise: propTaxable,
          taxRatePercent: invItem.tax_rate_percent,
          cgstPaise: propCgst,
          sgstPaise: propSgst,
          igstPaise: propIgst,
          totalPaise: propTotal,
          restock: !!itemInput.restock,
        });
      }

      const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;

      // 2. Insert sales_returns
      const insertReturnStmt = this.db.prepare(`
        INSERT INTO sales_returns (
          return_number, invoice_id, customer_id, customer_name_snapshot,
          return_date, taxable_amount_paise, cgst_amount_paise, sgst_amount_paise,
          igst_amount_paise, total_tax_paise, round_off_paise, grand_total_paise,
          refund_mode, refund_reference, reason, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `);

      const returnRes = insertReturnStmt.run(
        returnNumber,
        invoice.id,
        invoice.customer_id || null,
        invoice.customer_name_snapshot,
        input.return_date,
        totalTaxablePaise,
        totalCgstPaise,
        totalSgstPaise,
        totalIgstPaise,
        totalTaxPaise,
        grandTotalPaise,
        input.refund_mode,
        input.refund_reference ? input.refund_reference.trim() : null,
        input.reason.trim(),
        input.notes ? input.notes.trim() : null,
        userId || null
      );

      const returnId = Number(returnRes.lastInsertRowid);

      // 3. Insert sales_return_items and handle restocking
      const insertItemStmt = this.db.prepare(`
        INSERT INTO sales_return_items (
          sales_return_id, sales_invoice_item_id, product_id, variant_id,
          product_name_snapshot, variant_name_snapshot, sku_snapshot,
          quantity, unit_price_paise, discount_amount_paise, taxable_amount_paise,
          tax_rate_percent, cgst_amount_paise, sgst_amount_paise, igst_amount_paise,
          total_amount_paise, restock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of preparedList) {
        insertItemStmt.run(
          returnId,
          it.invoiceItemId,
          it.productId,
          it.variantId,
          it.productNameSnapshot,
          it.variantNameSnapshot,
          it.skuSnapshot,
          it.quantity,
          it.unitPricePaise,
          it.discountPaise,
          it.taxablePaise,
          it.taxRatePercent,
          it.cgstPaise,
          it.sgstPaise,
          it.igstPaise,
          it.totalPaise,
          it.restock ? 1 : 0
        );

        // Update returned_quantity on sales_invoice_items
        this.db
          .prepare('UPDATE sales_invoice_items SET returned_quantity = returned_quantity + ? WHERE id = ?')
          .run(it.quantity, it.invoiceItemId);

        // Physical restocking if accepted
        if (it.restock) {
          if (it.variantId) {
            this.db
              .prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?')
              .run(it.quantity, it.variantId);
            const varRow = this.db
              .prepare('SELECT stock_quantity FROM product_variants WHERE id = ?')
              .get(it.variantId) as { stock_quantity: number };

            this.db.prepare(`
              INSERT INTO stock_movements (
                product_id, variant_id, movement_type, quantity_change, balance_quantity_after,
                reference_table, reference_id, notes
              ) VALUES (?, ?, 'SALE_RETURN', ?, ?, 'sales_returns', ?, ?)
            `).run(
              it.productId,
              it.variantId,
              it.quantity,
              varRow.stock_quantity,
              returnId,
              `Restocked variant via Sales Return ${returnNumber}`
            );
          } else {
            this.db
              .prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
              .run(it.quantity, it.productId);
            const prodRow = this.db
              .prepare('SELECT stock_quantity FROM products WHERE id = ?')
              .get(it.productId) as { stock_quantity: number };

            this.db.prepare(`
              INSERT INTO stock_movements (
                product_id, movement_type, quantity_change, balance_quantity_after,
                reference_table, reference_id, notes
              ) VALUES (?, 'SALE_RETURN', ?, ?, 'sales_returns', ?, ?)
            `).run(
              it.productId,
              it.quantity,
              prodRow.stock_quantity,
              returnId,
              `Restocked product via Sales Return ${returnNumber}`
            );
          }
        }
      }

      // 4. Financial & Customer balance adjustments
      if (invoice.customer_id) {
        if (input.refund_mode === 'STORE_CREDIT') {
          // Adjust customer balance
          this.db
            .prepare('UPDATE customers SET balance_paise = balance_paise - ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(grandTotalPaise, invoice.customer_id);
        }

        // Record refund payment entry for auditable cash/bank outflow or store credit
        const paymentMode = input.refund_mode === 'STORE_CREDIT' ? 'CASH' : input.refund_mode;
        const refNum = input.refund_reference || returnNumber;
        const paymentNumber = `PAY-REF-${returnNumber}`;

        this.db.prepare(`
          INSERT INTO payments (
            payment_number, payment_date, party_type, party_id, invoice_id,
            amount_paise, payment_mode, reference_number, notes, user_id, payment_type
          ) VALUES (?, ?, 'CUSTOMER', ?, ?, ?, ?, ?, ?, ?, 'REFUND')
        `).run(
          paymentNumber,
          input.return_date,
          invoice.customer_id,
          invoice.id,
          grandTotalPaise,
          paymentMode,
          refNum,
          `Refund for sales return ${returnNumber} (${input.refund_mode})`,
          userId || null
        );
      }

      // 5. Update invoice status if all items are fully returned
      const checkRow = this.db
        .prepare(`
          SELECT SUM(quantity - returned_quantity) AS remaining
          FROM sales_invoice_items
          WHERE invoice_id = ?
        `)
        .get(invoice.id) as { remaining: number | null };

      if (checkRow && (checkRow.remaining === null || checkRow.remaining <= 0)) {
        this.db.prepare("UPDATE sales_invoices SET status = 'RETURNED' WHERE id = ?").run(invoice.id);
      }

      // 6. Increment sequence number
      const currentSeq = parseInt(returnNumber.replace(/^[A-Z-]+/, ''), 10);
      this.db
        .prepare("UPDATE app_settings SET value = ? WHERE key = 'next_sales_return_number'")
        .run(String(currentSeq + 1));

      // 7. Audit log
      this.db.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('SALES_RETURN', 'sales_returns', ?, ?, ?, 'system')
      `).run(
        String(returnId),
        JSON.stringify({
          returnNumber,
          invoiceNumber: invoice.invoice_number,
          grandTotalPaise,
          refundMode: input.refund_mode,
          itemsCount: preparedList.length,
        }),
        userId || null
      );

      return returnId;
    });

    const newId = transaction();
    return this.getById(newId)!;
  }
}
