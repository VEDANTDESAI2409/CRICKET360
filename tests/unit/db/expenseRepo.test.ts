import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ExpenseRepo } from '../../../src/main/db/expenseRepo';

describe('Milestone 6: ExpenseRepo & Operating Overheads Management', () => {
  let db: Database.Database;
  let repo: ExpenseRepo;

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

    repo = new ExpenseRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should list standard seeded retail expense categories and allow custom categories', () => {
    const categories = repo.getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(8);
    const codes = categories.map((c) => c.code);
    expect(codes).toContain('RENT');
    expect(codes).toContain('POWER');
    expect(codes).toContain('SALARY');
    expect(codes).toContain('LOGISTICS');

    const newCat = repo.createCategory({
      name: 'Internet & Broadband',
      code: 'BROADBAND',
      description: 'POS fiber line and wifi',
    });
    expect(newCat.id).toBeDefined();
    expect(newCat.code).toBe('BROADBAND');

    // Duplicate prevention
    expect(() => {
      repo.createCategory({ name: 'Duplicate', code: 'BROADBAND' });
    }).toThrow();
  });

  it('2. should generate sequential collision-free expense numbers', () => {
    const num1 = repo.getNextExpenseNumber();
    expect(num1).toBe('EXP-1001');

    repo.create({
      category_id: 1,
      expense_date: '2026-10-25',
      amount_paise: 4500000,
      payment_mode: 'BANK_TRANSFER',
      payee_name: 'Mall Management Corp',
      reference_number: 'NEFT-MUM-9988',
    });

    const num2 = repo.getNextExpenseNumber();
    expect(num2).toBe('EXP-1002');
  });

  it('3. should create, update, filter, and delete expense records with audit logs', () => {
    const created = repo.create({
      category_id: 2, // Electricity & Power
      expense_date: '2026-10-25',
      amount_paise: 850000,
      payment_mode: 'UPI',
      payment_status: 'PAID',
      payee_name: 'Adani Electricity Mumbai',
      reference_number: 'UPI-BILL-12345',
      notes: 'October billing cycle',
    });

    expect(created.id).toBeDefined();
    expect(created.amount_paise).toBe(850000);
    expect(created.category_name).toBe('Electricity & Power');

    // Check audit log for creation
    const auditCreate = db.prepare("SELECT * FROM audit_logs WHERE action = 'EXPENSE_CREATE' AND entity_id = ?").get(String(created.id)) as any;
    expect(auditCreate).toBeDefined();

    // Update expense
    const updated = repo.update({
      id: created.id,
      amount_paise: 920000,
      notes: 'Revised including late fine',
    });
    expect(updated.amount_paise).toBe(920000);
    expect(updated.notes).toBe('Revised including late fine');

    // Filter by category
    const list = repo.getAll({ category_id: 2 });
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);

    // Delete expense
    const ok = repo.delete(created.id);
    expect(ok).toBe(true);

    const afterDel = repo.getById(created.id);
    expect(afterDel).toBeNull();

    // Check audit log for deletion
    const auditDel = db.prepare("SELECT * FROM audit_logs WHERE action = 'EXPENSE_DELETE' AND entity_id = ?").get(String(created.id)) as any;
    expect(auditDel).toBeDefined();
  });
});
