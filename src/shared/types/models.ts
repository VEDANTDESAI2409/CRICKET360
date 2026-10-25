export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  dbPath: string;
  isPackaged: boolean;
  walEnabled: boolean;
  foreignKeysEnabled: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: number;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  code: string;
  is_active: number;
  created_at: string;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
}

export interface HsnCode {
  id: number;
  hsn_code: string;
  description: string;
  tax_rate_percent: number;
  is_active: number;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  stock_quantity: number;
  tax_rate_percent: number;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id: number;
  brand_id: number;
  unit_id: number;
  hsn_code: string;
  tax_rate_percent: number;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  stock_quantity: number;
  min_stock_level: number;
  reorder_level: number;
  has_variants: number;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductWithDetails extends Product {
  category_name: string;
  brand_name: string;
  unit_name: string;
  unit_symbol: string;
  variants_count: number;
  variants?: ProductVariant[];
}

export interface CreateVariantInput {
  variant_name: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  opening_stock_quantity: number;
  tax_rate_percent?: number;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string;
  category_id: number;
  brand_id: number;
  unit_id: number;
  hsn_code?: string;
  tax_rate_percent?: number;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  min_stock_level: number;
  reorder_level: number;
  opening_stock_quantity: number;
  has_variants: boolean;
  variants?: CreateVariantInput[];
}

export interface UpdateProductInput {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id: number;
  brand_id: number;
  unit_id: number;
  hsn_code?: string;
  tax_rate_percent?: number;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  min_stock_level: number;
  reorder_level: number;
  is_active: number;
}

export type StockAdjustmentReason =
  | 'PHYSICAL_AUDIT_MISMATCH'
  | 'DAMAGED_IN_STORE'
  | 'EXPIRED_DEFECTIVE'
  | 'SAMPLE_DEMO'
  | 'THEFT_OR_LOSS'
  | 'FOUND_SURPLUS'
  | 'OTHER';

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  variant_id?: number;
  variant_name?: string;
  old_quantity: number;
  new_quantity: number;
  variance_quantity: number;
  reason: StockAdjustmentReason;
  notes?: string;
  user_id?: number;
  created_at: string;
}

export interface StockAdjustmentInput {
  product_id: number;
  variant_id?: number;
  new_quantity: number;
  reason: StockAdjustmentReason;
  notes?: string;
}

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'SALE_INVOICE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'DAMAGE_WRITE_OFF'
  | 'PHYSICAL_ADJUSTMENT';

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  variant_id?: number;
  variant_name?: string;
  movement_type: StockMovementType;
  quantity_change: number;
  balance_quantity_after: number;
  reference_table?: string;
  reference_id?: number;
  notes?: string;
  created_at: string;
}

export interface ProductFilterQuery {
  search?: string;
  category_id?: number;
  brand_id?: number;
  stock_status?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE';
  is_active?: number;
  sort_by?: 'name' | 'sku' | 'price' | 'stock' | 'created_at';
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface Supplier {
  id: number;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string;
  payment_terms_days: number;
  notes?: string | null;
  balance_paise: number;
  is_active: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface CreateSupplierInput {
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string;
  payment_terms_days?: number;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  id: number;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string;
  payment_terms_days?: number;
  notes?: string | null;
  is_active?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string | null;
  credit_limit_paise?: number;
  notes?: string | null;
  balance_paise: number;
  is_active: number;
  created_at?: string;
  updated_at?: string | null;
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
export type InvoiceStatus = 'COMPLETED' | 'CANCELLED' | 'RETURNED';

export interface SalesInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name_snapshot: string;
  variant_name_snapshot?: string | null;
  sku_snapshot: string;
  barcode_snapshot?: string | null;
  hsn_code_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_price_paise: number;
  mrp_paise: number;
  discount_amount_paise: number;
  taxable_amount_paise: number;
  tax_rate_percent: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_amount_paise: number;
  created_at: string;
}

export type PaymentType =
  | 'INVOICE_PAYMENT'
  | 'PURCHASE_PAYMENT'
  | 'CUSTOMER_RECEIPT'
  | 'SUPPLIER_PAYOUT'
  | 'REFUND';

export interface PaymentRecord {
  id: number;
  payment_number: string;
  payment_date: string;
  party_type: 'CUSTOMER' | 'SUPPLIER';
  party_id: number;
  party_name?: string;
  invoice_id?: number | null;
  invoice_number?: string | null;
  purchase_id?: number | null;
  purchase_number?: string | null;
  payment_type?: PaymentType;
  amount_paise: number;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
}

export type Payment = PaymentRecord;

export interface SalesInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  customer_id?: number | null;
  customer_name_snapshot: string;
  customer_phone_snapshot?: string | null;
  customer_gstin_snapshot?: string | null;
  customer_address_snapshot?: string | null;
  place_of_supply: string;
  is_inter_state: number;
  taxable_amount_paise: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_tax_paise: number;
  discount_amount_paise: number;
  round_off_paise: number;
  grand_total_paise: number;
  paid_amount_paise: number;
  balance_amount_paise: number;
  payment_status: PaymentStatus;
  status: InvoiceStatus;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  items?: SalesInvoiceItem[];
  payments?: PaymentRecord[];
}

export interface CreateInvoiceItemInput {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_price_paise: number;
  discount_amount_paise?: number;
}

export interface PaymentTenderInput {
  mode: PaymentMode;
  amount_paise: number;
  reference_number?: string | null;
}

export interface CreateInvoiceInput {
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_gstin?: string | null;
  customer_address?: string | null;
  customer_state_code?: string | null;
  items: CreateInvoiceItemInput[];
  discount_amount_paise?: number;
  payments: PaymentTenderInput[];
  notes?: string | null;
}

export interface InvoiceFilterQuery {
  search?: string;
  status?: InvoiceStatus;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name_snapshot: string;
  variant_name_snapshot?: string | null;
  sku_snapshot: string;
  barcode_snapshot?: string | null;
  hsn_code_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_cost_paise: number;
  discount_amount_paise: number;
  taxable_amount_paise: number;
  tax_rate_percent: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_amount_paise: number;
  returned_quantity: number;
  created_at: string;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_invoice_number: string;
  supplier_id: number;
  supplier_name_snapshot?: string | null;
  supplier_gstin_snapshot?: string | null;
  purchase_date: string;
  place_of_supply: string;
  is_inter_state: number;
  taxable_amount_paise: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_tax_paise: number;
  subtotal_paise: number;
  discount_amount_paise: number;
  round_off_paise: number;
  total_amount_paise: number;
  paid_amount_paise: number;
  balance_amount_paise: number;
  payment_status: PaymentStatus;
  status: 'RECEIVED' | 'CANCELLED';
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  items?: PurchaseItem[];
  payments?: PaymentRecord[];
  supplier_name?: string;
}

export interface CreatePurchaseItemInput {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_cost_paise: number;
  tax_rate_percent: number;
  discount_amount_paise?: number;
}

export interface CreatePurchaseInput {
  supplier_id: number;
  supplier_invoice_number: string;
  purchase_date: string;
  place_of_supply?: string;
  is_inter_state?: boolean;
  items: CreatePurchaseItemInput[];
  discount_amount_paise?: number;
  notes?: string;
  initial_payment?: {
    amount_paise: number;
    payment_mode: PaymentMode;
    reference_number?: string;
    notes?: string;
  };
}

export interface PurchaseReturnItem {
  id: number;
  purchase_return_id: number;
  purchase_item_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name?: string;
  quantity: number;
  unit_cost_paise: number;
  tax_rate_percent: number;
  taxable_amount_paise: number;
  total_amount_paise: number;
  created_at: string;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  purchase_id: number;
  supplier_id: number;
  supplier_name?: string;
  purchase_number?: string;
  return_date: string;
  taxable_amount_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
  reason: string;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  items?: PurchaseReturnItem[];
}

export interface CreatePurchaseReturnItemInput {
  purchase_item_id: number;
  quantity: number;
}

export interface CreatePurchaseReturnInput {
  purchase_id: number;
  return_date: string;
  reason: string;
  notes?: string;
  items: CreatePurchaseReturnItemInput[];
}

export interface RecordSupplierPaymentInput {
  supplier_id: number;
  purchase_id?: number | null;
  amount_paise: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  notes?: string | null;
}

export interface RecordCustomerPaymentInput {
  customer_id: number;
  invoice_id?: number | null;
  amount_paise: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  notes?: string | null;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  reference_number: string;
  description: string;
  debit_paise: number;
  credit_paise: number;
  running_balance_paise: number;
}

export interface CustomerStatement {
  customer: Customer;
  totalSalesPaise: number;
  totalPaidPaise: number;
  outstandingBalancePaise: number;
  invoices: SalesInvoice[];
  payments: PaymentRecord[];
  entries: LedgerEntry[];
}

export interface SupplierStatement {
  supplier: Supplier;
  totalPurchasesPaise: number;
  totalPaidPaise: number;
  totalReturnsPaise: number;
  outstandingBalancePaise: number;
  purchases: Purchase[];
  payments: PaymentRecord[];
  returns: PurchaseReturn[];
  entries: LedgerEntry[];
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string | null;
  credit_limit_paise?: number;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state_code?: string | null;
  credit_limit_paise?: number;
  notes?: string | null;
  is_active?: number;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'ADMIN' | 'CASHIER' | 'STAFF';
  is_active: number;
}

export interface DatabaseStats {
  categoryCount: number;
  brandCount: number;
  productCount: number;
  customerCount: number;
  supplierCount: number;
  migrationVersion: string;
}

export interface HealthCheckResult {
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  foreignKeys: boolean;
  journalMode: string;
  integrity: string;
  timestamp: string;
}

export interface DashboardMetrics {
  totalActiveProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalStockQuantity: number;
  totalStockValuationPaise: number;
  todaySalesPaise: number;
  todayPurchasesPaise: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface LowStockAlertItem {
  id: number;
  name: string;
  sku: string;
  categoryName: string;
  brandName: string;
  stockQuantity: number;
  minStockLevel: number;
  reorderLevel: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  mrpPaise: number;
  sellingPricePaise: number;
}

export interface RecentTransactionItem {
  id: number;
  referenceNumber: string;
  partyName: string;
  transactionDate: string;
  totalAmountPaise: number;
  status: string;
  type: 'SALE' | 'PURCHASE';
}

export interface DaySalesSummary {
  dayName: string;
  date: string;
  salesAmountPaise: number;
  invoiceCount: number;
}

// ==========================================
// Milestone 6: Sales Returns & Refunds
// ==========================================

export interface SalesReturnItem {
  id: number;
  sales_return_id: number;
  sales_invoice_item_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name_snapshot: string;
  variant_name_snapshot?: string | null;
  sku_snapshot: string;
  quantity: number;
  unit_price_paise: number;
  discount_amount_paise: number;
  taxable_amount_paise: number;
  tax_rate_percent: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_amount_paise: number;
  restock: number;
  created_at: string;
}

export interface SalesReturn {
  id: number;
  return_number: string;
  invoice_id: number;
  invoice_number?: string;
  customer_id?: number | null;
  customer_name_snapshot: string;
  return_date: string;
  taxable_amount_paise: number;
  cgst_amount_paise: number;
  sgst_amount_paise: number;
  igst_amount_paise: number;
  total_tax_paise: number;
  round_off_paise: number;
  grand_total_paise: number;
  refund_mode: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'STORE_CREDIT';
  refund_reference?: string | null;
  reason: string;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  items?: SalesReturnItem[];
}

export interface CreateSalesReturnItemInput {
  sales_invoice_item_id: number;
  quantity: number;
  restock: boolean;
}

export interface CreateSalesReturnInput {
  invoice_id: number;
  return_date: string;
  refund_mode: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'STORE_CREDIT';
  refund_reference?: string | null;
  reason: string;
  notes?: string | null;
  items: CreateSalesReturnItemInput[];
}

export interface SalesReturnFilterQuery {
  search?: string;
  start_date?: string;
  end_date?: string;
  customer_id?: number;
}

// ==========================================
// Milestone 6: Expense Management
// ==========================================

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: number;
  created_at: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface Expense {
  id: number;
  expense_number: string;
  category_id: number;
  category_name?: string;
  category_code?: string;
  expense_date: string;
  amount_paise: number;
  payment_mode: PaymentMode;
  payment_status: 'PAID' | 'PENDING' | 'DRAFT';
  payee_name?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateExpenseInput {
  category_id: number;
  expense_date: string;
  amount_paise: number;
  payment_mode: PaymentMode;
  payment_status?: 'PAID' | 'PENDING' | 'DRAFT';
  payee_name?: string | null;
  supplier_id?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  id: number;
  category_id?: number;
  expense_date?: string;
  amount_paise?: number;
  payment_mode?: PaymentMode;
  payment_status?: 'PAID' | 'PENDING' | 'DRAFT';
  payee_name?: string | null;
  supplier_id?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface ExpenseFilterQuery {
  search?: string;
  category_id?: number;
  payment_status?: 'PAID' | 'PENDING' | 'DRAFT';
  payment_mode?: PaymentMode;
  start_date?: string;
  end_date?: string;
}

// ==========================================
// Milestone 6: Audit Logs
// ==========================================

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details_json?: string | null;
  user_id?: number | null;
  username_snapshot?: string | null;
  created_at: string;
}

export interface CreateAuditLogInput {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details_json?: string | null;
  user_id?: number | null;
  username_snapshot?: string | null;
}

export interface AuditLogFilterQuery {
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

// ==========================================
// Milestone 6: Database Backup & Restore
// ==========================================

export interface BackupMetadata {
  id: number;
  backup_filename: string;
  file_path: string;
  file_size_bytes: number;
  sha256_hash: string;
  backup_type: 'MANUAL' | 'SCHEDULED' | 'PRE_RESTORE';
  status: 'VALID' | 'RESTORED' | 'CORRUPTED';
  notes?: string | null;
  created_at: string;
}

export interface CreateBackupResult {
  success: boolean;
  backup?: BackupMetadata;
  error?: string;
}

export interface VerifyBackupResult {
  isValid: boolean;
  sha256Matched: boolean;
  sqliteIntegrityOk: boolean;
  fileSizeBytes: number;
  message: string;
}

export interface RestoreBackupResult {
  success: boolean;
  preRestoreBackupPath?: string;
  restoredFrom: string;
  error?: string;
}

// ==========================================
// Milestone 6: Reports & Business Analytics
// ==========================================

export interface ReportDateFilter {
  start_date: string;
  end_date: string;
}

export interface SalesReportSummary {
  startDate: string;
  endDate: string;
  totalInvoicesCount: number;
  grossSalesPaise: number;
  totalDiscountsPaise: number;
  returnsAmountPaise: number;
  netSalesPaise: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  roundOffPaise: number;
  paymentBreakdown: Record<string, number>;
  dailyTrend: Array<{
    date: string;
    invoiceCount: number;
    netSalesPaise: number;
  }>;
}

export interface PurchaseReportSummary {
  startDate: string;
  endDate: string;
  totalPurchasesCount: number;
  totalInwardCostPaise: number;
  returnsAmountPaise: number;
  netPurchasesPaise: number;
  totalTaxPaidPaise: number;
  unpaidDuesPaise: number;
}

export interface ProfitLossReport {
  startDate: string;
  endDate: string;
  costingMethod: 'WEIGHTED_LANDED_COST';
  grossRevenuePaise: number;
  discountsPaise: number;
  returnsPaise: number;
  netRevenuePaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  grossMarginPercent: number;
  operatingExpensesPaise: number;
  expensesByCategory: Array<{
    categoryName: string;
    amountPaise: number;
  }>;
  netOperatingProfitPaise: number;
  netMarginPercent: number;
}

export interface InventoryValuationReport {
  totalStockUnits: number;
  totalCostValuationPaise: number;
  totalRetailValuationPaise: number;
  potentialGrossProfitPaise: number;
  categoryBreakdown: Array<{
    categoryName: string;
    units: number;
    costValuationPaise: number;
    retailValuationPaise: number;
  }>;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface TaxSummaryReport {
  startDate: string;
  endDate: string;
  b2bSales: Array<{
    customerName: string;
    gstin: string;
    invoiceNumber: string;
    invoiceDate: string;
    taxableAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalPaise: number;
  }>;
  b2cIntraStateTaxablePaise: number;
  b2cIntraStateTaxPaise: number;
  b2cInterStateTaxablePaise: number;
  b2cInterStateTaxPaise: number;
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    taxRatePercent: number;
    totalQuantity: number;
    taxableAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalTaxPaise: number;
  }>;
  totalOutputTaxPaise: number;
  totalInputTaxPaise: number;
}

export interface PaymentRegisterSummary {
  startDate: string;
  endDate: string;
  totalInflowsPaise: number;
  totalOutflowsPaise: number;
  netCashFlowPaise: number;
  inflowsByMode: Record<string, number>;
  outflowsByMode: Record<string, number>;
}

// ==========================================
// Milestone 6: System Settings & Shop Details
// ==========================================

export interface ShopSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  shop_gstin: string;
  shop_state_code: string;
  invoice_prefix: string;
  next_invoice_number: string;
  thermal_printer_name: string;
  thermal_receipt_width: string;
  currency_symbol: string;
  store_terms_and_conditions?: string;
  auto_backup_enabled?: string;
  auto_backup_retention_days?: string;
  low_stock_warning_threshold?: string;
}

export interface UpdateShopSettingsInput {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  shop_gstin: string;
  shop_state_code: string;
  invoice_prefix: string;
  thermal_printer_name?: string;
  thermal_receipt_width?: string;
  store_terms_and_conditions?: string;
  auto_backup_enabled?: string;
  auto_backup_retention_days?: string;
  low_stock_warning_threshold?: string;
}
