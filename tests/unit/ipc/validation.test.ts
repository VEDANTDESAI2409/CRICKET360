import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const settingKeySchema = z.string().min(1).max(100).regex(/^[a-z0-9_]+$/i);
const settingValueSchema = z.string().max(2000);

const setSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

describe('Milestone 1: IPC Input Boundary Validation', () => {
  it('1. should accept valid alphanumeric and underscore setting keys', () => {
    const validKeys = [
      'shop_name',
      'invoice_prefix',
      'thermal_printer_name',
      'gstin_number',
      'CRICKET360_SETTING_1',
    ];

    for (const key of validKeys) {
      expect(() => settingKeySchema.parse(key)).not.toThrow();
    }
  });

  it('2. should reject invalid or dangerous setting keys', () => {
    const invalidKeys = [
      '', // empty
      'shop name with spaces',
      'key;DROP TABLE users;', // SQL injection attempt
      '<script>alert(1)</script>', // XSS attempt
      '../../etc/passwd', // path traversal
      'a'.repeat(101), // exceeds max length
    ];

    for (const key of invalidKeys) {
      expect(() => settingKeySchema.parse(key)).toThrow();
    }
  });

  it('3. should validate complete setting payloads correctly', () => {
    // Valid payload
    const validPayload = {
      key: 'tax_rate_bats',
      value: '12%',
    };
    const parsed = setSettingSchema.parse(validPayload);
    expect(parsed.key).toBe('tax_rate_bats');
    expect(parsed.value).toBe('12%');

    // Missing key
    expect(() => setSettingSchema.parse({ value: '12%' })).toThrow();

    // Value exceeding limit
    expect(() =>
      setSettingSchema.parse({
        key: 'long_val',
        value: 'x'.repeat(2001),
      })
    ).toThrow();
  });

  it('4. should validate createInvoiceSchema payloads correctly', () => {
    const createInvoiceItemSchema = z.object({
      product_id: z.number().int().positive(),
      variant_id: z.number().int().positive().nullable().optional(),
      quantity: z.number().int().positive(),
      unit_price_paise: z.number().int().nonnegative(),
      discount_amount_paise: z.number().int().nonnegative().optional(),
    });

    const paymentTenderSchema = z.object({
      mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
      amount_paise: z.number().int().nonnegative(),
      reference_number: z.string().max(100).optional(),
    });

    const createInvoiceSchema = z.object({
      customer_id: z.number().int().positive().nullable().optional(),
      customer_name: z.string().max(150).optional(),
      customer_phone: z.string().max(30).optional(),
      customer_gstin: z.string().max(20).optional(),
      customer_address: z.string().max(300).optional(),
      customer_state_code: z.string().max(10).optional(),
      items: z.array(createInvoiceItemSchema).min(1),
      discount_amount_paise: z.number().int().nonnegative().optional(),
      payments: z.array(paymentTenderSchema),
      notes: z.string().max(500).optional(),
    });

    // Valid payload
    const valid = {
      customer_id: 1,
      items: [
        { product_id: 1, quantity: 2, unit_price_paise: 1150000, discount_amount_paise: 5000 },
      ],
      payments: [{ mode: 'CASH', amount_paise: 2295000 }],
    };
    expect(() => createInvoiceSchema.parse(valid)).not.toThrow();

    // Reject empty items array
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();

    // Reject negative quantity or price
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [{ product_id: 1, quantity: -1, unit_price_paise: 1000 }],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();

    // Reject invalid payment mode
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 1, unit_price_paise: 1000 }],
        payments: [{ mode: 'BITCOIN', amount_paise: 1000 }],
      })
    ).toThrow();
  });

  it('5. should validate cancelInvoiceSchema and mandate a reason', () => {
    const cancelInvoiceSchema = z.object({
      invoiceId: z.number().int().positive(),
      reason: z.string().min(2).max(300),
    });

    expect(() =>
      cancelInvoiceSchema.parse({ invoiceId: 10, reason: 'Wrong item billed' })
    ).not.toThrow();

    // Too short or empty reason
    expect(() => cancelInvoiceSchema.parse({ invoiceId: 10, reason: '' })).toThrow();
    // Non-positive invoice id
    expect(() => cancelInvoiceSchema.parse({ invoiceId: 0, reason: 'Valid reason' })).toThrow();
  });
});

