import Database from 'better-sqlite3';
import { Category, Brand, Unit, HsnCode } from '../../shared/types/models';

export function getCategories(db: Database.Database): Category[] {
  return db
    .prepare('SELECT * FROM categories ORDER BY name ASC')
    .all() as Category[];
}

export function getBrands(db: Database.Database): Brand[] {
  return db
    .prepare('SELECT * FROM brands ORDER BY name ASC')
    .all() as Brand[];
}

export function getUnits(db: Database.Database): Unit[] {
  return db
    .prepare('SELECT * FROM units ORDER BY name ASC')
    .all() as Unit[];
}

export function getHsnCodes(db: Database.Database): HsnCode[] {
  return db
    .prepare('SELECT * FROM hsn_codes WHERE is_active = 1 ORDER BY hsn_code ASC')
    .all() as HsnCode[];
}

export function createCategory(
  db: Database.Database,
  name: string,
  code: string,
  description?: string
): Category {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();

  const res = db
    .prepare('INSERT INTO categories (name, code, description) VALUES (?, ?, ?)')
    .run(cleanName, cleanCode, description ? description.trim() : null);

  return db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(Number(res.lastInsertRowid)) as Category;
}

export function createBrand(
  db: Database.Database,
  name: string,
  code: string
): Brand {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();

  const res = db
    .prepare('INSERT INTO brands (name, code) VALUES (?, ?)')
    .run(cleanName, cleanCode);

  return db
    .prepare('SELECT * FROM brands WHERE id = ?')
    .get(Number(res.lastInsertRowid)) as Brand;
}
