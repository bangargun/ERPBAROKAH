# MRIS - Multi Restaurant Information & Financial System (v2.0.59)

Sistem Manajemen Operasional & Keuangan Terpadu Multi-Restoran yang terdiri dari **Web Admin Dashboard** untuk pemilik/manajemen, **Mobile Tablet POS App / APK** untuk kasir & manajer cabang di lapangan, serta **Cloud REST API Engine**.

---

## 🌐 Endpoint & Domain Produksi Resmi

| Layanan / Portal | Alamat URL Produksi | Fungsi Utama |
| :--- | :--- | :--- |
| **Cloud REST API Engine** | [`https://mris-api.barokahgroupindonesia.tech`](https://mris-api.barokahgroupindonesia.tech) | Endpoint sinkronisasi data master, transaksi kasir, stok & laporan |
| **Web Admin Portal** | [`https://mris-admin.barokahgroupindonesia.tech`](https://mris-admin.barokahgroupindonesia.tech) | Portal manajemen keuangan, laporan outlet & otorisasi pusat |
| **Website Utama** | [`https://barokahgroupindonesia.tech`](https://barokahgroupindonesia.tech) | Landing page & portal perusahaan |

---

## 🗄️ Parameter Database MySQL & VPS Produksi

| Parameter | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Server VPS** | `187.77.122.142` | Cloud VPS Linux |
| **MySQL Host** | `127.0.0.1` *(atau `localhost`)* | Localhost socket VPS |
| **MySQL Port** | `3306` | Port standar MySQL |
| **MySQL Database** | `mris_db` | Single Primary Database Utama |
| **Deployment Script** | `/var/www/deploy.sh` | Script auto-deploy di VPS |
| **GitHub Repository** | [`https://github.com/bangargun/ERPBAROKAH.git`](https://github.com/bangargun/ERPBAROKAH.git) | Repositori utama |

---

## 🌟 Fitur Utama System MRIS

### 🏢 1. Web Admin Dashboard (Desktop & Tablet)
- **Financial & Executive Overview**: Memantau Total Pendapatan, Total Pengeluaran, Laba Bersih, Margin Profit %, serta grafik tren harian 30 hari.
- **Konsolidasi Multi-Restoran**: Filter per-outlet restoran atau konsolidasi seluruh cabang (Central, Senopati, Kemang, dll).
- **Manajemen Data Master**: Pengaturan Bahan Baku, Menu/Produk, Biaya Operasional, Otorisasi Pengguna, dan Supplier dari 1 pintu.
- **Laporan Laba Rugi (P&L Statement)**: Rincian pendapatan vs beban operasional (COGS, Gaji, Listrik, Sewa, Promosi) dilengkapi cetak PDF & ekspor laporan.
- **Persetujuan Logistik & Waste**: Verifikasi pengajuan opname stok, transfer antar-cabang, dan barang rusak (damaged goods).
- **Log Aktivitas & Audit**: Catatan aktivitas pengguna dan histori perubahan data.

### 📱 2. Mobile Tablet POS App (Cashier & Branch Manager APK)
- **Kasir & Transaksi POS**: Pencatatan penjualan dine-in, takeaway, catering, metode pembayaran (Cash, QRIS, Transfer, EDC), serta integrasi Thermal Printer via Web Bluetooth API.
- **Penutupan Shift (Shift Closing)**: Laporan audit kasir akhir shift dengan kalkulasi selisih fisik uang laci (Nihil / Surplus / Minus) secara real-time.
- **Laporan Harian & Logistik**: Form pengajuan biaya harian, stok opname harian, transfer stok antar-cabang, dan penginputan barang rusak (damaged goods).

---

## 📲 Cara Membangun (Build) Android APK

Untuk mengonversi aplikasi mobile tablet ini menjadi file `.apk` Android menggunakan CapacitorJS:

```bash
# 1. Masuk ke folder flutter-pos dan build bundle web:
cd flutter-pos && npm run build

# 2. Sync Capacitor Android:
npx cap sync android

# 3. Assemble APK Debug/Release via Gradle:
cd android
export JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home"
./gradlew assembleDebug

# 4. Hasil APK akan dibuat di:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🚀 Cara Menjalankan Server Lokal (Development)

### 1. Menjalankan Backend API Server Lokal
```bash
export PATH="/Users/argun/Desktop/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH"
PORT=5001 node server.js
```
*Server API Lokal akan berjalan di `http://localhost:5001`*

### 2. Menjalankan Web Admin Dashboard Lokal
```bash
cd web_admin
export PATH="/Users/argun/Desktop/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH"
npm run dev
```
*Buka browser di `http://localhost:5001` atau port dev Vite.*

---

## 🚀 Deployment ke VPS Server (`187.77.122.142`)

Untuk mendeploy kodingan terbaru dari GitHub ke VPS, jalankan 1 perintah di terminal SSH VPS Anda:

```bash
bash /var/www/deploy.sh
```

---

## 🛠️ Stack Teknologi
- **Mobile POS**: React 19, Vite, CapacitorJS, Web Bluetooth API
- **Web Admin**: React 19, Recharts, Lucide-React, Vanilla CSS
- **Backend API**: Node.js, Express.js, MySQL2 (`mris_db`)
- **Database**: Single Primary MySQL Database `mris_db`
