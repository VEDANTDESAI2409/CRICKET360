import Database from 'better-sqlite3';
import {
  StockAdjustment,
  StockAdjustmentInput,
  StockMovement,
} from '../../shared/types/models';

/**
 * Retrieves auditable stock movements with readable product and variant information.
 */
export function getStockMovements(
  db: Database.Database,
  productId?: number,
  limit: number = 50
): StockMovement[] {
  let sql = `
    SELECT 
      sm.id,
      sm.product_id,
      sm.variant_id,
      sm.movement_type,
      sm.quantity_change,
      sm.balance_quantity_after,
      sm.reference_table,
      sm.reference_id,
      sm.notes,
      sm.created_at,
      p.name as product_name,
      p.sku as product_sku,
      pv.variant_name as variant_name
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    LEFT JOIN product_variants pv ON sm.variant_id = pv.id
    WHERE 1=1
  `;

  const params: (number | string)[] = [];
  if (productId) {
    sql += ' AND sm.product_id = ?';
    params.push(productId);
  }

  sql += ' ORDER BY sm.id DESC LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(...params) as StockMovement[];
}

/**
 * Performs an atomic physical stock adjustment with mandatory audit log.
 */
export function adjustStock(
  db: Database.Database,
  input: StockAdjustmentInput
): StockAdjustment {
  if (input.new_quantity < 0) {
    throw new Error('New stock quantity cannot be negative.');
  }

  const runAdjustment = db.transaction(() => {
    // 1. Fetch current stock
    let currentStock = 0;
    let productName = '';
    let productSku = '';
    let variantName = '';

    if (input.variant_id) {
      const vRow = db
        .prepare(`
          SELECT pv.stock_quantity, pv.variant_name, p.name as product_name, p.sku as product_sku
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          WHERE pv.id = ? AND pv.product_id = ?
        `)
        .get(input.variant_id, input.product_id) as
        | { stock_quantity: number; variant_name: string; product_name: string; product_sku: string }
        | undefined;

      if (!vRow) {
        throw new Error(`Variant with ID ${input.variant_id} for Product ${input.product_id} not found.`);
      }

      currentStock = vRow.stock_quantity;
      productName = vRow.product_name;
      productSku = vRow.product_sku;
      variantName = vRow.variant_name;
    } else {
      const pRow = db
        .prepare('SELECT stock_quantity, name, sku FROM products WHERE id = ?')
        .get(input.product_id) as
        | { stock_quantity: number; name: string; sku: string }
        | undefined;

      if (!pRow) {
        throw new Error(`Product with ID ${input.product_id} not found.`);
      }

      currentStock = pRow.stock_quantity;
      productName = pRow.name;
      productSku = pRow.sku;
    }

    const variance = input.new_quantity - currentStock;
    if (variance === 0) {
      throw new Error('New stock quantity is identical to current stock. No adjustment variance detected.');
    }

    // 2. Generate unique adjustment reference number (e.g., ADJ-2026-0001)
    const countRow = db.prepare('SELECT COUNT(*) as count FROM stock_adjustments').get() as { count: number };
    const adjNumber = `ADJ-${new Date().getFullYear()}-${String((countRow?.count || 0) + 1).padStart(4, '0')}`;

    // 3. Update stock in database
    if (input.variant_id) {
      db.prepare('UPDATE product_variants SET stock_quantity = ? WHERE id = ?').run(
        input.new_quantity,
        input.variant_id
      );

      // Recalculate parent product total stock from all variants
      const totalVarStock = db
        .prepare('SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_variants WHERE product_id = ?')
        .get(input.product_id) as { total: number };

      db.prepare("UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?").run(
        totalVarStock.total,
        input.product_id
      );
    } else {
      db.prepare("UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?").run(
        input.new_quantity,
        input.product_id
      );
    }

    // 4. Insert into stock_adjustments table
    const adjRes = db
      .prepare(`
        INSERT INTO stock_adjustments (
          adjustment_number, product_id, variant_id,
          old_quantity, new_quantity, variance_quantity,
          reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .run(
        adjNumber,
        input.product_id,
        input.variant_id || null,
        currentStock,
        input.new_quantity,
        variance,
        input.reason,
        input.notes ? input.notes.trim() : null
      );

    const adjustmentId = Number(adjRes.lastInsertRowid);

    // 5. Insert corresponding immutable movement record in stock_movements
    const movementType =
      variance < 0 && input.reason === 'DAMAGED_IN_STORE'
        ? 'DAMAGE_WRITE_OFF'
        : 'PHYSICAL_ADJUSTMENT';

    const auditNote = input.notes ? `${input.reason}: ${input.notes.trim()}` : input.reason;

    db.prepare(`
      INSERT INTO stock_movements (
        product_id, variant_id, movement_type,
        quantity_change, balance_quantity_after,
        reference_table, reference_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, 'stock_adjustments', ?, ?, datetime('now'))
    `).run(
      input.product_id,
      input.variant_id || null,
      movementType,
      variance,
      input.new_quantity,
      adjustmentId,
      auditNote
    );

    return {
      id: adjustmentId,
      adjustment_number: adjNumber,
      product_id: input.product_id,
      product_name: productName,
      product_sku: productSku,
      variant_id: input.variant_id,
      variant_name: variantName,
      old_quantity: currentStock,
      new_quantity: input.new_quantity,
      variance_quantity: variance,
      reason: input.reason,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };
  });

  return runAdjustment();
}

/**
 * Retrieves physical stock adjustments history.
 */
export function getStockAdjustments(
  db: Database.Database,
  productId?: number,
  limit: number = 50
): StockAdjustment[] {
  let sql = `
    SELECT 
      sa.id,
      sa.adjustment_number,
      sa.product_id,
      sa.variant_id,
      sa.old_quantity,
      sa.new_quantity,
      sa.variance_quantity,
      sa.reason,
      sa.notes,
      sa.created_at,
      p.name as product_name,
      p.sku as product_sku,
      pv.variant_name as variant_name
    FROM stock_adjustments sa
    LEFT JOIN products p ON sa.product_id = p.id
    LEFT JOIN product_variants pv ON sa.variant_id = pv.id
    WHERE 1=1
  `;

  const params: (number | string)[] = [];
  if (productId) {
    sql += ' AND sa.product_id = ?';
    params.push(productId);
  }

  sql += ' ORDER BY sa.id DESC LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(...params) as StockAdjustment[];
}
