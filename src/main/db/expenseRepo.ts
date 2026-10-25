import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterQuery,
} from '../../shared/types/models';

export class ExpenseRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  getCategories(): ExpenseCategory[] {
    return this.db
      .prepare('SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name ASC')
      .all() as ExpenseCategory[];
  }

  createCategory(input: CreateExpenseCategoryInput): ExpenseCategory {
    const cleanName = input.name.trim();
    const cleanCode = input.code.trim().toUpperCase();

    const existing = this.db
      .prepare('SELECT id FROM expense_categories WHERE code = ? OR name = ?')
      .get(cleanCode, cleanName);

    if (existing) {
      throw new Error(`Expense category with code "${cleanCode}" or name "${cleanName}" already exists.`);
    }

    const res = this.db
      .prepare('INSERT INTO expense_categories (name, code, description) VALUES (?, ?, ?)')
      .run(cleanName, cleanCode, input.description?.trim() || null);

    return this.db
      .prepare('SELECT * FROM expense_categories WHERE id = ?')
      .get(Number(res.lastInsertRowid)) as ExpenseCategory;
  }

  getNextExpenseNumber(): string {
    const prefixRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'expense_prefix'")
      .get() as { value: string } | undefined;
    const nextNumRow = this.db
      .prepare("SELECT value FROM app_settings WHERE key = 'next_expense_number'")
      .get() as { value: string } | undefined;

    const prefix = prefixRow ? prefixRow.value : 'EXP-';
    const nextNum = nextNumRow ? parseInt(nextNumRow.value, 10) : 1001;

    let candidate = `${prefix}${nextNum}`;
    let counter = nextNum;

    while (
      this.db
        .prepare('SELECT id FROM expenses WHERE expense_number = ?')
        .get(candidate)
    ) {
      counter += 1;
      candidate = `${prefix}${counter}`;
    }

    return candidate;
  }

  getAll(filters?: ExpenseFilterQuery): Expense[] {
    let sql = `
      SELECT
        e.*,
        ec.name AS category_name,
        ec.code AS category_code,
        s.name AS supplier_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      sql += ` AND (e.expense_number LIKE ? OR e.payee_name LIKE ? OR e.reference_number LIKE ? OR e.notes LIKE ? OR ec.name LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    if (filters?.category_id) {
      sql += ` AND e.category_id = ?`;
      params.push(filters.category_id);
    }

    if (filters?.payment_status) {
      sql += ` AND e.payment_status = ?`;
      params.push(filters.payment_status);
    }

    if (filters?.payment_mode) {
      sql += ` AND e.payment_mode = ?`;
      params.push(filters.payment_mode);
    }

    if (filters?.start_date) {
      sql += ` AND e.expense_date >= ?`;
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      sql += ` AND e.expense_date <= ?`;
      params.push(filters.end_date);
    }

    sql += ` ORDER BY e.expense_date DESC, e.id DESC`;

    return this.db.prepare(sql).all(...params) as Expense[];
  }

  getById(id: number): Expense | null {
    const row = this.db
      .prepare(`
        SELECT
          e.*,
          ec.name AS category_name,
          ec.code AS category_code,
          s.name AS supplier_name
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        WHERE e.id = ?
      `)
      .get(id) as Expense | undefined;

    return row || null;
  }

  create(input: CreateExpenseInput, userId?: number): Expense {
    if (input.amount_paise <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    const transaction = this.db.transaction(() => {
      const category = this.db
        .prepare('SELECT id, name FROM expense_categories WHERE id = ?')
        .get(input.category_id) as { id: number; name: string } | undefined;

      if (!category) {
        throw new Error(`Expense category #${input.category_id} not found.`);
      }

      const expenseNumber = this.getNextExpenseNumber();

      const insertStmt = this.db.prepare(`
        INSERT INTO expenses (
          expense_number, category_id, expense_date, amount_paise,
          payment_mode, payment_status, payee_name, supplier_id,
          reference_number, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = insertStmt.run(
        expenseNumber,
        category.id,
        input.expense_date,
        input.amount_paise,
        input.payment_mode,
        input.payment_status || 'PAID',
        input.payee_name?.trim() || null,
        input.supplier_id || null,
        input.reference_number?.trim() || null,
        input.notes?.trim() || null,
        userId || null
      );

      const expenseId = Number(res.lastInsertRowid);

      // Increment sequence number
      const currentSeq = parseInt(expenseNumber.replace(/^[A-Z-]+/, ''), 10);
      this.db
        .prepare("UPDATE app_settings SET value = ? WHERE key = 'next_expense_number'")
        .run(String(currentSeq + 1));

      // Audit log
      this.db.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('EXPENSE_CREATE', 'expenses', ?, ?, ?, 'system')
      `).run(
        String(expenseId),
        JSON.stringify({
          expenseNumber,
          categoryName: category.name,
          amountPaise: input.amount_paise,
          paymentMode: input.payment_mode,
          paymentStatus: input.payment_status || 'PAID',
        }),
        userId || null
      );

      return expenseId;
    });

    const newId = transaction();
    return this.getById(newId)!;
  }

  update(input: UpdateExpenseInput, userId?: number): Expense {
    const existing = this.getById(input.id);
    if (!existing) {
      throw new Error(`Expense #${input.id} not found.`);
    }

    const transaction = this.db.transaction(() => {
      const updateStmt = this.db.prepare(`
        UPDATE expenses SET
          category_id = COALESCE(?, category_id),
          expense_date = COALESCE(?, expense_date),
          amount_paise = COALESCE(?, amount_paise),
          payment_mode = COALESCE(?, payment_mode),
          payment_status = COALESCE(?, payment_status),
          payee_name = ?,
          supplier_id = ?,
          reference_number = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `);

      updateStmt.run(
        input.category_id || null,
        input.expense_date || null,
        input.amount_paise || null,
        input.payment_mode || null,
        input.payment_status || null,
        input.payee_name !== undefined ? (input.payee_name?.trim() || null) : existing.payee_name,
        input.supplier_id !== undefined ? input.supplier_id : existing.supplier_id,
        input.reference_number !== undefined ? (input.reference_number?.trim() || null) : existing.reference_number,
        input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
        input.id
      );

      // Audit log
      this.db.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('EXPENSE_UPDATE', 'expenses', ?, ?, ?, 'system')
      `).run(
        String(input.id),
        JSON.stringify({
          expenseNumber: existing.expense_number,
          updatedFields: Object.keys(input).filter((k) => k !== 'id'),
        }),
        userId || null
      );

      return input.id;
    });

    transaction();
    return this.getById(input.id)!;
  }

  delete(id: number, userId?: number): boolean {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Expense #${id} not found.`);
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

      this.db.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('EXPENSE_DELETE', 'expenses', ?, ?, ?, 'system')
      `).run(
        String(id),
        JSON.stringify({
          expenseNumber: existing.expense_number,
          amountPaise: existing.amount_paise,
        }),
        userId || null
      );

      return true;
    });

    return transaction();
  }
}
