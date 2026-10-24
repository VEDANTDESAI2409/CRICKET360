import {
  AppInfo,
  AppSetting,
  DatabaseStats,
  HealthCheckResult,
  DashboardMetrics,
  LowStockAlertItem,
  RecentTransactionItem,
  DaySalesSummary,
  ProductWithDetails,
  ProductVariant,
  CreateProductInput,
  UpdateProductInput,
  ProductFilterQuery,
  Category,
  Brand,
  Unit,
  HsnCode,
  StockAdjustment,
  StockMovement,
  StockAdjustmentInput,
  SalesInvoice,
  CreateInvoiceInput,
  InvoiceFilterQuery,
  Customer,
  CreateCustomerInput,
} from './models';

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface IpcApi {
  app: {
    getInfo: () => Promise<IpcResult<AppInfo>>;
    getHealthCheck: () => Promise<IpcResult<HealthCheckResult>>;
  };
  settings: {
    getAll: () => Promise<IpcResult<AppSetting[]>>;
    get: (key: string) => Promise<IpcResult<string | null>>;
    set: (key: string, value: string) => Promise<IpcResult<boolean>>;
  };
  db: {
    getStats: () => Promise<IpcResult<DatabaseStats>>;
  };
  dashboard: {
    getMetrics: () => Promise<IpcResult<DashboardMetrics>>;
    getLowStockAlerts: () => Promise<IpcResult<LowStockAlertItem[]>>;
    getRecentTransactions: () => Promise<IpcResult<RecentTransactionItem[]>>;
    getWeeklySalesSummary: () => Promise<IpcResult<DaySalesSummary[]>>;
  };
  products: {
    getAll: (filters?: ProductFilterQuery) => Promise<IpcResult<ProductWithDetails[]>>;
    getById: (id: number) => Promise<IpcResult<ProductWithDetails | null>>;
    create: (data: CreateProductInput) => Promise<IpcResult<ProductWithDetails>>;
    update: (data: UpdateProductInput) => Promise<IpcResult<ProductWithDetails>>;
    toggleActive: (id: number, is_active: number) => Promise<IpcResult<boolean>>;
    delete: (id: number) => Promise<IpcResult<boolean>>;
    validateSku: (sku: string, excludeProductId?: number) => Promise<IpcResult<{ available: boolean }>>;
    validateBarcode: (barcode: string, excludeProductId?: number) => Promise<IpcResult<{ available: boolean }>>;
    generateSku: (categoryCode: string, brandCode: string) => Promise<IpcResult<string>>;
    generateBarcode: () => Promise<IpcResult<string>>;
    getVariants: (productId: number) => Promise<IpcResult<ProductVariant[]>>;
  };
  inventory: {
    getStockMovements: (productId?: number, limit?: number) => Promise<IpcResult<StockMovement[]>>;
    adjustStock: (data: StockAdjustmentInput) => Promise<IpcResult<StockAdjustment>>;
    getAdjustments: (productId?: number, limit?: number) => Promise<IpcResult<StockAdjustment[]>>;
  };
  masters: {
    getCategories: () => Promise<IpcResult<Category[]>>;
    getBrands: () => Promise<IpcResult<Brand[]>>;
    getUnits: () => Promise<IpcResult<Unit[]>>;
    getHsnCodes: () => Promise<IpcResult<HsnCode[]>>;
    createCategory: (name: string, code: string, description?: string) => Promise<IpcResult<Category>>;
    createBrand: (name: string, code: string) => Promise<IpcResult<Brand>>;
  };
  billing: {
    createInvoice: (data: CreateInvoiceInput) => Promise<IpcResult<SalesInvoice>>;
    getInvoices: (filters?: InvoiceFilterQuery) => Promise<IpcResult<SalesInvoice[]>>;
    getInvoiceById: (id: number) => Promise<IpcResult<SalesInvoice | null>>;
    cancelInvoice: (invoiceId: number, reason: string) => Promise<IpcResult<SalesInvoice>>;
    getNextInvoiceNumber: () => Promise<IpcResult<string>>;
    getShopSettings: () => Promise<
      IpcResult<{
        shopName: string;
        shopGstin: string;
        shopAddress: string;
        shopPhone: string;
        shopEmail: string;
        shopStateCode: string;
      }>
    >;
  };
  customers: {
    search: (query?: string) => Promise<IpcResult<Customer[]>>;
    create: (data: CreateCustomerInput) => Promise<IpcResult<Customer>>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}

