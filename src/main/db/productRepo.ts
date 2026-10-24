import Database from 'better-sqlite3';
import {
  ProductWithDetails,
  ProductVariant,
  CreateProductInput,
  UpdateProductInput,
  ProductFilterQuery,
} from '../../shared/types/models';

/**
 * Validates whether an SKU is available (not already in use).
 */
export function validateSku(
  db: Database.Database,
  sku: string,
  excludeProductId?: number
): boolean {
  const cleanSku = sku.trim();
  if (!cleanSku) return false;

  let query = 'SELECT id FROM products WHERE sku = ? COLLATE NOCASE';
  const params: (string | number)[] = [cleanSku];
  if (excludeProductId) {
    query += ' AND id != ?';
    params.push(excludeProductId);
  }

  const existingProd = db.prepare(query).get(...params);
  if (existingProd) return false;

  // Also check product_variants table
  let varQuery = 'SELECT id FROM product_variants WHERE sku = ? COLLATE NOCASE';
  const varParams: (string | number)[] = [cleanSku];
  if (excludeProductId) {
    varQuery += ' AND product_id != ?';
    varParams.push(excludeProductId);
  }

  const existingVar = db.prepare(varQuery).get(...varParams);
  return !existingVar;
}

/**
 * Validates whether a barcode is available (not already in use).
 */
export function validateBarcode(
  db: Database.Database,
  barcode: string,
  excludeProductId?: number
): boolean {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return true; // empty barcode is allowed

  let query = 'SELECT id FROM products WHERE barcode = ?';
  const params: (string | number)[] = [cleanBarcode];
  if (excludeProductId) {
    query += ' AND id != ?';
    params.push(excludeProductId);
  }

  const existingProd = db.prepare(query).get(...params);
  if (existingProd) return false;

  let varQuery = 'SELECT id FROM product_variants WHERE barcode = ?';
  const varParams: (string | number)[] = [cleanBarcode];
  if (excludeProductId) {
    varQuery += ' AND product_id != ?';
    varParams.push(excludeProductId);
  }

  const existingVar = db.prepare(varQuery).get(...varParams);
  return !existingVar;
}

/**
 * Generates a structured SKU recommendation based on category and brand codes.
 */
export function generateSku(
  db: Database.Database,
  categoryCode: string,
  brandCode: string
): string {
  const cat = (categoryCode || 'CRIC').toUpperCase().slice(0, 4);
  const brd = (brandCode || 'GEN').toUpperCase().slice(0, 4);
  const prefix = `${cat}-${brd}`;

  const row = db
    .prepare("SELECT COUNT(*) as count FROM products WHERE sku LIKE ? || '%'")
    .get(prefix) as { count: number };

  const nextSeq = String((row?.count || 0) + 1).padStart(3, '0');
  let candidate = `${prefix}-${nextSeq}`;

  // Ensure uniqueness
  let counter = 1;
  while (!validateSku(db, candidate)) {
    candidate = `${prefix}-${String((row?.count || 0) + 1 + counter).padStart(3, '0')}`;
    counter++;
  }

  return candidate;
}

/**
 * Generates an EAN-13 compatible 12/13-digit barcode with India prefix 890.
 */
export function generateBarcode(): string {
  // India GS1 country code prefix 890 + random 9 digits
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `890${randomPart}`;
}

/**
 * Retrieves all products with category, brand, and unit details based on filters.
 */
export function getAllProducts(
  db: Database.Database,
  filters: ProductFilterQuery = {}
): ProductWithDetails[] {
  let sql = `
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.barcode,
      p.category_id,
      p.brand_id,
      p.unit_id,
      p.hsn_code,
      p.tax_rate_percent,
      p.purchase_cost_paise,
      p.selling_price_paise,
      p.mrp_paise,
      p.stock_quantity,
      p.min_stock_level,
      p.reorder_level,
      p.has_variants,
      p.is_active,
      p.created_at,
      p.updated_at,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(b.name, 'Generic') as brand_name,
      COALESCE(u.name, 'Pieces') as unit_name,
      COALESCE(u.symbol, 'Pcs') as unit_symbol,
      (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) as variants_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE 1=1
  `;

  const params: (string | number)[] = [];

  // Search filter (name, SKU, barcode, brand name, category name)
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    sql += ` AND (
      p.name LIKE ? OR 
      p.sku LIKE ? OR 
      p.barcode LIKE ? OR 
      c.name LIKE ? OR 
      b.name LIKE ?
    )`;
    params.push(q, q, q, q, q);
  }

  if (filters.category_id) {
    sql += ' AND p.category_id = ?';
    params.push(filters.category_id);
  }

  if (filters.brand_id) {
    sql += ' AND p.brand_id = ?';
    params.push(filters.brand_id);
  }

  if (typeof filters.is_active === 'number') {
    sql += ' AND p.is_active = ?';
    params.push(filters.is_active);
  }

  // Stock status filter
  if (filters.stock_status && filters.stock_status !== 'ALL') {
    if (filters.stock_status === 'OUT_OF_STOCK') {
      sql += ' AND p.stock_quantity = 0';
    } else if (filters.stock_status === 'LOW_STOCK') {
      sql += ' AND p.stock_quantity > 0 AND p.stock_quantity <= p.min_stock_level';
    } else if (filters.stock_status === 'IN_STOCK') {
      sql += ' AND p.stock_quantity > p.min_stock_level';
    } else if (filters.stock_status === 'INACTIVE') {
      sql += ' AND p.is_active = 0';
    }
  }

  // Sorting
  const sortDirection = filters.sort_direction === 'desc' ? 'DESC' : 'ASC';
  let sortCol = 'p.name';
  if (filters.sort_by === 'sku') sortCol = 'p.sku';
  else if (filters.sort_by === 'price') sortCol = 'p.selling_price_paise';
  else if (filters.sort_by === 'stock') sortCol = 'p.stock_quantity';
  else if (filters.sort_by === 'created_at') sortCol = 'p.id';

  sql += ` ORDER BY ${sortCol} ${sortDirection}`;

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return db.prepare(sql).all(...params) as ProductWithDetails[];
}

/**
 * Retrieves a single product with full category, brand, unit, and variant details.
 */
export function getProductById(
  db: Database.Database,
  id: number
): ProductWithDetails | null {
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.barcode,
      p.category_id,
      p.brand_id,
      p.unit_id,
      p.hsn_code,
      p.tax_rate_percent,
      p.purchase_cost_paise,
      p.selling_price_paise,
      p.mrp_paise,
      p.stock_quantity,
      p.min_stock_level,
      p.reorder_level,
      p.has_variants,
      p.is_active,
      p.created_at,
      p.updated_at,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(b.name, 'Generic') as brand_name,
      COALESCE(u.name, 'Pieces') as unit_name,
      COALESCE(u.symbol, 'Pcs') as unit_symbol,
      (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) as variants_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE p.id = ?
  `;

  const product = db.prepare(sql).get(id) as ProductWithDetails | undefined;
  if (!product) return null;

  // Retrieve variants if present
  product.variants = db
    .prepare(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC'
    )
    .all(id) as ProductVariant[];

  return product;
}

/**
 * Creates a new product along with optional variants and initial opening stock.
 */
export function createProduct(
  db: Database.Database,
  data: CreateProductInput
): ProductWithDetails {
  // Validate SKU uniqueness
  if (!validateSku(db, data.sku)) {
    throw new Error(`SKU "${data.sku}" is already in use by another product.`);
  }

  // Validate barcode uniqueness if provided
  if (data.barcode && data.barcode.trim()) {
    if (!validateBarcode(db, data.barcode)) {
      throw new Error(`Barcode "${data.barcode}" is already assigned to another product.`);
    }
  }

  // Enforce pricing logic: selling_price must be <= mrp
  if (data.mrp_paise > 0 && data.selling_price_paise > data.mrp_paise) {
    throw new Error('Selling price cannot exceed Maximum Retail Price (MRP).');
  }

  const runCreate = db.transaction(() => {
    let initialStock = Math.max(0, data.opening_stock_quantity || 0);

    // If variants are specified, calculate total stock from variants
    if (data.has_variants && data.variants && data.variants.length > 0) {
      initialStock = data.variants.reduce(
        (sum, v) => sum + Math.max(0, v.opening_stock_quantity || 0),
        0
      );
    }

    const insertStmt = db.prepare(`
      INSERT INTO products (
        name, sku, barcode, category_id, brand_id, unit_id,
        hsn_code, tax_rate_percent, purchase_cost_paise, selling_price_paise,
        mrp_paise, stock_quantity, min_stock_level, reorder_level,
        has_variants, is_active, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 1, datetime('now'), datetime('now')
      )
    `);

    const result = insertStmt.run(
      data.name.trim(),
      data.sku.trim(),
      data.barcode ? data.barcode.trim() : null,
      data.category_id,
      data.brand_id,
      data.unit_id,
      data.hsn_code || '9506',
      data.tax_rate_percent ?? 12.0,
      data.purchase_cost_paise,
      data.selling_price_paise,
      data.mrp_paise,
      initialStock,
      data.min_stock_level,
      data.reorder_level,
      data.has_variants ? 1 : 0
    );

    const productId = Number(result.lastInsertRowid);

    // Insert variants if present
    if (data.has_variants && data.variants && data.variants.length > 0) {
      const insertVarStmt = db.prepare(`
        INSERT INTO product_variants (
          product_id, variant_name, sku, barcode, size, color,
          purchase_cost_paise, selling_price_paise, mrp_paise,
          stock_quantity, tax_rate_percent, is_active, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, 1, datetime('now')
        )
      `);

      for (const v of data.variants) {
        if (!validateSku(db, v.sku)) {
          throw new Error(`Variant SKU "${v.sku}" is already in use.`);
        }

        const vStock = Math.max(0, v.opening_stock_quantity || 0);
        const varRes = insertVarStmt.run(
          productId,
          v.variant_name.trim(),
          v.sku.trim(),
          v.barcode ? v.barcode.trim() : null,
          v.size ? v.size.trim() : null,
          v.color ? v.color.trim() : null,
          v.purchase_cost_paise,
          v.selling_price_paise,
          v.mrp_paise,
          vStock,
          v.tax_rate_percent ?? (data.tax_rate_percent ?? 12.0)
        );

        // Record opening stock for variant
        if (vStock > 0) {
          db.prepare(`
            INSERT INTO stock_movements (
              product_id, variant_id, movement_type, quantity_change,
              balance_quantity_after, notes, created_at
            ) VALUES (?, ?, 'OPENING_STOCK', ?, ?, 'Initial stock on variant creation', datetime('now'))
          `).run(productId, Number(varRes.lastInsertRowid), vStock, vStock);
        }
      }
    } else if (initialStock > 0) {
      // Record opening stock for simple product
      db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity_change,
          balance_quantity_after, notes, created_at
        ) VALUES (?, 'OPENING_STOCK', ?, ?, 'Initial stock on product creation', datetime('now'))
      `).run(productId, initialStock, initialStock);
    }

    return productId;
  });

  const createdId = runCreate();
  const created = getProductById(db, createdId);
  if (!created) {
    throw new Error('Failed to retrieve product after creation.');
  }
  return created;
}

/**
 * Updates an existing product's master catalog properties.
 */
export function updateProduct(
  db: Database.Database,
  data: UpdateProductInput
): ProductWithDetails {
  const existing = getProductById(db, data.id);
  if (!existing) {
    throw new Error(`Product with ID ${data.id} not found.`);
  }

  if (!validateSku(db, data.sku, data.id)) {
    throw new Error(`SKU "${data.sku}" is already in use by another product.`);
  }

  if (data.barcode && data.barcode.trim()) {
    if (!validateBarcode(db, data.barcode, data.id)) {
      throw new Error(`Barcode "${data.barcode}" is already assigned to another product.`);
    }
  }

  if (data.mrp_paise > 0 && data.selling_price_paise > data.mrp_paise) {
    throw new Error('Selling price cannot exceed Maximum Retail Price (MRP).');
  }

  db.prepare(`
    UPDATE products SET
      name = ?,
      sku = ?,
      barcode = ?,
      category_id = ?,
      brand_id = ?,
      unit_id = ?,
      hsn_code = ?,
      tax_rate_percent = ?,
      purchase_cost_paise = ?,
      selling_price_paise = ?,
      mrp_paise = ?,
      min_stock_level = ?,
      reorder_level = ?,
      is_active = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name.trim(),
    data.sku.trim(),
    data.barcode ? data.barcode.trim() : null,
    data.category_id,
    data.brand_id,
    data.unit_id,
    data.hsn_code || '9506',
    data.tax_rate_percent ?? 12.0,
    data.purchase_cost_paise,
    data.selling_price_paise,
    data.mrp_paise,
    data.min_stock_level,
    data.reorder_level,
    data.is_active,
    data.id
  );

  const updated = getProductById(db, data.id);
  if (!updated) {
    throw new Error('Failed to retrieve updated product.');
  }
  return updated;
}

/**
 * Toggles product active state.
 */
export function toggleProductActive(
  db: Database.Database,
  id: number,
  isActive: number
): boolean {
  const res = db
    .prepare("UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
    .run(isActive === 1 ? 1 : 0, id);
  return res.changes > 0;
}

/**
 * Safely deletes a product if it has no sales or purchases.
 */
export function deleteProduct(db: Database.Database, id: number): boolean {
  const existing = getProductById(db, id);
  if (!existing) {
    throw new Error(`Product with ID ${id} not found.`);
  }

  // Check sales invoices or purchases referencing this product
  let hasInvoices = false;
  try {
    const saleRow = db
      .prepare('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ? AND movement_type IN (\'SALE_INVOICE\', \'PURCHASE_RECEIPT\')')
      .get(id) as { count: number };
    if (saleRow && saleRow.count > 0) {
      hasInvoices = true;
    }
  } catch {
    // If movement table error, continue
  }

  if (hasInvoices) {
    throw new Error(
      `Cannot delete "${existing.name}" because it has historical sales or purchase movements. Please deactivate the product instead to preserve business integrity.`
    );
  }

  const runDelete = db.transaction(() => {
    // Clean up opening stock movements & adjustments for this product
    db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM stock_adjustments WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  });

  runDelete();
  return true;
}

/**
 * Retrieves variants for a product.
 */
export function getProductVariants(
  db: Database.Database,
  productId: number
): ProductVariant[] {
  return db
    .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC')
    .all(productId) as ProductVariant[];
}
