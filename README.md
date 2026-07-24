# MRIS - Multi Restaurant Information & Financial System

Sistem Manajemen Keuangan Terpadu Multi-Restoran yang terdiri dari **Web Admin Dashboard** untuk pemilik/manajemen dan **Mobile App / APK** untuk kasir & manajer cabang di lapangan.

---

## 🌟 Fitur Utama

### 🏢 1. Web Admin Dashboard (Desktop & Tablet)
- **Financial Overview**: Memantau Total Pendapatan, Total Pengeluaran, Laba Bersih, Margin Profit %, serta grafik tren harian 30 hari.
- **Konsolidasi Multi-Restoran**: Filter per-outlet restoran atau konsolidasi seluruh cabang (Senopati, Kemang, PIK).
- **Manajemen Outlet & Budget**: Menambah cabang restoran baru, menetapkan budget bulanan, dan penanggung jawab cabang.
- **Laporan Laba Rugi (P&L Statement)**: Rincian pendapatan (Dine-in, Takeaway, Catering) vs beban operasional (COGS, Gaji, Listrik, Sewa, Promosi) dilengkapi grafik pie chart dan fitur Cetak / Print PDF.
- **Persetujuan Pengeluaran (Expense Approval)**: Verifikasi pengajuan biaya/nota bernominal besar dari kasir/manajer cabang.
- **Audit Penutupan Kas Shift**: Rekonsiliasi omset POS vs fisik uang kasir di laci.

### 📱 2. Mobile User App (Cashier & Branch Manager APK)
- **Input Transaksi Cepat**: Pencatatan kas masuk & kas keluar dengan cepat via smartphone, lengkap dengan pilihan metode pembayaran (Cash, QRIS, Transfer, EDC) & foto bukti nota.
- **Penutupan Kas Shift (Shift Closing)**: Laporan penutupan kasir akhir shift dengan kalkulasi selisih audit (NIHIL / Surplus / Minus) secara real-time.
- **Ringkasan Cabang Harian**: Ringkasan omset dan laba cabang khusus layar mobile.
- **PWA & APK Ready**: Dapat diinstall langsung di Android / iOS atau dibangun menjadi file `.apk` Android via CapacitorJS.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Menjalankan Backend API Server
```bash
# Di terminal workspace:
export PATH=/Applications/Kimi.app/Contents/Resources/resources/runtime:$PATH
npm run server
```
*Server API akan berjalan di `http://localhost:5001`*

### 2. Menjalankan Frontend Web Admin & Mobile App Simulator
```bash
# Di terminal kedua:
export PATH=/Applications/Kimi.app/Contents/Resources/resources/runtime:$PATH
npm run dev
```
*Buka browser di `http://localhost:3000`*

---

## 📲 Cara Membangun (Build) Android APK

Untuk mengonversi aplikasi mobile ini menjadi file `.apk` Android menggunakan Capacitor:

1. **Build bundle produksi web**:
   ```bash
   npm run build
   ```

2. **Tambahkan platform Android**:
   ```bash
   npx cap add android
   npx cap sync
   ```

3. **Buka proyek Android di Android Studio untuk generate APK**:
   ```bash
   npx cap open android
   ```
   *Di Android Studio, pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** untuk menghasilkan file `.apk`.*

---

## 🛠️ Stack Teknologi
- **Frontend**: React 19, Vite, Lucide-React, Recharts, CSS Glassmorphism
- **Backend API**: Node.js, Express.js, CORS
- **Database**: Zero-dependency Portable JSON Persistent Database (`mris_finance.json`)
- **Mobile Packaging**: CapacitorJS / PWA
