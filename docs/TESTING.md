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
│   │   ├── sqlite-foundation.test.ts   # 6 tests: WAL mode, foreign keys, atomic migration rollback
│   │   └── dashboardRepo.test.ts       # 6 tests: Aggregate queries, cancellations exclusion, date boundaries
│   └── ipc/
│       └── validation.test.ts          # 3 tests: Zod IPC boundary validation for settings
└── components/
    ├── UiShell.test.tsx                # 6 tests: Button, Card, Badge, Sidebar, Header
    └── Dashboard.test.tsx              # 5 tests: MetricCard, SearchInput, Table sorting/empty, BarChart, ProgressDonut
```

**Total Active Test Count:** 26 automated tests passing with zero regressions.

### Key Milestone 2 Test Cases:
- **`dashboardRepo.test.ts`:**
  - Calculates active products, categories, stock units, and valuation against isolated SQLite fixtures.
  - Verifies completed invoices are aggregated while `CANCELLED` invoices are strictly excluded.
  - Verifies date boundaries (yesterday's invoices are excluded from today's sales).
  - Verifies low-stock and out-of-stock threshold classification.
  - Verifies rolling 7-day sales time series generation.
- **`Dashboard.test.tsx`:**
  - MetricCard featured and standard variant rendering.
  - SearchInput keyboard badge (`F4`), clear button action, and controlled change.
  - Table sorting toggles (`asc` / `desc`), loading skeletons, and empty state rendering.
  - BarChart pill heights and ProgressDonut SVG gauge arc calculations.
  - Low-stock inventory table searching and filter matching.
  - Quick POS action button navigation (`+ New Bill (F2)`).

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
