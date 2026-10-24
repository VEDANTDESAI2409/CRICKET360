import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  createProduct,
  updateProduct,
  getProductById,
  getAllProducts,
  toggleProductActive,
  deleteProduct,
  validateSku,
  validateBarcode,
  generateSku,
  generateBarcode,
} from '../../../src/main/db/productRepo';
import { CreateProductInput } from '../../../src/shared/types/models';

describe('Milestone 3: Product Repository & Variants', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run migrations 001, 002, 003
    const m001 = fs.readFileSync(
      path.resolve(__dirname, '../../../src/main/db/migrations/001_initial_schema.sql'),
      'utf-8'
    );
    db.exec(m001);

    const m002 = fs.readFileSync(
      path.resolve(__dirname, '../../../src/main/db/migrations/002_transactions_foundation.sql'),
      'utf-8'
    );
    db.exec(m002);

    const m003 = fs.readFileSync(
      path.resolve(__dirname, '../../../src/main/db/migrations/003_catalog_and_inventory.sql'),
      'utf-8'
    );
    db.exec(m003);
  });

  afterEach(() => {
    db.close();
  });

  it('1. should create a simple product with opening stock and record stock movement', () => {
    const input: CreateProductInput = {
      name: 'MRF Genius Grand Edition Cricket Bat',
      sku: 'BAT-MRF-GEN-01',
      barcode: '890123456789',
      category_id: 1, // Cricket Bats
      brand_id: 5, // MRF
      unit_id: 1, // Pieces
      hsn_code: '9506',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 950000, // Rs 9,500.00
      selling_price_paise: 1350000, // Rs 13,500.00
      mrp_paise: 1599900, // Rs 15,999.00
      min_stock_level: 2,
      reorder_level: 4,
      opening_stock_quantity: 5,
      has_variants: false,
    };

    const created = createProduct(db, input);

    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe('MRF Genius Grand Edition Cricket Bat');
    expect(created.sku).toBe('BAT-MRF-GEN-01');
    expect(created.stock_quantity).toBe(5);
    expect(created.category_name).toBe('Cricket Bats');
    expect(created.brand_name).toBe('MRF');
    expect(created.unit_symbol).toBe('Pcs');

    // Check opening stock movement was recorded
    const movements = db
      .prepare('SELECT * FROM stock_movements WHERE product_id = ?')
      .all(created.id) as any[];

    expect(movements.length).toBe(1);
    expect(movements[0].movement_type).toBe('OPENING_STOCK');
    expect(movements[0].quantity_change).toBe(5);
    expect(movements[0].balance_quantity_after).toBe(5);
  });

  it('2. should create a multi-variant product and compute total stock from variants', () => {
    const input: CreateProductInput = {
      name: 'New Balance Burn Cricket Shoes (Spikes)',
      sku: 'SHOE-NB-BURN-01',
      category_id: 3, // Footwear
      brand_id: 7, // New Balance
      unit_id: 2, // Pairs
      hsn_code: '6404',
      tax_rate_percent: 12.0,
      purchase_cost_paise: 320000,
      selling_price_paise: 480000,
      mrp_paise: 549900,
      min_stock_level: 3,
      reorder_level: 6,
      opening_stock_quantity: 0,
      has_variants: true,
      variants: [
        {
          variant_name: 'Size: UK 8',
          sku: 'SHOE-NB-BURN-01-UK8',
          size: 'UK 8',
          color: 'White/Cyan',
          purchase_cost_paise: 320000,
          selling_price_paise: 480000,
          mrp_paise: 549900,
          opening_stock_quantity: 3,
        },
        {
          variant_name: 'Size: UK 9',
          sku: 'SHOE-NB-BURN-01-UK9',
          size: 'UK 9',
          color: 'White/Cyan',
          purchase_cost_paise: 320000,
          selling_price_paise: 480000,
          mrp_paise: 549900,
          opening_stock_quantity: 4,
        },
        {
          variant_name: 'Size: UK 10',
          sku: 'SHOE-NB-BURN-01-UK10',
          size: 'UK 10',
          color: 'White/Cyan',
          purchase_cost_paise: 320000,
          selling_price_paise: 480000,
          mrp_paise: 549900,
          opening_stock_quantity: 2,
        },
      ],
    };

    const created = createProduct(db, input);

    expect(created.has_variants).toBe(1);
    expect(created.variants_count).toBe(3);
    // Total stock = 3 + 4 + 2 = 9
    expect(created.stock_quantity).toBe(9);

    // Verify individual variants exist
    const fullProd = getProductById(db, created.id);
    expect(fullProd?.variants?.length).toBe(3);
    expect(fullProd?.variants?.[0].sku).toBe('SHOE-NB-BURN-01-UK8');
    expect(fullProd?.variants?.[0].stock_quantity).toBe(3);
  });

  it('3. should validate SKU and barcode uniqueness strictly', () => {
    expect(validateSku(db, 'BAT-SS-TON-01')).toBe(false); // Already seeded
    expect(validateSku(db, 'UNIQUE-SKU-999')).toBe(true);

    expect(validateBarcode(db, '890123400001')).toBe(false); // Already seeded
    expect(validateBarcode(db, '999888777666')).toBe(true);
  });

  it('4. should prevent selling price from exceeding MRP', () => {
    const input: CreateProductInput = {
      name: 'Faulty Pricing Item',
      sku: 'FLT-001',
      category_id: 1,
      brand_id: 1,
      unit_id: 1,
      purchase_cost_paise: 10000,
      selling_price_paise: 25000, // Rs 250.00
      mrp_paise: 20000, // Rs 200.00 (less than selling price)
      min_stock_level: 1,
      reorder_level: 2,
      opening_stock_quantity: 1,
      has_variants: false,
    };

    expect(() => createProduct(db, input)).toThrow(
      'Selling price cannot exceed Maximum Retail Price (MRP).'
    );
  });

  it('5. should update product properties and toggle active status', () => {
    const all = getAllProducts(db);
    const first = all[0];

    const updated = updateProduct(db, {
      id: first.id,
      name: 'Updated Product Name',
      sku: first.sku,
      barcode: first.barcode,
      category_id: first.category_id,
      brand_id: first.brand_id,
      unit_id: first.unit_id,
      hsn_code: '9506',
      tax_rate_percent: 18.0,
      purchase_cost_paise: first.purchase_cost_paise,
      selling_price_paise: first.selling_price_paise + 50000,
      mrp_paise: first.mrp_paise + 50000,
      min_stock_level: 4,
      reorder_level: 8,
      is_active: 1,
    });

    expect(updated.name).toBe('Updated Product Name');
    expect(updated.tax_rate_percent).toBe(18.0);
    expect(updated.min_stock_level).toBe(4);

    // Toggle active
    toggleProductActive(db, first.id, 0);
    const afterDeactivate = getProductById(db, first.id);
    expect(afterDeactivate?.is_active).toBe(0);
  });

  it('6. should filter and search products accurately', () => {
    // Search "English Willow"
    const bats = getAllProducts(db, { search: 'English Willow' });
    expect(bats.length).toBeGreaterThan(0);
    expect(bats[0].name).toContain('English Willow');

    // Filter by stock status OUT_OF_STOCK
    const outOfStock = getAllProducts(db, { stock_status: 'OUT_OF_STOCK' });
    expect(outOfStock.length).toBe(1);
    expect(outOfStock[0].sku).toBe('GLV-KOOK-KAH-01');

    // Filter by category_id = 5 (Cricket balls)
    const balls = getAllProducts(db, { category_id: 5 });
    expect(balls.length).toBe(1);
    expect(balls[0].name).toContain('Ball');
  });

  it('7. should generate deterministic SKU and barcode recommendations', () => {
    const sku = generateSku(db, 'BAT', 'SS');
    expect(sku).toMatch(/^BAT-SS-\d{3}$/);

    const barcode = generateBarcode();
    expect(barcode.length).toBe(12);
    expect(barcode.startsWith('890')).toBe(true);
  });

  it('8. should safely delete products without sales, but protect products with transactions', () => {
    // Create new temporary product
    const temp = createProduct(db, {
      name: 'Temporary Deletable Grips',
      sku: 'GRP-TEMP-01',
      category_id: 5,
      brand_id: 1,
      unit_id: 1,
      purchase_cost_paise: 5000,
      selling_price_paise: 10000,
      mrp_paise: 12000,
      min_stock_level: 1,
      reorder_level: 2,
      opening_stock_quantity: 0,
      has_variants: false,
    });

    // Deletion should succeed
    expect(deleteProduct(db, temp.id)).toBe(true);
    expect(getProductById(db, temp.id)).toBeNull();

    // Now test deletion guard when product has a sale invoice movement
    const productWithSale = createProduct(db, {
      name: 'Protected Product With Sale',
      sku: 'PROT-SALE-01',
      category_id: 1,
      brand_id: 1,
      unit_id: 1,
      purchase_cost_paise: 10000,
      selling_price_paise: 20000,
      mrp_paise: 25000,
      min_stock_level: 1,
      reorder_level: 2,
      opening_stock_quantity: 1,
      has_variants: false,
    });

    // Simulate sale movement
    db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_quantity_after, notes)
      VALUES (?, 'SALE_INVOICE', -1, 0, 'Sold on invoice INV-001')
    `).run(productWithSale.id);

    expect(() => deleteProduct(db, productWithSale.id)).toThrow(
      'Cannot delete "Protected Product With Sale" because it has historical sales or purchase movements.'
    );
  });
});
