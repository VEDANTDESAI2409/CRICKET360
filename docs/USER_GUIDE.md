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
- **POS Billing:** High-speed counter sales register with barcode scanning, instant discounts, multi-tender payments, and thermal/A4 printing (Active - Milestone 4).
- **Purchases:** Inward purchase bills from manufacturers/wholesalers, variant item builder, real-time GST, duplicate invoice validation, and purchase returns (Active - Combined Milestone 5).
- **Customers (Khata):** Customer directory, credit limits, outstanding receivables, Khata statement, and payment collection (Active - Combined Milestone 5).
- **Suppliers:** Supplier directory, contact information, GSTIN, payment terms, and vendor running ledger (Active - Combined Milestone 5).
- **Payments:** Unified financial register for tracking inflows (sales, receipts) and outflows (vendor payouts) (Active - Combined Milestone 5).
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

---

## 7. Point-of-Sale (POS) Billing & GST Invoicing

### 7.1 Fast Checkout Workflow
1. Navigate to **POS Billing** using the left sidebar or the `F2` shortcut key.
2. Focus the product search box using `F4` or click inside it.
3. **Scan Barcode or Search:** Connect your USB barcode scanner and scan product barcodes, or type part of the product name, brand, or SKU.
4. **Variant Selection:** If an item has multiple sizes/colors (e.g. cricket bat sizes SH, LH, Harrow), an interactive variant picker will automatically open allowing you to select the exact variant.
5. **Managing Cart Items:**
   - Adjust quantities using the `+` or `-` buttons or by typing a number directly into the quantity input.
   - The register enforces stock validation: attempting to add more units than currently available in stock is automatically blocked.
   - Remove an item from the cart by clicking the trash icon.

### 7.2 Customer Selection & Inter-State GST
1. By default, the register selects **Walk-in Customer** with intra-state GST (e.g. Maharashtra `27`), splitting taxes 50/50 as CGST and SGST.
2. To bill a regular or out-of-state customer:
   - Select the customer from the customer dropdown menu.
   - If the customer belongs to a different state (e.g. Gujarat `24` or Delhi `07`), the tax engine immediately switches to **Inter-State GST (100% IGST)** with an informative badge.
3. **Quick Add Customer:** Click the `+` user icon next to the customer dropdown to register a new customer on the fly without leaving the sales counter.

### 7.3 Applying Discounts & Round-Off
1. Enter an **Invoice Discount** in the checkout panel:
   - Choose either a percentage (`%`) or fixed Rupee amount (`₹`).
   - The discount is proportionally distributed across items and deducted from taxable values before tax calculation.
2. **Nearest Rupee Round-Off:** The system automatically calculates the round-off adjustment paise to ensure the final payable amount is an exact whole Rupee.

### 7.4 Multi-Tender & Split Payments
1. Choose the payment mode:
   - **Cash:** Click quick denomination buttons (e.g. `₹ 500`, `₹ 1000`, `₹ 2000`) or enter cash received. The register calculates and displays the exact change due to the customer.
   - **UPI:** Generates a real-time dynamic UPI payment prompt and displays the shop's UPI ID / QR code for instant mobile app scanning. Enter the UTR / transaction reference.
   - **Card:** Enter the card authorization or swipe transaction code.
   - **Split Payment:** Click "Split Payment" to divide the bill across multiple tender methods (e.g., ₹1,000 Cash + ₹1,500 UPI). The register verifies that total tenders match the bill amount before allowing completion.

### 7.5 Generating, Printing & Previewing Invoices
1. Click **Complete & Generate Bill** or press `F10`.
2. A printable **GST Tax Invoice Modal** opens automatically with:
   - Unique sequential invoice number (e.g. `CR360-1001`).
   - Shop details, GSTIN, address, and contact numbers.
   - Customer name, phone, GSTIN, and Place of Supply.
   - Itemized table with HSN codes, quantities, rates, and tax breakdown.
   - Formal GST tax summary table (CGST, SGST, IGST per tax bracket).
   - Total amount in words (Indian numbering format).
   - Standard terms and conditions and cashier signature area.
3. **Print Options:**
   - Switch between **A4 Tax Invoice** format and **80mm Thermal Receipt** preview.
   - Click **Print Invoice** to send directly to your connected Windows system or thermal receipt printer.

### 7.6 Sales History & Audit-Safe Cancellation
1. Switch to the **Sales History** tab in the POS Billing header.
2. View historical invoices with filters for date range and completion status (`COMPLETED` or `CANCELLED`).
3. Click **View / Print** on any past invoice to reopen its full printable modal.
4. **Void / Cancel Invoice:**
   - Click **Void / Cancel** on any completed invoice.
   - Enter a mandatory cancellation reason in the confirmation dialog.
   - The invoice status is marked as `CANCELLED`.
   - **Automatic Stock Restitution:** The system automatically restores stock for all items on the cancelled invoice (updating variant stock and rolling up parent product totals) and records compensatory `SALE_RETURN` audit movements in the inventory ledger.

---

## 8. Supplier Management & Inward Procurement (Purchases)

### 8.1 Supplier Directory & Vendor Khata
1. Navigate to **Suppliers** in the left sidebar.
2. View active vendor accounts, contact numbers, GSTIN, payment terms (e.g., 30 days), and current payable dues.
3. Click **Add Supplier** to onboard a new sports equipment manufacturer or distributor.
4. Click **Khata** on any supplier to open their **Vendor Ledger Statement**:
   - Chronological log of all inward purchase bills (credit) and payment disbursements (debit).
   - Real-time running balance calculation ensuring transparency.

### 8.2 Inwarding Goods & Recording Purchase Bills
1. Navigate to **Purchases** in the left sidebar.
2. Click **+ New Purchase Bill**.
3. Select the supplier. The system automatically detects whether the supplier is intra-state (CGST + SGST) or inter-state (IGST) based on state codes.
4. Enter the **Supplier Bill / Invoice #** (e.g. `INV-2026-9901`) and invoice date.
   - *Duplicate Prevention:* If the same bill number is entered for this supplier, the system rejects it immediately to prevent duplicate accounting.
5. Add inward items in the item builder:
   - Select product and variant (size/color/weight).
   - Enter quantity received and purchase cost per unit.
   - Click **+ Add Item** to append to the bill grid.
6. (Optional) Enter bill-level discounts or record initial advance payment.
7. Click **Confirm Inward & Update Stock**:
   - Inward goods are immediately added to warehouse stock across variants and parent products.
   - Immutable `PURCHASE_RECEIPT` movements are logged in the inventory ledger.
   - The unpaid balance is added to the supplier's payable account.

### 8.3 Purchase Returns & Stock Adjustments
1. In the Purchases table, click the **Purchase Return** button on any received bill.
2. Enter the return quantities (cannot exceed available unreturned items).
3. Enter a mandatory return reason (e.g., transit damage, factory defect).
4. Click **Confirm Return & Adjust Stock**:
   - Stock is deducted immediately with compensatory `PURCHASE_RETURN` movement logs.
   - The supplier's account balance is credited by the return total.

---

## 9. Customer Accounts, Khata Ledger & Payment Receipts

### 9.1 Managing Customer Accounts & Credit Limits
1. Navigate to **Customers (Khata)** in the left sidebar.
2. View customer directories with mobile numbers, GSTIN, credit limits, and outstanding receivables.
3. Click **Register Customer** to add an academy, club, school, or regular retail buyer with custom credit terms.
4. Credit sales generated from the POS counter (unpaid or partially paid invoices) automatically flow into the customer's ledger balance.

### 9.2 Recording Customer Payments
1. In the Customers table, click **Receive Payment** on any customer with an outstanding balance.
2. Enter payment amount, payment mode (Cash, UPI, Card, Bank Transfer, Cheque), date, and reference.
3. (Optional) Allocate the payment against a specific sales invoice. The system prevents over-allocation.
4. Click **Confirm Payment Receipt**:
   - The customer's outstanding balance is reduced immediately.
   - The transaction is recorded in the customer's Khata statement and the unified payments register.

### 9.3 Customer Khata Statement
1. Click **Khata** on any customer to view their complete statement of accounts.
2. Review all sales invoices (debits) and payment receipts (credits) arranged chronologically with running balances.

---

## 10. Unified Financial Register (Inflows & Outflows)

1. Navigate to **Payments** in the left sidebar.
2. View the complete register of all monetary movements:
   - **Inflows:** POS sales payments and customer account receipts.
   - **Outflows:** Supplier payouts and bill disbursements.
3. Filter by Party Type (`Customer` vs `Supplier`), Payment Mode (`Cash`, `UPI`, `Card`, `Bank Transfer`), or search by reference number.
4. Audit all transactions with verified party name snapshots and receipt numbers.

