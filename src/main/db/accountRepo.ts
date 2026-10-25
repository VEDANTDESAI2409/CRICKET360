import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerStatement,
  SalesInvoice,
  PaymentRecord,
  LedgerEntry,
  RecordCustomerPaymentInput,
  RecordSupplierPaymentInput,
  PaymentMode,
  PaymentType,
  Supplier,
  Purchase,
} from '../../shared/types/models';

function normalizeOptionalString(val: string | null | undefined): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class AccountRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  // ==========================================
  // CUSTOMER OPERATIONS
  // ==========================================

  searchCustomers(query?: string): Customer[] {
    let sql = 'SELECT * FROM customers WHERE is_active = 1';
    const params: any[] = [];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      sql += ' AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ?)';
      params.push(q, q, q);
    }

    sql += ' ORDER BY id = 1 DESC, name ASC LIMIT 50';
    return this.db.prepare(sql).all(...params) as Customer[];
  }

  getCustomerById(id: number): Customer | null {
    const row = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
    return row || null;
  }

  createCustomer(input: CreateCustomerInput): Customer {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Customer name must be at least 2 characters.');
    }

    const stmt = this.db.prepare(`
      INSERT INTO customers (
        name, phone, email, gstin, address, state_code, credit_limit_paise, notes, balance_paise, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `);

    const res = stmt.run(
      input.name.trim(),
      normalizeOptionalString(input.phone),
      normalizeOptionalString(input.email),
      normalizeOptionalString(input.gstin),
      normalizeOptionalString(input.address),
      normalizeOptionalString(input.state_code) || '27',
      input.credit_limit_paise || 0,
      normalizeOptionalString(input.notes)
    );

    return this.getCustomerById(Number(res.lastInsertRowid))!;
  }

  updateCustomer(input: UpdateCustomerInput): Customer {
    const existing = this.getCustomerById(input.id);
    if (!existing) {
      throw new Error(`Customer with ID ${input.id} not found.`);
    }

    if (input.name && input.name.trim().length < 2) {
      throw new Error('Customer name must be at least 2 characters.');
    }

    const stmt = this.db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = ?,
        email = ?,
        gstin = ?,
        address = ?,
        state_code = COALESCE(?, state_code),
        credit_limit_paise = COALESCE(?, credit_limit_paise),
        notes = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      input.name ? input.name.trim() : null,
      input.phone !== undefined ? normalizeOptionalString(input.phone) : existing.phone,
      input.email !== undefined ? normalizeOptionalString(input.email) : existing.email,
      input.gstin !== undefined ? normalizeOptionalString(input.gstin) : existing.gstin,
      input.address !== undefined ? normalizeOptionalString(input.address) : existing.address,
      input.state_code || null,
      input.credit_limit_paise !== undefined ? input.credit_limit_paise : null,
      input.notes !== undefined ? normalizeOptionalString(input.notes) : existing.notes,
      input.is_active !== undefined ? input.is_active : null,
      input.id
    );

    return this.getCustomerById(input.id)!;
  }

  getCustomerLedger(id: number): CustomerStatement {
    const customer = this.getCustomerById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    // 1. Fetch sales invoices
    const invoices = this.db
      .prepare('SELECT * FROM sales_invoices WHERE customer_id = ? ORDER BY invoice_date ASC, id ASC')
      .all(id) as SalesInvoice[];

    // 2. Fetch payments received from customer
    const payments = this.db
      .prepare(
        "SELECT * FROM payments WHERE party_type = 'CUSTOMER' AND party_id = ? ORDER BY payment_date ASC, id ASC"
      )
      .all(id) as PaymentRecord[];

    // 3. Assemble unified ledger
    interface RawEvent {
      date: string;
      id: number;
      type: 'INVOICE' | 'PAYMENT';
      ref: string;
      desc: string;
      debit: number;
      credit: number;
    }

    const events: RawEvent[] = [];

    for (const inv of invoices) {
      events.push({
        date: inv.invoice_date,
        id: inv.id,
        type: 'INVOICE',
        ref: inv.invoice_number,
        desc: `Sales Invoice #${inv.invoice_number}`,
        debit: inv.grand_total_paise, // AR Increases (Debit)
        credit: 0,
      });
    }

    for (const pay of payments) {
      events.push({
        date: pay.payment_date,
        id: pay.id,
        type: 'PAYMENT',
        ref: pay.payment_number,
        desc: `Payment (${pay.payment_mode}${pay.reference_number ? ` - ${pay.reference_number}` : ''})`,
        debit: 0,
        credit: pay.amount_paise, // AR Decreases (Credit)
      });
    }

    events.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.id - b.id;
    });

    let runningBalance = 0;
    const entries: LedgerEntry[] = events.map((ev, idx) => {
      // In Accounts Receivable: Balance = Debits (Sales) - Credits (Receipts)
      runningBalance += ev.debit - ev.credit;
      return {
        id: `LED-CUST-${ev.type}-${ev.id}-${idx}`,
        date: ev.date,
        type: ev.type,
        reference_number: ev.ref,
        description: ev.desc,
        debit_paise: ev.debit,
        credit_paise: ev.credit,
        running_balance_paise: runningBalance,
      };
    });

    const totalSalesPaise = invoices.reduce((sum, inv) => sum + inv.grand_total_paise, 0);
    const totalPaidPaise = payments.reduce((sum, pay) => sum + pay.amount_paise, 0);

    return {
      customer,
      totalSalesPaise,
      totalPaidPaise,
      outstandingBalancePaise: customer.balance_paise,
      invoices,
      payments,
      entries,
    };
  }

  // ==========================================
  // PAYMENT RECORDING WITH INVOICE ALLOCATION
  // ==========================================

  recordCustomerPayment(input: RecordCustomerPaymentInput, userId?: number): PaymentRecord {
    if (input.amount_paise <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const customer = this.getCustomerById(input.customer_id);
    if (!customer) {
      throw new Error(`Customer with ID ${input.customer_id} not found.`);
    }

    const transaction = this.db.transaction(() => {
      let allocatedInvoice: SalesInvoice | undefined;

      if (input.invoice_id) {
        allocatedInvoice = this.db
          .prepare('SELECT * FROM sales_invoices WHERE id = ?')
          .get(input.invoice_id) as SalesInvoice | undefined;

        if (!allocatedInvoice) {
          throw new Error(`Sales invoice with ID ${input.invoice_id} not found.`);
        }
        if (allocatedInvoice.customer_id !== customer.id) {
          throw new Error(
            `Invoice ${allocatedInvoice.invoice_number} does not belong to customer ${customer.name}.`
          );
        }
        if (allocatedInvoice.balance_amount_paise <= 0) {
          throw new Error(`Invoice ${allocatedInvoice.invoice_number} is already fully paid.`);
        }
        if (input.amount_paise > allocatedInvoice.balance_amount_paise) {
          throw new Error(
            `Payment amount (₹${(input.amount_paise / 100).toFixed(2)}) exceeds invoice outstanding balance (₹${(allocatedInvoice.balance_amount_paise / 100).toFixed(2)}).`
          );
        }

        const newPaidAmount = allocatedInvoice.paid_amount_paise + input.amount_paise;
        const newBalanceAmount = allocatedInvoice.balance_amount_paise - input.amount_paise;
        const newPaymentStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

        this.db
          .prepare(
            `UPDATE sales_invoices 
             SET paid_amount_paise = ?, balance_amount_paise = ?, payment_status = ? 
             WHERE id = ?`
          )
          .run(newPaidAmount, newBalanceAmount, newPaymentStatus, allocatedInvoice.id);
      }

      // Decrement customer receivable balance
      this.db
        .prepare('UPDATE customers SET balance_paise = MAX(0, balance_paise - ?) WHERE id = ?')
        .run(input.amount_paise, customer.id);

      // Generate payment number
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
      const paymentNumber = `PAY-${dateStr}-CUST-${randHex}`;

      const res = this.db
        .prepare(
          `INSERT INTO payments (
            payment_number, payment_date, party_type, party_id, invoice_id,
            payment_type, amount_paise, payment_mode, reference_number, notes, user_id
          ) VALUES (?, ?, 'CUSTOMER', ?, ?, 'CUSTOMER_RECEIPT', ?, ?, ?, ?, ?)`
        )
        .run(
          paymentNumber,
          input.payment_date,
          customer.id,
          input.invoice_id || null,
          input.amount_paise,
          input.payment_mode,
          input.reference_number?.trim() || null,
          input.notes?.trim() || null,
          userId || null
        );

      const paymentId = Number(res.lastInsertRowid);
      return this.getPaymentById(paymentId)!;
    });

    return transaction();
  }

  recordSupplierPayment(input: RecordSupplierPaymentInput, userId?: number): PaymentRecord {
    if (input.amount_paise <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const supplier = this.db
      .prepare('SELECT * FROM suppliers WHERE id = ?')
      .get(input.supplier_id) as Supplier | undefined;

    if (!supplier) {
      throw new Error(`Supplier with ID ${input.supplier_id} not found.`);
    }

    const transaction = this.db.transaction(() => {
      let allocatedPurchase: Purchase | undefined;

      if (input.purchase_id) {
        allocatedPurchase = this.db
          .prepare('SELECT * FROM purchases WHERE id = ?')
          .get(input.purchase_id) as Purchase | undefined;

        if (!allocatedPurchase) {
          throw new Error(`Purchase invoice with ID ${input.purchase_id} not found.`);
        }
        if (allocatedPurchase.supplier_id !== supplier.id) {
          throw new Error(
            `Purchase ${allocatedPurchase.purchase_number} does not belong to supplier ${supplier.name}.`
          );
        }
        if (allocatedPurchase.balance_amount_paise <= 0) {
          throw new Error(`Purchase bill ${allocatedPurchase.purchase_number} is already fully paid.`);
        }
        if (input.amount_paise > allocatedPurchase.balance_amount_paise) {
          throw new Error(
            `Payment amount (₹${(input.amount_paise / 100).toFixed(2)}) exceeds purchase outstanding balance (₹${(allocatedPurchase.balance_amount_paise / 100).toFixed(2)}).`
          );
        }

        const newPaidAmount = allocatedPurchase.paid_amount_paise + input.amount_paise;
        const newBalanceAmount = allocatedPurchase.balance_amount_paise - input.amount_paise;
        const newPaymentStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

        this.db
          .prepare(
            `UPDATE purchases 
             SET paid_amount_paise = ?, balance_amount_paise = ?, payment_status = ? 
             WHERE id = ?`
          )
          .run(newPaidAmount, newBalanceAmount, newPaymentStatus, allocatedPurchase.id);
      }

      // Decrement supplier payable balance
      this.db
        .prepare('UPDATE suppliers SET balance_paise = MAX(0, balance_paise - ?) WHERE id = ?')
        .run(input.amount_paise, supplier.id);

      // Generate payment number
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
      const paymentNumber = `PAY-${dateStr}-SUP-${randHex}`;

      const res = this.db
        .prepare(
          `INSERT INTO payments (
            payment_number, payment_date, party_type, party_id, purchase_id,
            payment_type, amount_paise, payment_mode, reference_number, notes, user_id
          ) VALUES (?, ?, 'SUPPLIER', ?, ?, 'SUPPLIER_PAYOUT', ?, ?, ?, ?, ?)`
        )
        .run(
          paymentNumber,
          input.payment_date,
          supplier.id,
          input.purchase_id || null,
          input.amount_paise,
          input.payment_mode,
          input.reference_number?.trim() || null,
          input.notes?.trim() || null,
          userId || null
        );

      const paymentId = Number(res.lastInsertRowid);
      return this.getPaymentById(paymentId)!;
    });

    return transaction();
  }

  // ==========================================
  // UNIFIED PAYMENTS LEDGER
  // ==========================================

  getPaymentById(id: number): PaymentRecord | null {
    const row = this.db
      .prepare(
        `SELECT p.*,
                CASE 
                  WHEN p.party_type = 'CUSTOMER' THEN c.name 
                  ELSE s.name 
                END as party_name,
                inv.invoice_number,
                pur.purchase_number
         FROM payments p
         LEFT JOIN customers c ON p.party_type = 'CUSTOMER' AND p.party_id = c.id
         LEFT JOIN suppliers s ON p.party_type = 'SUPPLIER' AND p.party_id = s.id
         LEFT JOIN sales_invoices inv ON p.invoice_id = inv.id
         LEFT JOIN purchases pur ON p.purchase_id = pur.id
         WHERE p.id = ?`
      )
      .get(id) as PaymentRecord | undefined;

    return row || null;
  }

  getAllPayments(filters?: {
    party_type?: 'CUSTOMER' | 'SUPPLIER';
    party_id?: number;
    payment_mode?: PaymentMode;
    payment_type?: PaymentType;
    limit?: number;
    offset?: number;
  }): PaymentRecord[] {
    let sql = `
      SELECT p.*,
             CASE 
               WHEN p.party_type = 'CUSTOMER' THEN c.name 
               ELSE s.name 
             END as party_name,
             inv.invoice_number,
             pur.purchase_number
      FROM payments p
      LEFT JOIN customers c ON p.party_type = 'CUSTOMER' AND p.party_id = c.id
      LEFT JOIN suppliers s ON p.party_type = 'SUPPLIER' AND p.party_id = s.id
      LEFT JOIN sales_invoices inv ON p.invoice_id = inv.id
      LEFT JOIN purchases pur ON p.purchase_id = pur.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.party_type) {
      sql += ' AND p.party_type = ?';
      params.push(filters.party_type);
    }

    if (filters?.party_id) {
      sql += ' AND p.party_id = ?';
      params.push(filters.party_id);
    }

    if (filters?.payment_mode) {
      sql += ' AND p.payment_mode = ?';
      params.push(filters.payment_mode);
    }

    if (filters?.payment_type) {
      sql += ' AND p.payment_type = ?';
      params.push(filters.payment_type);
    }

    sql += ' ORDER BY p.id DESC';

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(sql).all(...params) as PaymentRecord[];
  }
}
