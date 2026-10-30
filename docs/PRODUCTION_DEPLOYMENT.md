# Panduan Deployment Produksi & Keamanan WorkPulse HRIS

Dokumen ini menjelaskan langkah-langkah deployment WorkPulse HRIS ke server produksi (VPS Linux Ubuntu/Debian) menggunakan Docker & Nginx Reverse Proxy, serta panduan menandatangani (signing) Android Release APK untuk rilis publik.

---

## 1. Arsitektur Deployment Docker

Sistem produksi diatur menggunakan Docker Compose dengan 3 kontainer utama yang terisolasi di dalam network internal `workpulse-net`:

1. **`workpulse-backend`**: Node.js 20 Alpine, menjalankan Express API di port internal 4000 dengan user non-root (`expressjs:1001`). Database SQLite (`dev.db`), direktori file foto (`uploads/`), dan folder backup dimount ke host.
2. **`workpulse-frontend`**: Node.js 20 Alpine, menjalankan Next.js Standalone server di port internal 3000 dengan user non-root (`nextjs:1001`).
3. **`workpulse-proxy`**: Nginx Alpine resmi sebagai reverse proxy di port 80 (HTTP) dan 443 (HTTPS), menangani caching aset statis Next.js, proxying API/Uploads, gzip compression, dan security headers.

---

## 2. Langkah-Langkah Deployment ke Server VPS

### Langkah A: Clone & Siapkan Environment
```bash
# 1. Pindah ke direktori project
cd hris-attendance

# 2. Buat file .env produksi untuk backend dari template
cp .env.production.example backend/.env

# 3. Edit backend/.env dengan nilai rahasia acak yang kuat:
# Generate token acak:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pastikan variabel berikut terisi di `backend/.env`:
* `JWT_SECRET`: Kunci rahasia 64 karakter heksadesimal.
* `DATA_ENCRYPTION_KEY`: Kunci AES-256-GCM 64 karakter untuk enkripsi data sensitif karyawan.
* `ALLOWED_ORIGINS`: Domain website Anda (misal `https://workpulse.perusahaan.com`).

---

### Langkah B: Menjalankan Kontainer via Docker Compose
```bash
# Build image dan jalankan di background
docker compose up -d --build

# Periksa status container & healthcheck
docker compose ps
docker compose logs -f
```

---

### Langkah C: Konfigurasi SSL / HTTPS dengan Certbot (Let's Encrypt)

1. Jalankan Certbot untuk mendapatkan sertifikat SSL gratis:
```bash
docker run -it --rm --name certbot \
  -v "$(pwd)/nginx/certbot-etc:/etc/letsencrypt" \
  -v "$(pwd)/nginx/certbot-web:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d workpulse.perusahaan.com
```

2. Aktifkan konfigurasi SSL Nginx:
   * Edit file `nginx/conf.d/ssl.conf.template` dan ganti `yourdomain.com` dengan domain Anda.
   * Ubah nama atau salin template menjadi `nginx/conf.d/ssl.conf`:
     ```bash
     cp nginx/conf.d/ssl.conf.template nginx/conf.d/ssl.conf
     ```
   * Reload Nginx:
     ```bash
     docker compose exec nginx nginx -s reload
     ```

---

## 3. Panduan Pembuatan Release Keystore & Signing Android APK

Untuk mendistribusikan APK rilis resmi ke karyawan atau mengunggah ke Google Play Store:

### 1. Buat Android Keystore Baru (Satu Kali Saja)
Jalankan perintah berikut di PowerShell atau Command Prompt (simpan keystore ini baik-baik dan jangan hilang):
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v `
  -keystore "hris-attendance/frontend/android/app/workpulse-release.keystore" `
  -alias workpulse-key `
  -keyalg RSA -keysize 2048 -validity 10000
```
Isi kata sandi dan informasi perusahaan saat diminta.

### 2. Hubungkan Keystore ke Konfigurasi Gradle
Buat file `hris-attendance/frontend/android/keystore.properties` (sudah disediakan contoh di `keystore.properties.example`):
```properties
storeFile=app/workpulse-release.keystore
storePassword=KataSandiKeystoreAnda
keyAlias=workpulse-key
keyPassword=KataSandiKeyAnda
```

### 3. Build Release APK Otomatis
Cukup klik ganda atau jalankan script:
```powershell
.\hris-attendance\build-release-apk.bat
```
Output APK rilis yang sudah teroptimasi dan bertanda tangan akan langsung tersimpan di:
* `hris-attendance/workpulse-v1.1.0-release.apk`
* Ukuran binary release: **~18.2 MB** (terkompresi & teroptimasi dari versi debug 20.1 MB).
