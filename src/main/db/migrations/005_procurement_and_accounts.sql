-- Cricket360: Procurement, Supplier Management & Customer Accounts (005_procurement_and_accounts.sql)
-- Enhances suppliers, customers, purchases, and payments; creates purchase_items, purchase_returns, and purchase_return_items.

-- 1. Enhance suppliers table
ALTER TABLE suppliers ADD COLUMN payment_terms_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN notes TEXT;
ALTER TABLE suppliers ADD COLUMN updated_at TEXT;

-- 2. Enhance customers table
ALTER TABLE customers ADD COLUMN email TEXT;
ALTER TABLE customers ADD COLUMN notes TEXT;
ALTER TABLE customers ADD COLUMN updated_at TEXT;

-- 3. Enhance purchases table
ALTER TABLE purchases ADD COLUMN supplier_name_snapshot TEXT;
ALTER TABLE purchases ADD COLUMN supplier_gstin_snapshot TEXT;
ALTER TABLE purchases ADD COLUMN place_of_supply TEXT NOT NULL DEFAULT '27';
ALTER TABLE purchases ADD COLUMN is_inter_state INTEGER NOT NULL DEFAULT 0 CHECK(is_inter_state IN (0, 1));
ALTER TABLE purchases ADD COLUMN taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN total_tax_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_tax_paise >= 0);
ALTER TABLE purchases ADD COLUMN subtotal_paise INTEGER NOT NULL DEFAULT 0 CHECK(subtotal_paise >= 0);
ALTER TABLE purchases ADD COLUMN discount_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN round_off_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN total_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN balance_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(balance_amount_paise >= 0);
ALTER TABLE purchases ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID'));
ALTER TABLE purchases ADD COLUMN user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Enforce unique supplier invoice number per supplier
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_invoice ON purchases(supplier_id, supplier_invoice_number);

-- 4. Create purchase_items table
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT,
    sku_snapshot TEXT NOT NULL,
    barcode_snapshot TEXT,
    hsn_code_snapshot TEXT NOT NULL DEFAULT '9506',
    unit_snapshot TEXT NOT NULL DEFAULT 'Pcs',
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_cost_paise INTEGER NOT NULL CHECK(unit_cost_paise >= 0),
    discount_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_paise >= 0),
    taxable_amount_paise INTEGER NOT NULL CHECK(taxable_amount_paise >= 0),
    tax_rate_percent REAL NOT NULL CHECK(tax_rate_percent >= 0),
    cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0),
    sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0),
    igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0),
    total_amount_paise INTEGER NOT NULL CHECK(total_amount_paise >= 0),
    returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(returned_quantity >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- 5. Create purchase_returns and purchase_return_items tables
CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    return_date TEXT NOT NULL, -- YYYY-MM-DD
    taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0),
    total_tax_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_tax_paise >= 0),
    grand_total_paise INTEGER NOT NULL DEFAULT 0 CHECK(grand_total_paise >= 0),
    reason TEXT NOT NULL,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON purchase_returns(return_date);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON UPDATE CASCADE ON DELETE CASCADE,
    purchase_item_id INTEGER NOT NULL REFERENCES purchase_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_cost_paise INTEGER NOT NULL CHECK(unit_cost_paise >= 0),
    tax_rate_percent REAL NOT NULL CHECK(tax_rate_percent >= 0),
    taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0),
    total_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_amount_paise >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pr_items_return ON purchase_return_items(purchase_return_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_item ON purchase_return_items(purchase_item_id);

-- 6. Enhance payments table for purchase allocations and payment classification
ALTER TABLE payments ADD COLUMN purchase_id INTEGER REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'INVOICE_PAYMENT';

CREATE INDEX IF NOT EXISTS idx_payments_purchase ON payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- 7. Seed initial purchase numbering sequences in app_settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('purchase_prefix', 'PUR-'),
    ('next_purchase_number', '1001'),
    ('purchase_return_prefix', 'PR-'),
    ('next_purchase_return_number', '1001');

-- 8. Seed additional realistic suppliers for testing intra/inter-state procurement
INSERT OR IGNORE INTO suppliers (name, company_name, phone, email, gstin, address, state_code, payment_terms_days, balance_paise) VALUES
    ('Meerut Bat & Leather Works', 'Meerut Sports Crafts LLP', '+91 98370 12345', 'sales@meerutcrafts.com', '09AABCM1234F1Z1', 'Partapur Industrial Estate, Meerut, UP', '09', 30, 0),
    ('Jalandhar Protective Gear Co', 'Jalandhar Sports Mfg Pvt Ltd', '+91 98140 54321', 'contact@jalandhargear.in', '03AAACJ9876E1Z5', 'Basti Nau, Jalandhar, Punjab', '03', 45, 0);
