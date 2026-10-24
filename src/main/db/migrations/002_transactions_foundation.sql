-- Cricket360: Transactions & Inventory Migration (002_transactions_foundation.sql)
-- Adds stock tracking, sales invoices, purchases, stock movements, and initial cricket products.

-- 1. Add stock_quantity columns to products and variants
ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0);
ALTER TABLE product_variants ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0);

-- 2. Sales Invoices Table
CREATE TABLE IF NOT EXISTS sales_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    invoice_date TEXT NOT NULL, -- YYYY-MM-DD
    customer_id INTEGER REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    customer_name_snapshot TEXT NOT NULL,
    taxable_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(taxable_amount_paise >= 0),
    cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0),
    sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0),
    igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0),
    grand_total_paise INTEGER NOT NULL DEFAULT 0 CHECK(grand_total_paise >= 0),
    paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount_paise >= 0),
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID')),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'CANCELLED', 'RETURNED')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON sales_invoices(customer_id);

-- 3. Supplier Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    supplier_invoice_number TEXT NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    purchase_date TEXT NOT NULL, -- YYYY-MM-DD
    grand_total_paise INTEGER NOT NULL DEFAULT 0 CHECK(grand_total_paise >= 0),
    paid_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount_paise >= 0),
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED', 'CANCELLED')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

-- 4. Stock Movements Ledger Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('OPENING_STOCK', 'PURCHASE_RECEIPT', 'SALE_INVOICE', 'SALE_RETURN', 'PURCHASE_RETURN', 'DAMAGE_WRITE_OFF', 'PHYSICAL_ADJUSTMENT')),
    quantity_change INTEGER NOT NULL, -- Positive for stock in, negative for stock out
    balance_quantity_after INTEGER NOT NULL,
    reference_table TEXT,
    reference_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);

-- 5. Seed Initial Real Cricket Catalog Items (For realistic initial inventory calculations)
INSERT OR IGNORE INTO products (
    name, sku, barcode, category_id, brand_id, unit_id, hsn_code,
    purchase_cost_paise, selling_price_paise, mrp_paise, stock_quantity,
    min_stock_level, reorder_level
) VALUES
    ('SS Ton Master English Willow Cricket Bat', 'BAT-SS-TON-01', '890123400001', 1, 1, 1, '9506', 750000, 1150000, 1299900, 8, 3, 5),
    ('SG Club Leather Cricket Ball (Red, Pack of 6)', 'BALL-SG-CLUB-01', '890123400002', 5, 2, 4, '9506', 180000, 240000, 280000, 2, 5, 10),
    ('Kookaburra Kahuna Pro Batting Gloves', 'GLV-KOOK-KAH-01', '890123400003', 2, 3, 2, '9506', 150000, 220000, 260000, 0, 2, 4),
    ('Shrey Master Class Air Cricket Helmet (Titanium)', 'HLMT-SHREY-01', '890123400004', 2, 8, 1, '9506', 420000, 580000, 650000, 5, 2, 4),
    ('DSC Intense Speed Cricket Shoes (Rubber Studs)', 'SHOE-DSC-INT-01', '890123400005', 3, 6, 2, '9506', 120000, 185000, 220000, 1, 3, 6),
    ('Gray-Nicolls Shockwave 500 Batting Pads', 'PAD-GN-SHOCK-01', '890123400006', 2, 4, 2, '9506', 220000, 310000, 350000, 6, 2, 4);

-- Seed corresponding opening stock movements
INSERT OR IGNORE INTO stock_movements (product_id, movement_type, quantity_change, balance_quantity_after, notes) VALUES
    (1, 'OPENING_STOCK', 8, 8, 'Initial verified stock intake'),
    (2, 'OPENING_STOCK', 2, 2, 'Initial verified stock intake (Low stock alert)'),
    (3, 'OPENING_STOCK', 0, 0, 'Out of stock on arrival'),
    (4, 'OPENING_STOCK', 5, 5, 'Initial verified stock intake'),
    (5, 'OPENING_STOCK', 1, 1, 'Initial verified stock intake (Low stock alert)'),
    (6, 'OPENING_STOCK', 6, 6, 'Initial verified stock intake');
