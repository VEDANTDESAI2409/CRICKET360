# Cricket360: Database Design & Data Integrity Specification

## 1. Overview & Technology Selection

Cricket360 uses **SQLite 3** managed via the `better-sqlite3` driver in the Electron Main process.
SQLite is an ideal solution for an offline-first Windows sports retail application because it requires zero background server processes, has zero external port exposure, offers microsecond query latency, and provides transactional ACID guarantees.

### Key Connection Settings:
```sql
PRAGMA journal_mode = WAL;         -- High concurrency and fast writes
PRAGMA foreign_keys = ON;          -- Strict referential integrity enforcement
PRAGMA synchronous = NORMAL;       -- Fast durable writes under WAL mode
PRAGMA busy_timeout = 5000;        -- Wait up to 5s if locked
PRAGMA temp_store = MEMORY;        -- Use memory for temporary tables & sorts
```

---

## 2. Financial Precision & Monetary Representation

### Rule: Integer Minor Currency Units (Paise)
- **1 Indian Rupee (INR) = 100 Paise.**
- All monetary columns in the database (`selling_price_paise`, `mrp_paise`, `purchase_cost_paise`, `taxable_amount_paise`, `cgst_amount_paise`, `sgst_amount_paise`, `igst_amount_paise`, `total_amount_paise`, `paid_amount_paise`, `balance_amount_paise`) are declared as `INTEGER NOT NULL`.
- Example: An item priced at ₹1,499.50 is stored as `149950`.
- Benefits:
  1. Completely eliminates floating-point rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`).
  2. Ensures GST calculation checks (`taxable + cgst + sgst == total`) balance to the exact integer paisa.
  3. Complies with strict retail audit requirements.

---

## 3. Database Schema Entities & Relationships

### 3.1 Master Catalog Entities
- **`categories`**: `id`, `name`, `code`, `description`, `is_active`, `created_at`
- **`subcategories`**: `id`, `category_id` (FK), `name`, `code`, `is_active`
- **`brands`**: `id`, `name`, `code`, `is_active` (e.g. SS, SG, Kookaburra, MRF, Gray-Nicolls, DSC, Spartan)
- **`sports`**: `id`, `name`, `code` (e.g. Cricket, Badminton, Football, Tennis, Table Tennis)
- **`units`**: `id`, `name`, `symbol` (e.g. Pcs, Box, Pair, Set, Dozen)
- **`hsn_codes`**: `id`, `hsn_code` (UNIQUE), `description`, `gst_rate_percent` (e.g. 1200 for 12.00%, 1800 for 18.00%)

### 3.2 Product & Variant Entities
- **`products`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `name`: TEXT NOT NULL
  - `sku`: TEXT UNIQUE NOT NULL
  - `barcode`: TEXT UNIQUE
  - `category_id`: INTEGER REFERENCES `categories(id)`
  - `subcategory_id`: INTEGER REFERENCES `subcategories(id)`
  - `brand_id`: INTEGER REFERENCES `brands(id)`
  - `sport_id`: INTEGER REFERENCES `sports(id)`
  - `unit_id`: INTEGER REFERENCES `units(id)`
  - `hsn_code_id`: INTEGER REFERENCES `hsn_codes(id)`
  - `purchase_cost_paise`: INTEGER NOT NULL DEFAULT 0
  - `selling_price_paise`: INTEGER NOT NULL DEFAULT 0
  - `mrp_paise`: INTEGER NOT NULL DEFAULT 0
  - `min_stock_level`: INTEGER NOT NULL DEFAULT 5
  - `reorder_level`: INTEGER NOT NULL DEFAULT 10
  - `has_variants`: BOOLEAN NOT NULL DEFAULT 0
  - `is_active`: BOOLEAN NOT NULL DEFAULT 1
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))
  - `updated_at`: TEXT NOT NULL DEFAULT (datetime('now'))

- **`product_variants`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)` ON DELETE CASCADE
  - `variant_name`: TEXT NOT NULL (e.g. "Size: SH / Color: Red")
  - `sku`: TEXT UNIQUE NOT NULL
  - `barcode`: TEXT UNIQUE
  - `size`: TEXT (e.g. "SH", "LH", "Size 5", "Size 6", "Youth")
  - `color`: TEXT
  - `purchase_cost_paise`: INTEGER NOT NULL
  - `selling_price_paise`: INTEGER NOT NULL
  - `mrp_paise`: INTEGER NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT 1

### 3.3 Inventory & Stock Audit Entities
- **`stock_movements`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)`
  - `variant_id`: INTEGER REFERENCES `product_variants(id)`
  - `movement_type`: TEXT NOT NULL CHECK(movement_type IN ('OPENING_STOCK', 'PURCHASE_RECEIPT', 'SALE_INVOICE', 'SALE_RETURN', 'PURCHASE_RETURN', 'DAMAGE_WRITE_OFF', 'PHYSICAL_ADJUSTMENT'))
  - `quantity_change`: INTEGER NOT NULL -- Positive for inward, negative for outward
  - `balance_quantity_after`: INTEGER NOT NULL
  - `reference_table`: TEXT -- e.g. 'sales_invoices', 'purchases'
  - `reference_id`: INTEGER
  - `notes`: TEXT
  - `user_id`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

- **`stock_adjustments`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `adjustment_number`: TEXT UNIQUE NOT NULL
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)`
  - `variant_id`: INTEGER REFERENCES `product_variants(id)`
  - `old_quantity`: INTEGER NOT NULL
  - `new_quantity`: INTEGER NOT NULL
  - `variance_quantity`: INTEGER NOT NULL
  - `reason`: TEXT NOT NULL
  - `user_id`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

### 3.4 Contact Entities (Parties)
- **`suppliers`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `name`: TEXT NOT NULL
  - `company_name`: TEXT
  - `gstin`: TEXT
  - `phone`: TEXT
  - `email`: TEXT
  - `address`: TEXT
  - `state_code`: TEXT -- e.g. "27" for Maharashtra
  - `balance_paise`: INTEGER NOT NULL DEFAULT 0 -- Positive = we owe supplier
  - `is_active`: BOOLEAN NOT NULL DEFAULT 1

- **`customers`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `name`: TEXT NOT NULL DEFAULT 'Walk-in Customer'
  - `phone`: TEXT
  - `gstin`: TEXT
  - `address`: TEXT
  - `state_code`: TEXT
  - `credit_limit_paise`: INTEGER NOT NULL DEFAULT 0
  - `balance_paise`: INTEGER NOT NULL DEFAULT 0 -- Positive = customer owes shop
  - `is_active`: BOOLEAN NOT NULL DEFAULT 1

### 3.5 Sales & Billing Entities
- **`sales_invoices`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `invoice_number`: TEXT UNIQUE NOT NULL -- e.g. "INV-2026-0001"
  - `invoice_date`: TEXT NOT NULL
  - `customer_id`: INTEGER REFERENCES `customers(id)`
  - `customer_name_snapshot`: TEXT NOT NULL
  - `customer_gstin_snapshot`: TEXT
  - `customer_phone_snapshot`: TEXT
  - `place_of_supply`: TEXT NOT NULL -- State code
  - `is_inter_state`: BOOLEAN NOT NULL DEFAULT 0
  - `taxable_amount_paise`: INTEGER NOT NULL
  - `cgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `sgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `igst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `total_tax_paise`: INTEGER NOT NULL
  - `discount_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `round_off_paise`: INTEGER NOT NULL DEFAULT 0
  - `grand_total_paise`: INTEGER NOT NULL
  - `paid_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `balance_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `payment_status`: TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID'))
  - `status`: TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'CANCELLED', 'RETURNED'))
  - `cancellation_reason`: TEXT
  - `user_id`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

- **`invoice_items`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `invoice_id`: INTEGER NOT NULL REFERENCES `sales_invoices(id)` ON DELETE CASCADE
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)`
  - `variant_id`: INTEGER REFERENCES `product_variants(id)`
  - `product_name_snapshot`: TEXT NOT NULL
  - `variant_name_snapshot`: TEXT
  - `hsn_code_snapshot`: TEXT NOT NULL
  - `unit_snapshot`: TEXT NOT NULL
  - `quantity`: INTEGER NOT NULL
  - `unit_price_paise`: INTEGER NOT NULL
  - `mrp_paise`: INTEGER NOT NULL
  - `discount_percent_basis_points`: INTEGER NOT NULL DEFAULT 0 -- e.g. 500 = 5.00%
  - `discount_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `taxable_amount_paise`: INTEGER NOT NULL
  - `gst_rate_basis_points`: INTEGER NOT NULL -- e.g. 1200 = 12.00%
  - `cgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `sgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `igst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `total_amount_paise`: INTEGER NOT NULL

### 3.6 Payments & Financial Ledger
- **`payments`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `payment_number`: TEXT UNIQUE NOT NULL
  - `payment_date`: TEXT NOT NULL
  - `party_type`: TEXT NOT NULL CHECK(party_type IN ('CUSTOMER', 'SUPPLIER'))
  - `party_id`: INTEGER NOT NULL
  - `invoice_id`: INTEGER REFERENCES `sales_invoices(id)`
  - `amount_paise`: INTEGER NOT NULL
  - `payment_mode`: TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'))
  - `reference_number`: TEXT -- e.g. UPI UTR or Card auth code
  - `notes`: TEXT
  - `user_id`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

### 3.7 Purchasing Entities
- **`purchases`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `purchase_number`: TEXT UNIQUE NOT NULL
  - `supplier_invoice_number`: TEXT NOT NULL
  - `supplier_id`: INTEGER NOT NULL REFERENCES `suppliers(id)`
  - `purchase_date`: TEXT NOT NULL
  - `taxable_amount_paise`: INTEGER NOT NULL
  - `total_tax_paise`: INTEGER NOT NULL
  - `grand_total_paise`: INTEGER NOT NULL
  - `paid_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `payment_status`: TEXT NOT NULL
  - `status`: TEXT NOT NULL DEFAULT 'RECEIVED'
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

- **`purchase_items`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `purchase_id`: INTEGER NOT NULL REFERENCES `purchases(id)` ON DELETE CASCADE
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)`
  - `variant_id`: INTEGER REFERENCES `product_variants(id)`
  - `quantity`: INTEGER NOT NULL
  - `purchase_cost_paise`: INTEGER NOT NULL
  - `tax_rate_basis_points`: INTEGER NOT NULL
  - `tax_amount_paise`: INTEGER NOT NULL
  - `total_amount_paise`: INTEGER NOT NULL

### 3.8 Operating Expenses & Categories
- **`expense_categories`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `name`: TEXT NOT NULL UNIQUE
  - `code`: TEXT NOT NULL UNIQUE
  - `description`: TEXT
  - `is_active`: INTEGER NOT NULL DEFAULT 1
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))
- **`expenses`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `expense_number`: TEXT NOT NULL UNIQUE
  - `category_id`: INTEGER NOT NULL REFERENCES `expense_categories(id)`
  - `supplier_id`: INTEGER REFERENCES `suppliers(id)`
  - `expense_date`: TEXT NOT NULL
  - `amount_paise`: INTEGER NOT NULL
  - `payment_method`: TEXT NOT NULL -- CASH, UPI, CARD, BANK_TRANSFER, CHEQUE, OTHER
  - `payment_status`: TEXT NOT NULL DEFAULT 'PAID' -- PAID, PENDING, DRAFT
  - `reference_number`: TEXT
  - `notes`: TEXT
  - `created_by`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))
  - `updated_at`: TEXT NOT NULL DEFAULT (datetime('now'))

### 3.9 Sales Returns & Restocking Entities
- **`sales_returns`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `return_number`: TEXT NOT NULL UNIQUE
  - `sales_invoice_id`: INTEGER NOT NULL REFERENCES `sales_invoices(id)`
  - `customer_id`: INTEGER REFERENCES `customers(id)`
  - `return_date`: TEXT NOT NULL
  - `reason`: TEXT NOT NULL
  - `taxable_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `cgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `sgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `igst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `refund_amount_paise`: INTEGER NOT NULL
  - `refund_method`: TEXT NOT NULL -- CASH, UPI, CARD, BANK_TRANSFER, STORE_CREDIT
  - `notes`: TEXT
  - `created_by`: INTEGER REFERENCES `users(id)`
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

- **`sales_return_items`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `sales_return_id`: INTEGER NOT NULL REFERENCES `sales_returns(id)` ON DELETE CASCADE
  - `sales_invoice_item_id`: INTEGER NOT NULL REFERENCES `sales_invoice_items(id)`
  - `product_id`: INTEGER NOT NULL REFERENCES `products(id)`
  - `variant_id`: INTEGER REFERENCES `product_variants(id)`
  - `product_name_snapshot`: TEXT NOT NULL
  - `variant_name_snapshot`: TEXT
  - `quantity`: INTEGER NOT NULL
  - `unit_price_paise`: INTEGER NOT NULL
  - `discount_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `tax_rate_percent`: REAL NOT NULL DEFAULT 0
  - `taxable_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `cgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `sgst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `igst_amount_paise`: INTEGER NOT NULL DEFAULT 0
  - `total_amount_paise`: INTEGER NOT NULL
  - `restock`: INTEGER NOT NULL DEFAULT 1 -- 1: physically returned to active stock; 0: damaged/written off
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

### 3.10 System Administration, Audit Trail & Backups
- **`app_settings`**: `key` (TEXT PRIMARY KEY), `value` (TEXT), `updated_at` (TEXT)
- **`users`**: `id`, `username` (UNIQUE), `display_name`, `password_hash`, `role` ('ADMIN', 'CASHIER', 'STAFF'), `is_active`, `created_at`
- **`audit_logs`**: `id`, `user_id` (FK), `action`, `entity_name`, `entity_id`, `details_json`, `created_at`
- **`backup_metadata`**:
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
  - `filename`: TEXT NOT NULL UNIQUE
  - `file_path`: TEXT NOT NULL
  - `file_size_bytes`: INTEGER NOT NULL
  - `sha256_hash`: TEXT NOT NULL
  - `backup_type`: TEXT NOT NULL DEFAULT 'MANUAL' -- MANUAL, PRE_RESTORE, SCHEDULED
  - `status`: TEXT NOT NULL DEFAULT 'SUCCESS'
  - `notes`: TEXT
  - `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))

---

## 4. Migration Architecture & Applied History

Migrations are version-controlled `.sql` files stored under `src/main/db/migrations/`:
1. `001_initial_schema.sql` (Milestone 1): Base schema with categories, brands, units, customers, suppliers, settings, and users.
2. `002_transactions_foundation.sql` (Milestone 2): Adds `stock_quantity` columns to `products` and `product_variants`, creates `sales_invoices`, `purchases`, `stock_movements`, and seeds initial cricket catalog items.
3. `003_catalog_and_inventory.sql` (Milestone 3):
   - Adds `tax_rate_percent` column (REAL DEFAULT 12.0) to `products` and `product_variants`.
   - Creates the `hsn_codes` registry table with standard sports GST classifications (e.g. `9506` for sports equipment @ 12%, `6404` for footwear @ 18%, `6109` for sports apparel @ 12%, `6506` for protective helmets @ 18%).
   - Creates `stock_adjustments` table with auto-generated adjustment numbers (`ADJ-YYYYMMDD-XXXX`), old vs new quantities, variance, reason codes, and audit notes.
   - Adds performance indices: `idx_products_active_stock`, `idx_products_cat_brand`, `idx_stock_mov_prod_created`, and `idx_stock_adj_prod`.
4. `004_pos_and_gst_billing.sql` (Milestone 4):
   - Adds `cancellation_reason`, `cancelled_at`, and `notes` columns to `sales_invoices`.
   - Creates `sales_invoice_items` table with historical snapshots of product name, variant name, HSN code, unit name, rate, and tax breakdowns.
   - Creates `payments` table supporting Cash, UPI, Card, and split payments.
   - Seeds additional customer records including inter-state customers in Gujarat (`24`) and Delhi (`07`).
   - Configures `invoice_prefix` (`CR360-`) and `next_invoice_number` (`1001`) in `app_settings`.
   - Adds performance indices: `idx_sales_inv_number`, `idx_sales_inv_date`, `idx_sales_inv_status`, `idx_sales_items_inv`, `idx_payments_inv`, and `idx_cust_search`.
5. `005_procurement_and_accounts.sql` (Combined Milestone 5):
   - Enhances `suppliers` table with `payment_terms_days`, `notes`, `updated_at`.
   - Enhances `customers` table with `credit_limit_paise`, `notes`, `updated_at`.
   - Enhances `purchases` table with `subtotal_paise`, `discount_amount_paise`, `round_off_paise`, `total_amount_paise`, `supplier_name_snapshot`, `supplier_gstin_snapshot`, `place_of_supply`, `is_inter_state`, `notes`.
   - Creates `uq_supplier_invoice` unique index on `purchases(supplier_id, supplier_invoice_number)` for duplicate bill prevention.
   - Creates `purchase_items` table with product snapshot, variant snapshot, SKU snapshot, unit cost, discount, tax breakdown (CGST/SGST/IGST), returned quantity, and timestamps.
   - Creates `purchase_returns` and `purchase_return_items` tables for vendor returns with compensatory stock adjustments and ledger credit.
   - Enhances `payments` table with `payment_type` ('SALE_INVOICE', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYOUT'), `purchase_id`, and `balance_paise_snapshot`.
   - Configures `purchase_prefix` (`PUR-`), `purchase_return_prefix` (`PR-`), `payment_receipt_prefix` (`REC-`), and `payment_payout_prefix` (`PAY-`) in `app_settings`.
   - Adds composite performance indices: `idx_purchases_supplier_date`, `idx_purchases_status`, `idx_purchase_items_purchase`, `idx_purchase_returns_pur`, `idx_payments_party_type`, and `idx_payments_purchase`.
6. `006_returns_expenses_and_controls.sql` (Milestone 6):
   - Creates `sales_returns` and `sales_return_items` tables with return reasons, item-level restock control, and proportional tax/discount snapshots.
   - Creates `expense_categories` and `expenses` tables with integer paise amounts, payee links, and payment statuses (`PAID`, `PENDING`, `DRAFT`).
   - Creates `audit_logs` table for tracking security-sensitive and business actions.
   - Creates `backup_metadata` table for tracking database backup snapshots and SHA-256 integrity hashes.
   - Configures sequence settings in `app_settings`: `sales_return_prefix` (`SR-`), `next_sales_return_number` (`1001`), `expense_prefix` (`EXP-`), `next_expense_number` (`1001`).
   - Seeds standard retail expense categories (Rent, Salaries, Utilities, Transport & Logistics, Repairs & Maintenance, Marketing & Promotion, Miscellaneous).
   - Adds performance indices: `idx_sales_returns_invoice`, `idx_sales_returns_customer`, `idx_sales_returns_date`, `idx_sales_return_items_return`, `idx_expenses_category`, `idx_expenses_date`, `idx_expenses_status`, `idx_audit_logs_action`, `idx_audit_logs_created`.

A dedicated migration tracking table `_schema_migrations` tracks installed migrations:
```sql
CREATE TABLE IF NOT EXISTS _schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
At startup, the migration runner reads all pending migration files sequentially inside an immediate transaction. If any migration fails, the entire transaction rolls back, preventing database corruption.

---

## 5. Dashboard Queries & Aggregate Calculation Rules

The dashboard computes all metrics directly from SQLite using parameterized statements:
- **Active Products:** `SELECT COUNT(*) FROM products WHERE is_active = 1`
- **Total Stock Quantity:** `SELECT COALESCE(SUM(stock_quantity), 0) FROM products WHERE is_active = 1`
- **Total Stock Valuation:** `SELECT COALESCE(SUM(stock_quantity * purchase_cost_paise), 0) FROM products WHERE is_active = 1` (in integer paise)
- **Today's Sales Revenue:** `SELECT COALESCE(SUM(grand_total_paise), 0) FROM sales_invoices WHERE invoice_date = ? AND status = 'COMPLETED'` (cancelled and returned invoices are excluded)
- **Today's Purchases:** `SELECT COALESCE(SUM(grand_total_paise), 0) FROM purchases WHERE purchase_date = ? AND status = 'RECEIVED'`
- **Stock Distribution:**
  - Out of stock: `stock_quantity = 0`
  - Low stock: `stock_quantity > 0 AND stock_quantity <= min_stock_level`
  - In stock: `stock_quantity > min_stock_level`
- **Rolling 7-Day Activity:** Sums completed sales per date from `T - 6` to `T`.

---

## 6. Backup & Recovery Strategy (Milestone 7 Verified)

1. **Persistent Location:** The production database is stored strictly inside the OS AppData user profile directory:
   `%APPDATA%\Cricket360\database\cricket360.sqlite`
   This directory is persistent across application updates, preventing any installer overwrite of live business data.
2. **Hot Online Snapshot:** Uses SQLite's native `VACUUM INTO 'backup_path'` after forcing a `wal_checkpoint(TRUNCATE)`. This ensures an atomic, consistent, non-blocking backup even during active store operations.
3. **Backup Filenames & SHA-256 Checksums:**
   - Standard Backups: `cricket360_backup_<TIMESTAMP>_<TAG>.db` stored in `%APPDATA%\Cricket360\backups\`.
   - SHA-256 hash computed immediately and persisted to `backup_metadata`.
4. **Pre-Restore Safety Snapshot & Non-Destructive Recovery:**
   - Prior to replacing the live database, `restoreBackup()` automatically creates a safety snapshot: `pre_restore_backup_<TIMESTAMP>_<TAG>.db`.
   - SQLite magic header (`SQLite format 3\0`) and internal `PRAGMA integrity_check` are validated before attempting file copy.
   - Active database connections are cleanly closed and unlinked (`-wal` and `-shm` artifacts removed) to prevent Windows `EBUSY` file locking errors.
   - The restored database is opened, verified with `PRAGMA integrity_check`, status updated to `'RESTORED'`, and logged to `audit_logs`.

