# 📌 Protokol Wajib: Periksa GEMINI.md & ingat.md Sebelum Eksekusi

Setiap kali berinteraksi dalam proyek MRIS, asisten AI WAJIB menjalankan protokol berikut:

## 1. Wajib Baca Aturan Sebelum Eksekusi
- Sebelum menulis, mengedit file, atau menjalankan perintah apa pun, asisten WAJIB memeriksa:
  1. `/Users/argun/Documents/MRIS/GEMINI.md`
  2. `/Users/argun/Documents/MRIS/ingat.md`
- Seluruh ketentuan, larangan, arsitektur, format jam titik dua (`HH:mm:ss`), isolasi akun (`webAdminAccounts` vs `mobileAccounts`), dan 5 ID cabang resmi di kedua file tersebut adalah HUKUM MUTLAK yang tidak boleh dilanggar.

## 2. Larangan Mutlak Data Mock / Palsu (Strict Real Data Policy)
- DILARANG membuat data mock, nama item tiruan ("Menu Paket Restoran", "Pesanan Menu", dummy objects), atau sampel transaksi buatan.
- Jika data di database / API bernilai kosong atau null, BIARKAN TETAP KOSONG (`[]`, `null`, `0`, atau tampilan state kosong/empty state yang sesuai).
- Seluruh angka, laporan keuangan, stok, dan menu harus 100% berasal dari data nyata MySQL / SQLite / masterData JSON persisten.

## 3. Pengerjaan Local-First & Izin Deploy
- Semua pengerjaan kode, editing file, dan build dilakukan di lingkungan LOCAL.
- DILARANG deploy ke VPS atau mengubah server production sebelum ada instruksi eksplisit dari pengguna (misal: "deploy", "minta deploy", "deploy ke vps").

## 4. Larangan Improvisasi Tanpa Izin (Zero Unauthorized Improvisation)
- Asisten hanya mengeksekusi apa yang secara eksplisit diminta pengguna.
- Ide penyempurnaan atau optimasi tambahan wajib disampaikan sebagai proposal terlebih dahulu dan menunggu persetujuan eksplisit dari pengguna sebelum dieksekusi.
