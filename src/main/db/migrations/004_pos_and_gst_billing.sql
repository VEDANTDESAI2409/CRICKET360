-- Cricket360: POS & GST Billing Migration (004_pos_and_gst_billing.sql)
-- Enhances sales_invoices, creates sales_invoice_items and payments tables, and adds sample customer records.

-- 1. Add missing billing and tax columns to sales_invoices
ALTER TABLE sales_invoices ADD COLUMN customer_phone_snapshot TEXT;
ALTER TABLE sales_invoices ADD COLUMN customer_gstin_snapshot TEXT;
ALTER TABLE sales_invoices ADD COLUMN customer_address_snapshot TEXT;
ALTER TABLE sales_invoices ADD COLUMN place_of_supply TEXT NOT NULL DEFAULT '27';
ALTER TABLE sales_invoices ADD COLUMN is_inter_state INTEGER NOT NULL DEFAULT 0 CHECK(is_inter_state IN (0, 1));
ALTER TABLE sales_invoices ADD COLUMN discount_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_paise >= 0);
ALTER TABLE sales_invoices ADD COLUMN round_off_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN balance_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(balance_amount_paise >= 0);
ALTER TABLE sales_invoices ADD COLUMN total_tax_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_tax_paise >= 0);
ALTER TABLE sales_invoices ADD COLUMN cancellation_reason TEXT;
ALTER TABLE sales_invoices ADD COLUMN cancelled_at TEXT;
ALTER TABLE sales_invoices ADD COLUMN user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. Sales Invoice Line Items Table
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT,
    sku_snapshot TEXT NOT NULL,
    barcode_snapshot TEXT,
    hsn_code_snapshot TEXT NOT NULL DEFAULT '9506',
    unit_snapshot TEXT NOT NULL DEFAULT 'Pcs',
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price_paise INTEGER NOT NULL CHECK(unit_price_paise >= 0),
    mrp_paise INTEGER NOT NULL DEFAULT 0 CHECK(mrp_paise >= 0),
    discount_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount_paise >= 0),
    taxable_amount_paise INTEGER NOT NULL CHECK(taxable_amount_paise >= 0),
    tax_rate_percent REAL NOT NULL CHECK(tax_rate_percent >= 0),
    cgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(cgst_amount_paise >= 0),
    sgst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(sgst_amount_paise >= 0),
    igst_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK(igst_amount_paise >= 0),
    total_amount_paise INTEGER NOT NULL CHECK(total_amount_paise >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inv_items_invoice ON sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_product ON sales_invoice_items(product_id);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_number TEXT UNIQUE NOT NULL COLLATE NOCASE,
    payment_date TEXT NOT NULL, -- YYYY-MM-DD
    party_type TEXT NOT NULL CHECK(party_type IN ('CUSTOMER', 'SUPPLIER')),
    party_id INTEGER NOT NULL,
    invoice_id INTEGER REFERENCES sales_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL,
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE')),
    reference_number TEXT,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_type, party_id);

-- 4. Seed additional customers for customer search & inter-state tax demonstration
INSERT OR IGNORE INTO customers (id, name, phone, gstin, address, state_code) VALUES
    (2, 'Rohit Sharma Cricket Academy', '+91 98201 23456', '27AABCR9876E1Z2', 'Bandra West, Mumbai', '27'),
    (3, 'Gujarat Lions Club (Inter-State)', '+91 97123 45678', '24AAACL5566G1Z3', 'Navrangpura, Ahmedabad, Gujarat', '24'),
    (4, 'Virat Sports Foundation (Inter-State)', '+91 98111 22334', '07AACCV7788H1Z4', 'Connaught Place, New Delhi', '07');
