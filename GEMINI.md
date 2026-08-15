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

| Port | Service | Domain | Status / Keterangan |
|------|---------|--------|---------------------|
| `5001` | **MRIS Single Unified Backend** (PM2: `erp-barokah`) | `mris-api.barokahgroupindonesia.tech`, `mris-admin.barokahgroupindonesia.tech` | 🟢 **AKTIF UTAMA (Single Source of Truth)** untuk Web Admin & seluruh APK POS Kasir |
| `4000` | ~~POS Kasir Backend Legacy~~ | ~~`pos-api.barokahgroupindonesia.com`~~ | ⛔ **DEPRECATED / SUDAH PUTUS HUBUNGAN** (Tidak digunakan lagi, dialihkan 100% ke Port 5001) |
| `80/443` | Nginx reverse proxy | Semua domain resmi | 🟢 Proxy lalu lintas HTTPS ke Port 5001 |

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

# 6. Rename dan simpan dengan format standar ringkas:
cp android/app/build/outputs/apk/release/app-release.apk \
   /Users/argun/Documents/MRIS/POS_KASIR_v{VERSI}.apk
```

#### Format Nama File APK Resmi:
```
POS_KASIR_v{VERSI}.apk

Contoh:
POS_KASIR_v4.2.9.apk
POS_KASIR_v4.3.0.apk
```
*(Versi terus bertambah secara berurutan setiap ada update baru)*

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
- [ ] APK diberi nama format standar: `POS_KASIR_v{VERSI}.apk`
- [ ] APK disimpan di `/Users/argun/Documents/MRIS/`

---

### 🏪 Distribusi APK ke Outlet (Ringkas, Universal & Fleksibel)

> 💡 **Standar 1 APK Universal**: Mulai versi **v4.2.9 ke atas**, penamaan file APK disederhanakan dan dikunci dengan format resmi:
> **`POS_KASIR_v{VERSI}.apk`** (contoh: `POS_KASIR_v4.2.9.apk`).
> APK ini secara otomatis menyesuaikan tampilan (*fluid responsive layout*) di semua ukuran layar:
> - **Tablet 10" (Samsung Tab A8)**: 4 kolom produk, font 13–14px, sidebar 300–340px (Rekomendasi Kasir Utama).
> - **Tablet Besar 11–13"+**: 5 kolom produk, font 14–15px, sidebar 360px.
> - **Tablet Kecil 7–8"**: 3 kolom produk, font 12px, sidebar 220px.
> - **Smartphone (5–6.7")**: 2 kolom produk, single panel fluid.

---

## 🍗 12. Kebijakan Master Data & Menu Spesifik Outlet

### 🏢 5 ID Cabang Resmi Barokah Group (DIKUNCI - JANGAN DIUBAH)
| ID Cabang (`outlet_id`) | Nama Cabang Resmi | Kode Outlet |
| :--- | :--- | :---: |
| **`1785307180576`** | **AYAM BAKAR SURABAYA TEBING TINGGI** | `SBY-TT` |
| **`1785369561430`** | **AYAM PECAK 2001 SEAFOOD TEBING TINGGI** | `PCK-TT` |
| **`1785537689430`** | **AYAM PECAK 2001 SEAFOOD RANTAU PRAPAT** | `PCK-RP` |
| **`1785369617361`** | **AYAM PECAK 2001 SEAFOOD KISARAN** | `PCK-KIS` |
| **`1785564003169`** | **PECEL LELE PAK HAJI KISARAN** | `PLP-KIS` |

#### 🛡️ Aturan Anti-Lupa & Hierarki Pencocokan Outlet (3-Layer Protection):
1. **Prioritas 1 (`outlet_id`)**: Kunci utama mutlak (*Primary Key*). Seluruh query filter, relasi produk, harga cabang, stok, dan akun kasir WAJIB dicocokkan via `String(outlet_id)`.
2. **Prioritas 2 (`code`)**: Pencocokan via Kode Outlet (misal `SBY-TT`, `PCK-TT`) untuk penomoran struk kasir dan SKU produk.
3. **Prioritas 3 (`name`)**: Fallback darurat menggunakan Nama Cabang jika ada data historis lama tanpa ID.
- **Status ID**: 5 ID di atas bersifat *immutable* (tidak boleh diganti atau di-generate ulang dengan angka acak baru).

### Kebijakan Menu Penyet (Ayam Bakar Surabaya)
- **`PRD-004` — `AYAM PENYET`**: Khusus aktif **hanya** untuk outlet **`AYAM BAKAR SURABAYA TEBING TINGGI`** (`1785307180576`).
  - Varian Resmi: `sambal merah` & `sambal ijo`.
  - Bahan Baku (Resep): `AYAM POTONG` (1 Porsi).
- **`PRD-007` — `BEBEK PENYET`**: Khusus aktif **hanya** untuk outlet **`AYAM BAKAR SURABAYA TEBING TINGGI`** (`1785307180576`).
  - Varian Resmi: `sambal ijo` & `sambal merah`.
  - Bahan Baku (Resep): `BEBEK POTONGAN` (1 Porsi).

### Proteksi Penghapusan Produk (Anti-Zombie Cache Resurrection)
- Saat produk dihapus, server dan client mencatat ID, SKU, dan Nama ke `deletedProductIds`.
- Di `App.jsx` (`mergeMasterArray`) dan `server.js` (`mergeMasterDataSafely`):
  - Memeriksa `isMasterItemDeleted(item, deletedIds)` terhadap ID, SKU, Code, dan lowercase Name.
  - Data lokal browser tidak boleh membangkitkan kembali produk yang sudah dihapus di server (`serverArr` adalah base authority).

### 🔄 Kebijakan Pembaruan Kategori Menu (Cascading In-Place Update)
- **Prinsip Utama (No Delete on Category Change)**:
  Saat nama kategori diubah atau kategori produk diganti, sistem **DILARANG MENGHAPUS** data produk/kategori. Sistem wajib melakukan **Cascading In-Place Update**.
- **Alasan & Tujuan**:
  1. **Audit Trail & Laporan Keuangan**: Mencegah transaksi masa lalu kehilangan relasi data (*orphan records*) dan menjaga grafik laba rugi/HPP serta riwayat penjualan tetap valid.
  2. **Stabilitas POS Kasir**: Mencegah menu kasir tiba-tiba hilang dari layar tablet kasir cabang saat dilakukan reorganisasi kategori di pusat.
  3. **Integritas Relasional MySQL**: Mempertahankan relasi ID produk terhadap resep bahan baku (`compositions`), stok mutasi logistik (`stockMovement`), dan laporan shift kasir (`shiftReports`).
- **Implementasi Teknis**:
  - Di `ProductCategoryManagement.jsx`: Saat kategori diedit, sistem memperbarui master kategori sekaligus meng-update field `category_name` & `category` pada seluruh produk terkait secara serentak.
  - Di `ProductManagement.jsx`: Mengikat 3 atribut kunci (`category_id`, `category_name`, `category`) secara atomik dengan stempel waktu `_updatedAt: Date.now()`.

---

## 🗂️ 13. Riwayat Build APK Terbaru
| Versi | File | Tanggal Build | Perubahan |
|-------|------|--------------|-----------|
| **v4.2.9** | **`POS_KASIR_BAROKAH_v4.2.9_Universal_Build_20260816.apk`** / **`POS KASIR.APK`** | 16-08-2026 | **Fitur Pindah Meja (Move Table)**: Tombol & modal interaktif untuk memindahkan pesanan konsumen dari satu meja ke meja lain secara otomatis dan memperbarui status meja kosong/terisi. |
| v4.2.8 | `POS_KASIR_BAROKAH_v4.2.8_Universal_Build_20260815.apk` | 15-08-2026 | **Sinkronisasi Otentik Akun Kasir Sesuai Pengaturan Web Admin**: Menampilkan akun real (`RATIH`, `DIANA`, `PENTI`, `WIDIA`, `OLIV`, `SELLY`, `PUTRI`, `MEMEY`, dll) per cabang di Langkah 2 login. |
| v4.2.7 | `POS_KASIR_BAROKAH_v4.2.7_Universal_Build_20260815.apk` | 15-08-2026 | Perbaikan TDZ Sesi Login Kasir |
| v4.2.5 | `POS_KASIR_BAROKAH_v4.2.5_Universal_Build_20260815.apk` | 15-08-2026 | Single Universal APK (Fluid Responsive Semua Layar) + Struk kembalian akurat + Pembersihan master data penyet khusus Surabaya |
| v4.2.4 | `POS_KASIR_BAROKAH_v4.2.4_Universal_Build_20260815.apk` | 15-08-2026 | Perbaikan cetak kembalian struk kasir Bluetooth ESC/POS + Modal preview struk |
| v4.2.3 | `POS_KASIR_BAROKAH_v4.2.3_Universal_Build_20260815.apk` | 15-08-2026 | Sinkronisasi kategori Seafood dan multi-outlet filter |
| v4.1.4 | `POS_KASIR_BAROKAH_v4.1.4_Tab10in_Build_20260815.apk` | 15-08-2026 | Cetak Struk Dapur, Struk Bar, & Struk Meja/Checker 100% tanpa harga |
| v4.1.3 | `POS_KASIR_BAROKAH_v4.1.3_Tab10in_Build_20260815.apk` | 15-08-2026 | Brand POS KASIR + Emerald Green Icon Barokah Grup |
