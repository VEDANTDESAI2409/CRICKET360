# Cricket360: Testing & Quality Assurance Plan

## 1. Testing Philosophy & Standards

In a retail financial management system, bugs can cause stock discrepancies, tax compliance failures, or revenue loss. Testing is treated as a continuous engineering discipline with automated suites covering:
1. **Financial & Tax Math:** 100% test coverage for GST split, item-level discounts, invoice rounding, and paise arithmetic.
2. **Database Transactions & Rollback:** Automated verification that failed sales or purchases do not commit partial records or alter stock.
3. **Stock Movement Audits:** Automated validation that every stock adjustment creates a corresponding immutable `stock_movement` record.
4. **UI Components & Workflows:** Vitest + React Testing Library verification of critical forms, data tables, POS keypad shortcuts, and modal interactions.

---

## 2. Test Suites Structure

```
tests/
├── unit/
│   ├── math/
│   │   ├── taxCalculations.test.ts     # CGST/SGST/IGST intra vs inter state
│   │   ├── currency.test.ts            # Paise conversion, formatting, rounding
│   │   └── discounts.test.ts           # Item & invoice level discount distribution
│   └── validation/
│       ├── productSchema.test.ts       # Zod schemas for products & variants
│       └── invoiceSchema.test.ts       # Zod schemas for invoices & payments
├── integration/
│   ├── db/
│   │   ├── migrations.test.ts          # Schema migrations run and rollback
│   │   ├── billingTransaction.test.ts  # Atomic sale invoice + stock reduction
│   │   ├── purchaseTransaction.test.ts # Inward purchase + stock addition
│   │   └── negativeStockLock.test.ts   # Guard against selling out-of-stock items
│   └── backup/
│       └── backupRestore.test.ts       # SQLite backup creation & restoration
└── components/
    ├── PosRegister.test.tsx            # POS barcode scan, line item addition
    ├── ProductModal.test.tsx           # Product creation form validation
    └── StockAdjustment.test.tsx        # Adjustment modal & reason requirement
```

---

## 3. Test Execution Commands

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

---

## 4. Manual Verification Protocols

1. **Barcode Scanner Emulation:** Connect standard USB HID barcode scanner and scan simulated barcodes into the POS input; verify instant line addition without requiring mouse clicks.
2. **Thermal Receipt Printing:** Verify print preview and silent print to 80mm thermal paper with high contrast and legible barcode/QR codes.
3. **Database Migration Verification:** Verify that starting the application on an existing database seamlessly applies incremental migrations without dropping user data.
4. **Offline Isolation:** Disconnect all network adapters; verify 100% of core shop functions (POS, stock, purchases, reports, backup) work without error.
