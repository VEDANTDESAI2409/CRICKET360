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
- **Products & Catalog:** Master inventory list, product variants (size/color), MRP, selling prices, HSN codes, and barcode generation (Active - Milestone 3).
- **Inventory & Stock:** Real-time stock audit, physical count reconciliation, and immutable movement ledger (Active - Milestone 3).
- **POS Billing:** High-speed counter sales register with barcode scanning, instant discounts, multi-tender payments, and thermal/A4 printing (Planned Milestone 6).
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

### 4.2 Counter Sales & Billing
1. Navigate to **POS Billing** (shortcut `F2`).
2. Scan product barcode using your USB scanner or type product/variant name in the search box.
3. Adjust quantities or apply line-item discounts if authorized.
4. Select payment method (Cash, UPI QR, Card, Customer Credit, or Split Payment).
5. Press **Complete & Print** (shortcut `F10`) to generate the invoice and trigger thermal or A4 printing.

### 4.3 Receiving Inventory
1. When a shipment arrives, go to **Purchases > New Purchase**.
2. Select or add the supplier and enter the supplier's invoice number and date.
3. Add received items, verifying cost price and GST rates.
4. Save the purchase to immediately increment warehouse and shop stock.

### 4.4 Evening Day Closing & Backup
1. Go to **Reports > Daily Closing Register** to verify cash in drawer against the recorded POS total.
2. Go to **Settings > Database Backup** and click **Create Backup Now**.
3. Save the backup file to a secondary external USB drive for safety.

---

## 5. Product Catalog Operations

### 5.1 Adding a New Product
1. Click **Products & Catalog** in the sidebar.
2. Click the **+ Add Product** button.
3. Enter the product title (e.g. *SS Ton Master English Willow Bat*).
4. Click **Auto-Generate** next to SKU to create a standardized code (e.g. `BAT-SS-004`).
5. (Optional) Click **Generate EAN Barcode** or scan the manufacturer barcode.
6. Select Category, Brand, Unit (Pcs, Pairs, Sets), and HSN code (`9506` for sports gear).
7. Enter **Purchase Cost (₹)**, **Selling Price (₹)**, and **MRP (₹)**. Margin percentage will update automatically.
8. Enter Reorder Level and Initial Opening Stock.
9. Click **Create Product**.

### 5.2 Managing Cricket Equipment Variants
1. Check **This product has multiple size / color variants** in the product form.
2. Click **+ Add Bat Sizes Preset (SH, LH, Harrow, 6)** to auto-populate standard cricket bat profiles.
3. Customize SKU, barcode, purchase price, selling price, and opening stock for each variant.
4. Total cumulative stock is automatically rolled up to the parent product.

### 5.3 Editing, Deactivating & Safe Deletion
- **Edit:** Click the pencil icon on any row to update prices, tax rates, or thresholds.
- **Deactivate:** In the edit modal, set Status to Inactive. Deactivated products are hidden from POS searches but retain historical data.
- **Delete:** Click the trash icon. Products with existing sales or purchases are permanently protected against accidental deletion.

---

## 6. Inventory Audits & Stock Reconciliation

### 6.1 Performing a Physical Stock Adjustment
1. Navigate to **Inventory & Stock** in the sidebar.
2. Locate the product and click **Adjust Stock**.
3. Enter the **New Verified Physical Count**. The variance (+/-) is calculated in real time.
4. Select a mandatory reason:
   - *Physical Stock Audit Mismatch*
   - *Damaged / Broken in Showroom*
   - *Defective / Manufacturer Return*
   - *Store Demo / Display Sample*
   - *Unaccounted Shrinkage / Loss*
   - *Found Surplus / Previous Count Error*
   - *Other Operational Adjustment*
5. Add optional audit notes and click **Apply Stock Adjustment**.

### 6.2 Viewing the Immutable Movement Ledger
1. Click the **Immutable Movement Ledger** tab in Inventory Management.
2. View every stock change with timestamp, movement type (`OPENING_STOCK`, `PHYSICAL_ADJUSTMENT`, etc.), change quantity, and resulting balance.

