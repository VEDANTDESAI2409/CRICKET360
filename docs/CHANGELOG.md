# Cricket360: Project Changelog

All notable changes to the Cricket360 project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
