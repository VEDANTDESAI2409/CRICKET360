import { describe, it, expect } from 'vitest';
import {
  settingKeySchema,
  setSettingSchema,
  createInvoiceSchema,
  cancelInvoiceSchema,
  createCustomerSchema,
} from '../../../src/main/ipc/schemas';

describe('Milestone 1 & 4: IPC Input Boundary Validation', () => {
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

  it('4. should safely accept walk-in customer with null customer_gstin and customer_address', () => {
    const walkInPayload = {
      customer_id: 1,
      customer_name: 'Walk-in Customer',
      customer_phone: null,
      customer_gstin: null,
      customer_address: null,
      customer_state_code: '27',
      items: [
        {
          product_id: 1,
          variant_id: null,
          quantity: 1,
          unit_price_paise: 112000,
          discount_amount_paise: 0,
        },
      ],
      payments: [{ mode: 'CASH', amount_paise: 112000, reference_number: null }],
      notes: null,
    };

    expect(() => createInvoiceSchema.parse(walkInPayload)).not.toThrow();
    const validated = createInvoiceSchema.parse(walkInPayload);
    expect(validated.customer_gstin).toBeNull();
    expect(validated.customer_address).toBeNull();
  });

  it('5. should safely accept registered customer with populated GSTIN and address', () => {
    const registeredPayload = {
      customer_id: 3,
      customer_name: 'Gujarat Lions Cricket Club',
      customer_phone: '+91 97123 45678',
      customer_gstin: '24AAACG1234P1Z8',
      customer_address: 'Stadium Road, Ahmedabad, Gujarat',
      customer_state_code: '24',
      items: [
        {
          product_id: 2,
          quantity: 2,
          unit_price_paise: 95000,
        },
      ],
      payments: [
        { mode: 'UPI', amount_paise: 190000, reference_number: 'UPI-9876543210' },
      ],
      notes: 'Urgent interstate match delivery',
    };

    expect(() => createInvoiceSchema.parse(registeredPayload)).not.toThrow();
    const validated = createInvoiceSchema.parse(registeredPayload);
    expect(validated.customer_gstin).toBe('24AAACG1234P1Z8');
    expect(validated.customer_address).toBe('Stadium Road, Ahmedabad, Gujarat');
  });

  it('6. should reject invalid required billing data', () => {
    // 1. Empty items array
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow(/Invoice must contain at least one product item/);

    // 2. Non-positive quantity
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 0, unit_price_paise: 1000 }],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();

    // 3. Negative price
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 1, unit_price_paise: -50 }],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();

    // 4. Invalid payment mode
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 1, unit_price_paise: 1000 }],
        payments: [{ mode: 'INVALID_CRYPTO', amount_paise: 1000 }],
      })
    ).toThrow();

    // 5. Exceeding GSTIN length
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        customer_gstin: 'A'.repeat(21),
        items: [{ product_id: 1, quantity: 1, unit_price_paise: 1000 }],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();

    // 6. Exceeding customer address length
    expect(() =>
      createInvoiceSchema.parse({
        customer_id: 1,
        customer_address: 'A'.repeat(301),
        items: [{ product_id: 1, quantity: 1, unit_price_paise: 1000 }],
        payments: [{ mode: 'CASH', amount_paise: 1000 }],
      })
    ).toThrow();
  });

  it('7. should validate createCustomerSchema and accept null/missing optional fields', () => {
    // Valid with all optional fields null
    const validWithNulls = {
      name: 'Test Customer',
      phone: null,
      gstin: null,
      address: null,
      state_code: null,
    };
    expect(() => createCustomerSchema.parse(validWithNulls)).not.toThrow();

    // Reject short or empty customer name
    expect(() => createCustomerSchema.parse({ name: 'A' })).toThrow();
    expect(() => createCustomerSchema.parse({ name: '' })).toThrow();
  });

  it('8. should validate cancelInvoiceSchema and mandate a reason', () => {
    expect(() =>
      cancelInvoiceSchema.parse({ invoiceId: 10, reason: 'Wrong item billed' })
    ).not.toThrow();

    // Too short or empty reason
    expect(() => cancelInvoiceSchema.parse({ invoiceId: 10, reason: '' })).toThrow();
    // Non-positive invoice id
    expect(() => cancelInvoiceSchema.parse({ invoiceId: 0, reason: 'Valid reason' })).toThrow();
  });
});
