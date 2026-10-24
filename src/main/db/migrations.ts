import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';

export interface MigrationResult {
  applied: string[];
  totalAlreadyApplied: number;
  success: boolean;
  error?: string;
}

export function runMigrations(
  customDb?: Database.Database,
  customMigrationsDir?: string
): MigrationResult {
  const db = customDb || getDatabase();
  
  // 1. Create migration tracking table if not present
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Resolve migrations directory
  let migrationsDir = customMigrationsDir;
  if (!migrationsDir) {
    // In dev / build, locate migrations relative to file
    const possiblePaths = [
      path.join(__dirname, 'migrations'),
      path.join(__dirname, '../../src/main/db/migrations'),
      path.join(process.cwd(), 'src/main/db/migrations'),
      path.join(process.resourcesPath || '', 'migrations'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }
  }

  if (!migrationsDir || !fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found. Searched paths: ${migrationsDir}`);
  }

  // 3. Find all .sql migration files sorted deterministically
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // 4. Retrieve already applied versions
  const appliedRows = db
    .prepare('SELECT version FROM _schema_migrations ORDER BY version ASC')
    .all() as { version: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  const appliedThisRun: string[] = [];

  // 5. Execute pending migrations inside atomic transactions
  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (appliedSet.has(version)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Run each migration inside an atomic transaction
    const executeMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _schema_migrations (version) VALUES (?)').run(version);
    });

    try {
      executeMigration();
      appliedThisRun.push(version);
    } catch (err) {
      const errorMsg = `Migration ${version} failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  return {
    applied: appliedThisRun,
    totalAlreadyApplied: appliedSet.size,
    success: true,
  };
}
