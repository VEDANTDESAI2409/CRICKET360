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
- **`expense_categories`**: `id`, `name`, `is_active`
- **`expenses`**: `id`, `expense_number`, `category_id` (FK), `expense_date`, `amount_paise`, `payment_mode`, `recipient_name`, `notes`, `created_at`

### 3.9 System Administration & Audit Trail
- **`app_settings`**: `key` (TEXT PRIMARY KEY), `value` (TEXT), `updated_at` (TEXT)
- **`users`**: `id`, `username` (UNIQUE), `display_name`, `password_hash`, `role` ('ADMIN', 'CASHIER', 'STAFF'), `is_active`, `created_at`
- **`audit_logs`**: `id`, `user_id` (FK), `action`, `entity_name`, `entity_id`, `details_json`, `created_at`
- **`backup_metadata`**: `id`, `filename`, `file_size_bytes`, `backup_type`, `status`, `created_at`

---

## 4. Migration Architecture & Applied History

Migrations are version-controlled `.sql` files stored under `src/main/db/migrations/`:
1. `001_initial_schema.sql` (Milestone 1): Base schema with categories, brands, units, customers, suppliers, settings, and users.
2. `002_transactions_foundation.sql` (Milestone 2): Adds `stock_quantity` columns to `products` and `product_variants`, creates `sales_invoices`, `purchases`, `stock_movements`, and seeds initial cricket catalog items.

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

## 6. Backup & Recovery Strategy

1. **Location:** Default database path is inside the OS AppData folder:
   `%APPDATA%\Cricket360\database\cricket360.sqlite`
2. **Online Backup:** Uses SQLite's native `VACUUM INTO 'backup_path'` or SQLite Online Backup API. This ensures a hot, consistent backup even while the application is actively writing.
3. **Safety:** Backups are written to a `.cricket360bak` file with an SHA-256 integrity hash.
4. **Restoration:** Restores are performed by:
   - Verifying the file's SQLite header and SHA-256 checksum.
   - Performing an integrity check: `PRAGMA integrity_check;`.
   - Safely closing active DB connections, copying the backup into place, and reopening.
