# Cricket360: Testing & Quality Assurance Plan

## 1. Testing Philosophy & Standards

In a retail financial management system, bugs can cause stock discrepancies, tax compliance failures, or revenue loss. Testing is treated as a continuous engineering discipline with automated suites covering:
1. **Financial & Tax Math:** 100% test coverage for GST split, item-level discounts, invoice rounding, and paise arithmetic.
2. **Database Transactions & Rollback:** Automated verification that failed sales or purchases do not commit partial records or alter stock.
3. **Stock Movement Audits:** Automated validation that every stock adjustment creates a corresponding immutable `stock_movement` record.
4. **UI Components & Workflows:** Vitest + React Testing Library verification of critical forms, data tables, POS keypad shortcuts, and modal interactions.

---

## 2. Test Suites Structure & Active Coverage

The test suite runs under Vitest using in-memory SQLite and React Testing Library:

```
tests/
├── unit/
│   ├── db/
│   │   ├── sqlite-foundation.test.ts       # 6 tests: WAL mode, foreign keys, atomic migration rollback
│   │   ├── dashboardRepo.test.ts           # 6 tests: Aggregate queries, cancellations exclusion, date boundaries
│   │   ├── productRepo.test.ts             # 8 tests: CRUD, variants, transactions, safe deletion, unique SKU/barcodes
│   │   ├── inventoryRepo.test.ts           # 5 tests: Adjustments, variance, ledger audit trail, variant rollup
│   │   ├── billingRepo.test.ts             # 10 tests: Sequential numbering, atomic sale, stock deduction, walk-in/registered snapshots, cancellation
│   │   ├── purchaseRepo.test.ts            # 5 tests: Inward receipts, duplicate invoice prevention, tax calculation, purchase returns & stock restitution
│   │   └── accountRepo.test.ts             # 5 tests: Customer Khata, supplier ledger, partial payments, payment allocation & balance invariants
│   ├── ipc/
│   │   ├── validation.test.ts              # 8 tests: Zod IPC boundary validation for billing, null walk-in customer fields, settings
│   │   └── procurementValidation.test.ts   # 7 tests: Zod IPC validation for suppliers, purchases, returns, customer/supplier payments
│   └── utils/
│       └── billingMath.test.ts             # 6 tests: Integer paise tax math, intra/inter-state split, rounding, discounts, words
└── components/
    ├── UiShell.test.tsx                    # 6 tests: Button, Card, Badge, Sidebar, Header
    ├── Dashboard.test.tsx                  # 5 tests: MetricCard, SearchInput, Table sorting/empty, BarChart, ProgressDonut
    ├── ProductCatalog.test.tsx             # 4 tests: Rendering, search filter, auto SKU generation/creation, view details modal
    ├── InventoryManagement.test.tsx        # 3 tests: Summary metrics, audit trail tab, physical stock adjustment & variance calculation
    ├── PosBilling.test.tsx                 # 5 tests: Register rendering, search & cart addition, stock limits, inter-state IGST, sale completion & print modal
    ├── Suppliers.test.tsx                  # 3 tests: Supplier directory, KPI metrics, Add Supplier modal, Vendor Khata running balance
    ├── Customers.test.tsx                  # 3 tests: Customer directory, KPI metrics, Register Customer modal, Customer Khata statement
    └── Purchases.test.tsx                  # 4 tests: Purchases directory, Inward Goods modal with builder cart, View details, Pay bill modal
```

**Total Active Test Count:** 99 automated tests passing across 18 test files with zero regressions.

### Key Milestone 4 Test Cases:
- **`billingMath.test.ts`:**
  - Tax-inclusive back-calculation with integer paise arithmetic (`Math.round(gross / (1 + rate / 100))`).
  - Intra-state GST splitting: assigns odd paise to CGST ensuring exact equality (`cgst + sgst === totalTax`).
  - Inter-state tax calculation assigning 100% of GST to IGST.
  - Multi-item tax aggregation, item discounts, and invoice-level discount proportional distribution.
  - Round-off calculation to nearest Rupee (nearest 100 paise).
  - Indian numbering currency in words converter (`₹ 1,120.00` -> "Rupees One Thousand One Hundred Twenty Only").
- **`billingRepo.test.ts`:**
  - Collision-free sequential invoice generation based on `app_settings` prefix and sequence counter.
  - Transaction-safe sale creation with simultaneous item snapshot insertion, payments, and customer balance updates.
  - Automatic stock deduction for standard items and variant items with parent cumulative rollup.
  - Immutable `stock_movements` recording (`movement_type = 'SALE_INVOICE'`).
  - Multi-tender split payment support (e.g. Cash + UPI + Card) with exact sum validation.
  - Hard transactional rejection and rollback if attempting to sell more quantity than available stock.
  - Invoice cancellation workflow: status updated to `CANCELLED`, compensatory `SALE_RETURN` movements logged, stock restored for all items, and customer balances reconciled.
  - Sales history queries with date range and status filters.
- **`validation.test.ts`:**
  - Boundary validation for `createInvoiceSchema` ensuring valid customer IDs, positive quantities, non-empty payment tenders, and valid payment modes.
  - Validation for `cancelInvoiceSchema` requiring non-empty cancellation reasons.
- **`PosBilling.test.tsx`:**
  - Register rendering with quick customer selection, walk-in option, and barcode/search input.
  - Item addition to cart with real-time tax calculation and stock indicator.
  - Quantity increment/decrement buttons with available stock limits.
  - Automatic tax recalculation from CGST/SGST to IGST upon selecting an out-of-state customer.
  - Tender completion and printable GST Tax Invoice modal rendering.

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
