# 📌 UTAMA: Selalu Cek `ingat.md` & `gemini.md` Sebelum Eksekusi Kode
> ⛔ **DILARANG DATA MOCK / PALSU**: Jika data kosong, biarkan saja kosong (`ingat.md`).

## 🛡️ 1. Core Security Architecture & Role-Based Access Control (RBAC)

### 🔄 Build Synchronization & Single Source of Truth Rule
- **Primary Source**: `web_admin/src/` is the single source of truth for the Web Admin codebase.
- **Automated Sync**: The root `package.json` `build` script automatically syncs `web_admin/src → src` and `web_admin/dist → dist` using `rsync` prior to compiling.
- **Single Build Execution**: Always run `npm run build` from the root directory on the **local machine**. This ensures root `/dist` and `web_admin/dist` are 100% identical and always contain all 14 sidebar menu items.
- **Deploy ke VPS**: Gunakan `npm run deploy` (bukan rsync manual). Script ini build → git push → VPS git pull dengan urutan yang benar agar versi tidak pernah balik ke versi lama.

---

## 📊 2. System Modules Overview

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

### ⚠️ Aturan Deploy — WAJIB DIIKUTI

> **`npm run deploy` HANYA dijalankan dari laptop lokal, BUKAN dari SSH VPS!**

### ✅ Cara Deploy yang Benar (Satu Perintah)

```bash
# Jalankan dari laptop, di folder project:
cd /Users/argun/Documents/MRIS
npm run deploy
```

Script ini otomatis melakukan **urutan yang benar**:
1. `npm run build` — build web admin (web_admin/src → dist)
2. `git add -A && git commit && git push` — push ke GitHub **dulu**
3. SSH ke VPS → `git reset --hard origin/main` → `pm2 restart erp-barokah`

### ❌ Urutan yang SALAH (penyebab 11 menu kembali)

```
❌ JANGAN: rsync ke VPS dulu → git push belakangan
   Risiko: jika webhook jalan di antara keduanya, VPS balik ke versi lama GitHub

❌ JANGAN: jalankan npm run deploy dari dalam SSH VPS
   Akibat: ENOENT — tidak ada package.json di /root/
```

### 🔧 Jika Perlu Sync Manual VPS (tanpa kode baru)

```bash
# Dari laptop lokal:
sshpass -p 'Barokahgrub30@@' ssh -o StrictHostKeyChecking=no root@187.77.122.142 \
  "cd /var/www/erp-barokah && git fetch origin && git reset --hard origin/main && pm2 restart erp-barokah"
```

### 📌 Port Mapping Resmi VPS (`187.77.122.142`)

| Port | Service | Domain |
|------|---------|--------|
| `5001` | MRIS ERP Backend (PM2: `erp-barokah`) | `mris-api.barokahgroupindonesia.tech`, `mris-admin.tech`, `barokahgroupindonesia.tech` |
| `4000` | POS Kasir Backend | `pos-api.barokahgroupindonesia.com` |
| `80/443` | Nginx reverse proxy | Semua domain |

### 📁 Path Penting di VPS

| Path | Fungsi |
|------|--------|
| `/var/www/erp-barokah/` | Root project MRIS (git repo) |
| `/var/www/erp-barokah/dist/` | Static files yang di-serve Nginx |
| `/var/www/erp-barokah/server.js` | Backend API (PM2 process `erp-barokah`) |
| `/var/www/erp-barokah/mris_finance.json` | Database JSON persisten |

---

## 📦 5. Build APK — Versi per Ukuran Perangkat

Setiap kali membangun APK POS Kasir, **wajib membuat varian untuk setiap kategori ukuran layar** berikut. Ini memastikan layout, font size, grid produk, dan panel order tampil optimal di semua perangkat kasir.

---

### 🎯 Target Perangkat & CSS Breakpoint

| Varian | Ukuran Layar | CSS Viewport (Landscape) | Contoh Perangkat | Priority |
|---|---|---|---|---|
| **Phone** | 5–6.7" | 360–480px lebar | Samsung A-series, Redmi | ⬜ Sekunder |
| **Tablet Kecil** | 7–8" | 600–768px lebar | Samsung Tab A7 Lite, Lenovo Tab M8 | 🟡 Penting |
| **Tablet Standar 10"** | 9.7–10.5" | 800–1024px lebar | Samsung Tab A8, Lenovo Tab P11 | 🔴 **UTAMA** |
| **Tablet Besar** | 11–13" | 1100–1366px lebar | Samsung Tab S8, iPad Pro | 🟢 Bonus |

---

### 📐 Aturan Layout per Varian

#### 📱 Phone (360–480px)
```
- Grid produk : 2 kolom
- Panel order : full-screen (modal bawah)
- Font produk : 11–12px
- Tombol bayar: full width
- Orientasi   : PORTRAIT utama
```

#### 📟 Tablet Kecil 7–8" (600–768px)
```
- Grid produk : 3 kolom
- Panel order : fixed sidebar kanan 220px
- Font produk : 12–13px
- Kategori    : horizontal scroll
- Orientasi   : LANDSCAPE utama
```

#### 🖥️ Tablet Standar 10" (800–1024px) ← TARGET UTAMA
```
- Grid produk : 3–4 kolom
- Panel order : fixed sidebar kanan 280–320px
- Font produk : 13–14px
- Header      : 56px tinggi
- Tombol bayar: 56px height
- Orientasi   : LANDSCAPE WAJIB
```

#### 🖥️ Tablet Besar 11"+ (1100px+)
```
- Grid produk : 4–5 kolom
- Panel order : fixed sidebar kanan 340–380px
- Font produk : 14–15px
- Tampilkan   : info shift, nama kasir, jam digital
- Orientasi   : LANDSCAPE
```

---

### 🔧 Cara Build APK per Varian (Capacitor + Android)

```bash
# 1. Masuk ke direktori project
cd /Users/argun/Documents/MRIS

# 2. Build web bundle (pastikan breakpoint CSS sudah disesuaikan varian)
npm run build

# 3. Sync ke Android
npx cap sync android

# 4. Build APK via Gradle
cd android && ./gradlew assembleRelease

# 5. Output APK:
# android/app/build/outputs/apk/release/app-release.apk

# 6. Rename dan simpan dengan format standar:
cp android/app/build/outputs/apk/release/app-release.apk \
   /Users/argun/Documents/MRIS/POS_KASIR_BAROKAH_v{VERSI}_{VARIAN}_Build_{TANGGAL}.apk
```

#### Format Nama File APK:
```
POS_KASIR_BAROKAH_v{VERSI}_{VARIAN}_Build_{YYYYMMDD}.apk

Contoh:
POS_KASIR_BAROKAH_v4.1.0_Phone_Build_20260810.apk
POS_KASIR_BAROKAH_v4.1.0_Tab7in_Build_20260810.apk
POS_KASIR_BAROKAH_v4.1.0_Tab10in_Build_20260810.apk   ← UTAMA
POS_KASIR_BAROKAH_v4.1.0_Tab12in_Build_20260810.apk
```

---

### 🧩 Implementasi Responsif di AndroidPosRegister.jsx

Gunakan deteksi ukuran layar ini di dalam komponen POS:

```js
const screenW = window.innerWidth;

const DEVICE =
  screenW >= 1100 ? 'tab-xl'   // 11"+ tablet besar
  : screenW >= 800 ? 'tab-10'  // 10" tablet standar (UTAMA)
  : screenW >= 600 ? 'tab-7'   // 7–8" tablet kecil
  : 'phone';                    // smartphone

const layout = {
  'phone':  { cols: 2, sidebarW: '100%',  fontSz: 11, btnH: 48, padding: 8  },
  'tab-7':  { cols: 3, sidebarW: '220px', fontSz: 12, btnH: 52, padding: 10 },
  'tab-10': { cols: 4, sidebarW: '300px', fontSz: 13, btnH: 56, padding: 12 },
  'tab-xl': { cols: 5, sidebarW: '360px', fontSz: 14, btnH: 60, padding: 14 },
}[DEVICE];
```

---

### ✅ Checklist Sebelum Release APK

- [ ] Test di emulator/device **Tab 10" landscape** (wajib)
- [ ] Grid produk tidak overflow / terpotong
- [ ] Panel order cart penuh, tidak ada scroll horizontal
- [ ] Keyboard virtual tidak menutupi tombol "Bayar"
- [ ] Tombol kategori bisa diklik (tidak terlalu kecil, min 44px)
- [ ] Font produk terbaca dari jarak ±50cm
- [ ] APK diberi nama sesuai format standar + tanggal build
- [ ] APK disimpan di `/Users/argun/Documents/MRIS/`

---

### 🏪 Distribusi APK ke Outlet

| Perangkat Kasir | Varian APK yang Dipasang |
|---|---|
| Samsung Tab A8 10" (kasir utama) | `Tab10in` ← **gunakan ini** |
| Tablet 7–8" (kasir pendukung) | `Tab7in` |
| Smartphone Android (darurat) | `Phone` |
| Tablet besar manager | `Tab12in` |
