# 📌 UTAMA: Selalu Cek `ingat.md` & `gemini.md` Sebelum Eksekusi Kode
> ⛔ **DILARANG DATA MOCK / PALSU**: Jika data kosong, biarkan saja kosong (`ingat.md`).

## 🛑 PROTOKOL KEPATUHAN EKSEKUSI & LINGKUNGAN PENGEMBANGAN

### 💻 1. Aturan Mutlak: Pengerjaan Selalu di Local (Local-First Rule)
1. **Selalu di Lingkungan Local**:
   - Setiap perintah dan pengerjaan dari pengguna (menulis kode, mengedit file, menjalankan uji coba, build lokal) **WAJIB HANYA DILAKUKAN DI LOCAL**.
   - Sebelum ada perintah eksplisit dari pengguna untuk melakukan deploy (misal: *"deploy"*, *"minta deploy"*, *"deploy ke vps"*), asisten AI **DILARANG KERAS menyentuh VPS atau menjalankan perintah `npm run deploy`**.
   - Tetap berada dan bekerja di lingkungan local sampai pengguna secara khusus memerintahkan deploy.

2. **Pembedaan Build APK (Local POS vs Production POS)**:
   - **Perintah: "build apk local"**:
     - Berikan nama yang jelas membedakan: **`Local POS`** (Nama file: `LOCAL_POS_v{VERSI}.apk` / `local-pos.apk`).
     - **DILARANG menghubungkan POS Kasir ke live server VPS sebelum ada perintah eksplisit dari pengguna: *"pos kasir untuk terhubung ke server"***.
     - APK Local POS ditujukan untuk pengujian internal / lokal.
   - **Perintah: "pos kasir untuk terhubung ke server"**:
     - HANYA setelah perintah eksplisit ini diterima, barulah konfigurasi endpoint POS kasir diarahkan dan dibangun untuk terhubung ke server production.

3. **Larangan Keras Improvisasi Tanpa Izin (*Zero Unauthorized Improvisation*)**:
   - Asisten AI **HANYA mengeksekusi apa yang secara eksplisit diminta oleh pengguna**.
   - Jika asisten AI memiliki ide penyempurnaan, optimasi, atau alternatif solusi, asisten **DILARANG langsung mengeksekusinya ke dalam kode**.
   - Asisten **WAJIB menyampaikan proposal ide tersebut terlebih dahulu kepada pengguna dan WAJIB MENUNGGU PERSETUJUAN EKSPLISIT** dari pengguna sebelum melakukan modifikasi.

4. **Uji Validitas Sebelum Eksekusi**:
   - Perubahan backend wajib lulus `node -c server.js`, dan frontend wajib lulus `npm run build` lokal.

---

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
- **Pemisahan Total Akun POS Mobile vs Web Admin**:
  - `mobileAccounts` (Akun POS Mobile APK) dan `webAdminAccounts` (Akun Web Admin) adalah **2 domain entitas yang terpisah secara independen**.
  - Menambah, mengubah (*edit*), memperbarui password, atau menghapus user pada `POS Mobile Accounts` **DILARANG OTOMATIS MERUBAH / MENYINKRONKAN KE `Web Admin Accounts`**, dan begitu juga sebaliknya.
  - Setiap perubahan akun harus diisolasi strictly pada data store masing-masing.
- **JWT & Session Cryptography**: User sessions are validated with cryptographic tokens. Token payload contains user ID, normalized role, branch access scope, and explicit permission grants.
- **Strict Role Normalization**: System maps legacy and custom role aliases (`superadmin`, `owner`, `manajer cabang`, `kasir`, `logistik`) into standardized RBAC tiers.
- **Super Admin Overrides**: Only verified `Super Admin / Owner` roles possess system-wide configuration write access (`settings`, `activity_log`).
- **Granular Feature Access Matrix (View, Edit, Delete)**:
  - Setiap modul dalam Matriks Hak Akses Web Admin dikontrol secara granular oleh 3 parameter terpisah:
    - **`View`**: Mengontrol akses melihat modul / membuka halaman sidebar.
    - **`Edit`**: Mengontrol izin menambah data baru (`+ Tambah`), upload Excel/CSV, dan membuka form edit (`✏️ Edit`).
    - **`Delete`**: Mengontrol visibilitas dan eksekusi tombol hapus (`🗑️ Trash`).
  - **Standar Antarmuka (UI) Matriks Hak Akses**:
    - Tombol badge bersih tanpa icon/emoji di depan teks (`View`, `Edit`, `Delete`).
    - **🟢 Warna Hijau**: Menandakan izin aktif (`true`).
    - **🔴 Warna Merah**: Menandakan izin non-aktif (`false`).
  - **Daftar Modul Matriks**:
    - `dashboard`: Real-time financial analytics & omzet metrics.
    - `masterData`: Product catalog, pricing matrix, categories, and table layout.
    - `costs`: Biaya, pengeluaran operasional, dan beban HPP.
    - `reports`: Financial statements, cash flow, P&L, daily report approvals, manual report updates, dan Perbandingan Harga.
    - `stock`: Logistics inventory, stock opname, dan ingredient movement tracking.
    - `approved`: Approval transaksi dan laporan harian outlet.
    - `policies`: Dokumen SOP dan kebijakan restoran.
    - `settings`: System parameters, user rights, thermal printer configuration, dan security logs.

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

## ⚡ 3. Standar Arsitektur Data Pipeline POS Kasir, Format Jam (WIB), & Sinkronisasi

### 🕒 A. Standar Jam & Timezone Resmi (WIB / Asia/Jakarta)
1. **Format Wajib Titik Dua (`HH:mm:ss`)**:
   - Seluruh komponen (POS Kasir, Web Admin, Backend API, MySQL) **WAJIB menyimpan dan menampilkan waktu dalam format `HH:mm:ss`** (contoh: `13:21:45`).
   - **DILARANG KERAS** menggunakan format titik (`13.21.45`) karena MySQL `TIME` column akan mengartikannya sebagai detik dan merusak data menjadi `00:00:13`.
2. **Kunci Timezone ke Asia/Jakarta (WIB - UTC+7)**:
   - Setiap pembentukan tanggal/waktu transaksi baru wajib menggunakan zona waktu `Asia/Jakarta` (bukan UTC atau waktu sistem tanpa timezone).
3. **Resolusi Waktu Transaksi**:
   - Jika kolom `time` kosong / rusak, ambil langsung dari jam riil `created_at` (format `YYYY-MM-DD HH:MM:SS`).

---

### 🚀 B. Jalur Komunikasi Ringan POS (Direct REST API)
1. **Checkout Transaksi (`POST /api/pos/transaction`)**:
   - Endpoint super cepat (**< 15 ms**) untuk satu struk penjualan.
   - Server langsung melakukan *commit* ke tabel `sales_transactions` MySQL, memotong stok bahan baku (`stock_movement`), dan memperbarui in-memory cache Web Admin.
2. **Rekonsiliasi Tutup Shift (`POST /api/pos/shift-close`)**:
   - Endpoint khusus rincian kas laci (**< 10 ms**) langsung masuk ke tabel `shift_closings`.
3. **Resolusi URL API Terpusat (`web_admin/src/utils/apiConfig.js`)**:
   - **Localhost (`localhost:3000`)** ➔ Otomatis mengarah ke backend lokal `http://localhost:5001`.
   - **Web Admin Browser Produksi** ➔ Menggunakan relative path `/api/...` (Nginx proxy ke port 5001).
   - **Mobile APK Native** ➔ Mengarah ke `https://mris-api.barokahgroupindonesia.tech`.

---

### 🎯 C. Penghapusan Modul Shift Kasir (Direct Transaction Stream)
1. **Modul Shift Ditiadakan**:
   - Sistem tidak lagi memerlukan form/tabel tutup shift kasir (`shift_closings`, `closedShifts`).
   - Seluruh omzet, kas masuk, dan rekonsiliasi kas kasir **dihitung 100% langsung dari catatan transaksi penjualan (`sales_transactions`)**.
2. **Keuntungan Operasional**:
   - Kasir tidak lagi terbebani pengisian form tutup shift.
   - Database lebih ramping dan bersih tanpa data shift duplikat/gantung.
   - Web Admin menghitung omzet secara real-time dan murni dari transaksi riil.

---

### 🧹 D. Kebersihan Antarmuka (UI Integrity)
1. **Bebas Banner Anomali:**
   - Tidak menampilkan banner merah/peringatan anomali transaksi double input di Dashboard maupun Penjualan.
2. **Susunan Tab Penjualan:**
   - Menu Penjualan memiliki **9 Sub-Tab terstruktur** (Tab 1 Omzet s/d Tab 9 Perbandingan Bulanan).

---

### 🏛️ E. Standar Filter Cabang Tunggal (Single Source of Truth)
1. **Satu Filter Cabang Terpusat di Top Header (Navbar Atas):**
   - Dropdown outlet utama di Navbar Atas (`selectedBranch`) adalah satu-satunya pengendali cakupan cabang untuk seluruh modul Web Admin.
2. **Dilarang Menambahkan Dropdown Outlet Duplikat di Dalam Halaman/Tab:**
   - Seluruh halaman (Dashboard, Katalog Menu, Pelanggan, 9 Sub-Tab Penjualan, Riwayat Transaksi, Logistik/Stok Opname, Penyesuaian, Update Laporan, Approval Center, Laporan Keuangan, dan Log Aktivitas) telah dibersihkan dari filter outlet lokal duplikat.
   - Filter di dalam halaman hanya dikhususkan untuk parameter waktu (Tahun, Bulan, Rentang Tanggal) atau pencarian (*Search Bar*).
3. **Bebas Tabrakan State & Kedip (*Zero Flicker Auto-Sync*):**
   - Dengan 1 filter cabang tunggal terpusat, siklus auto-sync 10 detik berjalan mulus tanpa konflik data, lonjakan angka, atau rendering berkedip.


---

## 📱 4. Mobile Android App: POS KASIR 4.0 Architecture

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

### 🔧 Cara Build APK (Local POS vs Production POS)

#### A. Build APK Local (Perintah: "build apk local")
* **Aturan:** Menghasilkan APK untuk pengujian offline / local. **DILARANG** menghubungkan ke live database VPS sebelum ada perintah eksplisit.
* **Nama File APK Local:** `LOCAL_POS_v{VERSI}.apk` (Contoh: `LOCAL_POS_v4.3.0.apk`)

```bash
# 1. Masuk ke direktori project
cd /Users/argun/Documents/MRIS

# 2. Build web bundle local
npm run build

# 3. Sync ke Android
npx cap sync android

# 4. Build APK via Gradle
cd android && ./gradlew assembleRelease

# 5. Simpan sebagai Local POS APK:
cp android/app/build/outputs/apk/release/app-release.apk \
   /Users/argun/Documents/MRIS/LOCAL_POS_v{VERSI}.apk
```

#### B. Build APK Production (Perintah: "pos kasir untuk terhubung ke server")
* **Aturan:** HANYA dijalankan jika ada perintah eksplisit untuk menghubungkan POS kasir ke live server production.
* **Nama File APK Production:** `POS_KASIR_v{VERSI}.apk` (Contoh: `POS_KASIR_v4.3.0.apk`)

```bash
cp android/app/build/outputs/apk/release/app-release.apk \
   /Users/argun/Documents/MRIS/POS_KASIR_v{VERSI}.apk
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
| **v4.4.1** | **`POS_KASIR_v4.4.1.apk`** / **`mris-pos.apk`** | 26-08-2026 | **Build Rilis Terbaru**: Peringatan keras anti-fraud pada struk order dapur/bar/meja (tanpa harga), tombol Tagihan sementara, fitur Download (PDF/CSV) & Kirim ke WhatsApp pada Laporan Harian POS Kasir, serta dukungan penuh sinkronisasi outlet baru. |
| v4.3.4 | `POS_KASIR_v4.3.4.apk` | 16-08-2026 | **Auto-Hide Menu & Varian Harga Rp 0**: Jika harga produk/menu untuk cabang aktif diset `0`, produk tidak muncul di grid menu POS. Jika harga varian diset `0`, varian tersebut otomatis disembunyikan dari daftar pilihan varian di drawer/modal kasir. |
| v4.3.3 | `POS_KASIR_v4.3.3.apk` | 16-08-2026 | Fix Auto-Push Edit Produk: Deteksi update konten produk via `_updatedAt` dan nama-based tombstone filter. |
| v4.3.2 | `POS_KASIR_v4.3.2.apk` | 16-08-2026 | Fix auto-push (count-based) dan hapus batas 60 detik untuk master data lokal. |
| v4.3.1 | `POS_KASIR_v4.3.1.apk` | 16-08-2026 | **Fix Sinkronisasi Kategori Menu**: Perbaikan kritis server-side union merge untuk `categories`, `products`, `ingredients` — mencegah APK lama menimpa data master terbaru dari Web Admin. |
| **v4.3.0** | **`POS_KASIR_BAROKAH_v4.3.0_Universal_Build_20260816.apk`** / **`POS_KASIR_v4.3.0.apk`** / **`POS KASIR.APK`** | 16-08-2026 | **Build Rilis Universal Terbaru**: Pembaruan modul Analisis Harga Bahan, Riwayat Transaksi & Omzet POS, performa respon offline-first, dan optimasi layout multi-layar (Tablet 10", Smartphone, Tablet Besar). |
| v4.2.9 | `POS_KASIR_BAROKAH_v4.2.9_Universal_Build_20260816.apk` | 16-08-2026 | **Fitur Pindah Meja (Move Table)**: Tombol & modal interaktif untuk memindahkan pesanan konsumen dari satu meja ke meja lain secara otomatis dan memperbarui status meja kosong/terisi. |
| v4.2.8 | `POS_KASIR_BAROKAH_v4.2.8_Universal_Build_20260815.apk` | 15-08-2026 | **Sinkronisasi Otentik Akun Kasir Sesuai Pengaturan Web Admin**: Menampilkan akun real (`RATIH`, `DIANA`, `PENTI`, `WIDIA`, `OLIV`, `SELLY`, `PUTRI`, `MEMEY`, dll) per cabang di Langkah 2 login. |
| v4.2.7 | `POS_KASIR_BAROKAH_v4.2.7_Universal_Build_20260815.apk` | 15-08-2026 | Perbaikan TDZ Sesi Login Kasir |
| v4.2.5 | `POS_KASIR_BAROKAH_v4.2.5_Universal_Build_20260815.apk` | 15-08-2026 | Single Universal APK (Fluid Responsive Semua Layar) + Struk kembalian akurat + Pembersihan master data penyet khusus Surabaya |
| v4.2.4 | `POS_KASIR_BAROKAH_v4.2.4_Universal_Build_20260815.apk` | 15-08-2026 | Perbaikan cetak kembalian struk kasir Bluetooth ESC/POS + Modal preview struk |
| v4.2.3 | `POS_KASIR_BAROKAH_v4.2.3_Universal_Build_20260815.apk` | 15-08-2026 | Sinkronisasi kategori Seafood dan multi-outlet filter |
| v4.1.4 | `POS_KASIR_BAROKAH_v4.1.4_Tab10in_Build_20260815.apk` | 15-08-2026 | Cetak Struk Dapur, Struk Bar, & Struk Meja/Checker 100% tanpa harga |
| v4.1.3 | `POS_KASIR_BAROKAH_v4.1.3_Tab10in_Build_20260815.apk` | 15-08-2026 | Brand POS KASIR + Emerald Green Icon Barokah Grup |

---

## 🛡️ 14. Solusi & Proteksi Penyimpanan Server (Anti-Disk Full Protection)

### 📊 Ringkasan Kapasitas & Kebutuhan Riil
- **Kapasitas VPS Hostinger**: 100 GB NVMe SSD (`/dev/sda1`).
- **Kebutuhan Riil Sistem**: ~2 GB s/d 5 GB (Database `mris_db` & `pos_barokah` + Build Web Admin + Backend Node.js).
- **Penggunaan Normal**: 10% – 15% (Tersedia ~85 GB Free Space).

### ⚙️ Konfigurasi Proteksi yang Diterapkan di VPS (187.77.122.142)

1. **Auto-Expire MySQL Binary Logs (24 Jam)**:
   - **Lokasi Konfigurasi**: `/etc/mysql/mysql.conf.d/mysqld.cnf`
   - **Parameter**: `binlog_expire_logs_seconds = 86400`
   - **Fungsi**: Mencegah MySQL mengumpulkan ratusan file *binlog* (sebelumnya menumpuk 750+ file = ~75 GB). Log query replikasi sementara otomatis dihapus setelah 24 jam.

2. **Automated Weekly Maintenance Cron Script**:
   - **Lokasi Script**: `/root/auto_maintenance.sh` (Berjalan setiap Minggu jam 03:00 WIB: `0 3 * * 0 /root/auto_maintenance.sh > /dev/null 2>&1`).
   - **Aktivitas Otomasi**:
     - Purge MySQL binary logs yang berusia lebih dari 1 hari (`PURGE BINARY LOGS BEFORE NOW() - INTERVAL 1 DAY`).
     - Vacuum systemd journal log hingga maksimal 50 MB (`journalctl --vacuum-size=50M`).
     - Membersihkan apt package cache (`apt-get clean && apt-get autoremove -y`).
     - Flush riwayat log PM2 (`pm2 flush`).
     - Membersihkan file temporary lama (`find /tmp -type f -mtime +7 -delete`).

3. **Optimasi Katalog Menu Tanpa Gambar (Zero Image Bloat)**:
   - Semua katalog menu dan bahan baku diubah menjadi model SKU & SVG icon modern berkinerja tinggi, sehingga tidak memakan bandwidth maupun media storage disk VPS.

---

## 🔄 15. Arsitektur Jalur Data Sederhana & Stabil (Kasir ↔ Database ↔ Web Admin)

Prinsip dasar arsitektur data: **Sederhana, Satu Jalur Tunggal, Tanpa Duplikasi / Alternatif.**

```
[POS KASIR APK] ──(1. Bayar/Checkout: POST /api/pos/transaction)──▶ [DATABASE MYSQL]
       ▲                                                                   │
       │                                                                   ▼
(4. Update Menu/Harga)                                         (2. Read: GET /api/master-data)
       │                                                                   │
       │                                                                   ▼
[DATABASE MYSQL] ◀──(3. Ubah Menu/Master: POST /api/master-data)── [WEB ADMIN]
```

### 1. Alur Penjualan (Kasir POS ➔ Database ➔ Web Admin)
1. **Input & Bayar di POS**: Kasir memproses transaksi hingga struk tercetak.
2. **Kirim ke Database**: APK kasir mengirim data transaksi via satu-satunya endpoint resmi: `POST /api/pos/transaction`.
3. **Penyimpanan Permanen**: Server menyimpan transaksi ke `mris_master_data` (JSON Blob) dan tabel `sales_transactions`.
4. **Pembaruan Web Admin**: Web Admin membaca data terkini secara terpusat melalui `GET /api/master-data` (single polling loop di `App.jsx`).
5. **Tampilan Statis & Konsisten**: Data di Web Admin ditampilkan murni sesuai catatan database tanpa modifikasi atau penimpaan lokal.

### 2. Alur Pengaturan (Web Admin ➔ Database ➔ POS Kasir)
1. **Input Data Master di Web Admin**: Admin mengubah harga menu, menambah kategori, atau mengupdate bahan baku.
2. **Kirim ke Database**: Web Admin mengirim perubahan via `POST /api/master-data`.
3. **Proteksi Backend**: Backend memblokir mutasi `salesTransactions` pada endpoint ini (transaksi kasir aman dan tidak bisa tertimpa oleh state Web Admin).
4. **Pembaruan ke POS Kasir**: POS Kasir mengunduh master data terbaru dari server saat sinkronisasi, menu dan harga langsung terupdate di kasir.

### 3. Ketentuan Mutlak Jalur Tunggal (Anti-Konflik & Anti-Flicker)
- **Satu Sumber Kebenaran (Single Source of Truth)**: Database MySQL adalah satu-satunya rujukan kebenaran data.
- **Satu Siklus Sinkronisasi di Web Admin**: Hanya ada satu live polling di tingkat root (`App.jsx`). Dilarang membuat `setInterval` terpisah di sub-halaman (seperti `SalesTransactionsPage`) yang memanggil fetch/POST secara liar.
- **Tombol "Sync Mobile APK"**: Hanya memicu read-refresh (`GET /api/master-data`) untuk mengambil data terbaru dari database, tanpa mengirim payload POST yang berpotensi merusak state.
- **Pembersihan Data Terhapus**: Data yang sudah dihapus permanen di-purge langsung dari database sehingga tidak menimbulkan selisih antara data mentah dan data terfilter.

### 4. Alur Koreksi & Upload Excel Transaksi (Web Admin ➔ Database ➔ POS Kasir)
1. **Koreksi / Upload dari Web Admin**: Admin dapat mengedit diskon/nominal transaksi yang salah input atau mengunggah transaksi historis via Excel.
2. **Sinkronisasi Database**: Data langsung disimpan permanen ke tabel MySQL `sales_transactions`.
3. **Pembaruan Laporan**: Seluruh laporan (Dashboard, Omzet, Laba Rugi) di Web Admin otomatis menyesuaikan dengan angka terkoreksi.
4. **Respon POS Kasir**: POS Kasir mengunduh data terkoreksi saat membuka menu Riwayat Transaksi tanpa mengganggu aktivitas penjualan kasir yang sedang berjalan. Kasir tidak bisa menimpa kembali data yang sudah dikoreksi Admin.




