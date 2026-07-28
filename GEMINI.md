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
)}
```

---

## 🏗️ ARSITEKTUR MRIS

### Stack Teknologi
- **APK Android**: React + Vite → Capacitor → Android (`flutter-pos/`)
- **Backend/API**: Node.js Express (`server.js` + `pos-backend/`)
- **Web Admin**: React (`web_admin/`)
- **Data Storage**: MySQL `mris_db` (`mris_master_data` table) sebagai Primary Storage, diakses via `/api/master-data` (dengan JSON fallback backup)

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

### Environment
- Java: `/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home`
- Node: `/Users/argun/Desktop/ChatGPT.app/Contents/Resources/cua_node/bin`
- APK selalu di-commit ke `main` branch di GitHub

---

## ⚡ PERFORMA

- Gunakan `useMemo` untuk kalkulasi berat yang bergantung pada `masterData`
- Gunakan `useCallback` untuk handler yang diteruskan ke child component
- Gunakan `useDebounce(300ms)` untuk semua input pencarian/filter
- JANGAN biarkan `outletTransactions.filter()` atau `cart.reduce()` jalan tanpa `useMemo`

---

## 🔢 VERSIONING

- Format versi: `vX.X.Y` — increment `Y` setiap perbaikan kecil, `X.Y` setiap fitur baru
- Versi saat ini: **v2.0.46**
- Nama file APK: `MRIS_vX.X.Y_Build_YYYYMMDD_HHMM.apk`
- Commit message format: `Jenis: deskripsi singkat (vX.X.Y)`

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
   `curl -s "https://mris-admin.barokahgroupindonesia.tech/api/webhook/deploy?secret=mris_deploy_secret_2026"`
   (Command yang berjalan di VPS: `cd /var/www/MRIS_TECH && git fetch origin && git reset --hard origin/main && cd web_admin && npm run build && cp -r dist/* ../dist/ && pm2 restart mris-app-tech`).
8. **Perlindungan Data Input User**: Data real/nyata yang di-input oleh user di database, Web Admin, maupun Mobile POS (misal: transaksi, produk, outlet, akun, laporan, master data) **DILARANG KERAS DIHAPUS, DI-RESET, ATAU DI-OVERWRITE DENGAN KOSONG** oleh AI. AI hanya boleh menghapus/cleansing data fake/mock/dummy hardcoded sebagaimana diatur dalam GEMINI.md. Penghapusan data real hanya dilakukan melalui aksi hapus manual dari user di UI/sistem.
