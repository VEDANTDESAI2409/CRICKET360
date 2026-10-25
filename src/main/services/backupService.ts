import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { app } from 'electron';
import { getDatabase, closeDatabase, initDatabase, getDatabasePath } from '../db/connection';
import {
  BackupMetadata,
  VerifyBackupResult,
  RestoreBackupResult,
} from '../../shared/types/models';

export function getBackupDirectory(): string {
  let baseDir: string;
  try {
    baseDir = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.cwd(), 'Cricket360');
  } catch {
    baseDir = path.join(process.env.APPDATA || process.cwd(), 'Cricket360');
  }

  const backupDir = path.join(baseDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

export function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export class BackupService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private getDb(): Database.Database {
    return this.customDb || getDatabase();
  }

  createBackup(
    notes?: string,
    backupType: 'MANUAL' | 'SCHEDULED' | 'PRE_RESTORE' = 'MANUAL',
    userId?: number
  ): BackupMetadata {
    const db = this.getDb();
    const backupDir = getBackupDirectory();

    // 1. Force WAL checkpoint to ensure all data is in the main database file
    db.pragma('wal_checkpoint(TRUNCATE)');

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const uniqueTag = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const prefix = backupType === 'PRE_RESTORE' ? 'pre_restore_' : 'cricket360_';
    const backupFilename = `${prefix}backup_${timestamp}_${uniqueTag}.db`;
    const targetFilePath = path.join(backupDir, backupFilename);

    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {}
    }

    // 2. Use VACUUM INTO to safely write a standalone consistent SQLite backup
    const sanitizedPath = targetFilePath.replace(/'/g, "''");
    db.prepare(`VACUUM INTO '${sanitizedPath}'`).run();

    if (!fs.existsSync(targetFilePath)) {
      throw new Error(`Backup failed: destination file was not created at ${targetFilePath}`);
    }

    // 3. Compute SHA256 and get file size
    const stat = fs.statSync(targetFilePath);
    const sha256 = computeSha256(targetFilePath);

    // 4. Save metadata
    const insertStmt = db.prepare(`
      INSERT INTO backup_metadata (
        backup_filename, file_path, file_size_bytes, sha256_hash,
        backup_type, status, notes
      ) VALUES (?, ?, ?, ?, ?, 'VALID', ?)
    `);

    const res = insertStmt.run(
      backupFilename,
      targetFilePath,
      stat.size,
      sha256,
      backupType,
      notes?.trim() || null
    );

    const backupId = Number(res.lastInsertRowid);

    // 5. Audit log
    db.prepare(`
      INSERT INTO audit_logs (
        action, entity_type, entity_id, details_json, user_id, username_snapshot
      ) VALUES ('BACKUP_CREATE', 'backups', ?, ?, ?, 'system')
    `).run(
      String(backupId),
      JSON.stringify({ backupFilename, fileSizeBytes: stat.size, sha256, backupType }),
      userId || null
    );

    return {
      id: backupId,
      backup_filename: backupFilename,
      file_path: targetFilePath,
      file_size_bytes: stat.size,
      sha256_hash: sha256,
      backup_type: backupType,
      status: 'VALID',
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
  }

  getAllBackups(): BackupMetadata[] {
    const db = this.getDb();
    const rows = db
      .prepare('SELECT * FROM backup_metadata ORDER BY id DESC')
      .all() as BackupMetadata[];
    return rows;
  }

  verifyBackup(backupFilename: string): VerifyBackupResult {
    const backupDir = getBackupDirectory();
    const filePath = path.join(backupDir, backupFilename);

    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        sha256Matched: false,
        sqliteIntegrityOk: false,
        fileSizeBytes: 0,
        message: `Backup file "${backupFilename}" not found on disk.`,
      };
    }

    const stat = fs.statSync(filePath);
    if (stat.size < 100) {
      return {
        isValid: false,
        sha256Matched: false,
        sqliteIntegrityOk: false,
        fileSizeBytes: stat.size,
        message: 'File size is too small to be a valid SQLite database.',
      };
    }

    // Verify SQLite magic header bytes: "SQLite format 3\0"
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(16);
    fs.readSync(fd, headerBuffer, 0, 16, 0);
    fs.closeSync(fd);

    const magic = headerBuffer.toString('utf8', 0, 15);
    if (magic !== 'SQLite format 3') {
      return {
        isValid: false,
        sha256Matched: false,
        sqliteIntegrityOk: false,
        fileSizeBytes: stat.size,
        message: 'Invalid database header. File is not a valid SQLite database.',
      };
    }

    // Check SHA256 against stored metadata
    const computedHash = computeSha256(filePath);
    const db = this.getDb();
    const meta = db
      .prepare('SELECT sha256_hash FROM backup_metadata WHERE backup_filename = ?')
      .get(backupFilename) as { sha256_hash: string } | undefined;

    const shaMatched = meta ? meta.sha256_hash === computedHash : true;

    // Verify SQLite internal integrity
    let integrityOk = false;
    let integrityMsg = '';

    try {
      const testDb = new Database(filePath, { readonly: true, fileMustExist: true });
      const check = testDb.pragma('integrity_check', { simple: true });
      testDb.close();

      integrityOk = check === 'ok';
      integrityMsg = integrityOk ? 'Integrity check passed.' : `Integrity issue: ${check}`;
    } catch (err) {
      integrityOk = false;
      integrityMsg = err instanceof Error ? err.message : String(err);
    }

    const isValid = shaMatched && integrityOk;

    return {
      isValid,
      sha256Matched: shaMatched,
      sqliteIntegrityOk: integrityOk,
      fileSizeBytes: stat.size,
      message: isValid
        ? 'Backup verified successfully. Hash matched and SQLite integrity verified.'
        : `Verification failed: ${integrityMsg} (SHA-256 match: ${shaMatched})`,
    };
  }

  restoreBackup(backupFilename: string, userId?: number): RestoreBackupResult {
    // 1. Rigorous verification check before touching live DB
    const verification = this.verifyBackup(backupFilename);
    if (!verification.isValid) {
      return {
        success: false,
        restoredFrom: backupFilename,
        error: `Cannot restore invalid backup: ${verification.message}`,
      };
    }

    const backupDir = getBackupDirectory();
    const candidatePath = path.join(backupDir, backupFilename);

    let preRestorePath: string | undefined;

    try {
      // 2. Protect against overwriting: Create automatic PRE_RESTORE backup of active database
      const preRestoreMeta = this.createBackup(
        `Automatic safety snapshot before restoring ${backupFilename}`,
        'PRE_RESTORE',
        userId
      );
      preRestorePath = preRestoreMeta.file_path;

      // 3. Close active database
      closeDatabase();

      // 4. Copy candidate backup into active db path
      const activeDbPath = getDatabasePath();

      // Clean up WAL/SHM artifacts if any
      const walPath = `${activeDbPath}-wal`;
      const shmPath = `${activeDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      fs.copyFileSync(candidatePath, activeDbPath);

      // 5. Re-open active database and run sanity integrity check
      const restoredDb = initDatabase(activeDbPath);
      const integrity = restoredDb.pragma('integrity_check', { simple: true });
      if (integrity !== 'ok') {
        throw new Error(`Restored database failed integrity check: ${integrity}`);
      }

      // 6. Update backup status and log audit
      restoredDb
        .prepare("UPDATE backup_metadata SET status = 'RESTORED' WHERE backup_filename = ?")
        .run(backupFilename);

      restoredDb.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('BACKUP_RESTORE', 'backups', ?, ?, ?, 'system')
      `).run(
        backupFilename,
        JSON.stringify({ restoredFrom: backupFilename, preRestoreSnapshot: preRestorePath }),
        userId || null
      );

      return {
        success: true,
        preRestoreBackupPath: preRestorePath,
        restoredFrom: backupFilename,
      };
    } catch (err) {
      // Re-open active database if closed
      try {
        initDatabase();
      } catch {}

      return {
        success: false,
        preRestoreBackupPath: preRestorePath,
        restoredFrom: backupFilename,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
