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
});
