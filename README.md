# Cricket360 - Sports Shop Inventory, GST Billing & Management Software

[![Desktop App](https://img.shields.io/badge/Platform-Windows%2010%2F11%20x64-167A53.svg)](https://github.com/VEDANTDESAI2409/CRICKET360)
[![Tech Stack](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20TypeScript%20%7C%20SQLite-124B36.svg)](https://github.com/VEDANTDESAI2409/CRICKET360)
[![License](https://img.shields.io/badge/License-Proprietary-7A8580.svg)](https://github.com/VEDANTDESAI2409/CRICKET360)

**Cricket360** is a professional, offline-capable desktop management system tailored for sports and cricket retail businesses in India. It handles product cataloging with variants (sizes, colors, bat weights), high-speed POS billing, intra-state and inter-state GST compliance, supplier purchases, customer credit ledgers (Khata), inventory movements with strict audit trails, expense tracking, and offline SQLite data storage with reliable automated backups.

---

## Key Features

- **Point of Sale (POS) Billing:** High-speed barcode scanning, keyboard navigation, multi-tender split payments (Cash, UPI, Card, Khata/Credit), item-level and bill-level discounts, and instant thermal receipt (80mm/58mm) or standard A4 GST invoice printing.
- **Complete GST & HSN Engine:** Automatic CGST/SGST (intra-state) vs IGST (inter-state) calculation based on customer state code, discount-adjusted taxable values, precision-safe integer math (paise-based arithmetic), and GSTR-1/3B summary reports.
- **Product & Variant Catalog:** Multi-variant support for sports goods (e.g. Cricket bats in Short Handle, Long Handle, Harrow; Shoes in UK sizes 6-11; Apparel in S-XXL; Balls, pads, gloves), unique SKUs, barcodes, and HSN associations.
- **Auditable Inventory & Stock Movements:** Every stock change (sale, purchase, return, damage write-off, physical adjustment) is recorded in an immutable audit ledger with user attribution. Hard prevention of negative stock by default.
- **Supplier & Purchase Management (Combined Milestone 5):** Inward purchase bills, duplicate supplier invoice prevention, supplier directory, vendor Khata statement with running balances, purchase returns with quantity limits, and supplier payouts.
- **Customer Credit & Ledger (Khata) (Combined Milestone 5):** Walk-in billing without registration, named customer accounts with credit limits, customer payment receipts with invoice allocation, and customer account statements.
- **Unified Financial Register (Combined Milestone 5):** Inflow vs outflow ledger tracking POS sales, customer receipts, and supplier payouts.
- **Operating Expenses:** Petty cash, shop rent, electricity, maintenance, and staff expense recording.
- **Analytics & Reports:** Sales by date/category/brand, fast/slow moving items, stock valuation, gross margin estimation, and daily cash drawer reconciliation.
- **Offline Data Sovereignty:** 100% offline functionality using local SQLite (`better-sqlite3`) in WAL mode. No cloud dependency, mandatory internet connection, or external subscription.

---

## Milestone Progress

- [x] **Milestone 0:** Repository & Requirements Audit
- [x] **Milestone 1:** Desktop Foundation & Architecture Setup
- [x] **Milestone 2:** Main Interface, Dashboard & Retail Design System
- [x] **Milestone 3:** Product Catalog & Inventory Management
- [x] **Milestone 4:** Point of Sale (POS) & GST Billing
- [x] **Combined Milestone 5:** Procurement, Supplier Management & Customer Accounts
- [ ] **Milestone 6 (Future):** Business Reports & GSTR Compliance
- [ ] **Milestone 7 (Future):** System Settings, Security & Backup Operations

---

## Technology Stack

- **Desktop Framework:** Electron
- **Frontend UI:** React 19 / 18 + TypeScript + Vite
- **Styling & Design System:** Tailwind CSS v3 with custom sports retail design system tokens (`#124B36` Dark Green, `#167A53` Primary Green, `#EAF5EF` Surface Green, `#F3F5F4` Background)
- **Database:** Local SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL`) and enforced foreign keys
- **Migrations:** Versioned SQL migrations runner
- **Validation:** Zod + React Hook Form
- **Testing:** Vitest + React Testing Library
- **Packaging:** Electron Builder targeting Windows NSIS (`x64`)

---

## Documentation Links

Comprehensive engineering and operational documentation is maintained inside the `docs/` directory:

- [Project Requirements & Traceability](file:///e:/cricket360%20daashboard/docs/PROJECT_REQUIREMENTS.md)
- [System Architecture Specification](file:///e:/cricket360%20daashboard/docs/ARCHITECTURE.md)
- [Database Schema & Data Integrity](file:///e:/cricket360%20daashboard/docs/DATABASE.md)
- [Testing & Quality Assurance Plan](file:///e:/cricket360%20daashboard/docs/TESTING.md)
- [Windows Installation & Release Guide](file:///e:/cricket360%20daashboard/docs/INSTALLATION_AND_RELEASE.md)
- [User Operating Guide](file:///e:/cricket360%20daashboard/docs/USER_GUIDE.md)
- [Project Changelog](file:///e:/cricket360%20daashboard/docs/CHANGELOG.md)
- [Development Work Log](file:///e:/cricket360%20daashboard/docs/DEVELOPMENT_LOG.md)

---

## Getting Started (Development)

### Prerequisites
- Node.js v20+ or v24+
- npm v10+
- Git for Windows
- Windows 10/11 64-bit

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (hot-reload for renderer & main)
npm run dev

# 3. Run automated tests
npm test

# 4. Build Windows installer package
npm run package:win
```

---

## Data & Backup Location

User database and backup files are safely persisted in the user profile directory:
- Database: `%APPDATA%\Cricket360\database\cricket360.sqlite`
- Backups: `%APPDATA%\Cricket360\backups\`
- Logs: `%APPDATA%\Cricket360\logs\`
