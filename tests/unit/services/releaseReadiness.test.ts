import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from '../../../src/main/db/migrations';
import { BackupService } from '../../../src/main/services/backupService';
import { ExportImportService } from '../../../src/main/services/exportImportService';

describe('Milestone 7: Release Readiness & Production Integrity', () => {
  let testDbDir: string;
  let testDbPath: string;
  let testDb: Database.Database;

  beforeEach(() => {
    testDbDir = path.resolve(`test-m7-db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    fs.mkdirSync(testDbDir, { recursive: true });
    testDbPath = path.join(testDbDir, 'release_test.sqlite');
    testDb = new Database(testDbPath);
    testDb.pragma('journal_mode = WAL');
    testDb.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    try {
      testDb.close();
    } catch {}
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. should apply all 6 migrations sequentially on a fresh database with zero errors', () => {
    const res = runMigrations(testDb);
    expect(res.success).toBe(true);
    expect(res.applied.length).toBe(6);
    expect(res.applied).toContain('001_initial_schema');
    expect(res.applied).toContain('002_transactions_foundation');
    expect(res.applied).toContain('003_catalog_and_inventory');
    expect(res.applied).toContain('004_pos_and_gst_billing');
    expect(res.applied).toContain('005_procurement_and_accounts');
    expect(res.applied).toContain('006_returns_expenses_and_controls');

    // Verify foreign keys and journal mode
    const jm = testDb.pragma('journal_mode', { simple: true });
    expect(jm).toBe('wal');
    const fk = testDb.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('2. should verify offline data sovereignty with zero external CDN or remote web script links', () => {
    const indexHtmlPath = path.resolve('index.html');
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // Must not include external font/script CDN links
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).not.toContain('unpkg.com');

    // CSP must enforce self
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("script-src 'self'");
  });

  it('3. should verify backup creation, integrity verification, and pre-restore safety snapshot', () => {
    runMigrations(testDb);

    const backupDir = path.join(testDbDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const backupService = new BackupService(testDb, backupDir, testDbPath);
    const backupRes = backupService.createBackup('Release test manual snapshot');

    expect(backupRes.status).toBe('VALID');
    expect(backupRes.backup_filename).toContain('.db');
    expect(fs.existsSync(backupRes.file_path)).toBe(true);
    expect(backupRes.sha256_hash).toBeDefined();

    // Verify backup integrity
    const verifyRes = backupService.verifyBackup(backupRes.backup_filename);
    expect(verifyRes.isValid).toBe(true);
    expect(verifyRes.sqliteIntegrityOk).toBe(true);

    // Verify restore creates pre-restore safety snapshot
    const restoreRes = backupService.restoreBackup(backupRes.backup_filename);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.preRestoreBackupPath).toBeDefined();
    expect(fs.existsSync(restoreRes.preRestoreBackupPath!)).toBe(true);
  });

  it('4. should prevent CSV import data corruption when rows have invalid or duplicate attributes', () => {
    runMigrations(testDb);

    const exportImport = new ExportImportService(testDb);

    // CSV with valid item and invalid item missing name
    const csvData = [
      'SKU,Product Name,Barcode,Category,Brand,Unit,HSN Code,Purchase Cost (INR),Selling Price (INR),MRP (INR),Stock Qty,Min Stock,Reorder Level',
      'BAT-REL-01,"SG Sunny Gold English Willow Bat",8901234567890,Cricket Bats,SG,Pcs,9506,12000,16500,18000,10,2,5',
      '"",,8901234567891,Cricket Bats,SG,Pcs,9506,500,800,900,5,1,2', // Invalid row
    ].join('\n');

    const importRes = exportImport.importProductsCsv(csvData);
    expect(importRes.importedCount).toBe(1);
    expect(importRes.errors.length).toBe(1);
    expect(importRes.errors[0]).toContain('SKU and Product Name are required');

    // Verify valid product was committed
    const prod = testDb.prepare('SELECT name, stock_quantity FROM products WHERE sku = ?').get('BAT-REL-01') as any;
    expect(prod).toBeDefined();
    expect(prod.name).toBe('SG Sunny Gold English Willow Bat');
    expect(prod.stock_quantity).toBe(10);
  });

  it('5. should verify that the Windows installer package exists and meets size expectations', () => {
    const installerPath = path.resolve('dist-package/Cricket360 Setup 1.0.0.exe');
    expect(fs.existsSync(installerPath)).toBe(true);

    const stat = fs.statSync(installerPath);
    // Should be greater than 50MB (Electron + Chromium + Node + better-sqlite3)
    expect(stat.size).toBeGreaterThan(50 * 1024 * 1024);

    const unpackedExe = path.resolve('dist-package/win-unpacked/Cricket360.exe');
    expect(fs.existsSync(unpackedExe)).toBe(true);
  });
});
