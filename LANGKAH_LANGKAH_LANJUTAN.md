# 🚀 PANDUAN LANGKAH-LANGKAH LANJUTAN DEPLOYMENT MRIS RESTORAN
**Domain Resmi**: `barokahgroupindonesia.tech`  
**Repository GitHub**: `https://github.com/bangargun/MRIS.git`  
**Port API Khusus MRIS**: `4000` *(Diterapkan isolasi port ketat agar tidak bentrok dengan domain lain di 1 VPS)*

---

## 📌 TAHAP 1: ARANKAN DNS DOMAIN KE IP VPS HOSTINGER

Buka portal **Domain / DNS Zone Editor** di Hostinger / tempat Anda membeli domain `barokahgroupindonesia.tech`, lalu tambahkan/edit 2 DNS Record berikut:

| Type | Name / Host | TTL | Target / Point To |
| :--- | :--- | :--- | :--- |
| **A** | `@` | Auto (14400) | `[IP_VPS_HOSTINGER_ANDA]` |
| **A** | `www` | Auto (14400) | `[IP_VPS_HOSTINGER_ANDA]` |

---

## 💻 TAHAP 2: SETUP SERVER & DATABASE DI VPS HOSTINGER (COP-PASTE PERINTAH)

Buka aplikasi **Terminal** di Mac Anda dan jalankan perintah di bawah ini secara berurutan:

### 1. Login SSH ke VPS Hostinger Anda
```bash
ssh root@IP_VPS_HOSTINGER_ANDA
```
*(Ganti `IP_VPS_HOSTINGER_ANDA` dengan IP server VPS Anda, lalu masukkan password root).*

---

### 2. Update System & Install Tooling (Nginx, Node.js 20, Git, PM2 & Certbot)
Copy-paste perintah ini sekaligus ke terminal VPS Anda:
```bash
sudo apt update && sudo apt install -y nginx git certbot python3-certbot-nginx curl && \
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt install -y nodejs && \
sudo npm install -g pm2
```

---

### 3. Clone Repository MRIS & Buat Folder Database Terisolasi
```bash
cd /var/www
sudo git clone https://github.com/bangargun/MRIS.git
cd /var/www/MRIS
sudo mkdir -p data
```

---

### 4. Install Dependencies & Build Web Dist Production
```bash
npm install
npm run build
```

---

### 5. Buat Konfigurasi Nginx Terisolasi (Port 4000 Khusus MRIS)
Jalankan perintah ini untuk membuka editor file Nginx:
```bash
sudo nano /etc/nginx/sites-available/barokahgroupindonesia.tech
```

Copy dan Paste seluruh teks konfigurasi di bawah ini ke dalam editor `nano`:
```nginx
server {
    listen 80;
    server_name barokahgroupindonesia.tech www.barokahgroupindonesia.tech;

    # Serve static frontend web dist
    root /var/www/MRIS/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests ke Backend Server MRIS di Port 4000 (Terisolasi Total)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Enable Gzip Compression untuk Kecepatan Maksimal
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```
> 💡 **Cara Simpan di Nano**: Tekan **`Ctrl + O`**, lalu tekan **`Enter`**. Setelah itu tekan **`Ctrl + X`** untuk keluar.

---

### 6. Aktifkan Site Nginx & Restart Web Server
```bash
sudo ln -s /etc/nginx/sites-available/barokahgroupindonesia.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 7. Install Sertifikat SSL Gratis (HTTPS Gembok Hijau)
```bash
sudo certbot --nginx -d barokahgroupindonesia.tech -d www.barokahgroupindonesia.tech
```
*(Ketik email Anda dan jawab `Y` saat diminta konfirmasi).*

---

### 8. Jalankan Database & API Server 24/7 via PM2
```bash
cd /var/www/MRIS
pm2 start server.js --name "mris-backend"
pm2 save
pm2 startup
```

---

## 🔄 TAHAP 3: CARA UPDATE OTOMATIS JIKA ADA PERUBAHAN KODE DI KEMUDIAN HARI

Jika Anda melakukan update kode di komputer lokal dan sudah push ke GitHub, Anda cukup jalankan 1 baris perintah ini di VPS Hostinger:

```bash
cd /var/www/MRIS && git pull origin main && npm run build && pm2 restart mris-backend
```

---

## 📱 TAHAP 4: OPERASIONAL ALUR PENGGUNAAN

### 1. Untuk Owner & Manajemen (Laptop / Mac / iPad / Browser HP)
- Buka URL: **`https://barokahgroupindonesia.tech`**
- Masuk melalui **Papan Login Khusus Manajemen** (`🚫 Restricted Access Gate`):
  - 👑 **Super Admin**: Username `superadmin` | Password `888` (atau `master` / `1234`)
  - 💼 **Owner**: Username `owner` | Password `999`
  - 🏢 **Admin Operasional**: Username `dewi_admin` | Password `123`

### 2. Untuk Kasir (Tablet / HP Android Outlet)
- Kirim file installer **`MRIS_POS_Kasir.apk`** dari folder laptop Anda ke perangkat Android kasir.
- Install file APK di Android.
- Kasir membuka aplikasi untuk **Buka Shift (Input Modal Kas)**, **Transaksi Penjualan**, **Cetak Struk**, dan **Tutup Shift**.
- Seluruh data penjualan kasir akan otomatis tersinkronisasi ke Web Management Dashboard Owner secara *real-time*!
