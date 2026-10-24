import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runMigrations } from '../../../src/main/db/migrations';

describe('Milestone 1: SQLite Foundation & Data Integrity', () => {
  let tempDir: string;
  let testDbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    // Create an isolated temporary directory for every test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cricket360-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. should enforce WAL mode and Foreign Keys pragmas', () => {
    const jm = db.pragma('journal_mode', { simple: true });
    const fk = db.pragma('foreign_keys', { simple: true });

    expect(jm).toBe('wal');
    expect(fk).toBe(1);
  });

  it('2. should run versioned migrations and record them in _schema_migrations', () => {
    const migrationsDir = path.resolve('src/main/db/migrations');
    const result = runMigrations(db, migrationsDir);

    expect(result.success).toBe(true);
    expect(result.applied).toContain('001_initial_schema');

    // Verify _schema_migrations tracking table
    const recorded = db.prepare('SELECT version FROM _schema_migrations').all() as { version: string }[];
    expect(recorded.map((r) => r.version)).toContain('001_initial_schema');

    // Verify default tables created
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('app_settings');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('brands');
    expect(tableNames).toContain('units');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('product_variants');
    expect(tableNames).toContain('suppliers');
    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('users');
  });

  it('3. should be idempotent and not re-execute already applied migrations', () => {
    const migrationsDir = path.resolve('src/main/db/migrations');
    
    // First run
    const firstRun = runMigrations(db, migrationsDir);
    expect(firstRun.applied.length).toBeGreaterThan(0);

    // Second run
    const secondRun = runMigrations(db, migrationsDir);
    expect(secondRun.applied.length).toBe(0);
    expect(secondRun.totalAlreadyApplied).toBe(firstRun.applied.length);
  });

  it('4. should strictly reject orphan foreign key records', () => {
    const migrationsDir = path.resolve('src/main/db/migrations');
    runMigrations(db, migrationsDir);

    // Attempt to insert product with invalid non-existent category_id = 99999
    expect(() => {
      db.prepare(`
        INSERT INTO products (name, sku, category_id, purchase_cost_paise, selling_price_paise, mrp_paise)
        VALUES ('Test Bat', 'BAT-INVALID-FK', 99999, 100000, 150000, 200000)
      `).run();
    }).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('5. should roll back atomic transactions completely when a step fails', () => {
    const migrationsDir = path.resolve('src/main/db/migrations');
    runMigrations(db, migrationsDir);

    // Initial category count
    const countBefore = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;

    const atomicOperation = db.transaction(() => {
      // Step 1: Valid insert
      db.prepare("INSERT INTO categories (name, code) VALUES ('Cricket Helmets', 'HLMT')").run();

      // Step 2: Intentional constraint violation (duplicate code or name)
      db.prepare("INSERT INTO categories (name, code) VALUES ('Cricket Bats', 'BAT')").run();
    });

    expect(() => atomicOperation()).toThrow(/UNIQUE constraint failed/);

    // Verify rollback: count should match original, 'Cricket Helmets' was NOT committed
    const countAfter = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
    expect(countAfter).toBe(countBefore);

    const checkHelmet = db.prepare("SELECT * FROM categories WHERE code = 'HLMT'").get();
    expect(checkHelmet).toBeUndefined();
  });

  it('6. should safely handle and rollback failed migrations without corrupting tracking', () => {
    // Create a temporary migrations directory with a broken SQL file
    const faultyMigrationsDir = path.join(tempDir, 'faulty_migrations');
    fs.mkdirSync(faultyMigrationsDir, { recursive: true });

    fs.writeFileSync(
      path.join(faultyMigrationsDir, '001_good.sql'),
      'CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT);'
    );
    fs.writeFileSync(
      path.join(faultyMigrationsDir, '002_broken.sql'),
      'INVALID SQL SYNTAX HERE !!!'
    );

    // Expect migration run to throw
    expect(() => {
      runMigrations(db, faultyMigrationsDir);
    }).toThrow(/Migration 002_broken failed/);

    // 001_good was committed, 002_broken was rolled back
    const recorded = db.prepare('SELECT version FROM _schema_migrations').all() as { version: string }[];
    const versions = recorded.map((r) => r.version);

    expect(versions).toContain('001_good');
    expect(versions).not.toContain('002_broken');
  });
});
