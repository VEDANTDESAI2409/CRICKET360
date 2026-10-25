# Cricket360: Development Work Log

## Log Entry: 2026-10-25 - Combined Milestone 5: Procurement, Supplier Management & Customer Accounts

### Summary of Work Completed
- **Phase A — Suppliers and Procurement:**
  - Implemented `SupplierRepo` (`src/main/db/supplierRepo.ts`): Supplier CRUD, search, active toggling, and running vendor ledger statement with debits, credits, and running balance calculation.
  - Implemented `PurchaseRepo` (`src/main/db/purchaseRepo.ts`): Purchase sequence generation (`PUR-`), transaction-safe purchase bill creation, duplicate supplier invoice prevention, inward stock increments, immutable `stock_movements` with `movement_type = 'PURCHASE_RECEIPT'`, and purchase returns with quantity limits and stock restitution.
  - B2B tax math helper (`src/shared/utils/billingMath.ts`): Tax-exclusive unit rates, intra-state CGST + SGST split, inter-state IGST, and nearest Rupee rounding in integer paise.
  - Created Supplier Management interface (`src/renderer/features/suppliers/Suppliers.tsx`) with search, KPI summary cards, Add/Edit modal, and Vendor Ledger statement.
  - Created Inward Procurement interface (`src/renderer/features/purchases/Purchases.tsx`) with bill creation modal, product/variant item builder, live GST calculation, initial tender recording, purchase details modal, purchase return modal, and pay bill modal.
- **Phase B — Supplier Payments and Customer Accounts:**
  - Implemented `AccountRepo` (`src/main/db/accountRepo.ts`): Customer CRUD, Khata ledger generation, customer payment receipts with invoice allocation, supplier payouts with purchase bill allocation, and unified payment register query.
  - Customer Accounts interface (`src/renderer/features/customers/Customers.tsx`) with customer directory, credit limit tracking, Add/Edit customer modal, and Customer Khata statement with running balances.
  - Unified Payments Register (`src/renderer/features/payments/PaymentsRegister.tsx`) tracking all inflow (sales, customer receipts) and outflow (supplier payouts) with party, mode, and date filters.
- **Phase C — Financial Integrity:**
  - Database Migration `005_procurement_and_accounts.sql`: Added `payment_terms_days` to `suppliers`, `credit_limit_paise` to `customers`, subtotal/discount/round-off to `purchases`, unique index `uq_supplier_invoice ON purchases(supplier_id, supplier_invoice_number)`, and created `purchase_items`, `purchase_returns`, `purchase_return_items`.
  - Enforced 100% integer paise precision across all purchase rates, line totals, taxes, payments, and running ledger entries.
  - Guarded all balance updates and stock mutations inside synchronous SQLite transactions (`db.transaction()`).
  - Implemented Zod boundary validation schemas (`src/main/ipc/schemas.ts`) for all new customer, supplier, purchase, return, and payment IPC requests.
- **Navigation Integration:**
  - Updated `src/renderer/components/Sidebar.tsx` to mark `Purchases`, `Customers`, `Suppliers`, and `Payments` as active navigation items.
  - Routed all 4 new modules in `src/renderer/App.tsx`.
- **Verification & Test Results:**
  - `npm run typecheck` (`tsc --noEmit`): 0 errors.
  - `npm test` (`vitest run`): 99 tests passing across 18 test files (27 new tests added).
  - `npm run build`: Production renderer bundle (Vite) and Electron bundles (esbuild) built cleanly.
  - `npm run smoke-test`: Electron application launched and verified with 5 active database migrations.

---

## Log Entry: 2026-10-25 - Fix: Handle Optional Customer Details in POS Billing

### Summary of Root Cause & Fix
- **Root Cause:**
  - SQLite `customers` table stores `NULL` for `gstin` and `address` when not provided (such as for `Walk-in Customer` with ID 1).
  - `better-sqlite3` deserializes SQL `NULL` values to JavaScript `null`.
  - When `selectedCustomer` was passed into `createInvoice`, `customer_gstin` and `customer_address` were passed as `null`.
  - The Zod IPC boundary validation schema used `z.string().max(20).optional()`, which only accepted `string | undefined`, rejecting `null` with `Expected string, received null`.
- **Changes Applied:**
  - `src/shared/types/models.ts`: Updated `Customer`, `CreateInvoiceInput`, `PaymentTenderInput`, and `CreateCustomerInput` to explicitly support `null` for optional fields (`phone`, `gstin`, `address`, `state_code`, `notes`, `reference_number`).
  - `src/main/ipc/schemas.ts`: Created centralized, electron-independent Zod boundary schemas using `.nullable().optional()` for optional customer attributes and notes while keeping strict validation on mandatory fields (items array non-empty, quantities positive, unit prices non-negative, valid payment mode enum, etc.).
  - `src/main/ipc/handlers.ts`: Refactored to import canonical schemas from `schemas.ts`.
  - `src/main/db/billingRepo.ts`: Added `normalizeOptionalString()` helper function to trim whitespace and normalize empty strings/nulls, ensuring walk-in customers safely record `NULL` snapshots and registered customers retain valid GSTIN/address snapshots.
  - `src/renderer/features/billing/PosBilling.tsx`: Strictly typed invoice payload to `CreateInvoiceInput` with explicit null coalescing (`?? null`).
  - `scripts/switch-bindings.mjs` & `tests/setup.ts`: Enhanced binding switcher and test setup to gracefully handle Windows `EBUSY` file locking when Electron is running during test execution by directly loading the Node.js ABI binary in Vitest.
- **Verification & Test Results:**
  - **Automated Tests:** 72 tests passing across 12 files (5 new regression tests added).
  - **Typecheck:** 0 errors (`tsc --noEmit`).
  - **Production Build:** Vite and Electron builds passed cleanly.
  - **Smoke Test:** Electron launch smoke test succeeded with 4 migrations verified.

---

## Log Entry: 2026-10-25 - Milestone 4: POS & GST Billing

### Summary of Work Completed
- **Point-of-Sale Billing Register (`src/renderer/features/billing/PosBilling.tsx`):**
  - High-speed retail checkout interface with instant search across product name, SKU, and barcode.
  - Interactive variant selector modal for bats (sizes, weights) and apparel/shoes before cart insertion.
  - Interactive cart table with quantity stepper, direct editing, item deletion, and real-time stock threshold validation.
  - Product-level and invoice-level discount configuration (percentage or fixed amount) with proportional integer-paise distribution across items.
  - Dynamic GST calculations supporting intra-state transactions (CGST 50% + SGST 50%) and inter-state transactions (IGST 100%) based on customer State code.
  - Multi-tender checkout supporting Cash, UPI (with simulated dynamic QR code), Card, and Split payments with exact tender sum validation.
  - Collision-free sequential invoice numbering (e.g. `CR360-1001`) with configurable shop prefix from `app_settings`.
  - Customer selection with one-click Walk-in Customer support and quick customer registration modal.
  - Comprehensive Sales History register with date filters, status indicators (`COMPLETED` / `CANCELLED`), invoice preview, and print actions.
  - Audit-safe invoice cancellation/void workflow requiring mandatory cancellation reason and automatically restoring stock with compensatory `SALE_RETURN` ledger records.
  - Dual layout printable GST Tax Invoice modal: A4 Tax Invoice and 80mm Thermal Receipt with shop details, GSTIN, HSN summaries, and amount in words.
- **Financial Precision Engine (`src/shared/utils/billingMath.ts`):**
  - Pure integer paise arithmetic eliminating IEEE 754 floating-point drift.
  - Tax-inclusive shelf price back-calculation: `Taxable = Math.round(Gross / (1 + Rate / 100))`.
  - Odd paise resolution ensuring `CGST + SGST === Total Tax` exactly.
  - Nearest Rupee round-off calculation (`round_off_paise`).
  - Indian numbering currency in words converter ("Rupees ... Only").
- **Database Migration `004_pos_and_gst_billing.sql`:**
  - Added cancellation audit columns (`cancellation_reason`, `cancelled_at`, `notes`) to `sales_invoices`.
  - Created `sales_invoice_items` with immutable line-item snapshots of product name, variant, HSN, unit, price, and tax breakdown.
  - Created `payments` table for recording individual payment tenders.
  - Seeded inter-state customer accounts in Gujarat (`24`) and Delhi (`07`).
  - Initialized invoice numbering settings (`invoice_prefix` = `CR360-`, `next_invoice_number` = `1001`).
- **Transactional Repositories & Typed IPC:**
  - `src/main/db/billingRepo.ts`: Atomic sale creation and cancellation transactions with stock movement synchronization and balance tracking.
  - `src/main/ipc/handlers.ts`: Zod-validated IPC endpoints for `billing:createInvoice`, `billing:getInvoices`, `billing:getInvoiceById`, `billing:cancelInvoice`, `billing:getNextInvoiceNumber`, `billing:getShopSettings`, `customers:search`, and `customers:create`.
  - `src/preload/index.ts`: Expose `window.api.billing` and `window.api.customers`.
- **Navigation Integration:**
  - Activated "POS & Billing" sidebar item in `Sidebar.tsx` and wired active views in `App.tsx`.
- **Verification & Test Results:**
  - **TypeScript:** `npm run typecheck` (`tsc --noEmit`) -> 0 errors.
  - **Renderer Build:** `npm run build:renderer` (`vite build`) -> 0 errors.
  - **Electron Build:** `npm run build:electron` (`esbuild`) -> 0 errors.
  - **Test Suite:** `npm test` (`vitest run`):
    - `tests/unit/utils/billingMath.test.ts` (6 tests passed)
    - `tests/unit/db/billingRepo.test.ts` (8 tests passed)
    - `tests/unit/ipc/validation.test.ts` (5 tests passed)
    - `tests/components/PosBilling.test.tsx` (5 tests passed)
    - `tests/unit/db/productRepo.test.ts` (8 tests passed)
    - `tests/unit/db/inventoryRepo.test.ts` (5 tests passed)
    - `tests/unit/db/dashboardRepo.test.ts` (6 tests passed)
    - `tests/unit/db/sqlite-foundation.test.ts` (6 tests passed)
    - `tests/components/ProductCatalog.test.tsx` (4 tests passed)
    - `tests/components/InventoryManagement.test.tsx` (3 tests passed)
    - `tests/components/Dashboard.test.tsx` (5 tests passed)
    - `tests/components/UiShell.test.tsx` (6 tests passed)
    - **Total:** 67 passed across 12 test files, 0 failed.
  - **Smoke Test:** `npm run smoke-test` -> Successfully executed with Electron runtime; applied migrations 001, 002, 003, and 004.

### Next Milestone
- Proceed with **Milestone 5: Purchases & Supplier Management** (Supplier master directory, purchase inward entry, stock increments, purchase returns).

---

## Log Entry: 2026-10-25 - Milestone 3: Product Catalog & Inventory Management

### Summary of Work Completed
- **Product Catalog Management (`ProductCatalog.tsx`):**
  - High-density data table with real-time text search across product name, SKU, barcode, and brand.
  - Multi-select filters for categories, brands, and stock status (`All`, `In Stock`, `Low Stock`, `Out of Stock`), plus sortable table columns (`Name`, `SKU`, `Category`, `Brand`, `Cost`, `Selling Price`, `Stock`, `Status`).
  - "+ Add Product" modal with auto-generation of unique SKUs (`CAT-BRD-XXXX`) and EAN-13 barcodes (`890XXXXXXXXX`).
  - Strict integer paise financial precision with live margin percentage calculation.
  - Equipment variant matrix builder supporting sizes (SH, LH, Harrow, 6), shoe sizes (UK 6-12), apparel sizes, weights, and colors.
  - Product specifications modal displaying product attributes, variant breakdowns, and recent stock movements audit trail.
  - Inactive product toggle and safe deletion guard preventing removal of products with historical transactions.
- **Inventory Reconciliation & Movement Ledger (`InventoryManagement.tsx`):**
  - KPI summary metrics: Total Stock Units across showroom/store, Landed Cost Valuation (in integer paise), Low-Stock count, and Out-of-Stock count.
  - Dual-tab workflow: Stock Reconciliation table and Immutable Movement Ledger.
  - Stock adjustment modal with real-time variance calculation (+/- units) and mandatory reason codes (`PHYSICAL_AUDIT_MISMATCH`, `DAMAGED_IN_STORE`, `EXPIRED_DEFECTIVE`, `SAMPLE_DEMO`, `THEFT_OR_LOSS`, `FOUND_SURPLUS`, `OTHER`).
  - Real-time audit trail displaying before/after balances, movement types, reference IDs, and user notes.
- **Database Migration `003_catalog_and_inventory.sql`:**
  - Added `tax_rate_percent` column to `products` and `product_variants`.
  - Created `hsn_codes` registry table populated with Indian GST classifications for sports goods (`9506`, `6404`, `6109`, `6506`).
  - Created `stock_adjustments` table for tracking physical count discrepancies.
  - Added composite indices for fast catalog filtering and stock movement lookups.
- **Transactional Repositories & Typed IPC:**
  - `src/main/db/productRepo.ts`: Atomic transactions for product and variant creation, opening stock movement insertion, and safe deletion checks.
  - `src/main/db/inventoryRepo.ts`: Synchronous stock adjustment transactions updating balance ledgers and rolling up variant quantities to parent records.
  - `src/main/db/mastersRepo.ts`: Master queries for categories, brands, units, and HSN codes.
  - `src/main/ipc/handlers.ts`: Zod-validated IPC channels for `products:*`, `inventory:*`, and `masters:*`.
- **Reusable UI Component:**
  - `<Modal>`: Accessible, responsive modal dialog supporting custom titles, subtitles, sizes, and footers matching the retail design system.
- **Navigation Integration:**
  - Activated "Products & Catalog" and "Inventory & Stock" sidebar items in `Sidebar.tsx` and wired active views in `App.tsx`.

### Verification & Test Results
- **TypeScript:** `npm run typecheck` (`tsc --noEmit`) -> 0 errors.
- **Renderer Build:** `npm run build:renderer` (`vite build`) -> 0 errors.
- **Electron Build:** `npm run build:electron` (`esbuild`) -> 0 errors.
- **Test Suite:** `npm test` (`vitest run`):
  - `tests/unit/db/productRepo.test.ts` (8 tests passed)
  - `tests/unit/db/inventoryRepo.test.ts` (5 tests passed)
  - `tests/unit/db/dashboardRepo.test.ts` (6 tests passed)
  - `tests/unit/db/sqlite-foundation.test.ts` (6 tests passed)
  - `tests/unit/ipc/validation.test.ts` (3 tests passed)
  - `tests/components/ProductCatalog.test.tsx` (4 tests passed)
  - `tests/components/InventoryManagement.test.tsx` (3 tests passed)
  - `tests/components/Dashboard.test.tsx` (5 tests passed)
  - `tests/components/UiShell.test.tsx` (6 tests passed)
  - **Total:** 46 passed across 9 test files, 0 failed.
- **Smoke Test:** `npm run smoke-test` -> Successfully executed with Electron runtime; applied migrations 001, 002, and 003.

### Next Milestone
- Proceed with **Milestone 4: Enhanced Inventory Management & Valuation** (or proceed per roadmap once approved by user).

---

## Log Entry: 2026-10-25 - Milestone 2: Main Interface, Dashboard & Retail Design System

### Summary of Work Completed
- **Visual Design System & Alignment:** Implemented the complete retail design system directly aligned with the user-provided "Donezo" dashboard reference adapted for sports retail. Configured exact tokens: Dark Green (`#124B36`), Primary Green (`#167A53`), Surface Green (`#EAF5EF`), App Background (`#F3F5F4`), White Cards (`#FFFFFF`), Primary Text (`#18231D`), Muted Text (`#7A8580`), and Borders (`#E3E9E5`).
- **Sidebar & Header Modernization:**
  - `Sidebar.tsx`: Created clean, compact left navigation with distinct active indicator pill, categorized "Menu" and "General" sections, planned module tags, live low-stock badge count, and an offline SQLite status card matching the reference layout.
  - `Header.tsx`: Integrated global product search with shortcut badge (`F4`), quick POS action button (`F2`), dynamic notification bell displaying real-time low-stock alert count, and cashier profile avatar.
- **Functional Store Dashboard (`src/renderer/features/dashboard/Dashboard.tsx`):**
  - **4 Top Summary Metric Cards:** Total Active Products (featured dark green card), Categories & Brands, Total Stock Units & Valuation, and Low-Stock Alerts.
  - **Secondary Financial & Operations Strip:** Real-time Today's Sales Revenue (completed invoices only), Today's Purchases, and Stock Valuation in paise.
  - **Weekly Sales Activity Pill Bar Chart:** Proportional vertical pill bars with hover tooltips displaying date, sales amount, invoice count, and today indicator.
  - **Stock Health Donut Progress Meter:** Semicircular SVG gauge rendering In Stock %, Low Stock %, and Out of Stock % fulfillment ratios.
  - **POS Shift & Retail Shortcuts:** Active Terminal 01 shift indicator with quick entry points to POS Billing, Add Product, Search Inventory, and GST Reports.
  - **Low-Stock Inventory Alerts Table:** Parameterized table listing items at or below reorder threshold with SKU, category, brand, quantity, threshold, status badge (`LOW STOCK` / `OUT OF STOCK`), and reorder actions.
  - **Recent Transactions Feed:** Honest empty state indicating where sales invoices and supplier bills will appear once recorded.
- **Reusable UI Foundation:**
  - `<MetricCard>`: Supports featured gradient and standard card variants.
  - `<Table>`: Generic composable data table with column definitions, sorting toggles (`asc` / `desc`), loading skeletons, and empty states.
  - `<SearchInput>`: Controlled, debounced search with clear action and keyboard badge.
  - `<BarChart>` & `<ProgressDonut>`: Dynamic SVG visualization primitives.
  - Currency utilities: `formatPaiseToRupees` and `parseRupeesToPaise` in integer paise.
- **Database Schema & Transactions Foundation:**
  - Created migration `002_transactions_foundation.sql`: Added `stock_quantity` to `products` and `product_variants`, created `sales_invoices`, `purchases`, `stock_movements`, and seeded 6 real cricket products with varying stock levels.
- **Data Architecture & Typed IPC Methods:**
  - Created `src/main/db/dashboardRepo.ts` with parameterized aggregate queries.
  - Registered IPC handlers: `dashboard:getMetrics`, `dashboard:getLowStockAlerts`, `dashboard:getRecentTransactions`, `dashboard:getWeeklySalesSummary`.
  - Exposed methods securely on `window.api.dashboard`.
- **Global Keyboard Shortcuts:** `F1` (Dashboard), `F2` (Billing), `F4` (Search), with safeguards preventing interception during active form inputs.

### Verification & Test Results
- **TypeScript:** `npm run typecheck` (`tsc --noEmit`) -> 0 errors.
- **Renderer Build:** `npm run build:renderer` (`vite build`) -> 0 errors.
- **Electron Build:** `npm run build:electron` (`esbuild`) -> 0 errors.
- **Test Suite:** `npm test` (`vitest run`):
  - `tests/unit/db/dashboardRepo.test.ts` (6 tests passed)
  - `tests/unit/db/sqlite-foundation.test.ts` (6 tests passed)
  - `tests/components/Dashboard.test.tsx` (5 tests passed)
  - `tests/components/UiShell.test.tsx` (6 tests passed)
  - `tests/unit/ipc/validation.test.ts` (3 tests passed)
  - **Total:** 26 passed, 0 failed.
- **Smoke Test:** `npm run smoke-test` -> Successfully executed with Electron runtime; applied migrations 001 and 002.

### Next Milestone
- Proceed with **Milestone 3: Product Catalog & Inventory Management** (Master product CRUD, variant generation, barcode generation, stock adjustments, and category management).

---

## Log Entry: 2026-10-25 - Milestone 1: Desktop Foundation Implementation

### Summary of Work Completed
- **Electron Lifecycle & Windows Host Integration:** Configured Electron Main lifecycle with single-instance lock (`app.requestSingleInstanceLock()`), custom application window dimensions (1366x820), navigation restrictions, and safe error dialog box handling.
- **Preload Isolation:** Established secure `contextBridge.exposeInMainWorld('api', ...)` exposing strictly typed methods. No raw IPC or Node modules exposed.
- **SQLite Engine:** Implemented local persistence using `better-sqlite3` with `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, and 5000ms busy timeout.
- **Migration Infrastructure:** Created versioned SQL migration runner. Executed migration `001_initial_schema.sql` creating and seeding 9 core master tables (`app_settings`, `categories`, `brands`, `units`, `products`, `product_variants`, `suppliers`, `customers`, `users`).
- **UI Shell & Retail Design System:** Built React 18 UI shell matching the visual reference with Tailwind CSS design tokens (`#124B36` Dark Green, `#167A53` Primary Green, `#EAF5EF` Surface Green, `#F3F5F4` Canvas, `#FFFFFF` Cards).
- **Reusable Component Library:** Built `<Button>`, `<Card>`, `<Input>`, `<Badge>`, `<Sidebar>`, and `<Header>` with support for variants, loading indicators, and keyboard shortcuts (`F1`, `F2`).
- **Dual-ABI Binding Solution:** Automated seamless switching between Node.js ABI 137 (for Vitest test execution) and Electron ABI 132 (for Electron desktop execution and Windows packaging) via `scripts/switch-bindings.mjs`.
- **Packaging Pipeline:** Successfully verified unpacked binary output (`dist-package\win-unpacked\Cricket360.exe`, 190 MB) and compiled Windows setup installer (`dist-package\Cricket360 Setup 1.0.0.exe`, 85.6 MB) with NSIS configuration protecting persistent AppData database across upgrades and uninstalls.

### Verification & Test Results
- **TypeScript:** `npm run typecheck` (`tsc --noEmit`) -> 0 errors.
- **Renderer Build:** `npm run build:renderer` (`vite build`) -> 0 errors.
- **Electron Build:** `npm run build:electron` (`esbuild`) -> 0 errors.
- **Test Suite:** `npm test` (`vitest run`):
  - `tests/unit/ipc/validation.test.ts` (3 tests passed)
  - `tests/unit/db/sqlite-foundation.test.ts` (6 tests passed)
  - `tests/components/UiShell.test.tsx` (6 tests passed)
  - **Total:** 15 passed, 0 failed.
- **Smoke Test:** `npm run smoke-test` -> Electron launched, connected to SQLite, verified migration idempotency, created database at `%APPDATA%\Cricket360\database\cricket360.sqlite`.
- **Windows Packaging:** `npx electron-builder --win --x64` generated `dist-package\Cricket360 Setup 1.0.0.exe` (85.6 MB).

### Files Created/Modified
- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `electron-builder.yml`, `index.html`
- `scripts/dev.mjs`, `scripts/build-electron.mjs`, `scripts/switch-bindings.mjs`, `scripts/smoke-test.mjs`
- `src/main/index.ts`, `src/main/db/connection.ts`, `src/main/db/migrations.ts`, `src/main/db/migrations/001_initial_schema.sql`, `src/main/ipc/handlers.ts`
- `src/preload/index.ts`
- `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/index.css`
- `src/renderer/components/Button.tsx`, `src/renderer/components/Card.tsx`, `src/renderer/components/Input.tsx`, `src/renderer/components/Badge.tsx`, `src/renderer/components/Sidebar.tsx`, `src/renderer/components/Header.tsx`
- `src/shared/types/models.ts`, `src/shared/types/ipc.ts`
- `tests/setup.ts`, `tests/unit/db/sqlite-foundation.test.ts`, `tests/unit/ipc/validation.test.ts`, `tests/components/UiShell.test.tsx`
- `docs/*`

### Next Milestone
- Proceed with **Milestone 2: Main Interface & Retail Design System** (Expanding dashboard KPI calculation engine, recent sales/purchases queries, stock alert feeds, and high-density retail data tables).

### Summary of Work Completed
- **Repository State Inspection:** The workspace `e:\cricket360 daashboard` was inspected. Identified that the repository was newly initialized with a single commit containing an empty UTF-16LE `README.md`.
- **Environment Verification:** Node.js v24.15.0, npm 11.12.1, Git 2.53.0.windows.3, Python 3.12.10, and Visual Studio 2026 build tools located on Windows host.
- **Architectural Specification:** Defined process boundaries (Main, Preload, Renderer), IPC contracts, security boundaries (`contextIsolation: true`, `nodeIntegration: false`), and offline storage model.
- **Financial Rule Definition:** Established the Integer Minor Units (paise) standard to eliminate floating-point arithmetic errors across all billing and GST calculations.
- **Documentation Baseline:** Created the 8 core documentation files under `docs/` and established the requirement traceability matrix.

### Decisions Made & Technical Rationale
1. **Database:** SQLite with `better-sqlite3` in WAL mode for synchronous, high-performance ACID operations.
2. **Precision:** Storing all prices, taxes, and amounts as integer paise (`1 INR = 100 paise`).
3. **Styling:** Tailwind CSS v3 with custom design system tokens matching the forest/emerald green and clean white retail reference (`#124B36`, `#167A53`, `#EAF5EF`, `#F3F5F4`).
4. **Packaging:** Electron Builder with NSIS installer targeting Windows 64-bit.
5. **Testing Framework:** Vitest + React Testing Library for frontend component and business logic unit testing.

### Files Created/Modified
- `README.md`
- `docs/PROJECT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/CHANGELOG.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/TESTING.md`
- `docs/INSTALLATION_AND_RELEASE.md`
- `docs/USER_GUIDE.md`

### Next Immediate Steps
1. Execute Milestone 1: Initialize Electron + Vite + React + TypeScript desktop scaffolding.
2. Configure `better-sqlite3` database initialization, migration runner, and initial schema migrations.
3. Establish IPC bridge contracts and verified test runner.
