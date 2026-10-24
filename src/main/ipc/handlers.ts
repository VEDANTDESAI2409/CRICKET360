import { ipcMain, app } from 'electron';
import { z } from 'zod';
import { getDatabase, checkDatabaseHealth, getDatabaseStats, getActiveDbPath } from '../db/connection';
import { AppInfo, AppSetting } from '../../shared/types/models';
import { IpcResult } from '../../shared/types/ipc';

// Zod schemas for boundary validation
const settingKeySchema = z.string().min(1).max(100).regex(/^[a-z0-9_]+$/i);
const settingValueSchema = z.string().max(2000);

const setSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

export function registerIpcHandlers(): void {
  // 1. App Info Handler
  ipcMain.handle('app:getInfo', async (): Promise<IpcResult<AppInfo>> => {
    try {
      const health = checkDatabaseHealth();
      const appInfo: AppInfo = {
        name: 'Cricket360',
        version: app ? app.getVersion() : '1.0.0',
        platform: process.platform,
        dbPath: getActiveDbPath(),
        isPackaged: app ? app.isPackaged : false,
        walEnabled: health.journalMode === 'wal',
        foreignKeysEnabled: health.foreignKeys,
      };
      return { success: true, data: appInfo };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 2. Health Check Handler
  ipcMain.handle('app:getHealthCheck', async () => {
    try {
      const health = checkDatabaseHealth();
      return { success: true, data: health };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 3. Settings Handlers
  ipcMain.handle('settings:getAll', async (): Promise<IpcResult<AppSetting[]>> => {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT key, value, updated_at FROM app_settings ORDER BY key ASC').all() as AppSetting[];
      return { success: true, data: rows };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('settings:get', async (_event, key: unknown): Promise<IpcResult<string | null>> => {
    try {
      const parsedKey = settingKeySchema.parse(key);
      const db = getDatabase();
      const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(parsedKey) as { value: string } | undefined;
      return { success: true, data: row ? row.value : null };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('settings:set', async (_event, payload: unknown): Promise<IpcResult<boolean>> => {
    try {
      const { key, value } = setSettingSchema.parse(payload);
      const db = getDatabase();
      db.prepare(`
        INSERT INTO app_settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, value);
      return { success: true, data: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 4. Database Stats Handler
  ipcMain.handle('db:getStats', async () => {
    try {
      const stats = getDatabaseStats();
      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
