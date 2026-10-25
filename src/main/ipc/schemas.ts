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
  email: z.string().email().max(100).nullable().optional().or(z.literal('')),
  gstin: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  state_code: z.string().max(10).nullable().optional(),
  credit_limit_paise: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateCustomerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(150),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(100).nullable().optional().or(z.literal('')),
  gstin: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  state_code: z.string().max(10).nullable().optional(),
  credit_limit_paise: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters').max(150),
  company_name: z.string().max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(100).nullable().optional().or(z.literal('')),
  gstin: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  state_code: z.string().max(10).optional(),
  payment_terms_days: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateSupplierSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2, 'Supplier name must be at least 2 characters').max(150),
  company_name: z.string().max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(100).nullable().optional().or(z.literal('')),
  gstin: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  state_code: z.string().max(10).optional(),
  payment_terms_days: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export const createPurchaseItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unit_cost_paise: z.number().int().nonnegative('Unit cost cannot be negative'),
  tax_rate_percent: z.number().nonnegative(),
  discount_amount_paise: z.number().int().nonnegative().optional(),
});

export const createPurchaseSchema = z.object({
  supplier_id: z.number().int().positive('Supplier selection is required'),
  supplier_invoice_number: z.string().min(1, 'Supplier invoice number is required').max(100),
  purchase_date: z.string().min(10).max(10),
  place_of_supply: z.string().max(10).optional(),
  is_inter_state: z.boolean().optional(),
  items: z.array(createPurchaseItemSchema).min(1, 'Purchase must have at least one line item'),
  discount_amount_paise: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  initial_payment: z
    .object({
      amount_paise: z.number().int().nonnegative(),
      payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
      reference_number: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
});

export const createPurchaseReturnItemSchema = z.object({
  purchase_item_id: z.number().int().positive(),
  quantity: z.number().int().positive('Return quantity must be greater than zero'),
});

export const createPurchaseReturnSchema = z.object({
  purchase_id: z.number().int().positive(),
  return_date: z.string().min(10).max(10),
  reason: z.string().min(2, 'Return reason is required').max(300),
  notes: z.string().max(500).optional(),
  items: z.array(createPurchaseReturnItemSchema).min(1, 'Must return at least one item'),
});

export const recordSupplierPaymentSchema = z.object({
  supplier_id: z.number().int().positive(),
  purchase_id: z.number().int().positive().nullable().optional(),
  amount_paise: z.number().int().positive('Payment amount must be greater than zero'),
  payment_date: z.string().min(10).max(10),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  reference_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const recordCustomerPaymentSchema = z.object({
  customer_id: z.number().int().positive(),
  invoice_id: z.number().int().positive().nullable().optional(),
  amount_paise: z.number().int().positive('Payment amount must be greater than zero'),
  payment_date: z.string().min(10).max(10),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  reference_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// ==========================================
// Milestone 6 Schemas
// ==========================================

export const createSalesReturnItemSchema = z.object({
  sales_invoice_item_id: z.number().int().positive(),
  quantity: z.number().int().positive('Return quantity must be greater than zero'),
  restock: z.boolean(),
});

export const createSalesReturnSchema = z.object({
  invoice_id: z.number().int().positive(),
  return_date: z.string().min(10).max(10),
  refund_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'STORE_CREDIT']),
  refund_reference: z.string().max(100).nullable().optional(),
  reason: z.string().min(2, 'Return reason must be at least 2 characters').max(300),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(createSalesReturnItemSchema).min(1, 'Must return at least one item'),
});

export const salesReturnFilterSchema = z.object({
  search: z.string().max(100).optional(),
  start_date: z.string().max(20).optional(),
  end_date: z.string().max(20).optional(),
  customer_id: z.number().int().positive().optional(),
});

export const createExpenseCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Category code must be at least 2 characters').max(30),
  description: z.string().max(300).nullable().optional(),
});

export const createExpenseSchema = z.object({
  category_id: z.number().int().positive('Expense category is required'),
  expense_date: z.string().min(10).max(10),
  amount_paise: z.number().int().positive('Expense amount must be greater than zero'),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  payment_status: z.enum(['PAID', 'PENDING', 'DRAFT']).optional(),
  payee_name: z.string().max(150).nullable().optional(),
  supplier_id: z.number().int().positive().nullable().optional(),
  reference_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateExpenseSchema = z.object({
  id: z.number().int().positive(),
  category_id: z.number().int().positive().optional(),
  expense_date: z.string().min(10).max(10).optional(),
  amount_paise: z.number().int().positive().optional(),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']).optional(),
  payment_status: z.enum(['PAID', 'PENDING', 'DRAFT']).optional(),
  payee_name: z.string().max(150).nullable().optional(),
  supplier_id: z.number().int().positive().nullable().optional(),
  reference_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const expenseFilterSchema = z.object({
  search: z.string().max(100).optional(),
  category_id: z.number().int().positive().optional(),
  payment_status: z.enum(['PAID', 'PENDING', 'DRAFT']).optional(),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']).optional(),
  start_date: z.string().max(20).optional(),
  end_date: z.string().max(20).optional(),
});

export const reportDateFilterSchema = z.object({
  start_date: z.string().min(10).max(10),
  end_date: z.string().min(10).max(10),
});

export const auditLogFilterSchema = z.object({
  action: z.string().max(50).optional(),
  entity_type: z.string().max(50).optional(),
  start_date: z.string().max(20).optional(),
  end_date: z.string().max(20).optional(),
  limit: z.number().int().positive().optional(),
});

export const updateShopSettingsSchema = z.object({
  shop_name: z.string().min(1, 'Shop name is required').max(150),
  shop_address: z.string().max(300),
  shop_phone: z.string().max(50),
  shop_email: z.string().max(100),
  shop_gstin: z.string().max(25),
  shop_state_code: z.string().max(10),
  invoice_prefix: z.string().max(10),
  thermal_printer_name: z.string().max(100).optional(),
  thermal_receipt_width: z.string().max(20).optional(),
  store_terms_and_conditions: z.string().max(2000).optional(),
  auto_backup_enabled: z.string().max(10).optional(),
  auto_backup_retention_days: z.string().max(10).optional(),
  low_stock_warning_threshold: z.string().max(10).optional(),
});


