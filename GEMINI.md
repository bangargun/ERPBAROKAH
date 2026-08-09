# GEMINI.md - System Specification, Security Hardening & Android POS KASIR 4.0 Architecture

## 🛡️ 1. Core Security Architecture & Role-Based Access Control (RBAC)

System **MRIS (Multi Restaurant Financial & Operational Information System)** implements multi-tiered security hardening across Web Admin and Mobile POS environments.

### 🔑 Authentication & Session Integrity
- **JWT & Session Cryptography**: User sessions are validated with cryptographic tokens. Token payload contains user ID, normalized role, branch access scope, and explicit permission grants.
- **Strict Role Normalization**: System maps legacy and custom role aliases (`superadmin`, `owner`, `manajer cabang`, `kasir`, `logistik`) into standardized RBAC tiers.
- **Super Admin Overrides**: Only verified `Super Admin / Owner` roles possess system-wide configuration write access (`settings`, `activity_log`).
- **Granular Feature Access Matrix**:
  - `dashboard`: Real-time financial analytics & omzet metrics.
  - `masterData`: Product catalog, pricing matrix, categories, and table layout.
  - `reports`: Financial statements, cash flow, P&L, daily report approvals, manual report updates, and **Perbandingan Harga**.
  - `stock`: Logistics inventory, stock opname, and ingredient movement tracking.
  - `settings`: System parameters, user rights, thermal printer configuration, and security logs.

### 🔒 Data Isolation & Multi-Branch Security
- **Branch Scope Filtering (`selectedBranch`)**: Queries are scoped to authorized branch IDs. Cross-outlet data leakage is prevented via `isProductAvailableAtOutlet` and `activeOutletId` resolution.
- **Sanitization & Anti-XSS**: User input strings in product names, ingredient names, notes, and expense categories are sanitized before rendering to eliminate Cross-Site Scripting (XSS) risks.
- **Immutability of Audit Trails**: Financial logs and activity records in `activity_log` are append-only.

---

## 📊 2. System Modules Overview

### 1. Dashboard Executive Multi-Restoran
- Real-time POS integration, revenue monitoring, average bill analytics, multi-outlet comparison charts, and AI-driven financial insights.

### 2. Data Master (Master Data Management)
- **Katalog Menu (`ProductManagement.jsx`)**: Multi-outlet product management with instant branch filtering, standard & variant pricing matrix, and HPP composition tracking.
- **Kategori Menu, Bahan Baku, Pelanggan, Meja, Outlet, Payment Methods, Suppliers, Satuan/Unit, Akuntansi (COA)**.

### 3. Penjualan & POS Cashier
- Real-time receipt management, dine-in/takeaway ordering, split bill, loyalty points integration, and thermal receipt printing.

### 4. Logistik & Inventory Management
- Stock opname, stock transfer, low-stock threshold alerts, and supplier purchase orders.

### 5. Laporan Harian Outlet (`ApprovalCenter.jsx`)
- Approval workflow for daily cashier closing reports, cash vs digital payment verification, and expense breakdown validation.

### 6. Update Laporan (`ManualReportUpdatePage.jsx`)
- Specialized data table for manual financial adjustments, entry preview modals, and cascading deletion with automatic stock restoration.

### 7. Perbandingan Harga (`IngredientPriceComparisonPage.jsx`)
- Multi-source price comparison matrix across all outlets combining data from Logistics, Daily Reports, Update Laporan, and Master HPP.
- Searchable Select Dropdown with real-time popup search for raw materials.
- Direct calendar widget date range pickers (`[Dari Tanggal]` s/d `[Sampai Tanggal]`).
- Visual grid lines across all table rows and columns for maximum readability.

### 8. Laporan Keuangan (`FinancialReportsFull.jsx`)
- Complete financial statements: Income Statement (Laba Rugi), Balance Sheet (Neraca), Cash Flow (Arus Kas), Equity Statement, and HPP Analysis.

### 9. Printer & Thermal Settings
- Bluetooth & IP thermal printer driver settings, auto-cut paper triggers, and receipt header/footer customizations.

### 10. Kelola SOP Restoran & Program Loyalitas
- Restaurant Standard Operating Procedures management and customer tiering/points loyalty system.

### 11. Pengaturan Sistem & User Rights
- User rights management, role permission matrix overrides, and application configuration.

### 12. Log Aktivitas
- Complete audit trail of system events, login attempts, data modifications, and deletion logs.

---

## 📱 3. Mobile Android App: POS KASIR 4.0 Architecture

The mobile application **POS KASIR 4.0** is an offline-first, high-performance Android POS register built for restaurant cashiers, waiters, and branch managers.

### 🚀 Key Capabilities of POS KASIR 4.0:
1. **Offline-First Transaction Processing**: Processes orders, calculates tax/service fees, generates split-bills, and queues sync events even without active internet connection.
2. **Auto Bluetooth & USB Thermal Printing**: Native ESC/POS driver integration for instant receipt printing to 58mm & 80mm thermal printers.
3. **Table Floor Map & Order Status**: Visual table layout editor with real-time status (Available, Occupied, Reserved, Bill Requested).
4. **Kitchen Display System (KDS) Routing**: Auto-routes food items to Kitchen Printer / Kitchen Display and drink items to Bar Printer.
5. **Real-Time Stock Depletion**: Depletes ingredient stock dynamically based on recipe composition upon order completion.
6. **Hardened Multi-Tenant Security**: PIN-protected cashier shift opening & closing with cash drawer reconciliation.

---

## 🛠️ 4. Production Deployment & Operational Runbook

To deploy the latest web admin bundle and updates to the production VPS server (`mris-admin.barokahgroupindonesia.tech`):

```bash
cd /var/www/erp-barokah
git fetch origin
git reset --hard origin/main
git clean -fd
cd web_admin
npm install
npm run build
mkdir -p ../dist
cp -r dist/* ../dist/
cd ..
pm2 restart all
```
