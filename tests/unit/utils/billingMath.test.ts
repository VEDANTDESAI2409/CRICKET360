import { describe, it, expect } from 'vitest';
import {
  calculateLineTax,
  calculateInvoiceTotals,
  amountInWordsIndian,
} from '../../../src/shared/utils/billingMath';

describe('Milestone 4: GST Billing Math & Financial Calculations', () => {
  describe('calculateLineTax', () => {
    it('1. should calculate intra-state GST (50/50 CGST and SGST split) on tax-inclusive price', () => {
      // Selling price: ₹1,120 (112000 paise), 12% GST, Intra-state (e.g. Maharashtra to Maharashtra)
      // Taxable = 112000 / 1.12 = 100000 paise (₹1,000.00)
      // Total GST = 12000 paise (₹120.00)
      // CGST = 6000 paise (₹60.00), SGST = 6000 paise (₹60.00)
      const res = calculateLineTax({
        unitPricePaise: 112000,
        quantity: 1,
        taxRatePercent: 12.0,
        isInterState: false,
      });

      expect(res.taxableAmountPaise).toBe(100000);
      expect(res.cgstAmountPaise).toBe(6000);
      expect(res.sgstAmountPaise).toBe(6000);
      expect(res.igstAmountPaise).toBe(0);
      expect(res.totalTaxPaise).toBe(12000);
      expect(res.totalAmountPaise).toBe(112000);
    });

    it('2. should calculate inter-state GST (100% IGST) without CGST/SGST', () => {
      // Selling price: ₹1,180 (118000 paise), 18% GST, Inter-state (e.g. MH to Gujarat)
      // Taxable = 118000 / 1.18 = 100000 paise (₹1,000.00)
      // IGST = 18000 paise (₹180.00)
      const res = calculateLineTax({
        unitPricePaise: 118000,
        quantity: 1,
        taxRatePercent: 18.0,
        isInterState: true,
      });

      expect(res.taxableAmountPaise).toBe(100000);
      expect(res.cgstAmountPaise).toBe(0);
      expect(res.sgstAmountPaise).toBe(0);
      expect(res.igstAmountPaise).toBe(18000);
      expect(res.totalTaxPaise).toBe(18000);
      expect(res.totalAmountPaise).toBe(118000);
    });

    it('3. should handle odd tax paise splits without losing a paisa', () => {
      // Selling price: ₹1,000 (100000 paise), 12% GST, Intra-state
      // Taxable = Round(100000 / 1.12) = 89286 paise
      // Total GST = 100000 - 89286 = 10714 paise
      // CGST = Round(10714 / 2) = 5357 paise
      // SGST = 10714 - 5357 = 5357 paise
      const res = calculateLineTax({
        unitPricePaise: 100000,
        quantity: 1,
        taxRatePercent: 12.0,
        isInterState: false,
      });

      expect(res.cgstAmountPaise + res.sgstAmountPaise).toBe(res.totalTaxPaise);
      expect(res.taxableAmountPaise + res.totalTaxPaise).toBe(res.totalAmountPaise);
    });

    it('4. should apply line item discount and calculate tax on post-discount value', () => {
      // Item: ₹2,000 (200000 paise), discount ₹200 (20000 paise) -> net ₹1,800 (180000 paise)
      // GST @ 12%: Taxable = Round(180000 / 1.12) = 160714 paise
      // Total Tax = 180000 - 160714 = 19286 paise
      const res = calculateLineTax({
        unitPricePaise: 200000,
        quantity: 1,
        discountAmountPaise: 20000,
        taxRatePercent: 12.0,
        isInterState: false,
      });

      expect(res.discountAmountPaise).toBe(20000);
      expect(res.grossPaise).toBe(180000);
      expect(res.taxableAmountPaise).toBe(160714);
      expect(res.totalTaxPaise).toBe(19286);
      expect(res.totalAmountPaise).toBe(180000);
    });
  });

  describe('calculateInvoiceTotals & Round-off', () => {
    it('5. should aggregate items, apply bill discount, and round off to whole Rupee', () => {
      // Item 1: ₹1,120 (112000 paise, 12% GST)
      // Item 2: ₹590 (59000 paise, 18% GST)
      // Sum = 171000 paise
      // Bill discount: ₹100.50 (10050 paise)
      // Post-discount = 160950 paise (₹1,609.50)
      // Rounded to nearest Rupee = 161000 paise (₹1,610.00), roundOff = +50 paise
      const totals = calculateInvoiceTotals({
        items: [
          { unitPricePaise: 112000, quantity: 1, taxRatePercent: 12.0 },
          { unitPricePaise: 59000, quantity: 1, taxRatePercent: 18.0 },
        ],
        invoiceDiscountPaise: 10050,
        isInterState: false,
      });

      expect(totals.items.length).toBe(2);
      expect(totals.invoiceDiscountPaise).toBe(10050);
      expect(totals.grandTotalPaise).toBe(161000);
      expect(totals.roundOffPaise).toBe(50);
      expect(totals.grandTotalPaise % 100).toBe(0); // whole rupee
    });
  });

  describe('amountInWordsIndian', () => {
    it('6. should format paise into Indian numbering words format', () => {
      expect(amountInWordsIndian(150000)).toBe('One Thousand Five Hundred Rupees Only');
      expect(amountInWordsIndian(125000000)).toBe('Twelve Lakh Fifty Thousand Rupees Only');
      expect(amountInWordsIndian(0)).toBe('Zero Rupees Only');
    });
  });
});
