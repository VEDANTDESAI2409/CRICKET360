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
  UpdateCustomerInput,
  CustomerStatement,
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierStatement,
  Purchase,
  CreatePurchaseInput,
  PurchaseReturn,
  CreatePurchaseReturnInput,
  PaymentRecord,
  PaymentMode,
  PaymentType,
  RecordSupplierPaymentInput,
  RecordCustomerPaymentInput,
  SalesReturn,
  CreateSalesReturnInput,
  SalesReturnFilterQuery,
  ExpenseCategory,
  CreateExpenseCategoryInput,
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterQuery,
  AuditLog,
  AuditLogFilterQuery,
  BackupMetadata,
  VerifyBackupResult,
  RestoreBackupResult,
  ReportDateFilter,
  SalesReportSummary,
  PurchaseReportSummary,
  ProfitLossReport,
  InventoryValuationReport,
  TaxSummaryReport,
  PaymentRegisterSummary,
  ShopSettings,
  UpdateShopSettingsInput,
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
    getById: (id: number) => Promise<IpcResult<Customer | null>>;
    create: (data: CreateCustomerInput) => Promise<IpcResult<Customer>>;
    update: (data: UpdateCustomerInput) => Promise<IpcResult<Customer>>;
    getLedger: (id: number) => Promise<IpcResult<CustomerStatement>>;
  };
  suppliers: {
    getAll: (search?: string) => Promise<IpcResult<Supplier[]>>;
    getById: (id: number) => Promise<IpcResult<Supplier | null>>;
    create: (data: CreateSupplierInput) => Promise<IpcResult<Supplier>>;
    update: (data: UpdateSupplierInput) => Promise<IpcResult<Supplier>>;
    getLedger: (id: number) => Promise<IpcResult<SupplierStatement>>;
  };
  purchases: {
    getAll: (filters?: {
      supplier_id?: number;
      search?: string;
      status?: string;
      payment_status?: string;
      limit?: number;
      offset?: number;
    }) => Promise<IpcResult<Purchase[]>>;
    getById: (id: number) => Promise<IpcResult<Purchase | null>>;
    create: (data: CreatePurchaseInput) => Promise<IpcResult<Purchase>>;
    createReturn: (data: CreatePurchaseReturnInput) => Promise<IpcResult<PurchaseReturn>>;
    getNextNumber: () => Promise<IpcResult<string>>;
  };
  payments: {
    getAll: (filters?: {
      party_type?: 'CUSTOMER' | 'SUPPLIER';
      party_id?: number;
      payment_mode?: PaymentMode;
      payment_type?: PaymentType;
      limit?: number;
      offset?: number;
    }) => Promise<IpcResult<PaymentRecord[]>>;
    recordSupplierPayment: (data: RecordSupplierPaymentInput) => Promise<IpcResult<PaymentRecord>>;
    recordCustomerPayment: (data: RecordCustomerPaymentInput) => Promise<IpcResult<PaymentRecord>>;
  };
  returns: {
    getAll: (filters?: SalesReturnFilterQuery) => Promise<IpcResult<SalesReturn[]>>;
    getById: (id: number) => Promise<IpcResult<SalesReturn | null>>;
    create: (data: CreateSalesReturnInput) => Promise<IpcResult<SalesReturn>>;
    getNextNumber: () => Promise<IpcResult<string>>;
  };
  expenses: {
    getCategories: () => Promise<IpcResult<ExpenseCategory[]>>;
    createCategory: (data: CreateExpenseCategoryInput) => Promise<IpcResult<ExpenseCategory>>;
    getAll: (filters?: ExpenseFilterQuery) => Promise<IpcResult<Expense[]>>;
    getById: (id: number) => Promise<IpcResult<Expense | null>>;
    create: (data: CreateExpenseInput) => Promise<IpcResult<Expense>>;
    update: (data: UpdateExpenseInput) => Promise<IpcResult<Expense>>;
    delete: (id: number) => Promise<IpcResult<boolean>>;
    getNextNumber: () => Promise<IpcResult<string>>;
  };
  reports: {
    getSalesReport: (filter: ReportDateFilter) => Promise<IpcResult<SalesReportSummary>>;
    getPurchaseReport: (filter: ReportDateFilter) => Promise<IpcResult<PurchaseReportSummary>>;
    getProfitLossReport: (filter: ReportDateFilter) => Promise<IpcResult<ProfitLossReport>>;
    getInventoryValuationReport: () => Promise<IpcResult<InventoryValuationReport>>;
    getTaxReport: (filter: ReportDateFilter) => Promise<IpcResult<TaxSummaryReport>>;
    getPaymentsSummaryReport: (filter: ReportDateFilter) => Promise<IpcResult<PaymentRegisterSummary>>;
    exportCsv: (reportType: string, filter?: ReportDateFilter) => Promise<IpcResult<{ csvContent: string; filename: string }>>;
  };
  backups: {
    create: (notes?: string) => Promise<IpcResult<BackupMetadata>>;
    getAll: () => Promise<IpcResult<BackupMetadata[]>>;
    verify: (backupFilename: string) => Promise<IpcResult<VerifyBackupResult>>;
    restore: (backupFilename: string) => Promise<IpcResult<RestoreBackupResult>>;
  };
  audit: {
    getLogs: (filters?: AuditLogFilterQuery) => Promise<IpcResult<AuditLog[]>>;
  };
  systemSettings: {
    get: () => Promise<IpcResult<ShopSettings>>;
    update: (data: UpdateShopSettingsInput) => Promise<IpcResult<ShopSettings>>;
  };
  exportImport: {
    exportProductsCsv: () => Promise<IpcResult<{ csvContent: string; filename: string }>>;
    importProductsCsv: (csvContent: string) => Promise<IpcResult<{ importedCount: number; errors: string[] }>>;
    exportCustomersCsv: () => Promise<IpcResult<{ csvContent: string; filename: string }>>;
    exportSalesCsv: (filter?: ReportDateFilter) => Promise<IpcResult<{ csvContent: string; filename: string }>>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}

