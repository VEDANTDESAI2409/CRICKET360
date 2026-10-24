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

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  purchase_cost_paise: number;
  selling_price_paise: number;
  mrp_paise: number;
  is_active: number;
  created_at: string;
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
