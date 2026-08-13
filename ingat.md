# 📌 PERATURAN & INGATAN UTAMA PROYEK MRIS (ingat.md)

> **PENTING**: Sebelum melakukan eksekusi, pembuatan fitur, perbaikan bug, atau penulisan kode apa pun dalam proyek MRIS, WAJIB memeriksa dan mematuhi aturan di file ini.

---

## ⛔ 1. Larangan Data Mock / Palsu (Strict Real Data Policy)
- **Jangan Pernah Membuat Data Mock atau Data Palsu**:
  Jika data dari database, API, atau backend bernilai kosong/kosong dari sumber asli, **biarkan tetap kosong** (`[]`, `null`, `0`, atau tampilan state kosong/empty state yang sesuai).
- **Dilarang Menyuntikkan Dummy Data**:
  Jangan menyuntikkan array dummy, sampel transaksi buatan, nama produk tiruan, atau fallback angka buatan sendiri ke dalam komponen web admin maupun mobile app.
- **Satu Sumber Data Asli**:
  Seluruh angka, transaksi, laporan keuangan, stok, dan user harus 100% berasal dari data nyata di MySQL / SQLite / masterData JSON persisten.

---

## 🛡️ 2. Aturan Sync & Deploy (dari gemini.md)
- **Single Source of Truth**: `web_admin/src/` adalah sumber utama kode Web Admin.
- **Deploy Perintah Tunggal**: Selalu gunakan `npm run deploy` dari laptop lokal (`/Users/argun/Documents/MRIS`). Jangan jalankan deploy dari SSH VPS.
- **APK Naming & Versioning**: Penamaan APK rilis harus selalu menggunakan versi bertambah yang jelas dan universal fleksibel untuk semua layar tablet & phone.

---

## 📱 3. Aturan Alur Transaksi POS Kasir (Non-FIFO & Flexible Cart Access)
- **Fleksibilitas Transaksi Belum Dibayar**:
  Setiap transaksi yang belum dibayarkan (Dine In Meja, Take Away, Pesanan Gantung/Hold Order) dapat dimasukkan ke keranjang (Cart) kapan saja.
- **Bebas Akses Kapan Saja (Tanpa Aturan FIFO)**:
  Kasir dapat melakukan pembayaran, perubahan (tambah/kurang menu), atau pembatalan untuk pesanan mana pun **kapan saja secara acak/fleksibel TANPA harus mengikuti antrean FIFO (First In First Out)**.
- **Tombol Batal di Cart**:
  Menekan tombol Batal/Kosongkan di Cart hanya membatalkan/mengosongkan sesi keranjang aktif tanpa mengubah urutan pesanan gantung lainnya dan TANPA memicu cetak struk otomatis.
