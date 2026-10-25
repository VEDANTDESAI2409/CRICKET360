import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import { AuditLog, AuditLogFilterQuery, CreateAuditLogInput } from '../../shared/types/models';

export class AuditRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  logAction(input: CreateAuditLogInput): number {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        action, entity_type, entity_id, details_json, user_id, username_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      input.action,
      input.entity_type,
      input.entity_id || null,
      input.details_json || null,
      input.user_id || null,
      input.username_snapshot || 'system'
    );

    return Number(res.lastInsertRowid);
  }

  getLogs(filters?: AuditLogFilterQuery): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filters?.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters?.entity_type) {
      sql += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }

    if (filters?.start_date) {
      sql += ' AND created_at >= ?';
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      sql += ' AND created_at <= ?';
      params.push(`${filters.end_date} 23:59:59`);
    }

    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 100;
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(...params) as AuditLog[];
  }
}
