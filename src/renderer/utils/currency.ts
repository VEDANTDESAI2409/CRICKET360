/**
 * Cricket360: Currency and Financial Formatting Utilities
 * All financial data is processed in integer paise to eliminate floating-point drift.
 */

/**
 * Formats integer paise into Indian Rupee display format (e.g. 149900 -> "₹ 1,499.00").
 */
export function formatPaiseToRupees(paise: number, includeSymbol: boolean = true): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format Indian number system (e.g. 1,00,000)
  const rupeesStr = rupees.toLocaleString('en-IN');
  const paiseStr = remainderPaise.toString().padStart(2, '0');

  const formatted = `${rupeesStr}.${paiseStr}`;
  const prefix = includeSymbol ? '₹ ' : '';
  return isNegative ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

/**
 * Parses a rupee string input (e.g. "1499.50" or "1499") into integer paise (149950).
 */
export function parseRupeesToPaise(input: string): number {
  const sanitized = input.replace(/[^0-9.-]/g, '');
  const num = parseFloat(sanitized);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
