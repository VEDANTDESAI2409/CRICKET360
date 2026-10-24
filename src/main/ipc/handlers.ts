import { ipcMain, app } from 'electron';
import { z } from 'zod';
import { getDatabase, checkDatabaseHealth, getDatabaseStats, getActiveDbPath } from '../db/connection';
import {
  AppInfo,
  AppSetting,
  CreateProductInput,
  UpdateProductInput,
  StockAdjustmentInput,
  ProductFilterQuery,
  CreateInvoiceInput,
  InvoiceFilterQuery,
  CreateCustomerInput,
} from '../../shared/types/models';
import { IpcResult } from '../../shared/types/ipc';
import * as productRepo from '../db/productRepo';
import * as inventoryRepo from '../db/inventoryRepo';
import * as mastersRepo from '../db/mastersRepo';
import * as dashboardRepo from '../db/dashboardRepo';
import { BillingRepo } from '../db/billingRepo';

// Zod schemas for boundary validation
const settingKeySchema = z.string().min(1).max(100).regex(/^[a-z0-9_]+$/i);
const settingValueSchema = z.string().max(2000);
const setSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

const createVariantSchema = z.object({
  variant_name: z.string().min(1).max(150),
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  opening_stock_quantity: z.number().int().nonnegative(),
  tax_rate_percent: z.number().nonnegative().optional(),
});

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(60),
  barcode: z.string().max(60).optional(),
  category_id: z.number().int().positive(),
  brand_id: z.number().int().positive(),
  unit_id: z.number().int().positive(),
  hsn_code: z.string().max(20).optional(),
  tax_rate_percent: z.number().nonnegative().optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  reorder_level: z.number().int().nonnegative(),
  opening_stock_quantity: z.number().int().nonnegative(),
  has_variants: z.boolean(),
  variants: z.array(createVariantSchema).optional(),
});

const updateProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(60),
  barcode: z.string().max(60).optional(),
  category_id: z.number().int().positive(),
  brand_id: z.number().int().positive(),
  unit_id: z.number().int().positive(),
  hsn_code: z.string().max(20).optional(),
  tax_rate_percent: z.number().nonnegative().optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  reorder_level: z.number().int().nonnegative(),
  is_active: z.number().int().min(0).max(1),
});

const stockAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().optional(),
  new_quantity: z.number().int().nonnegative(),
  reason: z.enum([
    'PHYSICAL_AUDIT_MISMATCH',
    'DAMAGED_IN_STORE',
    'EXPIRED_DEFECTIVE',
    'SAMPLE_DEMO',
    'THEFT_OR_LOSS',
    'FOUND_SURPLUS',
    'OTHER',
  ]),
  notes: z.string().max(1000).optional(),
});

const createInvoiceItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().positive(),
  unit_price_paise: z.number().int().nonnegative(),
  discount_amount_paise: z.number().int().nonnegative().optional(),
});

const paymentTenderSchema = z.object({
  mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  amount_paise: z.number().int().nonnegative(),
  reference_number: z.string().max(100).optional(),
});

const createInvoiceSchema = z.object({
  customer_id: z.number().int().positive().nullable().optional(),
  customer_name: z.string().max(150).optional(),
  customer_phone: z.string().max(30).optional(),
  customer_gstin: z.string().max(20).optional(),
  customer_address: z.string().max(300).optional(),
  customer_state_code: z.string().max(10).optional(),
  items: z.array(createInvoiceItemSchema).min(1),
  discount_amount_paise: z.number().int().nonnegative().optional(),
  payments: z.array(paymentTenderSchema),
  notes: z.string().max(500).optional(),
});

const cancelInvoiceSchema = z.object({
  invoiceId: z.number().int().positive(),
  reason: z.string().min(2).max(300),
});

const createCustomerSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().max(30).optional(),
  gstin: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  state_code: z.string().max(10).optional(),
  credit_limit_paise: z.number().int().nonnegative().optional(),
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

  // 5. Dashboard Handlers
  ipcMain.handle('dashboard:getMetrics', async () => {
    try {
      const db = getDatabase();
      const metrics = dashboardRepo.getDashboardMetrics(db);
      return { success: true, data: metrics };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('dashboard:getLowStockAlerts', async () => {
    try {
      const db = getDatabase();
      const alerts = dashboardRepo.getLowStockAlerts(db);
      return { success: true, data: alerts };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('dashboard:getRecentTransactions', async () => {
    try {
      const db = getDatabase();
      const transactions = dashboardRepo.getRecentTransactions(db);
      return { success: true, data: transactions };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('dashboard:getWeeklySalesSummary', async () => {
    try {
      const db = getDatabase();
      const summary = dashboardRepo.getWeeklySalesSummary(db);
      return { success: true, data: summary };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 6. Product Catalog Handlers
  ipcMain.handle('products:getAll', async (_event, filters?: ProductFilterQuery) => {
    try {
      const db = getDatabase();
      const products = productRepo.getAllProducts(db, filters);
      return { success: true, data: products };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:getById', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const product = productRepo.getProductById(db, Number(id));
      return { success: true, data: product };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:create', async (_event, payload: unknown) => {
    try {
      const data = createProductSchema.parse(payload) as CreateProductInput;
      const db = getDatabase();
      const created = productRepo.createProduct(db, data);
      return { success: true, data: created };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:update', async (_event, payload: unknown) => {
    try {
      const data = updateProductSchema.parse(payload) as UpdateProductInput;
      const db = getDatabase();
      const updated = productRepo.updateProduct(db, data);
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:toggleActive', async (_event, id: number, isActive: number) => {
    try {
      const db = getDatabase();
      const success = productRepo.toggleProductActive(db, Number(id), Number(isActive));
      return { success: true, data: success };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:delete', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const success = productRepo.deleteProduct(db, Number(id));
      return { success: true, data: success };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:validateSku', async (_event, sku: string, excludeProductId?: number) => {
    try {
      const db = getDatabase();
      const available = productRepo.validateSku(db, String(sku), excludeProductId ? Number(excludeProductId) : undefined);
      return { success: true, data: { available } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:validateBarcode', async (_event, barcode: string, excludeProductId?: number) => {
    try {
      const db = getDatabase();
      const available = productRepo.validateBarcode(db, String(barcode), excludeProductId ? Number(excludeProductId) : undefined);
      return { success: true, data: { available } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:generateSku', async (_event, categoryCode: string, brandCode: string) => {
    try {
      const db = getDatabase();
      const sku = productRepo.generateSku(db, String(categoryCode), String(brandCode));
      return { success: true, data: sku };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:generateBarcode', async () => {
    try {
      const barcode = productRepo.generateBarcode();
      return { success: true, data: barcode };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('products:getVariants', async (_event, productId: number) => {
    try {
      const db = getDatabase();
      const variants = productRepo.getProductVariants(db, Number(productId));
      return { success: true, data: variants };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 7. Inventory & Stock Adjustment Handlers
  ipcMain.handle('inventory:getStockMovements', async (_event, productId?: number, limit?: number) => {
    try {
      const db = getDatabase();
      const movements = inventoryRepo.getStockMovements(db, productId ? Number(productId) : undefined, limit ? Number(limit) : 50);
      return { success: true, data: movements };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('inventory:adjustStock', async (_event, payload: unknown) => {
    try {
      const input = stockAdjustmentSchema.parse(payload) as StockAdjustmentInput;
      const db = getDatabase();
      const adj = inventoryRepo.adjustStock(db, input);
      return { success: true, data: adj };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('inventory:getAdjustments', async (_event, productId?: number, limit?: number) => {
    try {
      const db = getDatabase();
      const adjs = inventoryRepo.getStockAdjustments(db, productId ? Number(productId) : undefined, limit ? Number(limit) : 50);
      return { success: true, data: adjs };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 8. Masters Handlers (Categories, Brands, Units, HSN Codes)
  ipcMain.handle('masters:getCategories', async () => {
    try {
      const db = getDatabase();
      const categories = mastersRepo.getCategories(db);
      return { success: true, data: categories };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('masters:getBrands', async () => {
    try {
      const db = getDatabase();
      const brands = mastersRepo.getBrands(db);
      return { success: true, data: brands };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('masters:getUnits', async () => {
    try {
      const db = getDatabase();
      const units = mastersRepo.getUnits(db);
      return { success: true, data: units };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('masters:getHsnCodes', async () => {
    try {
      const db = getDatabase();
      const hsnCodes = mastersRepo.getHsnCodes(db);
      return { success: true, data: hsnCodes };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('masters:createCategory', async (_event, name: string, code: string, description?: string) => {
    try {
      const db = getDatabase();
      const cat = mastersRepo.createCategory(db, String(name), String(code), description ? String(description) : undefined);
      return { success: true, data: cat };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('masters:createBrand', async (_event, name: string, code: string) => {
    try {
      const db = getDatabase();
      const brand = mastersRepo.createBrand(db, String(name), String(code));
      return { success: true, data: brand };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 9. Billing & POS Handlers
  ipcMain.handle('billing:createInvoice', async (_event, rawData: unknown) => {
    try {
      const validated = createInvoiceSchema.parse(rawData);
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const invoice = repo.createInvoice(validated as CreateInvoiceInput);
      return { success: true, data: invoice };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('billing:getInvoices', async (_event, filters?: InvoiceFilterQuery) => {
    try {
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const invoices = repo.getInvoices(filters);
      return { success: true, data: invoices };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('billing:getInvoiceById', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const invoice = repo.getInvoiceById(Number(id));
      return { success: true, data: invoice };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('billing:cancelInvoice', async (_event, rawData: { invoiceId: number; reason: string }) => {
    try {
      const validated = cancelInvoiceSchema.parse(rawData);
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const cancelled = repo.cancelInvoice(validated.invoiceId, validated.reason);
      return { success: true, data: cancelled };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('billing:getNextInvoiceNumber', async () => {
    try {
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const nextNum = repo.getNextInvoiceNumber();
      return { success: true, data: nextNum };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('billing:getShopSettings', async () => {
    try {
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const settings = repo.getShopSettings();
      return { success: true, data: settings };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 10. Customer Handlers
  ipcMain.handle('customers:search', async (_event, query?: string) => {
    try {
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const customers = repo.getCustomers(query ? String(query) : undefined);
      return { success: true, data: customers };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('customers:create', async (_event, rawData: unknown) => {
    try {
      const validated = createCustomerSchema.parse(rawData);
      const db = getDatabase();
      const repo = new BillingRepo(db);
      const customer = repo.createCustomer(validated as CreateCustomerInput);
      return { success: true, data: customer };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}

