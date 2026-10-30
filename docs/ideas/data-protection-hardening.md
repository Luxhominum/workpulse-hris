# The Iron Vault: 3-Layer HRIS Data Protection & Web Shield

## 1. Problem Statement
> *"Bagaimana kita menjamin nol kebocoran data (*Zero Data Leak*) atas informasi paling sensitif karyawan (NIK KTP, No KK, Rekening Payroll, surat sakit dokter, dan foto selfie GPS) sehingga sekalipun file database disalin atau link diakses orang luar, data tetap tidak bisa dibaca tanpa hak akses resmi?"*

## 2. Recommended Direction: 3-Layer Defense Strategy

### 🛡️ Layer 1: Secure Media & Uploads Gateway (Proteksi Foto & Surat Sakit)
- Hentikan pembukaan folder `/uploads` secara publik via `express.static`.
- Alihkan pengunduhan/penampilan berkas melalui rute terproteksi: `GET /api/v1/media/:category/:filename` yang memverifikasi token autentikasi (JWT / Signed Token).
- Hanya pemilik foto bersangkutan atau HRD/Admin yang diizinkan mengunduh atau melihat dokumen bukti medis.
- Tambahkan proteksi *Path Traversal* (pencegahan `../../`) dan validasi tipe berkas.

### 🔐 Layer 2: Field-Level AES-256-GCM Encryption at Rest (Penyimpanan Terenkripsi)
- Menerapkan enkripsi simetris standar militer **AES-256-GCM** (dengan *Initialization Vector* acak & *Authentication Tag*) menggunakan modul native Node.js `crypto`.
- Kunci enkripsi (`DATA_ENCRYPTION_KEY`) disimpan di file konfigurasi rahasia `.env`.
- Kolom sensitif (`ktp_number`, `kk_number`, `bank_uob`, `bank_other`) otomatis dienkripsi sebelum ditulis ke database, dan didekripsi saat dibaca oleh layanan resmi.
- Sekalipun ada pihak yang berhasil mengunduh file database `dev.db`, data KTP dan rekening bank hanya berupa karakter acak (*ciphertext*) yang mustahil dibaca.

### 🎭 Layer 3: Strict API Masking & DTO Projections (Sensor Data di Antarmuka)
- **Masking Parsial Otomatis:**
  - NIK KTP: `337205********01` (hanya 6 digit awal & 2 digit akhir terlihat untuk verifikasi).
  - Rekening Bank: `UOB •••• 1234` (hanya 4 digit terakhir terlihat).
- **Pemisahan DTO:** Karyawan biasa hanya dapat melihat profil dirinya sendiri; endpoint umum internal tidak akan pernah membocorkan data pribadi rekan kerja lain.
- Penambahan header keamanan ketat: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, dan pembatasan CSP.

## 3. Key Assumptions to Validate
- [x] Enkripsi AES-256 pada kolom sensitif tidak menambah latensi signifikan pada kueri payroll (<2ms per rekaman).
- [x] Penutupan akses publik `/uploads` dan pengalihan ke authenticated media gateway tetap mempertahankan kelancaran pemuatan foto selfie pada aplikasi mobile dan browser admin.

## 4. MVP Scope
- In:
  - `backend/src/utils/crypto.ts` AES-256-GCM encryptor/decryptor.
  - Enkripsi/dekripsi otomatis di `employees.service.ts`.
  - Media streaming controller terproteksi di `backend/src/modules/media`.
  - Masking NIK KTP & Rekening Bank di response payload.
  - Penyelarasan `resolveMediaUrl` di frontend.
- Out:
  - OS-level full-disk encryption.
  - HSM level perbankan komersial besar.
