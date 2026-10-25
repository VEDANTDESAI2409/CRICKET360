import { describe, it, expect } from 'vitest';
import {
  createSalesReturnSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseCategorySchema,
  updateShopSettingsSchema,
  reportDateFilterSchema,
} from '../../../src/main/ipc/schemas';

describe('Milestone 6: IPC Validation & Security Schemas', () => {
  it('1. should validate valid sales return input', () => {
    const valid = {
      invoice_id: 1,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Customer requested size exchange',
      items: [
        {
          sales_invoice_item_id: 10,
          quantity: 2,
          restock: true,
        },
      ],
    };
    const parsed = createSalesReturnSchema.parse(valid);
    expect(parsed.invoice_id).toBe(1);
    expect(parsed.items[0].restock).toBe(true);
  });

  it('2. should reject sales returns with invalid refund modes or zero quantity items', () => {
    const invalidMode = {
      invoice_id: 1,
      return_date: '2026-10-25',
      refund_mode: 'BITCOIN', // invalid
      reason: 'Defective item',
      items: [{ sales_invoice_item_id: 1, quantity: 1, restock: true }],
    };
    expect(() => createSalesReturnSchema.parse(invalidMode)).toThrow();

    const zeroQty = {
      invoice_id: 1,
      return_date: '2026-10-25',
      refund_mode: 'CASH',
      reason: 'Defective item',
      items: [{ sales_invoice_item_id: 1, quantity: 0, restock: true }],
    };
    expect(() => createSalesReturnSchema.parse(zeroQty)).toThrow();
  });

  it('3. should validate create and update expense schemas', () => {
    const validExpense = {
      category_id: 1,
      expense_date: '2026-10-25',
      amount_paise: 5000000,
      payment_mode: 'BANK_TRANSFER',
      payment_status: 'PAID',
      payee_name: 'Commercial Realty Ltd',
      reference_number: 'NEFT-554433',
    };
    const parsed = createExpenseSchema.parse(validExpense);
    expect(parsed.amount_paise).toBe(5000000);

    const updateValid = {
      id: 5,
      amount_paise: 5200000,
      notes: 'Updated rent with maintenance included',
    };
    const parsedUpdate = updateExpenseSchema.parse(updateValid);
    expect(parsedUpdate.id).toBe(5);
    expect(parsedUpdate.amount_paise).toBe(5200000);
  });

  it('4. should reject negative or zero amount expenses', () => {
    const invalidAmt = {
      category_id: 1,
      expense_date: '2026-10-25',
      amount_paise: -100,
      payment_mode: 'CASH',
    };
    expect(() => createExpenseSchema.parse(invalidAmt)).toThrow();
  });

  it('5. should validate expense categories', () => {
    const cat = {
      name: 'Showroom Electricity',
      code: 'POWER',
      description: 'Monthly electricity bill',
    };
    const parsed = createExpenseCategorySchema.parse(cat);
    expect(parsed.code).toBe('POWER');
  });

  it('6. should validate report date filters with YYYY-MM-DD format', () => {
    const validFilter = {
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    };
    const parsed = reportDateFilterSchema.parse(validFilter);
    expect(parsed.start_date).toBe('2026-10-01');

    const invalidDate = {
      start_date: 'invalid-date',
      end_date: '2026-10-31',
    };
    expect(() => reportDateFilterSchema.parse(invalidDate)).toThrow();
  });

  it('7. should validate shop settings update input', () => {
    const validSettings = {
      shop_name: 'Cricket360 Sports & Pro Shop',
      shop_address: 'Sports Complex Road, Mumbai',
      shop_phone: '+91 98765 43210',
      shop_email: 'info@cricket360.in',
      shop_gstin: '27AABBC1234D1Z5',
      shop_state_code: '27',
      invoice_prefix: 'INV-',
    };
    const parsed = updateShopSettingsSchema.parse(validSettings);
    expect(parsed.shop_gstin).toBe('27AABBC1234D1Z5');
  });
});
