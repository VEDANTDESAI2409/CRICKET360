import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BackupService, computeSha256 } from '../../../src/main/services/backupService';

describe('Milestone 6: BackupService & Safe SQLite Disaster Recovery', () => {
  let db: Database.Database;
  let testDbPath: string;
  let backupService: BackupService;

  beforeEach(() => {
    // Create physical SQLite test file for VACUUM INTO
    const tempDir = path.resolve('temp_test_db');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    testDbPath = path.join(tempDir, `test_cricket360_${Date.now()}.db`);
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migrations
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

    backupService = new BackupService(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  it('1. should create an ACID-consistent backup file with SHA-256 calculation and metadata entry', () => {
    const meta = backupService.createBackup('Test automated snapshot');
    expect(meta.id).toBeDefined();
    expect(meta.backup_filename).toContain('cricket360_backup_');
    expect(meta.sha256_hash.length).toBe(64);
    expect(fs.existsSync(meta.file_path)).toBe(true);

    // Verify SHA-256 calculation
    const calculated = computeSha256(meta.file_path);
    expect(calculated).toBe(meta.sha256_hash);
  });

  it('2. should verify backup validity including SQLite format header and PRAGMA integrity_check', () => {
    const meta = backupService.createBackup('Verification test');
    const result = backupService.verifyBackup(meta.backup_filename);

    expect(result.isValid).toBe(true);
    expect(result.sha256Matched).toBe(true);
    expect(result.sqliteIntegrityOk).toBe(true);
    expect(result.fileSizeBytes).toBeGreaterThan(0);
  });

  it('3. should detect corrupted backup files when content or hash is altered', () => {
    const meta = backupService.createBackup('Corruption detection test');

    // Tamper with file content
    fs.appendFileSync(meta.file_path, 'GARBAGE_BYTES_CORRUPTED');

    const result = backupService.verifyBackup(meta.backup_filename);
    expect(result.isValid).toBe(false);
    expect(result.sha256Matched).toBe(false);
  });

  it('4. should list all backups in descending chronological order', () => {
    backupService.createBackup('Backup 1');
    backupService.createBackup('Backup 2');

    const all = backupService.getAllBackups();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0].id).toBeGreaterThan(all[1].id);
  });
});
