# 🚀 PANDUAN DEPLOYMENT ISOLASI KHUSUS MRIS (`barokahgroupindonesia.tech`)
**IP VPS Hostinger**: `187.77.122.142`  
**Domain Baru MRIS**: `barokahgroupindonesia.tech` *(Terisolasi 100% dari domain `barokahgroupindonesia.com`)*  
**Port API Khusus MRIS**: `4000`  
**Nama Layanan PM2**: `mris-app-tech`

---

## 📌 TAHAP 1: ATUR DNS MANAGEMENT DI DOMAIN `barokahgroupindonesia.tech`

Masuk ke hPanel Hostinger pada domain **`barokahgroupindonesia.tech`** (bukan `.com`), pilih menu **DNS/Nameserver**, lalu masukkan DNS Record berikut:

| Tipe | Nama | Konten / Value | TTL | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `187.77.122.142` | `14400` | Domain Utama MRIS |
| **A** | `mris-admin` | `187.77.122.142` | `14400` | Subdomain Web Admin Executive *(Membedakan dari admin-pos `.com`)* |
| **A** | `mris-api` | `187.77.122.142` | `14400` | Subdomain API Backend MRIS *(Membedakan dari pos-api `.com`)* |
| **CNAME** | `www` | `barokahgroupindonesia.tech` | `300` | CNAME Alias |

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

## 🔍 HASSIL AKHIR ISOLASI REKAYASA:
1. **Domain `.com`** (Aplikasi Lama Anda): Tetap berjalan di `187.77.122.142` tanpa terganggu sama sekali.
2. **Domain `.tech`** (Aplikasi Baru MRIS): Berjalan di folder `/var/www/MRIS_TECH`, port `4000`, dan PM2 `mris-app-tech`.
3. **Database**: Terisolasi 100% di `/var/www/MRIS_TECH/data/` sehingga **mustahil data saling bocor / tertukar**.
