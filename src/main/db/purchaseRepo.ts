import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  Purchase,
  PurchaseItem,
  CreatePurchaseInput,
  PurchaseReturn,
  PurchaseReturnItem,
  CreatePurchaseReturnInput,
  PaymentRecord,
  Supplier,
} from '../../shared/types/models';
import { calculatePurchaseTotals } from '../../shared/utils/billingMath';

export class PurchaseRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  /**
   * Generates next purchase number atomically
   */
  getNextPurchaseNumber(): string {
    const prefixRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'purchase_prefix'")
      .get() as { value: string } | undefined;
    const nextNumRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'next_purchase_number'")
      .get() as { value: string } | undefined;

    const prefix = prefixRow ? prefixRow.value : 'PUR-';
    const num = nextNumRow ? parseInt(nextNumRow.value, 10) : 1001;
    return `${prefix}${num}`;
  }

  /**
   * Generates next purchase return number atomically
   */
  getNextReturnNumber(): string {
    const prefixRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'purchase_return_prefix'")
      .get() as { value: string } | undefined;
    const nextNumRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'next_purchase_return_number'")
      .get() as { value: string } | undefined;

    const prefix = prefixRow ? prefixRow.value : 'PR-';
    const num = nextNumRow ? parseInt(nextNumRow.value, 10) : 1001;
    return `${prefix}${num}`;
  }

  /**
   * Atomically records a purchase invoice, increments variant/product stock,
   * creates immutable stock-movement records, updates supplier balance, and records initial payment if tendered.
   */
  createPurchase(input: CreatePurchaseInput, userId?: number): Purchase {
    if (!input.items || input.items.length === 0) {
      throw new Error('Purchase must contain at least one product item.');
    }

    const supplierInvoiceNo = input.supplier_invoice_number.trim();
    if (!supplierInvoiceNo) {
      throw new Error('Supplier invoice number is required.');
    }

    // 1. Validate Supplier
    const supplier = this.db
      .prepare('SELECT * FROM suppliers WHERE id = ?')
      .get(input.supplier_id) as Supplier | undefined;

    if (!supplier) {
      throw new Error(`Supplier with ID ${input.supplier_id} not found.`);
    }
    if (supplier.is_active === 0) {
      throw new Error(`Supplier "${supplier.name}" is deactivated.`);
    }

    // 2. Validate Duplicate Supplier Invoice for this supplier
    const duplicate = this.db
      .prepare('SELECT id, purchase_number FROM purchases WHERE supplier_id = ? AND supplier_invoice_number = ?')
      .get(input.supplier_id, supplierInvoiceNo) as { id: number; purchase_number: string } | undefined;

    if (duplicate) {
      throw new Error(
        `Supplier invoice number "${supplierInvoiceNo}" has already been entered for ${supplier.name} (${duplicate.purchase_number}).`
      );
    }

    // 3. Resolve Shop State & Inter-State
    const shopStateSetting = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'shop_state_code'")
      .get() as { value: string } | undefined;
    const shopStateCode = shopStateSetting?.value || '27';
    const supplierStateCode = input.place_of_supply || supplier.state_code || '27';
    const isInterState =
      input.is_inter_state !== undefined
        ? input.is_inter_state
        : supplierStateCode !== shopStateCode;

    // 4. Validate & calculate items
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid item quantity: ${item.quantity}. Must be greater than 0.`);
      }
      if (item.unit_cost_paise < 0) {
        throw new Error(`Invalid unit cost: ${item.unit_cost_paise}. Cannot be negative.`);
      }
    }

    const totals = calculatePurchaseTotals({
      items: input.items.map((it) => ({
        unitCostPaise: it.unit_cost_paise,
        quantity: it.quantity,
        discountAmountPaise: it.discount_amount_paise || 0,
        taxRatePercent: it.tax_rate_percent,
      })),
      discountAmountPaise: input.discount_amount_paise || 0,
      isInterState,
    });

    const initialPaidPaise = Math.max(0, input.initial_payment?.amount_paise || 0);
    if (initialPaidPaise > totals.totalAmountPaise) {
      throw new Error(
        `Initial payment (₹${(initialPaidPaise / 100).toFixed(2)}) cannot exceed total purchase amount (₹${(totals.totalAmountPaise / 100).toFixed(2)}).`
      );
    }

    const balanceAmountPaise = totals.totalAmountPaise - initialPaidPaise;
    const paymentStatus =
      balanceAmountPaise === 0
        ? 'PAID'
        : initialPaidPaise > 0
        ? 'PARTIALLY_PAID'
        : 'UNPAID';

    // 5. Execute atomic transaction
    const transaction = this.db.transaction(() => {
      const purchaseNumber = this.getNextPurchaseNumber();

      // Insert Purchase
      const insertPurchaseStmt = this.db.prepare(`
        INSERT INTO purchases (
          purchase_number, supplier_invoice_number, supplier_id,
          supplier_name_snapshot, supplier_gstin_snapshot, purchase_date,
          place_of_supply, is_inter_state, taxable_amount_paise,
          cgst_amount_paise, sgst_amount_paise, igst_amount_paise,
          total_tax_paise, subtotal_paise, discount_amount_paise,
          round_off_paise, grand_total_paise, total_amount_paise, paid_amount_paise,
          balance_amount_paise, payment_status, status, notes, user_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?
        )
      `);

      const purchaseRes = insertPurchaseStmt.run(
        purchaseNumber,
        supplierInvoiceNo,
        supplier.id,
        supplier.name,
        supplier.gstin || null,
        input.purchase_date,
        supplierStateCode,
        isInterState ? 1 : 0,
        totals.taxableAmountPaise,
        totals.cgstAmountPaise,
        totals.sgstAmountPaise,
        totals.igstAmountPaise,
        totals.totalTaxPaise,
        totals.taxableAmountPaise + totals.totalTaxPaise,
        totals.discountAmountPaise,
        totals.roundOffPaise,
        totals.totalAmountPaise,
        totals.totalAmountPaise,
        initialPaidPaise,
        balanceAmountPaise,
        paymentStatus,
        input.notes?.trim() || null,
        userId || null
      );

      const purchaseId = Number(purchaseRes.lastInsertRowid);

      // Increment sequence
      const currentNum = parseInt(purchaseNumber.replace(/^[A-Z-]+/, ''), 10);
      this.db
        .prepare("UPDATE app_settings SET value = ? WHERE key = 'next_purchase_number'")
        .run(String(currentNum + 1));

      // Insert Items & Update Inventory
      const insertItemStmt = this.db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, variant_id, product_name_snapshot,
          variant_name_snapshot, sku_snapshot, barcode_snapshot,
          hsn_code_snapshot, unit_snapshot, quantity, unit_cost_paise,
          discount_amount_paise, taxable_amount_paise, tax_rate_percent,
          cgst_amount_paise, sgst_amount_paise, igst_amount_paise,
          total_amount_paise, returned_quantity
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
        )
      `);

      const insertMovementStmt = this.db.prepare(`
        INSERT INTO stock_movements (
          product_id, variant_id, movement_type, quantity_change, balance_quantity_after,
          reference_table, reference_id, notes
        ) VALUES (?, ?, 'PURCHASE_RECEIPT', ?, ?, 'purchases', ?, ?)
      `);

      for (let i = 0; i < input.items.length; i++) {
        const itemInput = input.items[i];
        const calcItem = totals.items[i];

        // Fetch product info
        const product = this.db
          .prepare(
            `SELECT p.*, u.symbol as unit_symbol
             FROM products p
             LEFT JOIN units u ON p.unit_id = u.id
             WHERE p.id = ?`
          )
          .get(itemInput.product_id) as any;

        if (!product) {
          throw new Error(`Product with ID ${itemInput.product_id} not found.`);
        }

        let variantName: string | null = null;
        let skuSnapshot = product.sku;
        let barcodeSnapshot = product.barcode;

        if (itemInput.variant_id) {
          const variant = this.db
            .prepare('SELECT * FROM product_variants WHERE id = ? AND product_id = ?')
            .get(itemInput.variant_id, itemInput.product_id) as any;

          if (!variant) {
            throw new Error(`Variant with ID ${itemInput.variant_id} not found.`);
          }

          variantName = variant.variant_name;
          skuSnapshot = variant.sku;
          barcodeSnapshot = variant.barcode || product.barcode;

          // Increment variant stock & update purchase cost
          const newVarStock = variant.stock_quantity + itemInput.quantity;
          this.db
            .prepare(
              'UPDATE product_variants SET stock_quantity = ?, purchase_cost_paise = ? WHERE id = ?'
            )
            .run(newVarStock, itemInput.unit_cost_paise, itemInput.variant_id);

          // Roll up parent product stock
          const sumRow = this.db
            .prepare(
              'SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_variants WHERE product_id = ?'
            )
            .get(itemInput.product_id) as { total: number };

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(sumRow.total, itemInput.product_id);

          insertMovementStmt.run(
            itemInput.product_id,
            itemInput.variant_id,
            itemInput.quantity,
            newVarStock,
            purchaseId,
            `Purchase: ${purchaseNumber} (Bill #${supplierInvoiceNo})`
          );
        } else {
          // Standard product stock increment & cost update
          const newStock = product.stock_quantity + itemInput.quantity;
          this.db
            .prepare('UPDATE products SET stock_quantity = ?, purchase_cost_paise = ? WHERE id = ?')
            .run(newStock, itemInput.unit_cost_paise, itemInput.product_id);

          insertMovementStmt.run(
            itemInput.product_id,
            null,
            itemInput.quantity,
            newStock,
            purchaseId,
            `Purchase: ${purchaseNumber} (Bill #${supplierInvoiceNo})`
          );
        }

        insertItemStmt.run(
          purchaseId,
          itemInput.product_id,
          itemInput.variant_id || null,
          product.name,
          variantName,
          skuSnapshot,
          barcodeSnapshot,
          product.hsn_code || '9506',
          product.unit_symbol || 'Pcs',
          itemInput.quantity,
          itemInput.unit_cost_paise,
          calcItem.discountAmountPaise,
          calcItem.taxableAmountPaise,
          calcItem.taxRatePercent,
          calcItem.cgstAmountPaise,
          calcItem.sgstAmountPaise,
          calcItem.igstAmountPaise,
          calcItem.totalAmountPaise
        );
      }

      // Record Initial Payment Tender if provided
      if (initialPaidPaise > 0 && input.initial_payment) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
        const paymentNumber = `PAY-${dateStr}-SUP-${randHex}`;

        this.db
          .prepare(
            `INSERT INTO payments (
              payment_number, payment_date, party_type, party_id, purchase_id,
              payment_type, amount_paise, payment_mode, reference_number, notes, user_id
            ) VALUES (?, ?, 'SUPPLIER', ?, ?, 'PURCHASE_PAYMENT', ?, ?, ?, ?, ?)`
          )
          .run(
            paymentNumber,
            input.purchase_date,
            supplier.id,
            purchaseId,
            initialPaidPaise,
            input.initial_payment.payment_mode,
            input.initial_payment.reference_number || null,
            input.initial_payment.notes || `Initial payment for ${purchaseNumber}`,
            userId || null
          );
      }

      // Update Supplier Balance (Accounts Payable)
      if (balanceAmountPaise > 0) {
        this.db
          .prepare('UPDATE suppliers SET balance_paise = balance_paise + ? WHERE id = ?')
          .run(balanceAmountPaise, supplier.id);
      }

      return this.getById(purchaseId)!;
    });

    return transaction();
  }

  /**
   * Records a purchase return, reduces product/variant inventory, logs auditable stock movement,
   * updates purchase item returned quantity, and credits supplier balance.
   */
  createReturn(input: CreatePurchaseReturnInput, userId?: number): PurchaseReturn {
    if (!input.items || input.items.length === 0) {
      throw new Error('Must return at least one item.');
    }

    const purchase = this.getById(input.purchase_id);
    if (!purchase) {
      throw new Error(`Purchase with ID ${input.purchase_id} not found.`);
    }
    if (purchase.status === 'CANCELLED') {
      throw new Error(`Cannot return items from a cancelled purchase.`);
    }

    const transaction = this.db.transaction(() => {
      const returnNumber = this.getNextReturnNumber();

      let returnTaxablePaise = 0;
      let returnTotalTaxPaise = 0;
      let returnGrandTotalPaise = 0;

      interface PreparedReturnItem {
        purchaseItemId: number;
        productId: number;
        variantId: number | null;
        productName: string;
        quantity: number;
        unitCostPaise: number;
        taxRatePercent: number;
        taxableAmountPaise: number;
        totalAmountPaise: number;
      }

      const preparedItems: PreparedReturnItem[] = [];

      for (const retItem of input.items) {
        if (retItem.quantity <= 0) {
          throw new Error(`Return quantity must be greater than zero.`);
        }

        const pItem = (purchase.items || []).find((it) => it.id === retItem.purchase_item_id);
        if (!pItem) {
          throw new Error(
            `Purchase item #${retItem.purchase_item_id} does not belong to purchase ${purchase.purchase_number}.`
          );
        }

        const remainingReturnable = pItem.quantity - pItem.returned_quantity;
        if (retItem.quantity > remainingReturnable) {
          throw new Error(
            `Cannot return ${retItem.quantity} of "${pItem.product_name_snapshot}". Only ${remainingReturnable} remaining returnable.`
          );
        }

        // Check stock availability
        if (pItem.variant_id) {
          const varRow = this.db
            .prepare('SELECT stock_quantity FROM product_variants WHERE id = ?')
            .get(pItem.variant_id) as { stock_quantity: number } | undefined;
          const currentStock = varRow?.stock_quantity ?? 0;
          if (retItem.quantity > currentStock) {
            throw new Error(
              `Cannot return ${retItem.quantity} of "${pItem.product_name_snapshot}" (${pItem.variant_name_snapshot}). Current stock is only ${currentStock}.`
            );
          }
        } else {
          const prodRow = this.db
            .prepare('SELECT stock_quantity FROM products WHERE id = ?')
            .get(pItem.product_id) as { stock_quantity: number } | undefined;
          const currentStock = prodRow?.stock_quantity ?? 0;
          if (retItem.quantity > currentStock) {
            throw new Error(
              `Cannot return ${retItem.quantity} of "${pItem.product_name_snapshot}". Current stock is only ${currentStock}.`
            );
          }
        }

        const itemTaxable = retItem.quantity * pItem.unit_cost_paise;
        const itemTax = Math.round((itemTaxable * pItem.tax_rate_percent) / 100);
        const itemTotal = itemTaxable + itemTax;

        returnTaxablePaise += itemTaxable;
        returnTotalTaxPaise += itemTax;
        returnGrandTotalPaise += itemTotal;

        preparedItems.push({
          purchaseItemId: pItem.id,
          productId: pItem.product_id,
          variantId: pItem.variant_id || null,
          productName: pItem.product_name_snapshot,
          quantity: retItem.quantity,
          unitCostPaise: pItem.unit_cost_paise,
          taxRatePercent: pItem.tax_rate_percent,
          taxableAmountPaise: itemTaxable,
          totalAmountPaise: itemTotal,
        });
      }

      // Insert Purchase Return record
      const insertReturnStmt = this.db.prepare(`
        INSERT INTO purchase_returns (
          return_number, purchase_id, supplier_id, return_date,
          taxable_amount_paise, total_tax_paise, grand_total_paise,
          reason, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const returnRes = insertReturnStmt.run(
        returnNumber,
        purchase.id,
        purchase.supplier_id,
        input.return_date,
        returnTaxablePaise,
        returnTotalTaxPaise,
        returnGrandTotalPaise,
        input.reason.trim(),
        input.notes?.trim() || null,
        userId || null
      );

      const returnId = Number(returnRes.lastInsertRowid);

      // Increment sequence
      const currentNum = parseInt(returnNumber.replace(/^[A-Z-]+/, ''), 10);
      this.db
        .prepare("UPDATE app_settings SET value = ? WHERE key = 'next_purchase_return_number'")
        .run(String(currentNum + 1));

      // Insert Return Items and deduct inventory
      const insertReturnItemStmt = this.db.prepare(`
        INSERT INTO purchase_return_items (
          purchase_return_id, purchase_item_id, product_id, variant_id,
          quantity, unit_cost_paise, tax_rate_percent, taxable_amount_paise,
          total_amount_paise
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updatePItemStmt = this.db.prepare(`
        UPDATE purchase_items SET returned_quantity = returned_quantity + ? WHERE id = ?
      `);

      const insertMovementStmt = this.db.prepare(`
        INSERT INTO stock_movements (
          product_id, variant_id, movement_type, quantity_change, balance_quantity_after,
          reference_table, reference_id, notes
        ) VALUES (?, ?, 'PURCHASE_RETURN', ?, ?, 'purchase_returns', ?, ?)
      `);

      for (const it of preparedItems) {
        insertReturnItemStmt.run(
          returnId,
          it.purchaseItemId,
          it.productId,
          it.variantId,
          it.quantity,
          it.unitCostPaise,
          it.taxRatePercent,
          it.taxableAmountPaise,
          it.totalAmountPaise
        );

        updatePItemStmt.run(it.quantity, it.purchaseItemId);

        if (it.variantId) {
          const varRow = this.db
            .prepare('SELECT stock_quantity FROM product_variants WHERE id = ?')
            .get(it.variantId) as { stock_quantity: number };
          const newStock = varRow.stock_quantity - it.quantity;

          this.db
            .prepare('UPDATE product_variants SET stock_quantity = ? WHERE id = ?')
            .run(newStock, it.variantId);

          const sumRow = this.db
            .prepare(
              'SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_variants WHERE product_id = ?'
            )
            .get(it.productId) as { total: number };

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(sumRow.total, it.productId);

          insertMovementStmt.run(
            it.productId,
            it.variantId,
            -it.quantity,
            newStock,
            returnId,
            `Return: ${returnNumber} (${purchase.purchase_number})`
          );
        } else {
          const prodRow = this.db
            .prepare('SELECT stock_quantity FROM products WHERE id = ?')
            .get(it.productId) as { stock_quantity: number };
          const newStock = prodRow.stock_quantity - it.quantity;

          this.db
            .prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
            .run(newStock, it.productId);

          insertMovementStmt.run(
            it.productId,
            null,
            -it.quantity,
            newStock,
            returnId,
            `Return: ${returnNumber} (${purchase.purchase_number})`
          );
        }
      }

      // Credit Supplier Account (reduce accounts payable)
      this.db
        .prepare('UPDATE suppliers SET balance_paise = MAX(0, balance_paise - ?) WHERE id = ?')
        .run(returnGrandTotalPaise, purchase.supplier_id);

      // Adjust purchase balance if purchase had unpaid balance
      if (purchase.balance_amount_paise > 0) {
        const newPurchaseBalance = Math.max(0, purchase.balance_amount_paise - returnGrandTotalPaise);
        const newPaymentStatus = newPurchaseBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';
        this.db
          .prepare('UPDATE purchases SET balance_amount_paise = ?, payment_status = ? WHERE id = ?')
          .run(newPurchaseBalance, newPaymentStatus, purchase.id);
      }

      // Return statement
      const row = this.db
        .prepare('SELECT * FROM purchase_returns WHERE id = ?')
        .get(returnId) as PurchaseReturn;
      const retItems = this.db
        .prepare(
          `SELECT pri.*, p.name as product_name
           FROM purchase_return_items pri
           JOIN products p ON pri.product_id = p.id
           WHERE pri.purchase_return_id = ?`
        )
        .all(returnId) as PurchaseReturnItem[];

      return {
        ...row,
        items: retItems,
        purchase_number: purchase.purchase_number,
        supplier_name: purchase.supplier_name_snapshot || 'Supplier',
      };
    });

    return transaction();
  }

  /**
   * Retrieves purchase invoices with filters
   */
  getAll(filters?: {
    supplier_id?: number;
    search?: string;
    status?: string;
    payment_status?: string;
    limit?: number;
    offset?: number;
  }): Purchase[] {
    let query = `
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      query += ' AND (p.purchase_number LIKE ? OR p.supplier_invoice_number LIKE ? OR s.name LIKE ?)';
      params.push(q, q, q);
    }

    if (filters?.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters?.payment_status) {
      query += ' AND p.payment_status = ?';
      params.push(filters.payment_status);
    }

    query += ' ORDER BY p.id DESC';

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params) as Purchase[];

    return rows.map((pur) => {
      const items = this.db
        .prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC')
        .all(pur.id) as PurchaseItem[];
      const payments = this.db
        .prepare("SELECT * FROM payments WHERE party_type = 'SUPPLIER' AND purchase_id = ?")
        .all(pur.id) as PaymentRecord[];

      return {
        ...pur,
        items,
        payments,
      };
    });
  }

  /**
   * Retrieves a full purchase invoice by ID
   */
  getById(id: number): Purchase | null {
    const row = this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name
         FROM purchases p
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE p.id = ?`
      )
      .get(id) as Purchase | undefined;

    if (!row) return null;

    const items = this.db
      .prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC')
      .all(id) as PurchaseItem[];

    const payments = this.db
      .prepare("SELECT * FROM payments WHERE party_type = 'SUPPLIER' AND purchase_id = ? ORDER BY id ASC")
      .all(id) as PaymentRecord[];

    return {
      ...row,
      items,
      payments,
    };
  }
}
