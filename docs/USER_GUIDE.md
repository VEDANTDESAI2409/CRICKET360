# Cricket360: User Guide & Operating Manual

## 1. Introduction

Cricket360 is a dedicated desktop management system designed specifically for cricket and sports retail stores. It integrates point-of-sale (POS) billing, product variant inventory, supplier purchases, customer credit ledgers, GST tax calculations, and business performance analytics into a single, offline application.

---

## 2. Navigating the Interface

Cricket360 uses a persistent left sidebar organized into functional modules:
- **Dashboard:** At-a-glance shop performance, daily sales, active stock value, and low-stock alerts.
- **POS Billing:** High-speed counter sales register with barcode scanning, instant discounts, multi-tender payments, and thermal/A4 printing.
- **Products & Catalog:** Master inventory list, product variants (size/color), MRP, selling prices, and HSN codes.
- **Inventory & Stock:** Stock movements audit log, physical stock adjustment, and reorder alerts.
- **Purchases:** Inward purchase bills from manufacturers/wholesalers, purchase tax tracking, and supplier returns.
- **Customers (Khata):** Customer contact details, credit limits, outstanding balances, and payment receipts.
- **Suppliers:** Supplier directory, purchase history, and payable balances.
- **Reports & GST:** Daily sales registers, GSTR-1 summaries, category performance, and profit estimation.
- **Expenses:** Petty cash and operating expense recording (shop rent, electricity, maintenance).
- **Settings:** Business profile, GSTIN, invoice numbering prefixes, thermal printer configuration, and database backups.

---

## 3. Daily Workflow

### 3.1 Morning Opening
1. Launch Cricket360 from the Windows desktop shortcut.
2. Check the **Dashboard** for low-stock alerts and items requiring reorders from manufacturers.
3. Verify printer connection under **Settings > Printers**.

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
