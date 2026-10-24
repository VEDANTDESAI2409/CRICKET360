import { z } from 'zod';

export const settingKeySchema = z.string().min(1).max(100).regex(/^[a-z0-9_]+$/i);
export const settingValueSchema = z.string().max(2000);
export const setSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

export const createVariantSchema = z.object({
  variant_name: z.string().min(1).max(150),
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  opening_stock_quantity: z.number().int().nonnegative(),
  tax_rate_percent: z.number().nonnegative().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(60),
  barcode: z.string().max(60).optional(),
  category_id: z.number().int().positive(),
  brand_id: z.number().int().positive(),
  unit_id: z.number().int().positive(),
  hsn_code: z.string().max(20).optional(),
  tax_rate_percent: z.number().nonnegative().optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  reorder_level: z.number().int().nonnegative(),
  opening_stock_quantity: z.number().int().nonnegative(),
  has_variants: z.boolean(),
  variants: z.array(createVariantSchema).optional(),
});

export const updateProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(60),
  barcode: z.string().max(60).optional(),
  category_id: z.number().int().positive(),
  brand_id: z.number().int().positive(),
  unit_id: z.number().int().positive(),
  hsn_code: z.string().max(20).optional(),
  tax_rate_percent: z.number().nonnegative().optional(),
  purchase_cost_paise: z.number().int().nonnegative(),
  selling_price_paise: z.number().int().nonnegative(),
  mrp_paise: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  reorder_level: z.number().int().nonnegative(),
  is_active: z.number().int().min(0).max(1),
});

export const stockAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().optional(),
  new_quantity: z.number().int().nonnegative(),
  reason: z.enum([
    'PHYSICAL_AUDIT_MISMATCH',
    'DAMAGED_IN_STORE',
    'EXPIRED_DEFECTIVE',
    'SAMPLE_DEMO',
    'THEFT_OR_LOSS',
    'FOUND_SURPLUS',
    'OTHER',
  ]),
  notes: z.string().max(1000).optional(),
});

export const createInvoiceItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().positive(),
  unit_price_paise: z.number().int().nonnegative(),
  discount_amount_paise: z.number().int().nonnegative().optional(),
});

export const paymentTenderSchema = z.object({
  mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  amount_paise: z.number().int().nonnegative(),
  reference_number: z.string().max(100).nullable().optional(),
});

export const createInvoiceSchema = z.object({
  customer_id: z.number().int().positive().nullable().optional(),
  customer_name: z.string().max(150).nullable().optional(),
  customer_phone: z.string().max(30).nullable().optional(),
  customer_gstin: z.string().max(20).nullable().optional(),
  customer_address: z.string().max(300).nullable().optional(),
  customer_state_code: z.string().max(10).nullable().optional(),
  items: z.array(createInvoiceItemSchema).min(1, 'Invoice must contain at least one product item.'),
  discount_amount_paise: z.number().int().nonnegative().optional(),
  payments: z.array(paymentTenderSchema),
  notes: z.string().max(500).nullable().optional(),
});

export const cancelInvoiceSchema = z.object({
  invoiceId: z.number().int().positive(),
  reason: z.string().min(2, 'Cancellation reason must be at least 2 characters').max(300),
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(150),
  phone: z.string().max(30).nullable().optional(),
  gstin: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  state_code: z.string().max(10).nullable().optional(),
  credit_limit_paise: z.number().int().nonnegative().optional(),
});
