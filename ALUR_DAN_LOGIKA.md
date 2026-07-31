# 📘 ALUR DAN LOGIKA SISTEM MRIS (MULTI-RESTAURANT INTEGRATED SYSTEM)

Dokumen ini berisi penjelasan komprehensif mengenai **arsitektur, alur kerja, logika bisnis, rumus perhitungan, dan sistem keamanan** aplikasi MRIS baik pada **Web-Based Executive Management System** maupun **Mobile POS Kasir APK**.

---

## 📑 DAFTAR ISI
1. [Arsitektur & Konsep Utama Sistem](#1-arsitektur--konsep-utama-sistem)
2. [Logika Akses Keamanan & Hierarki Peran](#2-logika-akses-keamanan--hierarki-peran)
3. [Alur & Logika Mobile POS Kasir (Android APK)](#3-alur--logika-mobile-pos-kasir-android-apk)
4. [Alur & Logika Web Executive Management Dashboard](#4-alur--logika-web-executive-management-dashboard)
5. [Logika Sinkronisasi Database Terpusat & Offline-First](#5-logika-sinkronisasi-database-terpusat--offline-first)

---

## 1. ARSITEKTUR & KONSEP UTAMA SISTEM

MRIS dirancang menggunakan **Dual-Interface Hybrid Architecture** yang menghubungkan 2 fungsi operasional utama:

```
┌─────────────────────────────────────────┐      ┌─────────────────────────────────────────┐
│     📱 MOBILE POS KASIR (ANDROID APK)    │      │  💻 WEB EXECUTIVE MANAGEMENT (BROWSER)  │
│  - Digunakan Kasir & SPV di Toko        │      │  - Digunakan Owner & Super Admin        │
│  - Fokus Transaksi Cepat (2-Tap POS)    │      │  - Papan Login Khusus (Restricted Gate) │
│  - Buka/Tutup Shift & Cetak Struk       │      │  - Laporan Keuangan, HPP, & Approval   │
└────────────────────┬────────────────────┘      └────────────────────┬────────────────────┘
                     │                                                │
                     └───────────────────────┬────────────────────────┘
                                             ▼
                             ┌───────────────────────────────┐
                             │  ☁️ DATABASE TERPUSAT VPS     │
                             │   (Hostinger Port 4000)       │
                             │  - Central REST API Sync      │
                             │  - Offline-First Storage      │
                             └───────────────────────────────┘
```

---

## 2. LOGIKA AKSES KEAMANAN & HIERARKI PERAN

### A. Papan Login Khusus Manajemen (Web Executive Gate)
Untuk menjaga kerahasiaan data keuangan restoran, Web Dashboard dilindungi oleh **Papan Login Terkunci**:
* **Spesifikasi Banner**: `🚫 DILARANG MASUK KECUALI MANAJEMEN! (Restricted Access)`.
* **Aturan Masuk**: Pengguna selain tim manajemen tidak diperkenankan mengakses Web Dashboard.

### B. Matriks Hak Akses & Level Wewenang (Permission Matrix)

| Peran (Role) | Level Akses | Fitur & Wewenang Utama |
| :--- | :---: | :--- |
| 👑 **Super Admin** | **100** | Akses penuh seluruh sistem, edit Matriks Hak Akses (Web & Mobile APK), konfigurasi sistem, dan toggle icon mata penglihat password akun. |
| 💼 **Owner / Investor** | **95** | Akses Laporan Laba Rugi, Neraca, Arus Kas, Perbandingan HPP per Outlet, Perbandingan Omzet Bulan Lalu vs Berjalan, dan AI Analytics. |
| 🏢 **Admin Operasional** | **85** | Manajemen Data Master (Produk, Bahan, Supplier, Meja), Input Manual Jurnal, Approval Pengeluaran Besar & Stok Opname. |
| 🏪 **Supervisor (SPV)** | **50** | Audit Shift Kasir, Approval Diskon Kasir, Input Stok Opname Outlet, dan Rekapitulasi Kas Kecil. |
| 🛒 **Kasir / Staf Dapur** | **40** | Registrasi Penjualan POS, Buka/Tutup Shift, Cetak Struk Bluetooth/USB, dan Cetak Tiket Pesanan Dapur. |

---

## 3. ALUR & LOGIKA MOBILE POS KASIR (ANDROID APK)

Mobile POS dirancang dengan alur kerja **2-Tap Fast Checkout** agar transaksi kasir berjalan sangat cepat:

```
[1. Login Kasir & Pilih Outlet] ➔ [2. Buka Shift (Modal Kas)] ➔ [3. Register POS & Keranjang] ➔ [4. Pembayaran & Cetak Struk] ➔ [5. Tutup Shift & Rekap Uang]
```

### Logika Detail Setiap Tahap:

1. **Tahap 1: Login Kasir & Pemilihan Cabang**:
   - Kasir memilih cabang tempat ia bertugas dan menginput PIN 4-digit terdaftar.
2. **Tahap 2: Pembukaan Shift (Shift Opening)**:
   - Mandatory modal awal kas kecil (misal: Rp 500.000).
   - Sistem mencatat timestamp `_shiftStartTime` secara otomatis.
3. **Tahap 3: Keranjang Belanja & Kalkulasi Subtotal**:
   - Menu dikelompokkan per kategori (*Makanan Utama, Minuman, Snack & Dessert*).
   - Rumus Subtotal: `Subtotal = Quantity x Harga Produk`.
   - Rumus Total Bill: `Total = Subtotal + Pajak (jika ada) - Diskon`.
4. **Tahap 4: Pembayaran & Cetak Struk**:
   - Mendukung metode pembayaran: **Tunai (Cash)**, **QRIS**, **Kartu Debit/EDC**, dan **Transfer**.
   - Generate Nomor Struk Otomatis (Format: `INV-YYYYMMDD-XXXX`).
   - Mencetak Struk Kasir via Bluetooth / USB Thermal Printer (ukuran 58mm / 80mm).
5. **Tahap 5: Penutupan Shift & Rekapitulasi Kas (Shift Closing)**:
   - Kasir menghitung fisik uang tunai di laci (*Actual Cash*).
   - **Rumus Audit Selisih Shift (Variance Formula)**:
     $$\text{Variance} = (\text{Actual Cash} + \text{QRIS Sales} + \text{EDC Sales}) - \text{Total System Sales}$$
   - Jika `Variance = 0` ➔ Status: **✅ NIHIL / COCOK**.
   - Jika `Variance != 0` ➔ Status: **⚠️ ADANYA SELISIH (Kekurangan/Kelebihan Uang Laci)**.

---

## 4. ALUR & LOGIKA WEB EXECUTIVE MANAGEMENT DASHBOARD

Web Dashboard menyediakan analisis mendalam yang dirancang dengan **Fit-to-Page Compact Typography** (ukuran font tabel `0.72rem` / `0.76rem` agar muat dalam 1 layar tanpa nge-slide).

### Logika 4 Card Analisis Utama Dashboard:

1. **Card 1: Perbandingan Omzet Bulan Lalu vs Omzet Berjalan Bulan Ini per Outlet**:
   - **Logika**: Membandingkan akumulasi omzet bersih bulan lalu (*MoM Previous Month*) dengan omzet berjalan bulan ini (*Current Month-to-Date*) untuk setiap outlet yang dipilih.
   - **Tujuan**: Mengetahui tren pertumbuhan atau penurunan omzet tiap cabang.
2. **Card 2: Perbandingan Harga Menu / Produk Tertinggi**:
   - **Logika**: Mengurutkan produk dengan margin keuntungan / harga tertinggi berdasarkan rentang waktu (*Daily, Weekly, Monthly*) dan filter outlet.
3. **Card 3: Perbandingan Harga Bahan Baku per Outlet**:
   - **Logika**: Otomatis mendeteksi dan memberi peringatan jika terdapat **disparitas/selisih harga beli bahan baku** antar supplier cabang (misal: Harga Ayam Fillet di Cabang Jakarta Rp 45.000/kg vs Bandung Rp 50.000/kg).
4. **Card 4: Perhitungan & Target HPP (COGS) Tiap Outlet**:
   - **Rumus HPP**:
     $$\text{HPP (\%)} = \left( \frac{\text{Total Biaya Bahan Baku \& Dapur}}{\text{Total Penjualan Kotor}} \right) \times 100\%$$
   - **Indikator Target**:
     - Jika `HPP <= 35%` ➔ Badge: **✅ IDEAL / SEHAT**.
     - Jika `HPP > 35%` ➔ Badge: **⚠️ OVER BUDGET / PEMBOROSAN BAHAN**.

---

## 5. LOGIKA SINKRONISASI DATABASE TERPUSAT & OFFLINE-FIRST

### Alur Sinkronisasi Data (Cloud Sync Engine):

```
┌─────────────────────────┐
│ Perubahan Data di Client│
│ (Kasir APK / Web Owner) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 1. Simpan ke LocalStorage│ ➔ (Aplikasi Langsung Responsif Bebas Lag)
└────────────┬────────────┘
             │
             ▼ (Debounce Sync 1.5 Detik)
┌─────────────────────────┐
│ 2. Send POST /api/sync  │ ➔ (Kirim Payload ke VPS Hostinger Port 4000)
└────────────┬────────────┘
             │
             ├─── [Jika Internet Online] ───➔ ✅ Terupdate di VPS /var/www/MRIS_TECH/data/
             │
             └─── [Jika Internet Offline] ──➔ 🔄 Disimpan Sementara di Queue Local, 
                                              di-sync Otomatis Saat Online Kembali
```

### Keunggulan Logika Ini:
1. **Zero Downtime / Offline Ready**: Kasir di toko tidak pernah terhenti meskipun koneksi internet terputus.
2. **Real-time Reporting**: Owner di rumah/laptop langsung mendapatkan update omzet detik itu juga begitu tablet kasir terhubung ke internet.
3. **Isolasi Database Total**: Seluruh data tersimpan di `/var/www/erp-barokah/data/mris_finance.json` di port `4000` VPS Hostinger Anda, sehingga **100% aman dan tidak pernah tertukar dengan domain lain**.
