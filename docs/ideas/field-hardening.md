# The Invisible Guardian: Field Resilience & Weak Signal Hardening

## 1. Problem Statement
> *"Bagaimana kita mengeliminasi 100% kegagalan presensi dan komplain data alpa bagi staf di area sinyal lemah (gang ruko, pelosok canvasing) dan area atap seng/pabrik tanpa menambah beban tombol baru bagi karyawan?"*

## 2. Recommended Direction: Arah A (Automasi Senyap & Tangguh)
Sistem bekerja secara adaptif dan cerdas di latar belakang (*invisible*):
1. **Dynamic Geofence Elasticity (Toleransi Sinyal Satelit Melemah):**
   Ketika karyawan berada di dalam pabrik atau gudang beratap seng/beton, akurasi GPS satelit sering melemah (`accuracy` sensor melebar >20 meter). Sistem secara otomatis menghitung *uncertainty margin* ini ke dalam radius toleransi kantor (misal 100m + toleransi akurasi satelit hingga maks +30m), sehingga karyawan tidak terblokir *"Di Luar Radius"* secara keliru.
2. **Weak-Signal Adaptive Timeout (Anti-Hang 10 Detik):**
   Saat koneksi seluler lambat (2G/E), proses unggah foto presensi sering menggantung tanpa batas waktu. Kita menyematkan `AbortController` 10 detik: jika sinyal tidak merespons dalam 10 detik, sistem **tidak menampilkan error gagal**, melainkan langsung mengalihkannya secara senyap ke **Antrean Offline Lokal** dengan notifikasi ramah: *"Presensi tersimpan aman & otomatis dikirim saat sinyal membaik"*.
3. **Adaptive Image Compression (Payload Ultra-Ringan ~40KB):**
   Pada koneksi lambat, resolusi dan kompresi selfie disesuaikan secara otomatis ke *WebP 640px* (~40KB). Foto tetap sangat tajam untuk audit HRD, namun dapat terkirim dalam waktu di bawah 1 detik bahkan pada jaringan 3G/H+.
4. **Idempotent Silent Sync (Anti-Duplikasi Data):**
   Setiap presensi offline memiliki `idempotency_key` unik. Saat sinyal pulih dan HP mengirim ulang antrean, server menjamin tidak akan terjadi duplikasi catatan jam masuk ganda.

## 3. Key Assumptions to Validate
- [x] Toleransi akurasi satelit GPS (+15m s/d +30m) efektif mengatasi *GPS drift* di dalam ruangan tanpa disalahgunakan karyawan yang benar-benar berada jauh dari kantor.
- [x] Timeout 10 detik yang langsung beralih ke antrean offline menghilangkan komplain *"aplikasi muter-muter / loading lama"* di lapangan.
- [x] Foto selfie WebP ~40KB sudah lebih dari cukup untuk verifikasi wajah oleh HRD di dashboard admin.

## 4. MVP Scope
### In Scope:
- `useGeolocation.ts` dynamic accuracy-based radius buffer.
- `api.ts` AbortController 10s timeout on clock-in / clock-out / store check-in.
- Seamless auto-fallback to `OfflineQueue` when fetch times out or fails with network error.
- `imageCompressor.ts` adaptive quality adjustment on mobile devices.
- Metadata `is_offline_sync` dan `gps_accuracy` pada rekaman presensi.

### Out of Scope:
- Manual diagnostic test screens (user chose silent automation).
- Storing full raw 4K camera photos (guarantees timeouts on weak signal).
- Hard blocking when GPS accuracy is low inside warehouse.
