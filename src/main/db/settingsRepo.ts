import Database from 'better-sqlite3';
import { getDatabase } from './connection';
import { ShopSettings, UpdateShopSettingsInput } from '../../shared/types/models';

export class SettingsRepo {
  private db: Database.Database;

  constructor(customDb?: Database.Database) {
    this.db = customDb || getDatabase();
  }

  getShopSettings(): ShopSettings {
    const rows = this.db.prepare('SELECT key, value FROM app_settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    return {
      shop_name: map.get('shop_name') || 'Cricket360 Sports & Pro Shop',
      shop_address: map.get('shop_address') || '12, Sports Complex Road, Mumbai, Maharashtra',
      shop_phone: map.get('shop_phone') || '+91 98765 43210',
      shop_email: map.get('shop_email') || 'contact@cricket360.local',
      shop_gstin: map.get('shop_gstin') || '27AABBC1234D1Z5',
      shop_state_code: map.get('shop_state_code') || '27',
      invoice_prefix: map.get('invoice_prefix') || 'INV-',
      next_invoice_number: map.get('next_invoice_number') || '1001',
      thermal_printer_name: map.get('thermal_printer_name') || 'Default POS Printer',
      thermal_receipt_width: map.get('thermal_receipt_width') || '80mm',
      currency_symbol: map.get('currency_symbol') || '₹',
      store_terms_and_conditions:
        map.get('store_terms_and_conditions') ||
        '1. Goods once sold can only be exchanged within 7 days against valid receipt. 2. No exchange on used or knocked-in bats. 3. Warranty as per manufacturer terms.',
      auto_backup_enabled: map.get('auto_backup_enabled') || 'true',
      auto_backup_retention_days: map.get('auto_backup_retention_days') || '30',
      low_stock_warning_threshold: map.get('low_stock_warning_threshold') || '5',
    };
  }

  updateShopSettings(input: UpdateShopSettingsInput, userId?: number): ShopSettings {
    const transaction = this.db.transaction(() => {
      const upsert = this.db.prepare(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `);

      upsert.run('shop_name', input.shop_name.trim());
      upsert.run('shop_address', input.shop_address.trim());
      upsert.run('shop_phone', input.shop_phone.trim());
      upsert.run('shop_email', input.shop_email.trim());
      upsert.run('shop_gstin', input.shop_gstin.trim().toUpperCase());
      upsert.run('shop_state_code', input.shop_state_code.trim());
      upsert.run('invoice_prefix', input.invoice_prefix.trim().toUpperCase());

      if (input.thermal_printer_name !== undefined) {
        upsert.run('thermal_printer_name', input.thermal_printer_name.trim());
      }
      if (input.thermal_receipt_width !== undefined) {
        upsert.run('thermal_receipt_width', input.thermal_receipt_width.trim());
      }
      if (input.store_terms_and_conditions !== undefined) {
        upsert.run('store_terms_and_conditions', input.store_terms_and_conditions.trim());
      }
      if (input.auto_backup_enabled !== undefined) {
        upsert.run('auto_backup_enabled', input.auto_backup_enabled.trim());
      }
      if (input.auto_backup_retention_days !== undefined) {
        upsert.run('auto_backup_retention_days', input.auto_backup_retention_days.trim());
      }
      if (input.low_stock_warning_threshold !== undefined) {
        upsert.run('low_stock_warning_threshold', input.low_stock_warning_threshold.trim());
      }

      this.db.prepare(`
        INSERT INTO audit_logs (
          action, entity_type, entity_id, details_json, user_id, username_snapshot
        ) VALUES ('SETTINGS_UPDATE', 'app_settings', 'shop_settings', ?, ?, 'system')
      `).run(
        JSON.stringify({ shopName: input.shop_name, shopGstin: input.shop_gstin }),
        userId || null
      );
    });

    transaction();
    return this.getShopSettings();
  }
}
