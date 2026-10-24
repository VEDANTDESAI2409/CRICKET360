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
- `db:billing:*` - POS invoice creation, payment recording, cancellation (Milestone 6).
- `db:purchases:*` - Purchase bill entry, supplier returns (Milestone 5).
- `db:parties:*` - Customers, suppliers, ledgers, credit balances (Milestone 5 / 7).
- `db:reports:*` - GST summaries, sales reports, inventory valuations (Milestone 8).
- `system:print:*` - Silent printing to thermal or default printer, A4 print preview (Milestone 6).
- `system:backup:*` - Manual backup generation, database restore, integrity checks (Milestone 9).

### 4.1 Transactional Guarantees for Catalog & Stock Operations
All stock mutations and variant matrix insertions execute within synchronous `db.transaction()` boundaries:
1. **Opening Stock Ledger Sync:** When creating a product or variant with an opening stock quantity > 0, an immutable `stock_movements` record (`movement_type = 'OPENING_STOCK'`) is inserted in the exact same transaction.
2. **Variant Stock Rollup:** Updating stock for any product variant immediately recalculates and updates the parent product's cumulative `stock_quantity`.
3. **Safe Product Deletion Guard:** Products associated with historical `SALE_INVOICE` or `PURCHASE_RECEIPT` movements cannot be permanently deleted; the repository raises an explicit error advising deactivation instead.
4. **Reason-Enforced Adjustments:** Adjustments mandate a valid reason code (`PHYSICAL_AUDIT_MISMATCH`, `DAMAGED_IN_STORE`, `EXPIRED_DEFECTIVE`, `SAMPLE_DEMO`, `THEFT_OR_LOSS`, `FOUND_SURPLUS`, `OTHER`) recorded both in `stock_adjustments` and `stock_movements`.


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
