# Panduan Menjadikan PC Kantor Sebagai Server WorkPulse HRIS

Dokumen ini menjelaskan panduan operasional agar PC Windows Anda dapat berfungsi sebagai **Server Utama Perusahaan (On-Premises Server)** tanpa perlu menyewa cloud server.

---

## 1. Arsitektur & Jalur Akses

PC Anda saat ini memiliki IP Lokal: **`192.168.1.50`**.
Sistem WorkPulse HRIS menyediakan 3 jalur akses sekaligus:

| Lokasi Karyawan | Jalur Akses | Alamat URL yang Digunakan |
|---|---|---|
| **Di PC Server Sendiri** | Localhost | [http://localhost:3000](http://localhost:3000) (Admin: `/admin`) |
| **Di Kantor (Wi-Fi Kantor yang Sama)** | LAN IP Lokal | `http://192.168.1.50:3000` (Kios: `/kiosk`) |
| **Di Luar Kantor (Sales Canvasing / WFH)** | Cloudflare Zero-Trust Tunnel | URL HTTPS resmi dari Cloudflare (contoh: `https://xxx.trycloudflare.com`) |

---

## 2. Persiapan Satu Kali Saja (One-Time Setup)

### Langkah A: Buka Port di Windows Firewall
Agar HP Android atau laptop lain yang tersambung ke Wi-Fi kantor bisa mengakses server PC Anda:
1. Cari file: `setup-firewall-windows.bat`.
2. Klik kanan file tersebut, lalu pilih **"Run as administrator"**.
3. Port `3000` (Web) dan `4000` (API) akan otomatis diizinkan.

---

## 3. Cara Menjalankan Server Setiap Hari (Daily Run)

Anda cukup mengklik ganda file:
👉 [**`start-server-pc.bat`**](file:///c:/Users/User/Documents/antigravity/Project%20Aneh/hris-attendance/start-server-pc.bat)

Script ini secara otomatis akan:
1. **Membuat backup otomatis snapshot SQLite & file foto** ke folder `backend/backups/`.
2. Mendeteksi IP lokal PC Anda secara otomatis.
3. Menjalankan Backend Core Engine (Port 4000).
4. Menjalankan Frontend Web Portal (Port 3000).
5. Membuka **Cloudflare Secure Tunnel** (sehingga karyawan di luar kantor bisa absen lewat jaringan internet 4G/5G).

---

## 4. Tips Agar Server Tetap Stabil & Online

1. **Atur Windows Power & Sleep:**
   * Buka *Windows Settings > System > Power & sleep*.
   * Pada bagian **"When plugged in, PC goes to sleep after"**, ubah menjadi **"Never"**.
2. **Koneksi Jaringan:**
   * Gunakan kabel LAN (Ethernet) untuk PC server agar alamat IP tidak sering berubah dan koneksi stabil.
3. **Download Aplikasi Mobile Karyawan:**
   * Karyawan dapat mengunduh file APK rilis langsung dari browser HP dengan membuka:
     `http://192.168.1.50:4000/download-apk`
