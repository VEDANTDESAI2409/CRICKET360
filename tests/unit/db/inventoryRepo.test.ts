import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  adjustStock,
  getStockMovements,
  getStockAdjustments,
} from '../../../src/main/db/inventoryRepo';
import { createProduct, getProductById } from '../../../src/main/db/productRepo';

describe('Milestone 3: Inventory Repository & Auditable Adjustments', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

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

  it('1. should perform an atomic physical stock adjustment and log movements', () => {
    // Initial product 1 (SS Bat) has 8 units in seed
    const initialProd = getProductById(db, 1);
    expect(initialProd?.stock_quantity).toBe(8);

    const adjustment = adjustStock(db, {
      product_id: 1,
      new_quantity: 12, // +4 surplus found
      reason: 'FOUND_SURPLUS',
      notes: 'Found 4 unboxed bats in storage mezzanine',
    });

    expect(adjustment.old_quantity).toBe(8);
    expect(adjustment.new_quantity).toBe(12);
    expect(adjustment.variance_quantity).toBe(4);
    expect(adjustment.reason).toBe('FOUND_SURPLUS');
    expect(adjustment.adjustment_number).toMatch(/^ADJ-\d{4}-\d{4}$/);

    // Verify product stock was updated
    const updatedProd = getProductById(db, 1);
    expect(updatedProd?.stock_quantity).toBe(12);

    // Verify stock_movements ledger entry
    const movements = getStockMovements(db, 1);
    expect(movements.length).toBeGreaterThan(0);
    const latestMovement = movements[0];
    expect(latestMovement.movement_type).toBe('PHYSICAL_ADJUSTMENT');
    expect(latestMovement.quantity_change).toBe(4);
    expect(latestMovement.balance_quantity_after).toBe(12);
    expect(latestMovement.notes).toContain('Found 4 unboxed bats');
  });

  it('2. should classify damaged write-offs properly in movement ledger', () => {
    // Product 4 (Shrey Helmet) has 5 units in seed
    const adjustment = adjustStock(db, {
      product_id: 4,
      new_quantity: 3, // 2 units broken/damaged
      reason: 'DAMAGED_IN_STORE',
      notes: 'Grille cracked during customer demo',
    });

    expect(adjustment.variance_quantity).toBe(-2);

    const movements = getStockMovements(db, 4);
    const latest = movements[0];
    expect(latest.movement_type).toBe('DAMAGE_WRITE_OFF');
    expect(latest.quantity_change).toBe(-2);
    expect(latest.balance_quantity_after).toBe(3);
  });

  it('3. should reject negative stock counts and zero-variance adjustments', () => {
    // Reject negative count
    expect(() =>
      adjustStock(db, {
        product_id: 1,
        new_quantity: -5,
        reason: 'THEFT_OR_LOSS',
      })
    ).toThrow('New stock quantity cannot be negative.');

    // Reject 0 variance (attempting to set same stock)
    expect(() =>
      adjustStock(db, {
        product_id: 1,
        new_quantity: 8, // currently 8
        reason: 'PHYSICAL_AUDIT_MISMATCH',
      })
    ).toThrow('New stock quantity is identical to current stock.');
  });

  it('4. should update variant stock and recalculate parent product total stock', () => {
    // Create product with 2 variants
    const prod = createProduct(db, {
      name: 'SG Test Batting Gloves',
      sku: 'GLV-SG-TEST-01',
      category_id: 2,
      brand_id: 2,
      unit_id: 2,
      purchase_cost_paise: 120000,
      selling_price_paise: 180000,
      mrp_paise: 220000,
      min_stock_level: 2,
      reorder_level: 4,
      opening_stock_quantity: 0,
      has_variants: true,
      variants: [
        {
          variant_name: 'Men',
          sku: 'GLV-SG-TEST-01-MEN',
          purchase_cost_paise: 120000,
          selling_price_paise: 180000,
          mrp_paise: 220000,
          opening_stock_quantity: 5,
        },
        {
          variant_name: 'Youth',
          sku: 'GLV-SG-TEST-01-YTH',
          purchase_cost_paise: 120000,
          selling_price_paise: 180000,
          mrp_paise: 220000,
          opening_stock_quantity: 3,
        },
      ],
    });

    expect(prod.stock_quantity).toBe(8); // 5 + 3
    const variantId = prod.variants![0].id;

    // Adjust variant stock from 5 to 10
    adjustStock(db, {
      product_id: prod.id,
      variant_id: variantId,
      new_quantity: 10,
      reason: 'FOUND_SURPLUS',
    });

    // Parent product total stock should now be 10 + 3 = 13
    const updatedParent = getProductById(db, prod.id);
    expect(updatedParent?.stock_quantity).toBe(13);
  });

  it('5. should fetch stock adjustments history accurately', () => {
    adjustStock(db, {
      product_id: 1,
      new_quantity: 10,
      reason: 'PHYSICAL_AUDIT_MISMATCH',
      notes: 'Shelf count audit',
    });

    const adjustments = getStockAdjustments(db);
    expect(adjustments.length).toBeGreaterThan(0);
    expect(adjustments[0].product_id).toBe(1);
    expect(adjustments[0].reason).toBe('PHYSICAL_AUDIT_MISMATCH');
    expect(adjustments[0].product_name).toContain('SS Ton Master');
  });
});
