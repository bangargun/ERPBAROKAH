# 🚀 PANDUAN DEPLOYMENT ISOLASI KHUSUS MRIS (`barokahgroupindonesia.tech`)
**IP VPS Hostinger**: `187.77.122.142`  
**Domain Baru MRIS**: `barokahgroupindonesia.tech` *(Terisolasi 100% dari domain `barokahgroupindonesia.com`)*  
**Port API Khusus MRIS**: `4000`  
**Nama Layanan PM2**: `mris-app-tech`

---

## 📌 TAHAP 1: ATUR DNS MANAGEMENT DI DOMAIN `barokahgroupindonesia.tech`

Masuk ke hPanel Hostinger pada domain **`barokahgroupindonesia.tech`**, pilih menu **DNS/Nameserver**.

### 💡 SOLUSI CARA MENGATASI ERROR `CNAME www` DI HOSTINGER:
Hostinger menolak CNAME `www` jika di tabel bawah sudah ada record `www` lama. **Gunakan Tipe A untuk `www` dengan IP `187.77.122.142`** (jauh lebih stabil dan 100% tanpa error).

Masukkan 4 Record Tipe **A** berikut ini di Hostinger:

| Tipe | Nama | Value / Konten (IP) | TTL | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `187.77.122.142` | `14400` | Domain Utama MRIS |
| **A** | `www` | `187.77.122.142` | `14400` | Subdomain WWW *(Ganti tipe ke A agar tidak bentrok)* |
| **A** | `mris-admin` | `187.77.122.142` | `14400` | Subdomain Web Admin Executive |
| **A** | `mris-api` | `187.77.122.142` | `14400` | Subdomain API Backend MRIS |

*(Jika ada tombol sampah pada `www` lama di tabel daftar record bawah, hapus `www` lama terlebih dahulu sebelum menekan Tambahkan Record).*

---

## 💻 TAHAP 2: SETUP PERINTAH SSH (JALANKAN DI TERMINAL VPS `187.77.122.142`)

Buka Terminal Mac Anda dan ikuti perintah di bawah ini:

### 1. Login SSH ke VPS Hostinger
```bash
ssh root@187.77.122.142
```

---

### 2. Clone Proyek ke Folder Terisolasi `/var/www/MRIS_TECH`
```bash
cd /var/www
sudo git clone https://github.com/bangargun/MRIS.git MRIS_TECH
cd /var/www/MRIS_TECH
sudo mkdir -p data
```

---

### 3. Install Dependencies & Build Production Web Dist
```bash
npm install
npm run build
```

---

### 4. Buat Konfigurasi Nginx Terisolasi
Jalankan perintah ini:
```bash
sudo nano /etc/nginx/sites-available/barokahgroupindonesia.tech
```

Copy dan paste seluruh konfigurasi Nginx di bawah ini ke dalam editor `nano`:
```nginx
server {
    listen 80;
    server_name barokahgroupindonesia.tech www.barokahgroupindonesia.tech mris-admin.barokahgroupindonesia.tech mris-api.barokahgroupindonesia.tech;

    # Folder Terisolasi Khusus MRIS TECH
    root /var/www/MRIS_TECH/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Khusus Port 4000 (Terisolasi dari aplikasi .com)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```
> 💡 **Cara Simpan di Nano**: Tekan **`Ctrl + O`** ➔ **`Enter`** ➔ Tekan **`Ctrl + X`**.

---

### 5. Aktifkan Nginx & Install SSL HTTPS
```bash
sudo ln -s /etc/nginx/sites-available/barokahgroupindonesia.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d barokahgroupindonesia.tech -d www.barokahgroupindonesia.tech -d mris-admin.barokahgroupindonesia.tech -d mris-api.barokahgroupindonesia.tech
```

---

### 6. Jalankan Server Database MRIS via PM2 (Port 4000)
```bash
cd /var/www/MRIS_TECH
PORT=4000 pm2 start server.js --name "mris-app-tech"
pm2 save
```

---

## 🛠️ TAHAP 3: ALUR UPDATE / PERBAIKAN BUG DI KEMUDIAN HARI (LOCAL ➔ GITHUB ➔ VPS)

```
[Komputer Lokal (Mac)] ➔ 1. Edit & Tes Lokal ➔ 2. Git Commit & Push ➔ [GitHub] ➔ 3. Pull & Build di VPS
```

### 1. Edit & Tes Lokal di Mac
```bash
npm run dev
```

### 2. Commit & Push ke GitHub
```bash
git add .
git commit -m "Fix bug / update fitur"
git push origin main
```

### 3. Deploy Update di VPS (1 Baris Perintah & Permanent Autostart)
```bash
cd /var/www/erp-barokah && git pull origin main && npm run build && pm2 restart erp-barokah && pm2 save
```
