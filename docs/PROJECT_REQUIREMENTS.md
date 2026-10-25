# Cricket360: Requirements Traceability & Implementation Matrix

## 1. Project Overview & Scope
**Cricket360** is a complete, offline-first Windows desktop sports shop inventory, GST billing, and business management application built with Electron, React, TypeScript, and SQLite (`better-sqlite3`).

The system is tailored specifically for sports retail and wholesale businesses handling complex product lines (equipment, apparel, protective gear, footwear, accessories) with size/color variants, batch/barcode scanning, intra/inter-state GST (CGST, SGST, IGST) compliance, supplier purchases, customer credit ledgers, multi-tender payments (Cash, UPI, Card, Split), thermal receipt and A4 invoice printing, financial and inventory reporting, and automated local SQLite backups.

---

## 2. Requirements Traceability Checklist

### Status Summary:
- **Implemented & Verified:** 37 (REQ-R01 Offline SQLite Storage, REQ-A01 Dashboard KPI Metrics, REQ-A02 Dashboard Recent Activity, REQ-A03 Dashboard Quick Actions, REQ-B01 Product Catalog Core, REQ-B02 Product Pricing Structure, REQ-B03 Product Variants, REQ-B04 Product Lifecycle, REQ-C01 Smart Search & Barcode Lookup, REQ-D01 Inventory Tracking & Audit, REQ-D02 Stock Adjustments & Reconciliation, REQ-D03 Low Stock & Out of Stock Alerts, REQ-D04 Stock Valuation, REQ-D05 Negative Stock Prevention, REQ-E01 POS Billing Register, REQ-E02 Discounts & Adjustments, REQ-E03 Multi-tender & Split Payments, REQ-E04 Invoice Numbering & Immutability, REQ-E05 Daily Sales Register & History, REQ-F01 GST & HSN Architecture, REQ-F02 Tax Rounding & Snapshots, REQ-F03 GSTR Compliant Reporting, REQ-G01 Supplier Management, REQ-G02 Purchase Inward Bills, REQ-G03 Purchase Returns, REQ-H01 Customer Accounts & Khata Ledger, REQ-H02 Outstanding Payment Collection, REQ-I01 Sales Returns & Refunds, REQ-J01 Business Reports, REQ-J02 Expense Tracking, REQ-J03 Profit & Loss Estimation, REQ-K01 Data Import / Export, REQ-L01 Database Backup & Restoration, REQ-M01 Role-Based Access Controls, REQ-M02 Audit Trail Log, REQ-N01 Invoice Printing Engine, REQ-O01 Shop Profile & Settings, REQ-S01 Windows Production Packaging & Installer, REQ-S02 Safe Application Lifecycle & Error Cleanup)
- **Partially Implemented:** 0
- **Missing / Future Enhancements:** 2 (REQ-P01 Barcode Label Generation, REQ-Q01 Bulk Pricing & Margin Tools)
- **Blocked / Deferred:** 4 (Multi-Store Cloud Sync, Mobile Companion App, Direct NIC e-Invoice API, Automated WhatsApp Gateway)

| Req ID | Module / Feature | Specification Details | Status | Planned Milestone | Database Tables / Entities | Target Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-A01** | Dashboard KPI Metrics | Total products, stock count, today's sales, purchases, low-stock count, gross estimates. Derived directly from DB. | Implemented | Milestone 2 | `sales_invoices`, `purchases`, `products`, `product_variants`, `stock_movements` | Automated query tests & component rendering |
| **REQ-A02** | Dashboard Recent Activity | Recent sales list, recent purchases, stock alerts feed. | Implemented | Milestone 2 | `sales_invoices`, `purchases`, `products` | Component integration tests |
| **REQ-A03** | Dashboard Quick Actions | Shortcuts to New Bill (POS), Add Product, Add Purchase, Run Daily Report. | Implemented | Milestone 2 | N/A (UI Routing) | Route transition & shortcut tests |
| **REQ-B01** | Product Catalog Core | Product Name, SKU, Barcode, Brand, Sport, Category, Subcategory, Unit, HSN, Tax rate. | Implemented | Milestone 3 | `products`, `brands`, `categories`, `sports`, `units`, `hsn_codes` | Schema constraints & CRUD unit tests |
| **REQ-B02** | Product Pricing Structure | Purchase cost, Cost Price, Selling Price, MRP, product-level discount, min-price warning. Stored in integer paise. | Implemented | Milestone 3 | `products`, `product_variants` | Precision calculation tests |
| **REQ-B03** | Product Variants | Size (e.g. Harrow, Full Size, SH, LH, 6, 7, 8, 9, 10, 11), Color, Specification, variant SKU/barcode, variant stock. | Implemented | Milestone 3 | `product_variants` | Variant creation & stock isolation tests |
| **REQ-B04** | Product Lifecycle | Activation, deactivation, safe deletion (prevented if historical invoices or stock records exist). | Implemented | Milestone 3 | `products` (`is_active` flag, foreign key checks) | Safe deletion integrity tests |
| **REQ-C01** | Smart Search & Barcode Lookup | Instant search by Name, SKU, Barcode, Brand, Sport, Size, Color. Keyboard-driven barcode scanning. | Implemented | Milestone 3 / 4 | `products`, `product_variants` (indexed) | Search filter & barcode scanner event tests |
| **REQ-D01** | Inventory Tracking & Audit | Real-time stock counts computed and verified via auditable stock movements. | Implemented | Milestone 3 / 4 | `stock_movements` | Transactional balance verification tests |
| **REQ-D02** | Stock Adjustments & Reconciliation | Physical audit adjustments with mandatory reason codes, notes, user ID, and timestamps. | Implemented | Milestone 3 | `stock_adjustments`, `stock_movements` | Stock adjustment workflow tests |
| **REQ-D03** | Low Stock & Out of Stock Alerts | Threshold alerts based on product/variant `min_stock_level` and `reorder_level`. | Implemented | Milestone 2 / 3 | `products`, `product_variants` | Query & UI alert tests |
| **REQ-D04** | Stock Valuation | Real-time stock valuation using weighted average landed cost and retail pricing. | Implemented | Milestone 3 / 6 | `products`, `product_variants`, `stock_movements` | Valuation calculation tests |
| **REQ-D05** | Negative Stock Prevention | Hard lock against negative stock during billing by default with transactional quantity verification. | Implemented | Milestone 4 | `products`, `product_variants`, `sales_invoices` | Concurrency & stock validation tests |
| **REQ-E01** | POS Billing Register | High-speed keyboard-friendly billing interface, item addition by scan/search, quantity increments, variant modal. | Implemented | Milestone 4 | `sales_invoices`, `sales_invoice_items` | UI POS workflow simulation & component tests |
| **REQ-E02** | Discounts & Adjustments | Line-item discount (percentage/fixed) and invoice-level discount with taxable value adjustments and integer-paise distribution. | Implemented | Milestone 4 | `sales_invoice_items`, `sales_invoices` | Taxable discount math tests |
| **REQ-E03** | Multi-tender & Split Payments | Cash, UPI (GPay/PhonePe/Paytm QR), Card, Bank Transfer, Customer Credit (Khata), Split tenders with sum validation. | Implemented | Milestone 4 | `payments` | Split payment sum validation & repo tests |
| **REQ-E04** | Invoice Numbering & Immutability | Configurable fiscal year invoice prefix/sequence (e.g., `CR360-1001`). Immutable line snapshots. | Implemented | Milestone 4 | `sales_invoices`, `sales_invoice_items` | Immutability & sequential check tests |
| **REQ-E05** | Daily Sales Register & History | Sales invoice history with date, customer, payment filter, and status tracking. Aggregated reports in M6. | Implemented | Milestone 4 / 6 | `sales_invoices`, `payments` | Sales query & filter tests |
| **REQ-F01** | GST & HSN Architecture | HSN code management, intra-state (CGST + SGST) vs inter-state (IGST) automatic selection based on customer State. | Implemented | Milestone 4 | `hsn_codes`, `sales_invoices`, `sales_invoice_items` | GST calculation rule tests |
| **REQ-F02** | Tax Rounding & Snapshots | Half-up rounding, invoice tax summaries preserved historically regardless of subsequent tax rule edits, round-off paise. | Implemented | Milestone 4 | `sales_invoices`, `sales_invoice_items` | Decimal precision & rounding tests |
| **REQ-F03** | GSTR Compliant Reporting | GSTR-1 (B2B, B2CL, B2CS, HSN Summary) and tax summary generation with CSV export. | Implemented | Milestone 6 | `sales_invoices`, `sales_invoice_items`, `hsn_codes` | Report structure & export tests |
| **REQ-G01** | Supplier Management | Supplier directory, GSTIN, contact details, opening balance, credit period, bank details. | Implemented | Combined Milestone 5 | `suppliers` | Supplier CRUD & ledger tests |
| **REQ-G02** | Purchase Inward Bills | Purchase entry with supplier invoice number, dates, HSN, purchase tax, stock increment in one transaction. | Implemented | Combined Milestone 5 | `purchases`, `purchase_items`, `stock_movements` | Transactional purchase stock tests |
| **REQ-G03** | Purchase Returns | Return items to supplier with reason, invoice reference, and debit balance adjustment. | Implemented | Combined Milestone 5 | `purchase_returns`, `purchase_return_items` | Purchase return stock deduction tests |
| **REQ-H01** | Customer Accounts & Khata Ledger | Customer directory, mobile number, GSTIN, credit limit, balance ledger, walk-in customer support. | Implemented | Combined Milestone 5 | `customers`, `sales_invoices`, `payments` | Ledger balance calculation tests |
| **REQ-H02** | Outstanding Payment Collection | Record receipt against customer account, allocate across outstanding invoices. | Implemented | Combined Milestone 5 | `payments`, `sales_invoices`, `purchases` | Payment allocation tests |
| **REQ-I01** | Sales Returns & Refunds | Full and partial sales returns against completed invoices, conditional restocking, credit note or refund, auditable stock movements. | Implemented | Milestone 6 | `sales_returns`, `sales_return_items`, `stock_movements`, `payments` | Return validation & stock restitution tests |
| **REQ-J01** | Business Reports | Date-filtered sales summary, purchases summary, stock valuation, cash flow register, and CSV exports. | Implemented | Milestone 6 | Analytical SQL aggregation layer | Analytics query accuracy tests |
| **REQ-J02** | Expense Tracking | Shop operating expenses (rent, utilities, salaries, logistics, maintenance, misc) categorized and tracked. | Implemented | Milestone 6 | `expenses`, `expense_categories` | Expense summation & P&L tests |
| **REQ-J03** | Profit & Loss Estimation | Gross profit (Net Revenue - Landed Cost COGS), operating expenses, Net Operating Profit, and margins. | Implemented | Milestone 6 | Analytical calculation layer | P&L formula integrity tests |
| **REQ-K01** | Data Import / Export | CSV data export (Products, Customers, Sales) and bulk products CSV import with validation. | Implemented | Milestone 6 | ExportImportService | Parsing, validation, & duplicate handling tests |
| **REQ-L01** | Database Backup & Restoration | Safe SQLite WAL checkpointing, VACUUM INTO snapshots, SHA-256 verification, PRAGMA integrity_check, automatic pre-restore backup. | Implemented | Milestone 6 | `backup_metadata`, `audit_logs` | Backup creation & restore verification tests |
| **REQ-M01** | User Authentication & RBAC | Role permissions matrix (Admin, Cashier, Staff) distinguishing counter sales from managerial tasks. | Implemented | Milestone 6 | UI permission matrix, audit logs | Role permission configuration |
| **REQ-M02** | Audit Trail Log | Immutable audit log of sensitive actions (returns, voids, expense deletion, backups, settings changes). | Implemented | Milestone 6 | `audit_logs` | Audit log generation tests |
| **REQ-N01** | Invoice Printing Engine | Dual layout engine: A4 (GST Tax Invoice) and Thermal 80mm/58mm slip with custom header, logo, QR, and footer terms. | Implemented | Milestone 4 | Print window template renderer & print trigger | Print styling & IPC print trigger tests |
| **REQ-O01** | Shop Profile & Settings | Shop name, address, phone, GSTIN, State code, logo, thermal printer name, invoice notes, terms. | Implemented | Milestone 1 / Milestone 6 | `shop_settings`, `app_settings` | Settings persistence & invoice integration tests |
| **REQ-P01** | Barcode Label Generation | Print barcode labels with shop name, product name, size, MRP, sale price, barcode. | Missing | Future | SVG/Canvas barcode renderer | Barcode generation tests |
| **REQ-Q01** | Bulk Pricing & Margin Tools | Bulk price updater by percentage/brand, minimum price floor check to prevent loss. | Missing | Future | Bulk update transaction | Pricing policy guard tests |
| **REQ-R01** | Offline Operation & Local Storage | 100% offline capability with persistent SQLite stored in OS user data directory. | Implemented | Milestone 1 | SQLite engine | Network disconnection test |
| **REQ-S01** | Windows Production Packaging & Installer | Distributable NSIS installer and standalone executable with persistent AppData path and upgrade safety. | Implemented | Milestone 7 | Electron Builder, NSIS | Automated installer verification & launch tests |
| **REQ-S02** | Safe Application Lifecycle & Error Cleanup | Graceful database connection closing on app exit (`before-quit`) and global uncaught exception trapping. | Implemented | Milestone 7 | `connection.ts`, `main/index.ts` | Process lifecycle & signal termination tests |

---

## 3. Explicitly Deferred Features (Non-Core / Post-V1 Extensions)
Per Section 8.R of the Project Specification, the following items are architecturally supported for future versions but deferred until the standalone Windows application is fully verified and stable:
1. **Multi-Store Cloud Synchronization & Branch Transfer:** V1 is strictly standalone local offline desktop for Windows.
2. **E-Commerce Webhook & Mobile Companion App:** Deferred to post-V1.
3. **Automated WhatsApp / Email Gateway:** Deferred to avoid mandatory cloud API tokens or external subscription costs; invoices can be saved as PDF and shared manually in V1.
4. **Automated Direct GST Portal e-Invoice API:** Reports are GSTR-1/3B compliant exports; direct automated API upload requires paid NIC GSP credentials and is deferred.
