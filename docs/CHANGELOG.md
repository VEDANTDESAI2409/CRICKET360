# Cricket360: Project Changelog

All notable changes to the Cricket360 project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-m6] - 2026-10-25
### Added - Milestone 6: Returns, Expenses, Reports & Business Controls
- **Sales Returns & Restocking Engine (`Returns.tsx`, `returnsRepo.ts`):**
  - Full and partial sales return workflow with invoice lookup by number or customer.
  - Returnable quantity bounds checking preventing over-returns and duplicate return submissions.
  - Line-item proportional valuation, integer paise arithmetic, and return reason capture.
  - Physical restocking switch per line item (`restock: boolean`): restores variant and parent product inventory only when physical goods are accepted back into stock, writing immutable `stock_movements` with `movement_type = 'SALE_RETURN'`.
  - Multiple refund mechanisms: Cash, UPI, Card, Bank Transfer, and Store Credit.
  - Automatic customer Khata debit adjustment for credit sales.
  - Automatic invoice status progression to `RETURNED` when all items are returned.
- **Operating Expense Management (`Expenses.tsx`, `expenseRepo.ts`):**
  - Standard expense categories (Rent, Salaries, Utilities, Transport & Logistics, Repairs & Maintenance, Marketing, Miscellaneous) plus custom category creation.
  - Sequential expense numbering (`EXP-YYYYMM-XXXX`) and draft/pending/paid status tracking.
  - Amount in integer paise, payment method, payee/supplier link, and expense notes.
  - Distinct separation from inventory purchases and customer refunds to eliminate double counting.
- **Financial Reports & Business Analytics (`Reports.tsx`, `reportsRepo.ts`):**
  - Date-filtered reports for Sales (Gross sales, item discounts, bill discounts, returns, net revenue).
  - Purchases and Vendor Returns summary.
  - Profit & Loss statement with Cost of Goods Sold (COGS) based on Weighted Landed Cost, distinguishing Gross Margin % from Net Operating Profit % (deducting operating expenses).
  - Live Stock Valuation across catalog variants and standalone items with total units.
  - GST & HSN Tax summary: outward GSTR-1 liability vs inward ITC on purchases across CGST, SGST, and IGST without unsupported tax claims.
  - Cash Flow Register: cash/UPI/card/bank reconciliation across sales, customer payments, vendor payouts, expenses, and refunds.
  - RFC 4180 CSV Export across all reports with human-readable rupee formatting.
- **Business Controls, Safe Backups & Audit Trail (`Settings.tsx`, `backupService.ts`, `auditRepo.ts`, `exportImportService.ts`):**
  - Role-Based Access Control matrix (`ADMIN`, `CASHIER`, `STAFF`) with granular permissions.
  - Tamper-evident `audit_logs` tracking sensitive system actions with user attribution, entity snapshots, and JSON diffs.
  - Online database backups via SQLite `VACUUM INTO` with collision-safe unique filenames.
  - Backup integrity verification: SHA-256 hash validation, SQLite format 3 magic header checks, and `PRAGMA integrity_check`.
  - Automated safety snapshot before database restore (`PRE_RESTORE_`) to guard against corrupted or invalid backup files.
  - Safe CSV data export (Products, Customers, Sales) and bulk Product catalog import with automatic SKU/barcode generation.
  - Shop settings profile editor with GSTIN, address, state code, receipt headers/footers, and print preferences.
- **Database Migration `006_returns_expenses_and_controls.sql`:**
  - Created tables: `sales_returns`, `sales_return_items`, `expense_categories`, `expenses`, `audit_logs`, `backup_metadata`.
  - Seeded default categories and numbering sequences.
- **Testing & Verification:**
  - 37 new tests added (5 in `returnsRepo.test.ts`, 6 in `expenseRepo.test.ts`, 7 in `reportsRepo.test.ts`, 4 in `backupService.test.ts`, 7 in `m6Validation.test.ts`, 2 in `Returns.test.tsx`, 2 in `Expenses.test.tsx`, 2 in `Reports.test.tsx`, 2 in `Settings.test.tsx`).
  - Total automated test suite now at 136 passing tests across 27 test files.
  - Passed `npm run typecheck`, `npm test`, `npm run build`, and `npm run smoke-test`.

## [1.0.0-m5] - 2026-10-25
### Added - Combined Milestone 5: Procurement, Supplier Management & Customer Accounts
- **Phase A: Suppliers & Procurement Module (`Suppliers.tsx`, `Purchases.tsx`):**
  - Supplier directory with real-time search, KPI cards (Total Suppliers, Accounts Payable, Avg Payment Terms, GST Registered), Add/Edit vendor modal, and payment terms tracking.
  - Inward Goods & Purchase Invoice creation modal with supplier invoice number/date, item builder, variant selection, unit cost, discount, and real-time GST computation.
  - B2B procurement tax engine (`calculatePurchaseTotals`): tax-exclusive purchase rate computation, intra-state CGST+SGST split, inter-state IGST allocation, and round-off calculation in integer paise.
  - Duplicate supplier invoice validation scoped to `(supplier_id, supplier_invoice_number)` enforced via unique SQLite index `uq_supplier_invoice` and transactional pre-check.
  - Transaction-safe receipt of goods: updates warehouse stock on variants and parent products, logs auditable `stock_movements` with `movement_type = 'PURCHASE_RECEIPT'`, and adjusts supplier ledger balance.
  - Purchase history table with date/status filters, Purchase Details modal with tax breakdowns, and Bill Payment action modal.
  - Purchase Returns workflow with returnable quantity bounds checks, warehouse stock deduction with `PURCHASE_RETURN` movements, and vendor account balance credit.
- **Phase B: Supplier Payments & Customer Accounts (`Customers.tsx`, `PaymentsRegister.tsx`):**
  - Customer directory with search, credit limit management, receivables KPI cards, Add/Edit customer modal, and customer transaction history.
  - Support for customer credit balances generated during POS transactions when payment is deferred or partially tendered.
  - Full and partial customer payments recorded against outstanding sales invoices with over-allocation prevention.
  - Full and partial supplier payments recorded against outstanding purchase bills with over-allocation prevention.
  - Chronological Customer Khata statement modal and Supplier Ledger modal displaying debit/credit entries with verified running balance.
  - Unified Payments Register (`PaymentsRegister.tsx`) tracking all inflow (sales, receipts) and outflow (supplier payouts) with party and mode filters.
- **Phase C: Financial Integrity & Migrations:**
  - Database Migration `005_procurement_and_accounts.sql`: enhanced `suppliers`, `customers`, `purchases`, and `payments` tables, created `purchase_items`, `purchase_returns`, `purchase_return_items`, and sequence numbering keys.
  - 100% integer paise arithmetic across all purchase tax, line totals, discounts, payments, and running ledger balances.
  - All financial state modifications guarded by synchronous SQLite transactions (`db.transaction()`).
- **Sidebar & Navigation Integration:**
  - Activated `Purchases`, `Customers`, `Suppliers`, and `Payments` navigation items in `Sidebar.tsx`.
  - Routed all 4 new modules to dedicated screens in `App.tsx`.
- **Testing & Verification:**
  - 27 new tests added (5 in `purchaseRepo.test.ts`, 5 in `accountRepo.test.ts`, 7 in `procurementValidation.test.ts`, 3 in `Suppliers.test.tsx`, 3 in `Customers.test.tsx`, 4 in `Purchases.test.tsx`).
  - Total automated test suite expanded to 99 passing tests across 18 test files.
  - Verified with `npm run typecheck` (0 errors), `npm test` (99/99 pass), `npm run build` (clean Vite + Electron bundles), and `npm run smoke-test` (migrations 001–005 applied cleanly).

## [1.0.0-m4] - 2026-10-25
### Fixed - Optional Customer Details & IPC Validation
- **Customer GSTIN & Address Nullability:** Resolved IPC validation errors (`customer_gstin: expected string, received null`, `customer_address: expected string, received null`) when billing walk-in customers or customers without registered GST/address.
- **IPC Schema Normalization:** Created centralized `schemas.ts` using `.nullable().optional()` for optional customer details, notes, and payment references, while preserving strict validation for mandatory items and financial fields.
- **Repository Snapshot Normalization:** Added `normalizeOptionalString()` in `billingRepo.ts` to ensure consistent handling of whitespace, empty strings, and null snapshots.
- **Windows File Lock Handling in Test Runner:** Updated `switch-bindings.mjs` and `tests/setup.ts` to gracefully handle concurrent Electron instances during tests without `EBUSY` DLL copy locks.

### Added - Milestone 4: POS & GST Billing
- **Point-of-Sale Billing Register (`PosBilling.tsx`):**
  - High-speed retail billing interface with instant product search by name, SKU, or barcode.
  - Interactive variant selector modal for bats (sizes, weights) and apparel/shoes before adding to cart.
  - Cart management with quantity steppers, direct editing, item deletion, and real-time stock threshold validation.
  - Item-level and invoice-level discount configuration (percentage or fixed) with proportional integer-paise distribution.
  - Dynamic GST calculations supporting intra-state transactions (CGST 50% + SGST 50%) and inter-state transactions (IGST 100%) based on customer State code.
  - Multi-tender checkout supporting Cash, UPI (with simulated dynamic QR), Card, and Split payments with exact tender sum validation.
  - Collision-free sequential invoice numbering (e.g. `CR360-1001`) with configurable shop prefix.
  - Customer selection with one-click Walk-in Customer support and modal for quick on-the-fly customer registration.
  - Comprehensive Sales History register with date filters, status indicators (`COMPLETED` / `CANCELLED`), invoice preview, and print actions.
  - Audit-safe invoice cancellation/void workflow requiring mandatory cancellation reason and automatically restoring stock with compensatory `SALE_RETURN` ledger records.
  - Dual layout printable GST Tax Invoice modal: A4 Tax Invoice and 80mm Thermal Receipt with shop details, GSTIN, HSN summaries, and amount in words.
- **Financial Precision Engine (`billingMath.ts`):**
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
  - `billingRepo.ts`: Atomic sale creation and cancellation transactions with stock movement synchronization and balance tracking.
  - `handlers.ts`: Zod-validated IPC endpoints for `billing:createInvoice`, `billing:getInvoices`, `billing:getInvoiceById`, `billing:cancelInvoice`, `billing:getNextInvoiceNumber`, `billing:getShopSettings`, `customers:search`, and `customers:create`.
  - `preload/index.ts`: Expose `window.api.billing` and `window.api.customers`.
- **Automated Testing & Verification:**
  - 21 new tests added (6 in `billingMath.test.ts`, 8 in `billingRepo.test.ts`, 2 in `validation.test.ts`, 5 in `PosBilling.test.tsx`).
  - Total test suite expanded to 67 passing tests across 12 test files.
  - Full TypeScript typecheck verified (`tsc --noEmit`).
  - Production build completed (`npm run build`).
  - Electron launch smoke test validated with migration 004 active.

---

## [1.0.0-m3] - 2026-10-25
### Added - Milestone 3: Product Catalog & Inventory Management
- **Complete Product Catalog Module (`ProductCatalog.tsx`):**
  - High-density product inventory table with live search across name, SKU, barcode, and brand.
  - Multi-criteria filtering by category, brand, and stock status (`All`, `In Stock`, `Low Stock`, `Out of Stock`), plus sortable columns.
  - "+ Add Product" modal dialog with automatic SKU generation (`CAT-BRD-XXXX`) and EAN-13 barcode generation (`890XXXXXXXXX`).
  - Integer paise pricing precision (`purchase_cost_paise`, `selling_price_paise`, `mrp_paise`) with live margin percentage calculation.
  - Product variant matrix builder supporting cricket bat sizes (SH, LH, Harrow, 6), shoe sizes (UK 6-12), apparel sizes, weights, and colors.
  - View details modal showing comprehensive specifications, variant breakdown, and recent stock movements audit trail.
  - Inactive product toggle and safe deletion guard preventing removal of products with historical transactions.
- **Inventory Reconciliation & Movement Ledger Module (`InventoryManagement.tsx`):**
  - Summary metric cards tracking Total Stock Units across showroom/store, Landed Cost Valuation, Low-Stock items, and Out-of-Stock count.
  - Dual-tab workflow: Stock Reconciliation & Audit and Immutable Movement Ledger.
  - Stock adjustment modal with automatic variance computation (+/- units) and mandatory reason codes (`PHYSICAL_AUDIT_MISMATCH`, `DAMAGED_IN_STORE`, `EXPIRED_DEFECTIVE`, `SAMPLE_DEMO`, `THEFT_OR_LOSS`, `FOUND_SURPLUS`, `OTHER`).
  - Real-time audit trail displaying before/after balances, movement types, reference IDs, and user notes.
- **Database Migration `003_catalog_and_inventory.sql`:**
  - Added `tax_rate_percent` column to `products` and `product_variants`.
  - Created `hsn_codes` registry table populated with Indian GST classifications for sports goods (`9506`, `6404`, `6109`, `6506`).
  - Created `stock_adjustments` table for tracking physical count discrepancies.
  - Added composite indices for fast catalog filtering and stock movement lookups.
- **Transactional Repositories & Typed IPC:**
  - `productRepo.ts`: Atomic transactions for product and variant creation, opening stock movement insertion, and safe deletion checks.
  - `inventoryRepo.ts`: Synchronous stock adjustment transactions updating balance ledgers and rolling up variant quantities to parent records.
  - `mastersRepo.ts`: Master queries for categories, brands, units, and HSN codes.
  - `handlers.ts`: Zod-validated IPC channels for `products:*`, `inventory:*`, and `masters:*`.
- **Reusable UI Component:**
  - `<Modal>`: Accessible, responsive modal dialog supporting custom titles, subtitles, sizes, and footers matching the retail design system.
- **Automated Testing & Verification:**
  - 20 new tests added (8 in `productRepo.test.ts`, 5 in `inventoryRepo.test.ts`, 4 in `ProductCatalog.test.tsx`, 3 in `InventoryManagement.test.tsx`).
  - Total automated test suite expanded to 46 passing tests across 9 test files.
  - Verified with TypeScript typecheck, production build, and Electron launch smoke test.

---

## [1.0.0-m2] - 2026-10-25
### Added - Milestone 2: Main Interface, Dashboard & Retail Design System
- **Forest Green & White Retail Design System:** Fully refined application theme matching the reference layout using strict tokens (`#124B36` Dark Green, `#167A53` Primary Green, `#EAF5EF` Surface Green, `#F3F5F4` App Background, `#FFFFFF` White Cards, `#18231D` Primary Text, `#7A8580` Muted Text).
- **Persistent Left Navigation Sidebar:** Redesigned compact sidebar with distinct active green indicator pill, "Menu" and "General" sections, planned module tags, live low-stock badge, and offline SQLite status card.
- **Top Application Header:** Implemented search input with shortcut badge (`F4`), quick POS action button (`F2`), dynamic notification bell displaying real-time low-stock alert count, and cashier profile area.
- **Functional Store Dashboard:**
  - **4 Top Summary Metric Cards:** Total Active Products (featured green gradient), Product Categories & Brands, Total Stock Units & Valuation, and Low-Stock Alerts.
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
- **Database & IPC Extension:**
  - Migration `002_transactions_foundation.sql`: Added `stock_quantity` columns to `products` and `product_variants`, created `sales_invoices`, `purchases`, and `stock_movements` tables, and seeded initial cricket equipment.
  - Typed IPC methods: `dashboard:getMetrics`, `dashboard:getLowStockAlerts`, `dashboard:getRecentTransactions`, `dashboard:getWeeklySalesSummary`.
  - Parameterized repository queries in `src/main/db/dashboardRepo.ts` with strict cancellation exclusion and local date boundary handling.
- **Global Keyboard Shortcuts:** `F1` (Dashboard), `F2` (Billing), `F4` (Search), with safeguards preventing interception during active form inputs.
- **Automated Testing:** 11 new tests added covering repository calculations, cancellation exclusions, UI rendering, table sorting, and filtering (total test suite: 26 passing tests).

---

## [1.0.0-m1] - 2026-10-25
### Added - Milestone 1: Desktop Foundation
- **Electron Process Scaffolding:** Configured secure Electron main process with single-instance lock, context isolation (`contextIsolation: true`), disabled Node integration in renderer, and sandbox mode.
- **Preload Bridge:** Implemented strictly typed `window.api` bridge exposing only validated methods (`app.getInfo`, `app.getHealthCheck`, `settings.getAll`, `settings.get`, `settings.set`, `db.getStats`).
- **SQLite Engine:** Implemented local SQLite persistence with `better-sqlite3` configured with `WAL` journal mode, foreign key enforcement (`PRAGMA foreign_keys = ON;`), and 5000ms busy timeout.
- **Versioned Migrations:** Created atomic migration runner tracking versions in `_schema_migrations` and executed initial migration `001_initial_schema.sql` (seeding settings, cricket categories, brands, units, walk-in customer, and admin users).
- **Vite & React 18 UI Shell:** Built desktop application layout matching forest/emerald green and white cards reference (`#124B36`, `#167A53`, `#EAF5EF`, `#F3F5F4`).
- **Reusable Component Kit:** Created `<Button>`, `<Card>`, `<Input>`, `<Badge>`, `<Sidebar>`, and `<Header>` components.
- **Navigation Shell:** Implemented module routing between Dashboard, POS Billing, Products, Inventory, Purchases, Customers, Suppliers, Payments, Returns, Reports, Expenses, and Settings.
- **Dual-ABI Binding Automation:** Implemented `scripts/switch-bindings.mjs` seamlessly toggling between Node.js ABI 137 (for Vitest test runner) and Electron ABI 132 (for Electron runtime and Windows packaging).
- **Automated Test Suite:** Vitest test suite executing 15 automated unit and component tests with 100% pass rate.
- **Windows Packaging:** Successfully verified unpacked binary packaging (`dist-package\win-unpacked\Cricket360.exe`) and full standalone Windows NSIS setup installer (`dist-package\Cricket360 Setup 1.0.0.exe`).

---

## [0.1.0-m0] - 2026-10-25
### Added - Milestone 0: Requirements Audit & Architecture Foundation
- Initial repository and environment audit completed (Node v24.15.0, npm 11.12.1, Git 2.53.0 on Windows).
- Established strict architecture documentation in `docs/ARCHITECTURE.md`.
- Formulated comprehensive requirements traceability matrix in `docs/PROJECT_REQUIREMENTS.md`.
- Formulated complete SQLite schema and data integrity specification in `docs/DATABASE.md`.
- Initialized test plan in `docs/TESTING.md`.
- Initialized installer and release guide in `docs/INSTALLATION_AND_RELEASE.md`.
- Initialized user guide in `docs/USER_GUIDE.md`.
- Initialized development log in `docs/DEVELOPMENT_LOG.md`.
- Converted initial README.md encoding to UTF-8 without BOM.
