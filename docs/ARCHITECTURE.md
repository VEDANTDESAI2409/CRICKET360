# Cricket360: System Architecture & Design Specification

## 1. High-Level Architectural Overview

Cricket360 is built as an offline-first Windows desktop application utilizing a clean multi-tier architecture separating the trusted OS runtime from the UI presentation layer.

```
+---------------------------------------------------------------------------------------+
|                                    WINDOWS OS HOST                                    |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                        ELECTRON MAIN PROCESS (Node.js runtime)                |   |
|   |  - Lifecycle Management (Single instance lock, window creation, clean exit)    |   |
|   |  - Database Engine (better-sqlite3 with WAL, foreign keys, migrations)        |   |
|   |  - Business Services (BillingEngine, InventoryEngine, TaxEngine, BackupService)|   |
|   |  - OS Services (Silent / dialog printing, file exports, path resolver)         |   |
|   |  - Strict Typed IPC Handler Registration                                      |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           |                                           |
|                            IPC Message Bus (invoke / handle)                          |
|                                           |                                           |
|   +---------------------------------------v---------------------------------------+   |
|   |                         PRELOAD ISOLATION LAYER                               |   |
|   |  - contextIsolation: true, nodeIntegration: false                             |   |
|   |  - Strongly typed window.api bridge (only permitted method signatures)       |   |
|   +---------------------------------------+---------------------------------------+   |
|                                           |                                           |
|                            Direct In-Memory Bridge Call                               |
|                                           |                                           |
|   +---------------------------------------v---------------------------------------+   |
|   |                          RENDERER PROCESS (Browser Engine)                    |   |
|   |  - React 19 / 18 + TypeScript SPA                                             |   |
|   |  - Forest Green / Emerald Retail Design System                                |   |
|   |  - Routing, State Management & Keyboard-first POS interaction                |   |
|   |  - Data Tables, Forms (Zod + React Hook Form), Visual Charts, Print Layouts   |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

## 2. Process Boundaries & Security Model

### 2.1 Main Process (`src/main/`)
The Electron Main Process is the sole trusted authority. It directly interacts with the operating system, file system, SQLite database, and printer drivers.
- **Node Integration:** Disabled in renderer windows.
- **Context Isolation:** Enabled unconditionally (`contextIsolation: true`).
- **Sandbox:** Sandbox enabled where practical; renderer never has direct access to Node APIs, native file descriptors, or arbitrary SQL commands.
- **IPC Validation:** All inputs incoming from renderer through `ipcMain.handle` are validated before being forwarded to internal repositories and service methods.

### 2.2 Preload Layer (`src/preload/`)
The preload script securely exposes an immutable `window.api` object to the renderer via `contextBridge.exposeInMainWorld('api', ...)`.
- No raw `ipcRenderer.send` or `ipcRenderer.on` is exposed.
- All IPC methods are strongly typed using TypeScript interfaces shared between main and renderer (`src/shared/types/ipc.ts`).

### 2.3 Renderer Process (`src/renderer/`)
The renderer runs a modern React single-page application bundled with Vite. It handles:
- Route rendering (Dashboard, POS Billing, Products, Inventory, Purchases, Customers, Suppliers, Reports, Expenses, Settings).
- State management and optimistic UI updates backed by immediate local SQLite queries.
- Print previews and responsive desktop rendering.

---

## 3. Major Architectural Decisions

### 3.1 Styling System: Tailwind CSS v3 with Custom Sports Retail Design System Tokens
- **Decision:** Use Tailwind CSS v3 configured with an explicit, bespoke color palette matching the specification (`#124B36` Dark Green, `#167A53` Primary Green, `#EAF5EF` Surface Green, `#F3F5F4` App Background, `#FFFFFF` Card White, `#18231D` Primary Dark Text, `#7A8580` Muted Text).
- **Rationale:** Tailwind CSS with utility classes provides rapid UI development, zero runtime CSS overhead, full layout flexibility for compact high-density retail tables and billing grids, and easy print-media styling (`print:hidden`, `print:block`) while adhering strictly to the design tokens.

### 3.2 Monetary Precision: Integer Paise (Minor Currency Units)
- **Decision:** All financial values (prices, totals, discounts, taxes, payments, balances) are stored in the SQLite database and processed in business logic as **integers representing paise** (1 Rupee = 100 paise).
- **Rationale:** IEEE 754 floating-point numbers inherently introduce rounding errors (e.g., `0.1 + 0.2 === 0.30000000000000004`). In retail GST billing, fractional errors in tax computation can lead to invoice mismatches and compliance audit failures. Storing values in integer paise guarantees 100% mathematical precision with zero float drift. Presentation formatting converts paise to `₹ XX.XX` only at the UI display layer.

### 3.3 Database Engine: SQLite with `better-sqlite3`
- **Decision:** Use `better-sqlite3` operating in synchronous Write-Ahead Logging (`WAL`) mode with foreign key constraints enforced (`PRAGMA foreign_keys = ON;`).
- **Rationale:** `better-sqlite3` provides fast, synchronous execution on the Node.js main thread without the asynchronous callback overhead or thread contention of `sqlite3`. Synchronous execution ensures that financial transactions (`BEGIN IMMEDIATE` -> `INSERT invoice` -> `INSERT items` -> `UPDATE stock` -> `INSERT stock_movement` -> `COMMIT`) run atomically and predictably without partial state writes.

### 3.4 Packaging & Installer: Electron Builder with NSIS
- **Decision:** Electron Builder targeting Windows NSIS (`x64`).
- **Rationale:** Electron Builder has built-in support for NSIS installers on Windows, automated desktop shortcut generation, application icons, uninstallation handlers that protect user database directories, and native dependency compilation support via `electron-builder install-app-deps`.

---

## 4. IPC API Contract Overview

The IPC layer is organized into modular channels:
- `dashboard:getMetrics` - Aggregate KPI metrics (products, categories, stock, today's sales/purchases, stock distribution).
- `dashboard:getLowStockAlerts` - Reorder threshold alerts table items.
- `dashboard:getRecentTransactions` - Recent sales invoices & purchases feed.
- `dashboard:getWeeklySalesSummary` - 7-day rolling sales activity series for chart visualization.
- `app:getInfo` / `app:getHealthCheck` - Application environment, packaging state, database integrity.
- `settings:getAll` / `settings:get` / `settings:set` - Key-value persistent configuration store.
- `db:getStats` - Database entity counts and migration status.
- `products:getAll` / `products:getById` - Catalog search, category/brand/stock filtering, sorting, and full variant retrieval.
- `products:create` / `products:update` / `products:delete` / `products:toggleActive` - Product catalog lifecycle with auto SKU/barcode generation, variant matrix creation, and safe deletion guards.
- `products:generateSku` / `products:generateBarcode` - Collision-free unique SKU and EAN-13 barcode generation.
- `inventory:adjustStock` - Stock reconciliation with mandatory reason codes, variance calculation, and immutable ledger insertion.
- `inventory:getStockMovements` - Real-time audit trail of all historical stock movements with before/after balances.
- `masters:getCategories` / `masters:getBrands` / `masters:getUnits` / `masters:getHsnCodes` - Master taxonomy and GST registry queries.
- `billing:createInvoice` - Atomic sale creation recording invoice, items, payments, stock movement deductions, and balance updates.
- `billing:getInvoices` - Filterable sales invoice history (by date range, customer, payment status, completion status).
- `billing:getInvoiceById` - Full invoice query returning items, taxes, customer snapshots, and payment records.
- `billing:cancelInvoice` - Audit-safe invoice voiding workflow restoring variant and parent product stock with compensatory `SALE_RETURN` movements.
- `billing:getNextInvoiceNumber` - Atomic generation of collision-free sequential invoice numbers (e.g. `CR360-1001`).
- `billing:getShopSettings` - Shop profile snapshot for tax invoice headers and GSTIN/State verification.
- `customers:getAll` / `customers:getById` / `customers:create` / `customers:update` / `customers:getKhata` - Customer directory, credit management, and running Khata statement.
- `suppliers:getAll` / `suppliers:getById` / `suppliers:create` / `suppliers:update` / `suppliers:getLedger` - Supplier directory, payment terms, and vendor running ledger.
- `purchases:getAll` / `purchases:getById` / `purchases:create` / `purchases:createReturn` - Purchase bills inwarding, tax breakdown, duplicate supplier invoice validation, and purchase returns.
- `payments:recordCustomerPayment` / `payments:recordSupplierPayment` / `payments:getAll` - Full/partial payment recording against sales/purchase invoices, balance adjustments, and unified payment register.
- `returns:searchInvoices` / `returns:getReturnableItems` / `returns:createReturn` / `returns:getAll` / `returns:getById` - Sales returns workflow, partial/full item return verification, physical restocking ledger, and refund settlements.
- `expenses:getCategories` / `expenses:createCategory` / `expenses:getAll` / `expenses:getById` / `expenses:create` / `expenses:update` / `expenses:delete` - Operating expense lifecycle, categorized expenditure, and payee tracking.
- `reports:getSalesReport` / `reports:getPurchasesReport` / `reports:getProfitLossReport` / `reports:getStockValuationReport` / `reports:getGstReport` / `reports:getCashFlowReport` / `reports:exportCsv` - Comprehensive financial and operational reports with CSV export.
- `system:backup:create` / `system:backup:list` / `system:backup:restore` / `system:backup:verify` - Atomic online database backups, SHA-256 verification, and pre-restore snapshots.
- `system:export:data` / `system:import:products` - CSV bulk data export and product catalog import.
- `audit:getLogs` - Tamper-resistant system audit trail.
- `settings:getShopSettings` / `settings:updateShopSettings` - Shop profile snapshot, tax header configuration, and receipt customization.
- `system:print:*` - Silent printing to thermal or default printer, A4 print preview.

### 4.1 Transactional Guarantees for Billing, Catalog & Stock Operations
All stock mutations and billing workflows execute within synchronous `db.transaction()` boundaries:
1. **Atomic Sale Creation (`billing:createInvoice`):**
   - Validates available stock for each line item (standard products and variants).
   - Inserts into `sales_invoices` with complete fiscal snapshots.
   - Inserts each item into `sales_invoice_items` with historical snapshots of unit price, HSN, tax rate, and tax breakdown.
   - Deducts stock immediately from `product_variants` (if applicable) and parent `products`.
   - Records immutable `stock_movements` with `movement_type = 'SALE_INVOICE'` and reference ID.
   - Inserts tender records into `payments`.
   - If unpaid or partially paid, updates the customer's outstanding balance in `customers`.
   - Updates sequential invoice counter in `app_settings`.
2. **Audit-Safe Invoice Cancellation (`billing:cancelInvoice`):**
   - Verifies invoice status is `COMPLETED` (cannot void already cancelled invoices).
   - Updates invoice status to `CANCELLED` with mandatory reason and timestamp.
   - Restores stock for all invoice items (both variant stock and parent product cumulative stock).
   - Inserts compensatory `stock_movements` with `movement_type = 'SALE_RETURN'`.
   - If unpaid balance was added to the customer ledger, reverses the outstanding balance.
3. **Retail Tax Back-Calculation & Paise Precision:**
   - Shelf prices are tax-inclusive: `Taxable Value = Math.round(Gross Amount / (1 + Tax Rate / 100))`.
   - Total GST is split into CGST and SGST for intra-state (equal state codes), with odd paise assigned to CGST to guarantee `CGST + SGST === Total Tax`.
   - Inter-state transactions allocate 100% of tax to IGST.
   - Round-off to nearest Rupee (nearest 100 paise) is calculated and recorded in `round_off_paise`.
4. **Variant Stock Rollup:** Updating stock for any product variant immediately recalculates and updates the parent product's cumulative `stock_quantity`.
5. **Safe Product Deletion Guard:** Products associated with historical `SALE_INVOICE` or `PURCHASE_RECEIPT` movements cannot be permanently deleted; the repository raises an explicit error advising deactivation instead.
6. **Reason-Enforced Adjustments:** Adjustments mandate a valid reason code (`PHYSICAL_AUDIT_MISMATCH`, `DAMAGED_IN_STORE`, `EXPIRED_DEFECTIVE`, `SAMPLE_DEMO`, `THEFT_OR_LOSS`, `FOUND_SURPLUS`, `OTHER`) recorded both in `stock_adjustments` and `stock_movements`.

### 4.2 Procurement & Financial Account Invariants (Combined Milestone 5)
1. **B2B Procurement Tax Computation:**
   - Unit purchase rates are tax-exclusive: `Taxable Value = Quantity * Unit Cost - Discount`.
   - Intra-state procurement splits GST equally into CGST and SGST (`cgst_amount_paise = Math.floor(tax / 2)`, `sgst_amount_paise = tax - cgst`).
   - Inter-state procurement applies 100% to IGST (`igst_amount_paise = tax`).
2. **Duplicate Supplier Invoice Validation:**
   - Scoped strictly to `(supplier_id, supplier_invoice_number)`.
   - Enforced both at the database level via unique index `uq_supplier_invoice ON purchases(supplier_id, supplier_invoice_number)` and pre-checked in `PurchaseRepo.createPurchase` with clean business error reporting.
3. **Inward Stock Receipts:**
   - Every purchase bill inward creation executes in an atomic transaction: inserting `purchases`, inserting `purchase_items`, updating `stock_quantity` on both variants and parent products, inserting immutable `stock_movements` with `movement_type = 'PURCHASE_RECEIPT'`, recording any initial payment, and updating the supplier's balance in `suppliers`.
4. **Purchase Returns:**
   - Enforces quantity constraints: returned quantity cannot exceed `(item.quantity - item.returned_quantity)`.
   - Atomically decrements warehouse stock, logs compensatory `stock_movements` with `movement_type = 'PURCHASE_RETURN'`, increments `returned_quantity` on the item, and credits the supplier's account balance (`supplier.balance_paise -= return_total`).
5. **Payment Allocation & Ledger Balance Invariants:**
   - Supplier payouts prevent over-allocation: payment amount cannot exceed the bill's current `balance_amount_paise`.
   - Customer payment receipts prevent over-allocation against designated sales invoices and correctly decrement the customer's `balance_paise`.
   - Full audit trail: posted payments are immutable and recorded in a unified register (`payments` table with `payment_type` discriminator: `SALE_INVOICE`, `CUSTOMER_PAYMENT`, `SUPPLIER_PAYOUT`).
   - Chronological running balances in customer Khata and supplier statements guarantee `Debits - Credits = Current Balance`.


### 4.3 Returns, Costing, Operating Expenses & Business Controls (Milestone 6)
1. **Sales Returns & Stock Restitution Engine:**
   - Full and partial returns are supported against any completed sales invoice (`sales_returns` and `sales_return_items`).
   - Line-item proportional valuation: `propTotal = Math.round((invItem.total_amount_paise * qty) / invItem.quantity)`.
   - Restock decision per line item: Stock is restored to variant and parent product if and only if `restock: true` is indicated. When physically restocked, an immutable ledger entry is written with `movement_type = 'SALE_RETURN'`. Damaged/defective goods physically written off do not artificially inflate inventory.
   - Refund treatments: Supports `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`, and `STORE_CREDIT`.
   - Customer Khata reconciliation: Credit sales automatically reduce the customer's outstanding balance (`customers.balance_paise`), preventing phantom receivables.
   - Invoice status progression: When cumulative returned quantities equal original invoiced quantities, the sales invoice is transitioned to `RETURNED`.
2. **Operating Expense Management:**
   - Sequential identifier generation (`EXP-YYYYMM-XXXX`) for distinct auditability.
   - Standard retail categories: Rent, Salaries, Utilities, Logistics, Maintenance, Marketing, and Miscellaneous.
   - Distinct classification of operating cash outflows, preventing double counting against inventory purchase payouts or refund transactions.
   - Status tracking (`PAID`, `PENDING`, `DRAFT`) with payment mode attribution.
3. **Financial Costing & Reporting Architecture:**
   - **Cost of Goods Sold (COGS):** Calculated via `WEIGHTED_LANDED_COST` utilizing historical purchase inward rates.
   - **Gross Margin vs Net Operating Profit:** Clean separation in all calculations:
     - Gross Profit = Net Revenue - COGS
     - Gross Margin % = (Gross Profit / Net Revenue) * 100
     - Net Operating Profit = Gross Profit - Operating Expenses
     - Net Margin % = (Net Operating Profit / Net Revenue) * 100
   - **GST & HSN Tax Accounting:** Reconciles outward liability (GSTR-1 output tax on sales minus returns) against inward Input Tax Credit (ITC on purchases minus purchase returns) across CGST, SGST, and IGST components without unsupported tax assumptions.
   - **Live Stock Valuation:** Dynamically rolls up quantities multiplied by purchase landed cost across all variants and standalone catalog items.
   - **Cash Flow Register:** Real-time inflow (cash sales, customer debt payments) vs outflow (vendor payments, operating expenses, cash refunds) reconciliation.
4. **Business Controls, Safe Backups & Audit Trail:**
   - **Role-Based Access Control (RBAC):** Configured permission matrix across `ADMIN`, `CASHIER`, and `STAFF` roles covering POS sales, returns, purchases, expenses, reports, backups, settings, and product editing.
   - **Audit Trail:** Tamper-evident `audit_logs` record `user_id`, `action`, `entity_name`, `entity_id`, and snapshot `details_json` for critical operations (returns, expenses, adjustments, cancellations, settings changes, backups, data imports).
   - **Safe Database Backup & Restore (`BackupService`):**
     - Live online snapshot via SQLite `VACUUM INTO` ensuring zero lockup during store operations.
     - Unique, collision-free filename generation with millisecond timestamps and entropy tags.
     - SHA-256 hash generation and verification.
     - Pre-restore verification: SQLite magic header inspection (`SQLite format 3`) and `PRAGMA integrity_check`.
     - Automatic pre-restore snapshot (`PRE_RESTORE_`) created before replacing live database, preventing destructive overwrites.
   - **Safe Data Sync (`ExportImportService`):**
     - CSV export for Products, Customers, and Sales History with quoted RFC 4180 format.
     - Bulk Product Import with validation, automatic SKU/barcode synthesis for missing identifiers, and integer paise conversion.

---

## 5. Directory Structure

```
cricket360/
├── docs/                   # Architectural, database, and process documentation
├── src/
│   ├── main/               # Electron Main process code
│   │   ├── db/             # SQLite connection, migrations runner, repositories
│   │   ├── services/       # Billing, inventory, tax, and backup business services
│   │   ├── ipc/            # Typed IPC handlers registration
│   │   └── index.ts        # App lifecycle & window manager
│   ├── preload/            # Secure IPC exposure bridge
│   │   └── index.ts
│   ├── renderer/           # React frontend application
│   │   ├── src/
│   │   │   ├── components/ # Reusable UI components (Buttons, Cards, Modals, Tables)
│   │   │   ├── layouts/    # App layout with Sidebar and Top Navigation
│   │   │   ├── pages/      # Route pages (Dashboard, Billing, Products, Inventory, etc.)
│   │   │   ├── services/   # Frontend API client calling window.api
│   │   │   ├── styles/     # Tailwind and typography styles
│   │   │   ├── utils/      # Formatting (currency, date, barcode)
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── index.html
│   └── shared/             # Shared types, Zod schemas, constants
│       ├── types/
│       └── constants/
├── tests/                  # Unit and integration test suites
├── electron-builder.yml    # Windows NSIS packaging configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```
