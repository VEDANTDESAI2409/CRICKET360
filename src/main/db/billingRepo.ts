import Database from 'better-sqlite3';
import {
  SalesInvoice,
  SalesInvoiceItem,
  PaymentRecord,
  CreateInvoiceInput,
  InvoiceFilterQuery,
  Customer,
  CreateCustomerInput,
} from '../../shared/types/models';
import { calculateInvoiceTotals } from '../../shared/utils/billingMath';

export class BillingRepo {
  constructor(private db: Database.Database) {}

  /**
   * Retrieves current shop configuration from app_settings
   */
  getShopSettings(): {
    shopName: string;
    shopGstin: string;
    shopAddress: string;
    shopPhone: string;
    shopEmail: string;
    shopStateCode: string;
  } {
    const settings = this.db.prepare('SELECT key, value FROM app_settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const map = new Map<string, string>();
    for (const s of settings) {
      map.set(s.key, s.value);
    }

    return {
      shopName: map.get('shop_name') || 'Cricket360 Sports & Pro Shop',
      shopGstin: map.get('shop_gstin') || '27AABBC1234D1Z5',
      shopAddress: map.get('shop_address') || '12, Sports Complex Road, Mumbai, Maharashtra',
      shopPhone: map.get('shop_phone') || '+91 98765 43210',
      shopEmail: map.get('shop_email') || 'contact@cricket360.local',
      shopStateCode: map.get('shop_state_code') || '27',
    };
  }

  /**
   * Generates a collision-free sequential invoice number based on prefix and counter settings.
   */
  getNextInvoiceNumber(): string {
    const prefixRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'invoice_prefix'")
      .get() as { value: string } | undefined;
    const nextNumRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'next_invoice_number'")
      .get() as { value: string } | undefined;

    const prefix = prefixRow?.value || 'CR360-';
    let counter = parseInt(nextNumRow?.value || '1001', 10);
    if (isNaN(counter) || counter <= 0) counter = 1001;

    // Check collision against sales_invoices table
    let candidate = `${prefix}${counter}`;
    while (
      this.db.prepare('SELECT 1 FROM sales_invoices WHERE invoice_number = ?').get(candidate)
    ) {
      counter += 1;
      candidate = `${prefix}${counter}`;
    }

    return candidate;
  }

  /**
   * Searches customers by name, phone, or GSTIN
   */
  getCustomers(query?: string): Customer[] {
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      return this.db
        .prepare(
          `SELECT * FROM customers 
           WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ?)
           ORDER BY (id = 1) DESC, name ASC 
           LIMIT 30`
        )
        .all(q, q, q) as Customer[];
    }

    return this.db
      .prepare(
        `SELECT * FROM customers 
         WHERE is_active = 1 
         ORDER BY (id = 1) DESC, name ASC 
         LIMIT 30`
      )
      .all() as Customer[];
  }

  /**
   * Quick adds a new customer from the POS counter
   */
  createCustomer(input: CreateCustomerInput): Customer {
    const stmt = this.db.prepare(`
      INSERT INTO customers (
        name, phone, gstin, address, state_code, credit_limit_paise, balance_paise, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 1)
    `);

    const res = stmt.run(
      input.name.trim(),
      input.phone?.trim() || null,
      input.gstin?.trim() || null,
      input.address?.trim() || null,
      input.state_code?.trim() || '27',
      input.credit_limit_paise || 0
    );

    return this.db.prepare('SELECT * FROM customers WHERE id = ?').get(res.lastInsertRowid) as Customer;
  }

  /**
   * Atomically creates a sales invoice, records items, deducts inventory,
   * inserts immutable stock ledger movements, and logs payment tenders.
   */
  createInvoice(input: CreateInvoiceInput, userId?: number): SalesInvoice {
    if (!input.items || input.items.length === 0) {
      throw new Error('Invoice must contain at least one product item.');
    }

    for (const it of input.items) {
      if (it.quantity <= 0) {
        throw new Error(`Invalid item quantity: ${it.quantity}. Must be greater than 0.`);
      }
      if (it.unit_price_paise < 0) {
        throw new Error(`Invalid unit price: ${it.unit_price_paise}. Cannot be negative.`);
      }
    }

    const shopSettings = this.getShopSettings();
    const shopStateCode = shopSettings.shopStateCode;

    // Execute atomic transaction
    const transaction = this.db.transaction(() => {
      // 1. Resolve Customer
      let customer: Customer | undefined;
      const customerId = input.customer_id || 1; // default to Walk-in
      customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as
        | Customer
        | undefined;

      if (!customer && customerId === 1) {
        // Fallback Walk-in if missing
        customer = {
          id: 1,
          name: 'Walk-in Customer',
          phone: '0000000000',
          state_code: shopStateCode,
          balance_paise: 0,
          is_active: 1,
        };
      } else if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found.`);
      }

      const customerStateCode = input.customer_state_code || customer.state_code || shopStateCode;
      const isInterState = customerStateCode !== shopStateCode;
      const placeOfSupply = customerStateCode;

      // 2. Lock & Verify Stock for all items
      interface ItemEnriched {
        input: (typeof input.items)[0];
        productId: number;
        variantId: number | null;
        name: string;
        variantName: string | null;
        sku: string;
        barcode: string | null;
        hsnCode: string;
        unitSymbol: string;
        taxRatePercent: number;
        currentStock: number;
        newStock: number;
      }

      const enrichedItems: ItemEnriched[] = [];

      for (const item of input.items) {
        if (item.variant_id) {
          const variant = this.db
            .prepare(
              `SELECT v.*, p.name as parent_product_name, p.unit_id, p.hsn_code, u.symbol as unit_symbol
               FROM product_variants v
               JOIN products p ON v.product_id = p.id
               LEFT JOIN units u ON p.unit_id = u.id
               WHERE v.id = ?`
            )
            .get(item.variant_id) as any;

          if (!variant) {
            throw new Error(`Product variant with ID ${item.variant_id} does not exist.`);
          }
          if (variant.stock_quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${variant.parent_product_name} (${variant.variant_name}). Available: ${variant.stock_quantity}, Requested: ${item.quantity}.`
            );
          }

          enrichedItems.push({
            input: item,
            productId: variant.product_id,
            variantId: variant.id,
            name: variant.parent_product_name,
            variantName: variant.variant_name,
            sku: variant.sku,
            barcode: variant.barcode || null,
            hsnCode: variant.hsn_code || '9506',
            unitSymbol: variant.unit_symbol || 'Pcs',
            taxRatePercent: variant.tax_rate_percent ?? 12.0,
            currentStock: variant.stock_quantity,
            newStock: variant.stock_quantity - item.quantity,
          });
        } else {
          const product = this.db
            .prepare(
              `SELECT p.*, u.symbol as unit_symbol
               FROM products p
               LEFT JOIN units u ON p.unit_id = u.id
               WHERE p.id = ?`
            )
            .get(item.product_id) as any;

          if (!product) {
            throw new Error(`Product with ID ${item.product_id} does not exist.`);
          }
          if (product.stock_quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}.`
            );
          }

          enrichedItems.push({
            input: item,
            productId: product.id,
            variantId: null,
            name: product.name,
            variantName: null,
            sku: product.sku,
            barcode: product.barcode || null,
            hsnCode: product.hsn_code || '9506',
            unitSymbol: product.unit_symbol || 'Pcs',
            taxRatePercent: product.tax_rate_percent ?? 12.0,
            currentStock: product.stock_quantity,
            newStock: product.stock_quantity - item.quantity,
          });
        }
      }

      // 3. Compute Line Taxes & Invoice Totals
      const calculation = calculateInvoiceTotals({
        items: enrichedItems.map((e) => ({
          unitPricePaise: e.input.unit_price_paise,
          quantity: e.input.quantity,
          discountAmountPaise: e.input.discount_amount_paise || 0,
          taxRatePercent: e.taxRatePercent,
        })),
        invoiceDiscountPaise: input.discount_amount_paise || 0,
        isInterState,
      });

      // 4. Validate Payments & Tender
      const totalPaidPaise = (input.payments || []).reduce((sum, p) => sum + p.amount_paise, 0);

      if (totalPaidPaise < 0) {
        throw new Error('Total payment amount cannot be negative.');
      }

      // If Walk-in customer, payment must cover the grand total
      if (customerId === 1 && totalPaidPaise < calculation.grandTotalPaise) {
        throw new Error(
          `Walk-in customer sale must be fully paid. Total: ₹${(
            calculation.grandTotalPaise / 100
          ).toFixed(2)}, Paid: ₹${(totalPaidPaise / 100).toFixed(2)}.`
        );
      }

      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'PAID';
      let balanceAmountPaise = 0;

      if (totalPaidPaise >= calculation.grandTotalPaise) {
        paymentStatus = 'PAID';
        balanceAmountPaise = 0;
      } else if (totalPaidPaise === 0) {
        paymentStatus = 'UNPAID';
        balanceAmountPaise = calculation.grandTotalPaise;
      } else {
        paymentStatus = 'PARTIALLY_PAID';
        balanceAmountPaise = calculation.grandTotalPaise - totalPaidPaise;
      }

      // 5. Generate Invoice Number & Update App Settings Counter
      const invoiceNumber = this.getNextInvoiceNumber();
      const currentCounterMatch = invoiceNumber.match(/\d+$/);
      if (currentCounterMatch) {
        const nextNum = parseInt(currentCounterMatch[0], 10) + 1;
        this.db
          .prepare(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('next_invoice_number', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
          )
          .run(String(nextNum));
      }

      const today = new Date().toISOString().split('T')[0];

      // 6. Insert Sales Invoice
      const insertInvoiceStmt = this.db.prepare(`
        INSERT INTO sales_invoices (
          invoice_number, invoice_date, customer_id, customer_name_snapshot,
          customer_phone_snapshot, customer_gstin_snapshot, customer_address_snapshot,
          place_of_supply, is_inter_state, taxable_amount_paise, cgst_amount_paise,
          sgst_amount_paise, igst_amount_paise, total_tax_paise, discount_amount_paise,
          round_off_paise, grand_total_paise, paid_amount_paise, balance_amount_paise,
          payment_status, status, notes, user_id
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'COMPLETED', ?, ?
        )
      `);

      const invoiceRes = insertInvoiceStmt.run(
        invoiceNumber,
        today,
        customer.id,
        input.customer_name || customer.name,
        input.customer_phone || customer.phone || null,
        input.customer_gstin || customer.gstin || null,
        input.customer_address || customer.address || null,
        placeOfSupply,
        isInterState ? 1 : 0,
        calculation.taxableAmountPaise,
        calculation.cgstAmountPaise,
        calculation.sgstAmountPaise,
        calculation.igstAmountPaise,
        calculation.totalTaxPaise,
        calculation.totalDiscountAmountPaise,
        calculation.roundOffPaise,
        calculation.grandTotalPaise,
        Math.min(totalPaidPaise, calculation.grandTotalPaise),
        balanceAmountPaise,
        paymentStatus,
        input.notes || null,
        userId || null
      );

      const invoiceId = invoiceRes.lastInsertRowid as number;

      // 7. Insert Line Items & Deduct Stock
      const insertItemStmt = this.db.prepare(`
        INSERT INTO sales_invoice_items (
          invoice_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot,
          sku_snapshot, barcode_snapshot, hsn_code_snapshot, unit_snapshot, quantity,
          unit_price_paise, mrp_paise, discount_amount_paise, taxable_amount_paise,
          tax_rate_percent, cgst_amount_paise, sgst_amount_paise, igst_amount_paise,
          total_amount_paise
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMovementStmt = this.db.prepare(`
        INSERT INTO stock_movements (
          product_id, variant_id, movement_type, quantity_change, balance_quantity_after,
          reference_table, reference_id, notes
        ) VALUES (?, ?, 'SALE_INVOICE', ?, ?, 'sales_invoices', ?, ?)
      `);

      for (let i = 0; i < enrichedItems.length; i++) {
        const itemInfo = enrichedItems[i];
        const calcItem = calculation.items[i];

        insertItemStmt.run(
          invoiceId,
          itemInfo.productId,
          itemInfo.variantId,
          itemInfo.name,
          itemInfo.variantName,
          itemInfo.sku,
          itemInfo.barcode,
          itemInfo.hsnCode,
          itemInfo.unitSymbol,
          itemInfo.input.quantity,
          calcItem.unitPricePaise,
          calcItem.unitPricePaise, // standard MRP fallback
          calcItem.discountAmountPaise,
          calcItem.taxableAmountPaise,
          calcItem.taxRatePercent,
          calcItem.cgstAmountPaise,
          calcItem.sgstAmountPaise,
          calcItem.igstAmountPaise,
          calcItem.totalAmountPaise
        );

        if (itemInfo.variantId) {
          // Decrement variant stock
          this.db
            .prepare('UPDATE product_variants SET stock_quantity = ? WHERE id = ?')
            .run(itemInfo.newStock, itemInfo.variantId);

          // Recalculate parent product cumulative stock
          const sumRow = this.db
            .prepare(
              'SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_variants WHERE product_id = ?'
            )
            .get(itemInfo.productId) as { total: number };

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(sumRow.total, itemInfo.productId);

          // Log movement with variant new stock
          insertMovementStmt.run(
            itemInfo.productId,
            itemInfo.variantId,
            -itemInfo.input.quantity,
            itemInfo.newStock,
            invoiceId,
            `Sale invoice: ${invoiceNumber} (${itemInfo.variantName || 'Standard'})`
          );
        } else {
          // Standard product stock decrement
          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(itemInfo.newStock, itemInfo.productId);

          insertMovementStmt.run(
            itemInfo.productId,
            null,
            -itemInfo.input.quantity,
            itemInfo.newStock,
            invoiceId,
            `Sale invoice: ${invoiceNumber}`
          );
        }
      }

      // 8. Record Payment Tenders
      const insertPaymentStmt = this.db.prepare(`
        INSERT INTO payments (
          payment_number, payment_date, party_type, party_id, invoice_id,
          amount_paise, payment_mode, reference_number, notes, user_id
        ) VALUES (?, ?, 'CUSTOMER', ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      let payIndex = 1;

      for (const tender of input.payments || []) {
        if (tender.amount_paise > 0) {
          const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
          const paymentNumber = `PAY-${dateStr}-${payIndex++}-${randHex}`;

          insertPaymentStmt.run(
            paymentNumber,
            today,
            customer.id,
            invoiceId,
            tender.amount_paise,
            tender.mode,
            tender.reference_number || null,
            `Payment for invoice ${invoiceNumber}`,
            userId || null
          );
        }
      }

      // 9. Update Customer Balance if balance remains
      if (balanceAmountPaise > 0 && customer.id !== 1) {
        this.db
          .prepare('UPDATE customers SET balance_paise = balance_paise + ? WHERE id = ?')
          .run(balanceAmountPaise, customer.id);
      }

      return this.getInvoiceById(invoiceId)!;
    });

    return transaction();
  }

  /**
   * Retrieves a full invoice by ID including line items and payment records
   */
  getInvoiceById(id: number): SalesInvoice | null {
    const invoice = this.db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id) as
      | SalesInvoice
      | undefined;
    if (!invoice) return null;

    const items = this.db
      .prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ? ORDER BY id ASC')
      .all(id) as SalesInvoiceItem[];

    const payments = this.db
      .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id ASC')
      .all(id) as PaymentRecord[];

    return {
      ...invoice,
      items,
      payments,
    };
  }

  /**
   * Searches and filters sales invoices
   */
  getInvoices(filters?: InvoiceFilterQuery): SalesInvoice[] {
    let query = 'SELECT * FROM sales_invoices WHERE 1=1';
    const params: any[] = [];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      query += ' AND (invoice_number LIKE ? OR customer_name_snapshot LIKE ?)';
      params.push(q, q);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.start_date) {
      query += ' AND invoice_date >= ?';
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      query += ' AND invoice_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY id DESC';

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const invoices = this.db.prepare(query).all(...params) as SalesInvoice[];

    // Fetch line items for preview
    return invoices.map((inv) => {
      const items = this.db
        .prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?')
        .all(inv.id) as SalesInvoiceItem[];
      const payments = this.db
        .prepare('SELECT * FROM payments WHERE invoice_id = ?')
        .all(inv.id) as PaymentRecord[];
      return {
        ...inv,
        items,
        payments,
      };
    });
  }

  /**
   * Cancels/voids an invoice, reverses stock deduction with auditable movements,
   * and adjusts customer balance if needed.
   */
  cancelInvoice(invoiceId: number, reason: string): SalesInvoice {
    if (!reason || !reason.trim()) {
      throw new Error('A mandatory cancellation reason must be provided.');
    }

    const transaction = this.db.transaction(() => {
      const invoice = this.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice with ID ${invoiceId} not found.`);
      }
      if (invoice.status !== 'COMPLETED') {
        throw new Error(`Invoice ${invoice.invoice_number} is already ${invoice.status}.`);
      }

      // Update invoice status
      this.db
        .prepare(
          `UPDATE sales_invoices 
           SET status = 'CANCELLED', cancellation_reason = ?, cancelled_at = datetime('now') 
           WHERE id = ?`
        )
        .run(reason.trim(), invoiceId);

      // Restore stock for all items
      const insertMovementStmt = this.db.prepare(`
        INSERT INTO stock_movements (
          product_id, variant_id, movement_type, quantity_change, balance_quantity_after,
          reference_table, reference_id, notes
        ) VALUES (?, ?, 'SALE_RETURN', ?, ?, 'sales_invoices', ?, ?)
      `);

      for (const item of invoice.items || []) {
        if (item.variant_id) {
          // Increment variant stock
          const varRow = this.db
            .prepare('SELECT stock_quantity FROM product_variants WHERE id = ?')
            .get(item.variant_id) as { stock_quantity: number } | undefined;

          const currentStock = varRow?.stock_quantity ?? 0;
          const restoredStock = currentStock + item.quantity;

          this.db
            .prepare('UPDATE product_variants SET stock_quantity = ? WHERE id = ?')
            .run(restoredStock, item.variant_id);

          // Roll up parent stock
          const sumRow = this.db
            .prepare(
              'SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_variants WHERE product_id = ?'
            )
            .get(item.product_id) as { total: number };

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(sumRow.total, item.product_id);

          insertMovementStmt.run(
            item.product_id,
            item.variant_id,
            item.quantity,
            restoredStock,
            invoiceId,
            `Cancellation of ${invoice.invoice_number}: ${reason.trim()}`
          );
        } else {
          // Standard product stock restoration
          const prodRow = this.db
            .prepare('SELECT stock_quantity FROM products WHERE id = ?')
            .get(item.product_id) as { stock_quantity: number } | undefined;

          const currentStock = prodRow?.stock_quantity ?? 0;
          const restoredStock = currentStock + item.quantity;

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(restoredStock, item.product_id);

          insertMovementStmt.run(
            item.product_id,
            null,
            item.quantity,
            restoredStock,
            invoiceId,
            `Cancellation of ${invoice.invoice_number}: ${reason.trim()}`
          );
        }
      }

      // Reverse customer balance if credit balance was added
      if (invoice.balance_amount_paise > 0 && invoice.customer_id && invoice.customer_id !== 1) {
        this.db
          .prepare(
            'UPDATE customers SET balance_paise = MAX(0, balance_paise - ?) WHERE id = ?'
          )
          .run(invoice.balance_amount_paise, invoice.customer_id);
      }

      return this.getInvoiceById(invoiceId)!;
    });

    return transaction();
  }
}
