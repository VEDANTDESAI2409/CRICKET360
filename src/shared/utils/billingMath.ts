/**
 * Cricket360: GST Billing Math & Financial Precision Utilities
 * Operates strictly with integer paise (1 Rupee = 100 paise) to guarantee zero floating-point drift.
 */

export interface LineTaxCalculationInput {
  unitPricePaise: number;
  quantity: number;
  discountAmountPaise?: number;
  taxRatePercent: number;
  isInterState: boolean;
}

export interface LineTaxCalculationResult {
  quantity: number;
  unitPricePaise: number;
  discountAmountPaise: number;
  grossPaise: number;
  taxableAmountPaise: number;
  taxRatePercent: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalTaxPaise: number;
  totalAmountPaise: number;
}

export interface InvoiceTotalsCalculationInput {
  items: Array<{
    unitPricePaise: number;
    quantity: number;
    discountAmountPaise?: number;
    taxRatePercent: number;
  }>;
  invoiceDiscountPaise?: number;
  isInterState: boolean;
}

export interface InvoiceTotalsCalculationResult {
  items: LineTaxCalculationResult[];
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalTaxPaise: number;
  itemDiscountAmountPaise: number;
  invoiceDiscountPaise: number;
  totalDiscountAmountPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
}

/**
 * Calculates GST breakdown for an individual line item.
 * Retail prices are standardly inclusive of GST.
 */
export function calculateLineTax(input: LineTaxCalculationInput): LineTaxCalculationResult {
  const { unitPricePaise, quantity, taxRatePercent, isInterState } = input;
  const discountAmountPaise = Math.max(0, input.discountAmountPaise || 0);

  const rawGross = unitPricePaise * quantity;
  const grossPaise = Math.max(0, rawGross - discountAmountPaise);

  let taxableAmountPaise = 0;
  let totalTaxPaise = 0;
  let cgstAmountPaise = 0;
  let sgstAmountPaise = 0;
  let igstAmountPaise = 0;

  if (taxRatePercent > 0 && grossPaise > 0) {
    // Back-calculate taxable value: Gross / (1 + Rate / 100)
    taxableAmountPaise = Math.round(grossPaise / (1 + taxRatePercent / 100));
    totalTaxPaise = grossPaise - taxableAmountPaise;

    if (isInterState) {
      igstAmountPaise = totalTaxPaise;
      cgstAmountPaise = 0;
      sgstAmountPaise = 0;
    } else {
      // Split evenly into CGST and SGST with no lost paise
      cgstAmountPaise = Math.round(totalTaxPaise / 2);
      sgstAmountPaise = totalTaxPaise - cgstAmountPaise;
      igstAmountPaise = 0;
    }
  } else {
    taxableAmountPaise = grossPaise;
  }

  const totalAmountPaise = taxableAmountPaise + cgstAmountPaise + sgstAmountPaise + igstAmountPaise;

  return {
    quantity,
    unitPricePaise,
    discountAmountPaise,
    grossPaise,
    taxableAmountPaise,
    taxRatePercent,
    cgstAmountPaise,
    sgstAmountPaise,
    igstAmountPaise,
    totalTaxPaise,
    totalAmountPaise,
  };
}

/**
 * Computes aggregated invoice totals, taxes, round-off, and grand total.
 */
export function calculateInvoiceTotals(
  input: InvoiceTotalsCalculationInput
): InvoiceTotalsCalculationResult {
  const { items: inputItems, isInterState } = input;
  const invoiceDiscountPaise = Math.max(0, input.invoiceDiscountPaise || 0);

  let sumTaxable = 0;
  let sumCgst = 0;
  let sumSgst = 0;
  let sumIgst = 0;
  let sumTotalTax = 0;
  let sumItemDiscount = 0;

  const calculatedItems = inputItems.map((item) => {
    const calc = calculateLineTax({
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      discountAmountPaise: item.discountAmountPaise,
      taxRatePercent: item.taxRatePercent,
      isInterState,
    });

    sumTaxable += calc.taxableAmountPaise;
    sumCgst += calc.cgstAmountPaise;
    sumSgst += calc.sgstAmountPaise;
    sumIgst += calc.igstAmountPaise;
    sumTotalTax += calc.totalTaxPaise;
    sumItemDiscount += calc.discountAmountPaise;

    return calc;
  });

  const totalDiscountAmountPaise = sumItemDiscount + invoiceDiscountPaise;

  // Unrounded total before invoice-level discount
  const preDiscountTotal = sumTaxable + sumCgst + sumSgst + sumIgst;
  const postDiscountTotal = Math.max(0, preDiscountTotal - invoiceDiscountPaise);

  // Round off to nearest Indian Rupee (nearest 100 paise)
  const grandTotalPaise = Math.round(postDiscountTotal / 100) * 100;
  const roundOffPaise = grandTotalPaise - postDiscountTotal;

  return {
    items: calculatedItems,
    taxableAmountPaise: sumTaxable,
    cgstAmountPaise: sumCgst,
    sgstAmountPaise: sumSgst,
    igstAmountPaise: sumIgst,
    totalTaxPaise: sumTotalTax,
    itemDiscountAmountPaise: sumItemDiscount,
    invoiceDiscountPaise,
    totalDiscountAmountPaise,
    roundOffPaise,
    grandTotalPaise,
  };
}

/**
 * Converts a rupee integer amount to English words using Indian Numbering Format.
 * (e.g. 154200 paise -> 1542 rupees -> "One Thousand Five Hundred Forty Two Rupees Only")
 */
export function amountInWordsIndian(paise: number): string {
  const rupees = Math.floor(Math.max(0, paise) / 100);
  if (rupees === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    const unit = num % 10;
    return `${tens[Math.floor(num / 10)]}${unit ? ' ' + units[unit] : ''}`;
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = '';
    if (hundred > 0) {
      res += `${units[hundred]} Hundred`;
      if (rest > 0) res += ' and ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  let n = rupees;
  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const remaining = n;

  const parts: string[] = [];

  if (crores > 0) {
    parts.push(`${convertTwoDigits(crores)} Crore`);
  }
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
  }
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return `${parts.join(' ')} Rupees Only`;
}
