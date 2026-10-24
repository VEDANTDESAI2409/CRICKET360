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
  company_name?: string;
  phone?: string;
  gstin?: string;
  balance_paise: number;
  is_active: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  state_code?: string;
  credit_limit_paise?: number;
  balance_paise: number;
  is_active: number;
  created_at?: string;
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

export interface PaymentRecord {
  id: number;
  payment_number: string;
  payment_date: string;
  party_type: 'CUSTOMER' | 'SUPPLIER';
  party_id: number;
  invoice_id?: number | null;
  amount_paise: number;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
}

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
  reference_number?: string;
}

export interface CreateInvoiceInput {
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_gstin?: string;
  customer_address?: string;
  customer_state_code?: string;
  items: CreateInvoiceItemInput[];
  discount_amount_paise?: number;
  payments: PaymentTenderInput[];
  notes?: string;
}

export interface InvoiceFilterQuery {
  search?: string;
  status?: InvoiceStatus;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  state_code?: string;
  credit_limit_paise?: number;
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
