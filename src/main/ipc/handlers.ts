import { ipcMain, app } from 'electron';
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
  UpdateCustomerInput,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseInput,
  CreatePurchaseReturnInput,
  RecordSupplierPaymentInput,
  RecordCustomerPaymentInput,
} from '../../shared/types/models';
import { IpcResult } from '../../shared/types/ipc';
import * as productRepo from '../db/productRepo';
import * as inventoryRepo from '../db/inventoryRepo';
import * as mastersRepo from '../db/mastersRepo';
import * as dashboardRepo from '../db/dashboardRepo';
import { BillingRepo } from '../db/billingRepo';
import { SupplierRepo } from '../db/supplierRepo';
import { PurchaseRepo } from '../db/purchaseRepo';
import { AccountRepo } from '../db/accountRepo';
import {
  settingKeySchema,
  setSettingSchema,
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  createInvoiceSchema,
  cancelInvoiceSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseSchema,
  createPurchaseReturnSchema,
  recordSupplierPaymentSchema,
  recordCustomerPaymentSchema,
} from './schemas';

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
      const repo = new AccountRepo(db);
      const customers = repo.searchCustomers(query ? String(query) : undefined);
      return { success: true, data: customers };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('customers:getById', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const customer = repo.getCustomerById(Number(id));
      return { success: true, data: customer };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('customers:create', async (_event, rawData: unknown) => {
    try {
      const validated = createCustomerSchema.parse(rawData);
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const customer = repo.createCustomer(validated as CreateCustomerInput);
      return { success: true, data: customer };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('customers:update', async (_event, rawData: unknown) => {
    try {
      const validated = updateCustomerSchema.parse(rawData);
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const customer = repo.updateCustomer(validated as UpdateCustomerInput);
      return { success: true, data: customer };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('customers:getLedger', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const statement = repo.getCustomerLedger(Number(id));
      return { success: true, data: statement };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 11. Supplier Handlers
  ipcMain.handle('suppliers:getAll', async (_event, search?: string) => {
    try {
      const db = getDatabase();
      const repo = new SupplierRepo(db);
      const suppliers = repo.getAll(search ? String(search) : undefined);
      return { success: true, data: suppliers };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('suppliers:getById', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new SupplierRepo(db);
      const supplier = repo.getById(Number(id));
      return { success: true, data: supplier };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('suppliers:create', async (_event, rawData: unknown) => {
    try {
      const validated = createSupplierSchema.parse(rawData);
      const db = getDatabase();
      const repo = new SupplierRepo(db);
      const supplier = repo.create(validated as CreateSupplierInput);
      return { success: true, data: supplier };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('suppliers:update', async (_event, rawData: unknown) => {
    try {
      const validated = updateSupplierSchema.parse(rawData);
      const db = getDatabase();
      const repo = new SupplierRepo(db);
      const supplier = repo.update(validated as UpdateSupplierInput);
      return { success: true, data: supplier };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('suppliers:getLedger', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new SupplierRepo(db);
      const statement = repo.getLedger(Number(id));
      return { success: true, data: statement };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 12. Purchase & Return Handlers
  ipcMain.handle('purchases:getAll', async (_event, filters?: any) => {
    try {
      const db = getDatabase();
      const repo = new PurchaseRepo(db);
      const purchases = repo.getAll(filters);
      return { success: true, data: purchases };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('purchases:getById', async (_event, id: number) => {
    try {
      const db = getDatabase();
      const repo = new PurchaseRepo(db);
      const purchase = repo.getById(Number(id));
      return { success: true, data: purchase };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('purchases:create', async (_event, rawData: unknown) => {
    try {
      const validated = createPurchaseSchema.parse(rawData);
      const db = getDatabase();
      const repo = new PurchaseRepo(db);
      const purchase = repo.createPurchase(validated as CreatePurchaseInput);
      return { success: true, data: purchase };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('purchases:createReturn', async (_event, rawData: unknown) => {
    try {
      const validated = createPurchaseReturnSchema.parse(rawData);
      const db = getDatabase();
      const repo = new PurchaseRepo(db);
      const ret = repo.createReturn(validated as CreatePurchaseReturnInput);
      return { success: true, data: ret };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('purchases:getNextNumber', async () => {
    try {
      const db = getDatabase();
      const repo = new PurchaseRepo(db);
      const nextNum = repo.getNextPurchaseNumber();
      return { success: true, data: nextNum };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 13. Payment Handlers
  ipcMain.handle('payments:getAll', async (_event, filters?: any) => {
    try {
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const payments = repo.getAllPayments(filters);
      return { success: true, data: payments };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('payments:recordSupplierPayment', async (_event, rawData: unknown) => {
    try {
      const validated = recordSupplierPaymentSchema.parse(rawData);
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const payment = repo.recordSupplierPayment(validated as RecordSupplierPaymentInput);
      return { success: true, data: payment };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('payments:recordCustomerPayment', async (_event, rawData: unknown) => {
    try {
      const validated = recordCustomerPaymentSchema.parse(rawData);
      const db = getDatabase();
      const repo = new AccountRepo(db);
      const payment = repo.recordCustomerPayment(validated as RecordCustomerPaymentInput);
      return { success: true, data: payment };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}

