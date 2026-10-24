-- Cricket360: Product Catalog & Inventory Migration (003_catalog_and_inventory.sql)
-- Adds tax rate columns, HSN code registry, and stock adjustments table.

-- 1. Add tax_rate_percent to products and product_variants
ALTER TABLE products ADD COLUMN tax_rate_percent REAL NOT NULL DEFAULT 12.0 CHECK(tax_rate_percent >= 0);
ALTER TABLE product_variants ADD COLUMN tax_rate_percent REAL NOT NULL DEFAULT 12.0 CHECK(tax_rate_percent >= 0);

-- 2. HSN Codes Registry Table
CREATE TABLE IF NOT EXISTS hsn_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hsn_code TEXT UNIQUE NOT NULL COLLATE NOCASE,
    description TEXT NOT NULL,
    tax_rate_percent REAL NOT NULL DEFAULT 12.0 CHECK(tax_rate_percent >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hsn_code ON hsn_codes(hsn_code);

-- Seed standard Indian GST HSN codes for sports and cricket equipment
INSERT OR IGNORE INTO hsn_codes (hsn_code, description, tax_rate_percent) VALUES
    ('9506', 'Articles and equipment for general physical exercise, gymnastics, athletics, other sports (cricket bats, balls, pads, gloves, stumps)', 12.0),
    ('6404', 'Footwear with outer soles of rubber/plastics, cricket shoes with rubber studs or metal spikes', 12.0),
    ('6109', 'Cricket apparel, T-shirts, team jerseys, performance track wear', 12.0),
    ('6506', 'Other headgear, safety cricket helmets with titanium or steel grilles', 18.0),
    ('4202', 'Cricket kit bags, bat covers, wheelie gear luggage', 18.0),
    ('9503', 'Plastic training cricket sets, junior soft tennis cricket sets', 12.0);

-- 3. Stock Adjustments Table (Physical inventory reconciliation)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    old_quantity INTEGER NOT NULL CHECK(old_quantity >= 0),
    new_quantity INTEGER NOT NULL CHECK(new_quantity >= 0),
    variance_quantity INTEGER NOT NULL, -- new_quantity - old_quantity (can be positive or negative)
    reason TEXT NOT NULL CHECK(reason IN (
        'PHYSICAL_AUDIT_MISMATCH',
        'DAMAGED_IN_STORE',
        'EXPIRED_DEFECTIVE',
        'SAMPLE_DEMO',
        'THEFT_OR_LOSS',
        'FOUND_SURPLUS',
        'OTHER'
    )),
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON stock_adjustments(created_at);
