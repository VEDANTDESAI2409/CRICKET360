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
  balance_paise: number;
  is_active: number;
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
