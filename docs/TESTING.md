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
│   │   ├── dashboardRepo.test.ts       # 6 tests: Aggregate queries, cancellations exclusion, date boundaries
│   │   ├── productRepo.test.ts         # 8 tests: CRUD, variants, transactions, safe deletion, unique SKU/barcodes
│   │   └── inventoryRepo.test.ts       # 5 tests: Adjustments, variance, ledger audit trail, variant rollup
│   └── ipc/
│       └── validation.test.ts          # 3 tests: Zod IPC boundary validation for settings
└── components/
    ├── UiShell.test.tsx                # 6 tests: Button, Card, Badge, Sidebar, Header
    ├── Dashboard.test.tsx              # 5 tests: MetricCard, SearchInput, Table sorting/empty, BarChart, ProgressDonut
    ├── ProductCatalog.test.tsx         # 4 tests: Rendering, search filter, auto SKU generation/creation, view details modal
    └── InventoryManagement.test.tsx    # 3 tests: Summary metrics, audit trail tab, physical stock adjustment & variance calculation
```

**Total Active Test Count:** 46 automated tests passing across 9 test files with zero regressions.

### Key Milestone 3 Test Cases:
- **`productRepo.test.ts`:**
  - Product creation with unique SKU and EAN-13 barcode generation.
  - Multi-variant matrix generation for cricket bat sizes (SH, LH, Harrow, 6) with variant-specific SKUs.
  - Automatic `OPENING_STOCK` movement logging when opening stock > 0.
  - Collision-prevention on duplicate SKU or barcode.
  - Safe deletion protection preventing deletion when historical invoice or purchase movements exist.
  - Active/inactive toggle preserving referential integrity.
- **`inventoryRepo.test.ts`:**
  - Reason-mandated stock adjustments with auto-generated adjustment numbers (`ADJ-YYYYMMDD-XXXX`).
  - Strict movement ledger immutability and balance calculations (`balance_quantity_after`).
  - Child variant stock adjustments automatically updating parent product's cumulative stock.
  - Safe rejection when adjusting with missing or invalid reason codes.
- **`ProductCatalog.test.tsx`:**
  - High-density table rendering with margins, prices in rupees, and variant count badges.
  - Real-time client-side search by product name, SKU, or brand.
  - Add product modal workflow with auto-generated SKU and IPC submission.
  - View details modal showing pricing breakdown, variants list, and recent stock movements audit trail.
- **`InventoryManagement.test.tsx`:**
  - Summary metric cards for total stock units, inventory landed cost valuation, and low-stock warnings.
  - Tab switching between stock reconciliation and immutable movement ledger.
  - Stock adjustment modal calculating positive/negative variances dynamically and submitting verified physical counts.

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
