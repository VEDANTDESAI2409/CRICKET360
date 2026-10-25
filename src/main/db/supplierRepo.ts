import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierStatement,
  Purchase,
  PaymentRecord,
  PurchaseReturn,
  LedgerEntry,
} from '../../shared/types/models';

export class SupplierRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  /**
   * Retrieves all active/filtered suppliers ordered by name
   */
  getAll(search?: string): Supplier[] {
    let query = 'SELECT * FROM suppliers WHERE is_active = 1';
    const params: any[] = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query += ' AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR gstin LIKE ?)';
      params.push(q, q, q, q);
    }

    query += ' ORDER BY name ASC';
    return this.db.prepare(query).all(...params) as Supplier[];
  }

  /**
   * Gets a supplier by ID
   */
  getById(id: number): Supplier | null {
    const row = this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier | undefined;
    return row || null;
  }

  /**
   * Creates a new supplier
   */
  create(input: CreateSupplierInput): Supplier {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Supplier name must be at least 2 characters.');
    }

    const paymentTerms = input.payment_terms_days ?? 30;
    const stateCode = input.state_code || '27';

    const stmt = this.db.prepare(`
      INSERT INTO suppliers (
        name, company_name, phone, email, gstin, address, state_code,
        payment_terms_days, notes, balance_paise, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `);

    const res = stmt.run(
      input.name.trim(),
      input.company_name?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.gstin?.trim() || null,
      input.address?.trim() || null,
      stateCode,
      paymentTerms,
      input.notes?.trim() || null
    );

    return this.getById(Number(res.lastInsertRowid))!;
  }

  /**
   * Updates an existing supplier
   */
  update(input: UpdateSupplierInput): Supplier {
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error(`Supplier with ID ${input.id} not found.`);
    }

    if (input.name && input.name.trim().length < 2) {
      throw new Error('Supplier name must be at least 2 characters.');
    }

    const stmt = this.db.prepare(`
      UPDATE suppliers SET
        name = COALESCE(?, name),
        company_name = ?,
        phone = ?,
        email = ?,
        gstin = ?,
        address = ?,
        state_code = COALESCE(?, state_code),
        payment_terms_days = COALESCE(?, payment_terms_days),
        notes = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      input.name ? input.name.trim() : null,
      input.company_name !== undefined ? (input.company_name?.trim() || null) : existing.company_name,
      input.phone !== undefined ? (input.phone?.trim() || null) : existing.phone,
      input.email !== undefined ? (input.email?.trim() || null) : existing.email,
      input.gstin !== undefined ? (input.gstin?.trim() || null) : existing.gstin,
      input.address !== undefined ? (input.address?.trim() || null) : existing.address,
      input.state_code || null,
      input.payment_terms_days !== undefined ? input.payment_terms_days : null,
      input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
      input.is_active !== undefined ? input.is_active : null,
      input.id
    );

    return this.getById(input.id)!;
  }

  /**
   * Retrieves full supplier statement with purchases, payments, returns, and chronological ledger entries
   */
  getLedger(id: number): SupplierStatement {
    const supplier = this.getById(id);
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found.`);
    }

    // 1. Fetch purchases
    const purchases = this.db
      .prepare('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY purchase_date ASC, id ASC')
      .all(id) as Purchase[];

    // 2. Fetch payments
    const payments = this.db
      .prepare(
        "SELECT * FROM payments WHERE party_type = 'SUPPLIER' AND party_id = ? ORDER BY payment_date ASC, id ASC"
      )
      .all(id) as PaymentRecord[];

    // 3. Fetch purchase returns
    const returns = this.db
      .prepare('SELECT * FROM purchase_returns WHERE supplier_id = ? ORDER BY return_date ASC, id ASC')
      .all(id) as PurchaseReturn[];

    // 4. Combine into unified ledger sorted by date and sequence
    interface RawEvent {
      date: string;
      id: number;
      type: 'PURCHASE' | 'PAYMENT' | 'RETURN';
      ref: string;
      desc: string;
      debit: number;
      credit: number;
    }

    const events: RawEvent[] = [];

    for (const pur of purchases) {
      events.push({
        date: pur.purchase_date,
        id: pur.id,
        type: 'PURCHASE',
        ref: pur.purchase_number,
        desc: `Purchase Bill #${pur.supplier_invoice_number}`,
        debit: 0,
        credit: pur.total_amount_paise, // AP Increases (Credit)
      });
    }

    for (const pay of payments) {
      events.push({
        date: pay.payment_date,
        id: pay.id,
        type: 'PAYMENT',
        ref: pay.payment_number,
        desc: `Payment (${pay.payment_mode}${pay.reference_number ? ` - ${pay.reference_number}` : ''})`,
        debit: pay.amount_paise, // AP Decreases (Debit)
        credit: 0,
      });
    }

    for (const ret of returns) {
      events.push({
        date: ret.return_date,
        id: ret.id,
        type: 'RETURN',
        ref: ret.return_number,
        desc: `Purchase Return: ${ret.reason}`,
        debit: ret.grand_total_paise, // AP Decreases (Debit)
        credit: 0,
      });
    }

    // Sort chronologically
    events.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.id - b.id;
    });

    let runningBalance = 0;
    const entries: LedgerEntry[] = events.map((ev, idx) => {
      // In Accounts Payable: Balance = Credits (Purchases) - Debits (Payments & Returns)
      runningBalance += ev.credit - ev.debit;
      return {
        id: `LED-SUP-${ev.type}-${ev.id}-${idx}`,
        date: ev.date,
        type: ev.type,
        reference_number: ev.ref,
        description: ev.desc,
        debit_paise: ev.debit,
        credit_paise: ev.credit,
        running_balance_paise: runningBalance,
      };
    });

    const totalPurchasesPaise = purchases.reduce((sum, p) => sum + p.total_amount_paise, 0);
    const totalPaidPaise = payments.reduce((sum, p) => sum + p.amount_paise, 0);
    const totalReturnsPaise = returns.reduce((sum, r) => sum + r.grand_total_paise, 0);

    return {
      supplier,
      totalPurchasesPaise,
      totalPaidPaise,
      totalReturnsPaise,
      outstandingBalancePaise: supplier.balance_paise,
      purchases,
      payments,
      returns,
      entries,
    };
  }
}
