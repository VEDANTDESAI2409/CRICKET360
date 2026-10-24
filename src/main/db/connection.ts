import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { DatabaseStats, HealthCheckResult } from '../../shared/types/models';

let activeDb: Database.Database | null = null;
let currentDbPath: string = '';

export function getDatabasePath(customPath?: string): string {
  if (customPath) {
    return customPath;
  }
  if (process.env.CRICKET360_DB_PATH) {
    return process.env.CRICKET360_DB_PATH;
  }
  
  // Stable Windows AppData path: %APPDATA%/Cricket360/database/cricket360.sqlite
  let baseDir: string;
  try {
    baseDir = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.cwd(), 'Cricket360');
  } catch {
    baseDir = path.join(process.env.APPDATA || process.cwd(), 'Cricket360');
  }

  const dbDir = path.join(baseDir, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'cricket360.sqlite');
}

export function initDatabase(customPath?: string): Database.Database {
  if (activeDb) {
    return activeDb;
  }

  const dbPath = getDatabasePath(customPath);
  currentDbPath = dbPath;

  const db = new Database(dbPath, {
    timeout: 5000,
  });

  // Strict retail database pragma configuration
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  activeDb = db;
  return db;
}

export function getDatabase(): Database.Database {
  if (!activeDb) {
    return initDatabase();
  }
  return activeDb;
}

export function closeDatabase(): void {
  if (activeDb) {
    try {
      activeDb.close();
    } catch (err) {
      console.error('Error closing database:', err);
    }
    activeDb = null;
  }
}

export function checkDatabaseHealth(): HealthCheckResult {
  const db = getDatabase();
  try {
    const fkResult = db.pragma('foreign_keys', { simple: true });
    const jmResult = db.pragma('journal_mode', { simple: true });
    const integrityResult = db.pragma('integrity_check', { simple: true });

    const isHealthy = fkResult === 1 && jmResult === 'wal' && integrityResult === 'ok';

    return {
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      foreignKeys: fkResult === 1,
      journalMode: String(jmResult),
      integrity: String(integrityResult),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'ERROR',
      foreignKeys: false,
      journalMode: 'unknown',
      integrity: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    };
  }
}

export function getDatabaseStats(): DatabaseStats {
  const db = getDatabase();
  
  const getCount = (table: string): number => {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number } | undefined;
      return row ? row.count : 0;
    } catch {
      return 0;
    }
  };

  let migrationVersion = 'None';
  try {
    const row = db.prepare(`SELECT version FROM _schema_migrations ORDER BY version DESC LIMIT 1`).get() as { version: string } | undefined;
    if (row) {
      migrationVersion = row.version;
    }
  } catch {
    // Migration table may not exist yet
  }

  return {
    categoryCount: getCount('categories'),
    brandCount: getCount('brands'),
    productCount: getCount('products'),
    customerCount: getCount('customers'),
    supplierCount: getCount('suppliers'),
    migrationVersion,
  };
}

export function getActiveDbPath(): string {
  return currentDbPath;
}
