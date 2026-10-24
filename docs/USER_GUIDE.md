# Cricket360: User Guide & Operating Manual

## 1. Introduction

Cricket360 is a dedicated desktop management system designed specifically for cricket and sports retail stores. It integrates point-of-sale (POS) billing, product variant inventory, supplier purchases, customer credit ledgers, GST tax calculations, and business performance analytics into a single, offline application.

---

## 2. Navigating the Interface & Keyboard Shortcuts

Cricket360 uses a persistent left sidebar and top header with rapid keyboard shortcuts:
- **`F1`:** Switch to Store Dashboard.
- **`F2`:** Launch Point of Sale (POS) Billing counter.
- **`F4`:** Focus Global Product & Barcode search bar.
- Note: Keyboard shortcuts are safely ignored while typing inside form fields and text areas.

The sidebar is organized into functional sections:
- **Dashboard:** At-a-glance shop performance, daily sales, active stock value, and low-stock alerts.
- **POS Billing:** High-speed counter sales register with barcode scanning, instant discounts, multi-tender payments, and thermal/A4 printing (Planned Milestone 6).
- **Products & Catalog:** Master inventory list, product variants (size/color), MRP, selling prices, and HSN codes (Planned Milestone 3).
- **Inventory & Stock:** Stock movements audit log, physical stock adjustment, and reorder alerts (Planned Milestone 3 / 4).
- **Purchases:** Inward purchase bills from manufacturers/wholesalers, purchase tax tracking, and supplier returns (Planned Milestone 5).
- **Customers (Khata):** Customer contact details, credit limits, outstanding balances, and payment receipts (Planned Milestone 7).
- **Suppliers:** Supplier directory, purchase history, and payable balances (Planned Milestone 5).
- **Reports & GST:** Daily sales registers, GSTR-1 summaries, category performance, and profit estimation (Planned Milestone 8).
- **Expenses:** Petty cash and operating expense recording (shop rent, electricity, maintenance) (Planned Milestone 8).
- **Settings:** Business profile, GSTIN, invoice numbering prefixes, thermal printer configuration, and database backups.

---

## 3. Store Dashboard Operations

The dashboard provides real-time visibility into inventory levels, sales revenue, and stock health:

### 3.1 Hero KPI Metric Cards
- **Total Products:** Active products currently maintained in the shop catalog.
- **Categories & Brands:** Distinct merchandise categories (bats, balls, protection, footwear) and registered sports brands (SS, SG, Kookaburra, etc.).
- **Total Stock Quantity:** Total physical units available across the showroom and warehouse, accompanied by total stock valuation computed from purchase landed cost.
- **Low-Stock Alerts:** Total products currently at or below their designated reorder thresholds. Clicking this card smooth-scrolls directly to the alerts table.

### 3.2 Real-Time Revenue & Cost Strip
- **Today's Sales Revenue:** Real-time revenue sum of all completed invoices generated today. Cancelled or returned bills are automatically excluded.
- **Today's Purchases:** Inward inventory additions recorded today.
- **Stock Valuation:** Landed inventory cost calculated as `stock_quantity * purchase_cost_paise`.

### 3.3 Visual Analytics & Shift Status
- **Weekly Sales Activity (`BarChart`):** Proportional vertical pill bars depicting sales revenue across the rolling 7-day period. Hovering reveals specific date, revenue in rupees, and invoice counts.
- **Stock Health Meter (`ProgressDonut`):** Semicircular progress arc showing the percentage distribution of in-stock, low-stock, and out-of-stock items.
- **POS Terminal Shift Card:** Displays the current counter status (Counter 01 Open) with one-click POS billing launch.

### 3.4 Low-Stock Inventory Alerts Table
- Displays equipment requiring purchase reorders with SKU, category, brand, current quantity, and status badge (`LOW STOCK` or `OUT OF STOCK`).
- **Interactive Search:** Filter items instantly using the inline search box.
- **Column Sorting:** Click column headings (Product Name, Stock Level, Reorder Level) to toggle ascending/descending order.
- **Reorder Action:** Click "Reorder Stock" on any item to initiate inward supplier procurement.

---

## 4. Daily Workflow

### 4.1 Morning Opening
1. Launch Cricket360 from the Windows desktop shortcut.
2. Check the **Dashboard** for low-stock alerts and items requiring reorders from manufacturers.
3. Review the **Stock Health Meter** to ensure key items (balls, bats, pads) are adequately stocked.

### 3.2 Counter Sales & Billing
1. Navigate to **POS Billing** (shortcut `F2`).
2. Scan product barcode using your USB scanner or type product/variant name in the search box.
3. Adjust quantities or apply line-item discounts if authorized.
4. Select payment method (Cash, UPI QR, Card, Customer Credit, or Split Payment).
5. Press **Complete & Print** (shortcut `F10`) to generate the invoice and trigger thermal or A4 printing.

### 3.3 Receiving Inventory
1. When a shipment arrives, go to **Purchases > New Purchase**.
2. Select or add the supplier and enter the supplier's invoice number and date.
3. Add received items, verifying cost price and GST rates.
4. Save the purchase to immediately increment warehouse and shop stock.

### 3.4 Evening Day Closing & Backup
1. Go to **Reports > Daily Closing Register** to verify cash in drawer against the recorded POS total.
2. Go to **Settings > Database Backup** and click **Create Backup Now**.
3. Save the backup file to a secondary external USB drive for safety.
