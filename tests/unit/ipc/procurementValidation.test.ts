import { describe, it, expect } from 'vitest';
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseSchema,
  createPurchaseReturnSchema,
  recordSupplierPaymentSchema,
  recordCustomerPaymentSchema,
} from '../../../src/main/ipc/schemas';

describe('Combined Milestone 5: Procurement & Account IPC Validation Schemas', () => {
  describe('createSupplierSchema', () => {
    it('1. should accept valid supplier details', () => {
      const valid = {
        name: 'SG Cricket Goods Ltd',
        company_name: 'Sanspareils Greenlands Pvt Ltd',
        phone: '+91 98980 12345',
        email: 'sales@sgcricket.com',
        gstin: '09AABCS1234F1Z9',
        address: 'Meerut, Uttar Pradesh',
        state_code: '09',
        payment_terms_days: 30,
        notes: 'Official SG bat distributor',
      };

      const parsed = createSupplierSchema.parse(valid);
      expect(parsed.name).toBe('SG Cricket Goods Ltd');
      expect(parsed.payment_terms_days).toBe(30);
    });

    it('2. should reject empty supplier name', () => {
      expect(() => {
        createSupplierSchema.parse({ name: 'A' });
      }).toThrow();
    });

    it('3. should validate supplier update payload', () => {
      const parsed = updateSupplierSchema.parse({
        id: 1,
        name: 'SG Cricket Goods Updated',
        payment_terms_days: 45,
      });
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('SG Cricket Goods Updated');
      expect(parsed.payment_terms_days).toBe(45);
    });
  });

  describe('createPurchaseSchema', () => {
    it('3. should validate purchase payload and require items', () => {
      const valid = {
        supplier_id: 1,
        supplier_invoice_number: 'INV-2026-99',
        purchase_date: '2026-10-25',
        place_of_supply: '27',
        is_inter_state: false,
        items: [
          {
            product_id: 1,
            quantity: 10,
            unit_cost_paise: 500000,
            tax_rate_percent: 12,
          },
        ],
        discount_amount_paise: 0,
      };

      const parsed = createPurchaseSchema.parse(valid);
      expect(parsed.supplier_id).toBe(1);
      expect(parsed.items.length).toBe(1);
    });

    it('4. should reject purchase with zero or negative quantity', () => {
      expect(() => {
        createPurchaseSchema.parse({
          supplier_id: 1,
          supplier_invoice_number: 'INV-BAD',
          purchase_date: '2026-10-25',
          items: [{ product_id: 1, quantity: 0, unit_cost_paise: 500000, tax_rate_percent: 12 }],
        });
      }).toThrow(/Quantity must be greater than zero/);
    });
  });

  describe('createPurchaseReturnSchema', () => {
    it('5. should require return reason and return items', () => {
      expect(() => {
        createPurchaseReturnSchema.parse({
          purchase_id: 1,
          return_date: '2026-10-26',
          reason: '',
          items: [],
        });
      }).toThrow();
    });
  });

  describe('payment schemas', () => {
    it('6. should reject non-positive payment amounts', () => {
      expect(() => {
        recordCustomerPaymentSchema.parse({
          customer_id: 1,
          amount_paise: 0,
          payment_date: '2026-10-25',
          payment_mode: 'CASH',
        });
      }).toThrow(/greater than zero/);

      expect(() => {
        recordSupplierPaymentSchema.parse({
          supplier_id: 1,
          amount_paise: -500,
          payment_date: '2026-10-25',
          payment_mode: 'UPI',
        });
      }).toThrow(/greater than zero/);
    });
  });
});
