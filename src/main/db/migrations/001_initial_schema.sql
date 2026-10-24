-- Cricket360: Initial Schema Migration (001_initial_schema.sql)
-- Enforces referential integrity, unique constraints, and integer paise monetary representation.

-- 1. Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('shop_name', 'Cricket360 Sports & Pro Shop'),
    ('shop_address', '12, Sports Complex Road, Mumbai, Maharashtra'),
    ('shop_phone', '+91 98765 43210'),
    ('shop_email', 'contact@cricket360.local'),
    ('shop_gstin', '27AABBC1234D1Z5'),
    ('shop_state_code', '27'),
    ('invoice_prefix', 'CR360-'),
    ('next_invoice_number', '1001'),
    ('thermal_printer_name', 'Default'),
    ('thermal_receipt_width', '80mm'),
    ('currency_symbol', '₹');

-- 2. Product Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    code TEXT UNIQUE NOT NULL COLLATE NOCASE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial cricket & sports categories
INSERT OR IGNORE INTO categories (name, code, description) VALUES
    ('Cricket Bats', 'BAT', 'English willow, Kashmir willow, and tennis ball bats'),
    ('Protective Gear', 'PROT', 'Pads, gloves, helmets, thigh guards, arm guards'),
    ('Footwear', 'FOOT', 'Spikes, rubber studs, indoor training shoes'),
    ('Apparel & Whites', 'APPR', 'Cricket whites, jerseys, track pants, caps'),
    ('Balls & Accessories', 'BALL', 'Leather balls, tennis balls, grips, bat mallets, kits');

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    code TEXT UNIQUE NOT NULL COLLATE NOCASE,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed popular cricket brands
INSERT OR IGNORE INTO brands (name, code) VALUES
    ('SS (Sareen Sports)', 'SS'),
    ('SG (Sanspareils Greenlands)', 'SG'),
    ('Kookaburra', 'KOOK'),
    ('Gray-Nicolls', 'GN'),
    ('MRF', 'MRF'),
    ('DSC', 'DSC'),
    ('New Balance', 'NB'),
    ('Shrey', 'SHREY');

-- 4. Measurement Units Table
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    symbol TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO units (name, symbol) VALUES
    ('Pieces', 'Pcs'),
    ('Pairs', 'Pair'),
    ('Sets', 'Set'),
    ('Boxes', 'Box'),
    ('Dozens', 'Dzn');

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL COLLATE NOCASE,
    barcode TEXT UNIQUE,
    category_id INTEGER REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    brand_id INTEGER REFERENCES brands(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    unit_id INTEGER REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    hsn_code TEXT DEFAULT '9506',
    purchase_cost_paise INTEGER NOT NULL DEFAULT 0 CHECK(purchase_cost_paise >= 0),
    selling_price_paise INTEGER NOT NULL DEFAULT 0 CHECK(selling_price_paise >= 0),
    mrp_paise INTEGER NOT NULL DEFAULT 0 CHECK(mrp_paise >= 0),
    min_stock_level INTEGER NOT NULL DEFAULT 3 CHECK(min_stock_level >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 5 CHECK(reorder_level >= 0),
    has_variants INTEGER NOT NULL DEFAULT 0 CHECK(has_variants IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

-- 6. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL COLLATE NOCASE,
    barcode TEXT UNIQUE,
    size TEXT,
    color TEXT,
    purchase_cost_paise INTEGER NOT NULL CHECK(purchase_cost_paise >= 0),
    selling_price_paise INTEGER NOT NULL CHECK(selling_price_paise >= 0),
    mrp_paise INTEGER NOT NULL CHECK(mrp_paise >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

-- 7. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    state_code TEXT DEFAULT '27',
    balance_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial supplier
INSERT OR IGNORE INTO suppliers (name, company_name, phone, gstin) VALUES
    ('Rajesh Sports Wholesalers', 'Rajesh Sports Pvt Ltd', '+91 98200 11223', '27AAACR1234F1Z8');

-- 8. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    gstin TEXT,
    address TEXT,
    state_code TEXT DEFAULT '27',
    credit_limit_paise INTEGER NOT NULL DEFAULT 0 CHECK(credit_limit_paise >= 0),
    balance_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default Walk-in Customer
INSERT OR IGNORE INTO customers (id, name, phone) VALUES
    (1, 'Walk-in Customer', '0000000000');

-- 9. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CASHIER', 'STAFF')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default admin user (hash placeholder for local dev)
INSERT OR IGNORE INTO users (username, display_name, password_hash, role) VALUES
    ('admin', 'Store Administrator', 'scrypt:admin', 'ADMIN'),
    ('cashier', 'Counter Staff', 'scrypt:cashier', 'CASHIER');
