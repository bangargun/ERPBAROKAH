# MRIS Project Rules — Antigravity Persistent Memory

Dokumen ini dibaca otomatis oleh AI di setiap sesi. Selalu ikuti semua aturan di bawah ini.

---

## ❌ LARANGAN MUTLAK: TIDAK ADA DATA FAKE / MOCK / DUMMY

### Aturan Inti
> **DILARANG KERAS** menambahkan, mempertahankan, atau mengembalikan data hardcoded/statis/dummy/mock/placeholder di seluruh codebase MRIS — baik di APK, server, maupun web admin.

### Yang dimaksud data fake/mock/dummy:
- Array literal berisi data isi statis yang dipakai sebagai **fallback** jika `masterData` kosong
- Nama orang fiktif hardcoded (contoh: "Siti Rahma", "Budi Kurniawan", "Admin Pusat")  
- Nama supplier/outlet fiktif (contoh: "PT Sembako Nusantara", "UD Sayur Segar", "Outlet Cabang 2")
- Nama/daftar bahan baku hardcoded (contoh: "Beras Pandan Wangi", "Minyak Goreng Bimoli")
- Daftar biaya hardcoded (contoh: "Biaya Listrik & Air", "Biaya Gas LPG Dapur")
- Angka default sewenang-wenang sebagai fallback harga (contoh: `|| 15000`, `|| 2000000`)
- ID atau tanggal hardcoded di tampilan (contoh: `date: '2026-07-23'`, `id: 'OPN-20260723-001'`)
- Data stok opname dummy yang muncul saat `masterData.stockOpname` kosong/undefined

### Apa yang HARUS dilakukan sebagai gantinya:
```js
// ✅ BENAR — jika masterData kosong, tampilkan kosong / pesan informatif
const ingredients = masterData?.ingredients || [];

// ❌ SALAH — jangan pernah ini:
const ingredients = masterData?.ingredients || [
  { id: 1, name: 'Beras Pandan Wangi', unit: 'kg', cost: 14000 },
];
```

### Jika data kosong, tampilkan:
```jsx
// ✅ Pesan kosong yang jelas, bukan data palsu
{list.length === 0 && (
  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
    Belum ada data. Tambahkan melalui menu pengaturan.
  </div>
### ⚠️ KLARIFIKASI PENTING: DATA INPUT MANUAL PENGGUNA BUKAN FAKE / MOCK!
> **DATA YANG DI-INPUT MANUALL OLEH PENGGUNA** (seperti akun pengguna di **Pengaturan Hak User & Permission Matrix**, data outlet, transaksi, produk, biaya, bahan baku, serta laporan harian) adalah **DATA REAL PENGGUNA (BUKAN DATA MOCK / FAKE)**.
> **DILARANG KERAS** menghapus, mem-bypass, meng-overwrite, atau mengosongkan data yang telah dimasukkan oleh pengguna secara manual dalam kondisi apa pun (baik saat update fitur, sinkronisasi API, maupun build APK). Data pengguna wajib dipertahankan secara utuh dan aman!

---

## 🏗️ ARSITEKTUR MRIS

### Stack Teknologi
- **APK Android**: React + Vite → Capacitor → Android (`flutter-pos/`)
- **Backend/API**: Node.js Express (`server.js` + `pos-backend/`)
- **Web Admin**: React (`web_admin/`)
- **Data Storage**: MySQL `mris_db` sebagai **Single Primary Database (100% Database Utama)**. File `mris_finance.json` adalah database statis pasif yang hanya aktif/direcall secara manual via trigger `/api/db/restore-snapshot` atau `/api/db/backup-snapshot`.

### Alur Data (SATU ARAH)
```
Server /api/master-data
        ↓ (GET saat load)
masterData (React state)
        ↓ (dipakai semua komponen)
UI display / form input
        ↓ (setelah submit)
setMasterData → POST /api/master-data
```

### File Utama APK
- `/Users/argun/Documents/MRIS/flutter-pos/src/components/mobile/AndroidPosRegister.jsx`
  - Komponen monolitik ~12.000 baris
  - JANGAN split tanpa instruksi eksplisit dari user

### Proses Build APK
```bash
# 1. Build web
cd flutter-pos && npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK
cd android && ./gradlew assembleDebug

# 4. Copy APK ke root
cp android/app/build/outputs/apk/debug/app-debug.apk ../MRIS_vX.X.X_Build_YYYYMMDD_HHMM.apk
```

### Environment & Server VPS Produksi
- Java: `/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home`
- Node: `/Users/argun/Desktop/ChatGPT.app/Contents/Resources/cua_node/bin`
- GitHub Repo: `git@github.com:bangargun/ERPBAROKAH.git` (`https://github.com/bangargun/ERPBAROKAH.git`)
- **Server VPS IP**: `187.77.122.142`
- **Direktori Proyek VPS**: `/var/www/erp-barokah`
- **Script Deploy VPS**: `/var/www/deploy.sh`

---

## 🗄️ PARAMETER DATABASE & ENDPOINT PRODUKSI RESMI

| Parameter / Layanan | Nilai Resmi Produksi |
| :--- | :--- |
| **MySQL Host** | `127.0.0.1` *(atau `localhost`)* |
| **MySQL Port** | `3306` |
| **MySQL Database** | `mris_db` *(Single Primary Storage)* |
| **Server VPS** | `187.77.122.142` |
| **API Cloud Endpoint** | `https://mris-api.barokahgroupindonesia.tech` |
| **Web Admin Portal** | `https://mris-admin.barokahgroupindonesia.tech` |
| **Website Utama** | `https://barokahgroupindonesia.tech` |

---

## ⚡ PERFORMA

- Gunakan `useMemo` untuk kalkulasi berat yang bergantung pada `masterData`
- Gunakan `useCallback` untuk handler yang diteruskan ke child component
- Gunakan `useDebounce(300ms)` untuk semua input pencarian/filter
- JANGAN biarkan `outletTransactions.filter()` atau `cart.reduce()` jalan tanpa `useMemo`

---

## 🔢 VERSIONING & ATURAN SERI BUILD APK

- **Format Seri Nama Aplikasi POS Kasir**: `POS KASIR X.Y.Z` (Contoh: `POS KASIR 3.1.0`)
- **Aturan Urutan Seri Update**:
  - Rilis Seri 3.1: **POS KASIR 3.1.0**
  - Update Pertama: **POS KASIR 3.1.1**
  - Update Kedua: **POS KASIR 3.1.2**
  - Update Ketiga: **POS KASIR 3.1.3**, dst.
- **Standar Penamaan File APK Build di Root Workspace**:
  `POS_KASIR_3.1.1_BUILDYYYYMMDD.apk`
- **Synchronized Versioning Targets**:
  Setiap kali membuat build versi baru, wajib menyinkronkan versi di:
  1. `flutter-pos/android/app/build.gradle` (`versionCode 30101`, `versionName "3.1.1"`)
  2. `flutter-pos/package.json` (`"version": "3.1.1"`)
  3. `AndroidPosRegister.jsx` Badge Navigasi Header (`v3.1.1 GOLD`)
  4. Root file APK `POS_KASIR_3.1.1_BUILDYYYYMMDD.apk`
  5. Catatan: Jangan push file `.apk` ke GitHub (sesuai Aturan 11).

---

## 📋 MODUL LAPORAN

### Laporan Harian
- Submit → simpan ke: `manualEntryRecords`, `approvedFinanceDaily`, `shiftClosings`, `shift_closings`, `closedShifts`
- Dropdown bahan baku, biaya, supplier, dan nama pembuat → **HANYA dari `masterData`**

### Laporan Logistik (Stok Opname)  
- Submit → simpan ke: `approvedLogistics`, `stockOpname`, `stockMovement`
- Jika `masterData.stockOpname` kosong → tampilkan tabel kosong, **bukan dummy data**

### Laporan Transfer
- 2 tahap: form → konfirmasi → simpan
- Simpan ke: `stockTransfer`, `approvedTransfers`, `stockMovement`
- Status awal: `'ditunda'`, `is_approved: false`

### Laporan Waste (Barang Rusak)
- 2 tahap: form → preview → simpan via `handleSaveWasteFinal()`
- Simpan ke: `damagedGoods`, `approvedWaste`, `stockMovement`, `ingredients` (stok dikurangi)
- Jika stok item tidak ditemukan → log warning, **jangan crash atau isi default**

---

## 🚫 ATURAN TAMBAHAN

1. **Jangan pernah hapus komentar/docstring** yang sudah ada kecuali diminta
2. **Jangan split komponen** AndroidPosRegister.jsx tanpa instruksi eksplisit
3. **Setiap perubahan harus di-build** → verifikasi `BUILD SUCCESSFUL` sebelum commit
4. **Jika ada file dengan data fake** di server, GitHub, atau lokal → **hapus langsung**
5. **`currentUserSession`** harus dari `userSession` prop, bukan hardcoded default
6. **`adminList`** harus dari `masterData.users` atau `masterData.userRights`, bukan hardcoded
7. **Deploy Live Server Otomatis (Selektif)**: AI HANYA memicu update live server VPS (`mris-admin.barokahgroupindonesia.tech`) jika terdapat perubahan pada file **Web Admin (`web_admin/`)** atau **Backend Server (`server.js`, `pos-backend/`)**. Jika perubahan hanya terjadi pada Mobile APK (`flutter-pos/`), JANGAN memicu webhook VPS untuk menghemat bandwidth server:
   `curl -s "https://mris-api.barokahgroupindonesia.tech/api/webhook/deploy?secret=mris_deploy_secret_2026"`
   (Script yang dieksekusi VPS: `/var/www/deploy.sh`).
8. **Perlindungan Data Input User**: Data real/nyata yang di-input oleh user di database, Web Admin, maupun Mobile POS (misal: transaksi, produk, outlet, akun, laporan, master data) **DILARANG KERAS DIHAPUS, DI-RESET, ATAU DI-OVERWRITE DENGAN KOSONG** saat melakukan update/build Mobile APK maupun Web-based Admin. AI hanya boleh menghapus/cleansing data fake/mock/dummy hardcoded sebagaimana diatur dalam GEMINI.md. Seluruh data real user wajib dipertahankan secara utuh dan aman. Penghapusan data real hanya dilakukan melalui aksi hapus manual dari user di UI/sistem.
9. **Integrasi Thermal Printer Mobile**: Pemindaian printer thermal di POS Mobile wajib menggunakan Web Bluetooth API (`navigator.bluetooth.requestDevice`), **DILARANG** menggunakan dummy device array atau alert simulasi `setTimeout`.
10. **Penanganan Null-Safety & Cache Clearing**:
    - Selalu sertakan pengecekan null (`activeCust ? ... : null`) pada pembacaan objek dari `masterData` untuk mencegah `TypeError: Cannot read properties of null`.
    - Apabila terdapat pembersihan cache lokal tanpa mengganggu database VPS, tingkatkan key `mris_version` di `App.jsx` (contoh: `v57_outlet_clean`).
11. **Rilis APK Khusus Lokal**: Setiap kali melakukan build file APK Android (`.apk`), file APK cukup dirilis/disimpan di direktori lokal komputer pengguna (misal di root workspace). **DILARANG KERAS** meng-commit atau meng-push file `.apk` ke repository GitHub.
12. **🔒 LARANGAN MENYENTUH FITUR/KODE YANG SUDAH SELESAI**:
    - Apabila sebuah fitur, halaman, komponen, fungsi, jalur file, sintaks, atau logika **sudah dinyatakan selesai / sudah berjalan dengan benar**, AI **DILARANG KERAS** mengubah, memindahkan, merestrukturisasi, mengoptimasi, atau menyentuhnya dalam bentuk apa pun — termasuk ketika AI menganggap ada cara yang "lebih baik".
    - AI **tidak diberi kebebasan berinovasi** pada bagian kode yang sudah selesai. Inovasi bebas hanya boleh dilakukan pada fitur / kode baru yang sedang dikerjakan.
    - Satu-satunya pengecualian adalah jika **user secara eksplisit meminta perbaikan** pada bagian tersebut (misalnya: "perbaiki X", "ubah Y", "ada bug di Z").
    - **Contoh yang DILARANG** (meskipun tidak diminta): mengubah nama file/path, mengubah struktur komponen yang sudah jalan, mengganti sintaks yang sudah berfungsi, menambahkan "peningkatan" pada fitur yang sudah selesai, atau mereorganisasi kode sebagai "side effect" dari task lain.
    - **Prinsip**: Jika sudah selesai → simpan dan jangan ganggu. Fokus HANYA pada task yang diminta.
13. **🔒 PERLINDUNGAN MUTLAK DRIVER PRINTER THERMAL (KODE TERKUNCI)**:
    - Driver printer thermal Bluetooth versi **3.2.0** (`✅ Pertama kali BERHASIL — 3 Agustus 2026`) yang terletak pada file:
      - `BluetoothPrinterPlugin.java` (`flutter-pos/android/app/src/main/java/com/mris/finance/BluetoothPrinterPlugin.java` dan `android/app/src/main/java/com/mris/finance/BluetoothPrinterPlugin.java`)
      - `bluetoothPrinter.js` (`src/utils/bluetoothPrinter.js` dan `flutter-pos/src/utils/bluetoothPrinter.js`)
      - Logika scan & print di `AndroidPosRegister.jsx`
    - **TIDAK BOLEH DIUBAH, MERESTRUKTURISASI, ATAU DIUBAH SINTAKSNYA** dalam situasi apa pun.
    - Komponen driver ini mencakup:
      - Strategi 3-tier fallback socket (Secure SPP → Insecure SPP → Reflection Channel 1)
      - Pembungkusan `try-catch` pada `adapter.cancelDiscovery()` dan `device.getName()` untuk pencegahan `SecurityException` di Android 12+
      - Method `@PluginMethod`: `scanDevices`, `connectDevice`, `disconnectDevice`, `printText`, `testConnection`, `checkLiveStatus`
    - **JANGAN DISENTUH ATAU DIKUTAK-KATIK** kecuali ada perintah perbaikan eksplisit langsung dari pengguna.

---

## 🚀 ATURAN DEPLOYMENT VPS — WAJIB DIBACA SEBELUM DEPLOY

### ⚠️ KRITIS: Nginx VPS melayani dari `dist/` (root), BUKAN `web_admin/dist/`

> **TEMUAN 6 Agustus 2026** — Root cause dari semua masalah "tombol tidak berfungsi di VPS tapi berfungsi di local":
> Nginx di VPS (`mris-admin.barokahgroupindonesia.tech`) membaca file dari **`/var/www/erp-barokah/dist/`** (direktori root), **BUKAN** dari `web_admin/dist/`.

### Perintah Deploy yang BENAR:

```bash
# ✅ WAJIB: Build KEDUANYA setiap kali ada perubahan web_admin
cd /Users/argun/Documents/MRIS

# 1. Build web_admin terlebih dahulu
npm --prefix web_admin run build

# 2. WAJIB copy hasil build ke root dist/ (yang di-serve nginx VPS)
cp -r web_admin/dist/assets/index.js dist/assets/index.js
cp -r web_admin/dist/assets/index.css dist/assets/index.css
cp -r web_admin/dist/assets/icons.js dist/assets/icons.js
cp -r web_admin/dist/assets/charts.js dist/assets/charts.js
cp -r web_admin/dist/assets/vendor.js dist/assets/vendor.js
cp web_admin/dist/index.html dist/index.html

# 3. Commit dan push
git add dist/ web_admin/dist/
git commit -m "build: sync dist/ dan web_admin/dist/"
git push origin main
```

```bash
# Di VPS: cukup git pull saja (tidak perlu npm build di VPS)
cd /var/www/erp-barokah && git pull origin main
```

### ❌ JANGAN PERNAH:
- Hanya jalankan `npm --prefix web_admin run build` tanpa copy ke `dist/` → VPS tidak akan berubah!
- Hanya jalankan `git pull` di VPS tanpa memastikan `dist/` sudah diupdate di commit terbaru

---

## 🔒 ARSITEKTUR LOGISTIK — KODE TERKUNCI (STABIL 6 Agustus 2026)

### Status Fungsi Approve di `web_admin/src/components/admin/StockManagement.jsx`

> **DINYATAKAN SELESAI & BERFUNGSI** — Commit: `a1dafdc` + sync dist `90dcb7d`
> **DILARANG DIUBAH, DIGABUNG, ATAU DIRESTRUKTURISASI** sesuai Aturan 12.

### Fungsi Approve TERPISAH (1 fungsi per subtab) — JANGAN DIGABUNG:

| Subtab | Fungsi Handler | Array yang diupdate |
|---|---|---|
| **Stok Masuk** | `handleApproveMasukRecord(record)` | `stockMovement`, `approvedLogistics` |
| **Transfer Stok** | `handleApproveTransferRecord(record)` | `stockTransfer`, `approvedTransfers`, `stockMovement` |
| **Stok Rusak (Waste)** | `handleApproveWasteRecord(record)` | `damagedGoods`, `approvedWaste`, `stockMovement` |
| **Log Opname Audit** | `handleApproveOpnameReport(op)` | `stockOpname`, `approvedLogistics` |

### Pelajaran: Kesalahan Fatal yang Pernah Dilakukan
- ❌ Menggabungkan ke satu fungsi `handleToggleLogisticsStatus(record, logType)` → MERUSAK sinkronisasi
- ❌ Mengubah `<button>` kembali ke `<span>` → STATUS tidak bisa diklik
- ❌ Hanya build `web_admin/dist/` tanpa update `dist/` → VPS tidak berubah
- ❌ Melakukan `curl POST` test ke API server dengan `_lastUpdated: 9999999999999` → merusak merge logic server
- ✅ **Yang benar**: Fungsi terpisah per subtab + `<button>` dengan onClick + sync kedua dist/
