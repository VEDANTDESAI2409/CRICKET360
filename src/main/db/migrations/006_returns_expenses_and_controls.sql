-- Cricket360: Returns, Expenses, Reports & Business Controls (006_returns_expenses_and_controls.sql)
-- Adds sales returns, expense management, audit logs, backup metadata, and default master seeds.

-- 1. Add returned_quantity tracking to sales_invoice_items
ALTER TABLE sales_invoice_items ADD COLUMN returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(returned_quantity >= 0);

-- 2. Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    customer_id INTEGER REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    customer_name_snapshot TEXT NOT NULL,
    return_date TEXT NOT NULL, -- YYYY-MM-DD
    taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0),
    cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0),
    sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0),
    igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0),
    total_tax_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_tax_paise >= 0),
    round_off_paise INTEGER NOT NULL DEFAULT 0,
    grand_total_paise INTEGER NOT NULL DEFAULT 0 CHECK(grand_total_paise >= 0),
    refund_mode TEXT NOT NULL CHECK(refund_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'STORE_CREDIT')),
    refund_reference TEXT,
    reason TEXT NOT NULL,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);

-- 3. Sales Return Line Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON UPDATE CASCADE ON DELETE CASCADE,
    sales_invoice_item_id INTEGER NOT NULL REFERENCES sales_invoice_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT,
    sku_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price_paise INTEGER NOT NULL CHECK(unit_price_paise >= 0),
    discount_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_paise >= 0),
    taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0),
    tax_rate_percent REAL NOT NULL CHECK(tax_rate_percent >= 0),
    cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0),
    sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0),
    igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0),
    total_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_amount_paise >= 0),
    restock INTEGER NOT NULL DEFAULT 1 CHECK(restock IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sr_items_return ON sales_return_items(sales_return_id);
CREATE INDEX IF NOT EXISTS idx_sr_items_inv_item ON sales_return_items(sales_invoice_item_id);

-- 4. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    code TEXT UNIQUE NOT NULL COLLATE NOCASE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed standard sports retail operating expense categories
INSERT OR IGNORE INTO expense_categories (name, code, description) VALUES
    ('Store Rent & Lease', 'RENT', 'Monthly showroom and warehouse rent'),
    ('Electricity & Power', 'POWER', 'Electricity bills and backup generator fuel'),
    ('Staff Salaries & Wages', 'SALARY', 'Sales staff, coaches, and counter personnel'),
    ('Packaging & Logistics', 'LOGISTICS', 'Bat carry covers, parcel dispatch, and courier'),
    ('Repairs & Maintenance', 'MAINT', 'Bat knocking-in machine servicing and store repairs'),
    ('Marketing & Sponsorships', 'MARKETING', 'Local tournament banners, flyers, and academy promos'),
    ('Pantry & Refreshments', 'PANTRY', 'Drinking water, tea, coffee, and staff snacks'),
    ('Office & Miscellaneous', 'MISC', 'Thermal paper rolls, stationery, and miscellaneous expenses');

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    expense_date TEXT NOT NULL, -- YYYY-MM-DD
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE')),
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PENDING', 'DRAFT')),
    payee_name TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    reference_number TEXT,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(payment_status);

-- 6. Audit Trail Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL, -- INVOICE_VOID, SALES_RETURN, PURCHASE_RETURN, STOCK_ADJUSTMENT, PRICE_CHANGE, BACKUP_CREATE, BACKUP_RESTORE, SETTINGS_UPDATE
    entity_type TEXT NOT NULL, -- sales_invoices, sales_returns, purchases, stock_adjustments, products, app_settings, backups
    entity_id TEXT,
    details_json TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    username_snapshot TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 7. Database Backup Metadata Table
CREATE TABLE IF NOT EXISTS backup_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_filename TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK(file_size_bytes > 0),
    sha256_hash TEXT NOT NULL,
    backup_type TEXT NOT NULL CHECK(backup_type IN ('MANUAL', 'SCHEDULED', 'PRE_RESTORE')),
    status TEXT NOT NULL CHECK(status IN ('VALID', 'RESTORED', 'CORRUPTED')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_backups_created ON backup_metadata(created_at);

-- 8. Sequence numbering and business configuration in app_settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('sales_return_prefix', 'SR-'),
    ('next_sales_return_number', '1001'),
    ('expense_prefix', 'EXP-'),
    ('next_expense_number', '1001'),
    ('auto_backup_enabled', 'true'),
    ('auto_backup_retention_days', '30'),
    ('low_stock_warning_threshold', '5'),
    ('store_terms_and_conditions', '1. Goods once sold can only be exchanged within 7 days against valid receipt. 2. No exchange on used or knocked-in bats. 3. Warranty as per manufacturer terms.');
