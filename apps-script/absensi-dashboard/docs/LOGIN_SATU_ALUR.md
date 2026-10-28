# Satu tautan aplikasi untuk login panitia

Branch ui/login-satu-alur, 28 Oktober 2026, Asia/Jakarta. Melanjutkan penerimaan fitur verifikasi sesi pada source 3064b70 dan dokumentasi a6611a8.

## Pemasangan

1. Ganti lengkap **Akses.gs saja**. Semua file lain tetap versi yang sudah berfungsi, termasuk paket verifikasi sesi.
2. Simpan. Manage deployments → Edit deployment yang sama → New version → Deploy. Pertahankan URL `/exec` dan Authorized redirect URI yang sudah sesuai.
3. Buka ulang URL aplikasi utama. Tidak perlu membuat tab, migrasi, mendaftarkan ulang akun atau mengubah aktivasi/OAuth.

## Alur panitia

Admin tetap mendaftarkan nama/email/peran/status dan penugasan Program/Jenjang seperti sekarang. Spreadsheet akses terpisah dan seluruh formulir pendataan tetap digunakan.

Pada Manajemen Akses, card **Tautan Masuk Aplikasi** menampilkan URL utama. Gunakan Salin Tautan atau Buka Aplikasi. Jika clipboard browser tidak tersedia, teks dipilih agar dapat disalin manual. Tautan staf tersedia ketika Login Aplikasi aktif; pengaturan awal tetap hanya untuk pemilik.

Petugas cukup membuka URL tersebut, menunggu tombol **Masuk dengan Google** siap, lalu memilih akun Google. Sistem memverifikasi identitas, menautkan akun terdaftar bila ini login pertama, memeriksa peran/penugasan dan menampilkan Beranda otomatis. Tidak ada halaman uji terpisah atau tombol Siapkan Login/Lanjutkan ke Google/Buka Aplikasi dalam alur aplikasi biasa. Akun dengan sesi yang masih berlaku langsung membuka Beranda. Tautan lama `?page=masuk` tetap menuju alur yang sama.

Google tetap dapat meminta pemilihan akun/persetujuan. Jika OAuth masih Testing, email panitia tetap harus berada di daftar Test users Google Cloud. Waktu proses/jaringan Google tetap ada; pembaruan ini mengurangi langkah dan pemuatan halaman, bukan menjanjikan durasi tertentu.

## Diagnostik dan kegagalan

**Diagnostik Identitas** di konfigurasi pemilik (`?page=uji-login`) tetap uji identitas saja dan tidak membuat sesi aplikasi. Gunakan untuk penyiapan awal/pemeriksaan masalah, bukan sebagai langkah wajib setiap petugas. Batas tujuan alur tetap diperiksa server.

Login yang dibatalkan, akun nonaktif/tidak terdaftar, ikatan browser hilang atau penyimpanan diblokir tetap menutupi seluruh data. Setelah memperbaiki penyebab, gunakan tombol login/retry di tab yang sama. Tautan Google yang menunggu terlalu lama (270 detik) disiapkan ulang saat diklik; klik sekali lagi setelah siap. Jangan membuka callback lama atau memindahkan proses ke tab lain.

URL callback dibersihkan menggunakan API riwayat Apps Script; token sesi tetap di sessionStorage, tidak dalam URL. Callback aplikasi memverifikasi kode melalui endpoint server lama lalu memeriksa sesi aktif sebelum melepas permintaan data. Beranda dibuka dalam dokumen callback yang sama untuk menghindari pengalihan top-frame tanpa klik pengguna pada sandbox HTMLService. Tidak ada bypass identitas atau penyimpanan identitas browser sebagai otoritas.

## Uji setelah deploy

1. Pada profil browser yang belum login, buka URL utama. Tombol menyiapkan Google lalu dapat diklik; tidak perlu membuka tautan uji.
2. Gunakan akun petugas aktif yang baru didaftarkan dan belum diuji identitas terpisah. Setelah memilih Google, Beranda terbuka otomatis dengan identitas/penugasan yang benar.
3. Ulangi dengan Admin dan petugas lain pada profil browser terpisah. Periksa isolasi Jenjang tetap sama.
4. Muat ulang dan pindah halaman saat sesi berlaku: tidak diminta login ulang. Membuka `?page=masuk` dengan sesi berlaku juga membuka Beranda.
5. Log Out, masuk lagi; akun nonaktif tetap ditolak. Bila Google dibatalkan, data tetap tertutup dan login dapat dimulai kembali.
6. Pastikan card tautan pada Manajemen Akses memuat URL yang tersimpan, sedangkan formulir akun/penugasan dan fitur verifikasi sesi tetap bekerja seperti versi yang telah diterima.

## Validasi lokal dan batas bukti

220 tes Node (215 sebelumnya + 5 route/purpose/akun baru/QR) lulus. Pemeriksaan 61 source/generated scripts serta ID HTML dan 14 hash sumber lulus. Chromium menggunakan HTML aktual dari renderer dan bridge Google tiruan untuk satu klik anchor ke origin OAuth tiruan, redirect kembali pada tab yang sama, callback tertunda tanpa permintaan bisnis prematur, Beranda Admin/petugas desktop/mobile, sesi yang sudah aktif, ikatan browser hilang, penolakan akun dan penyimpanan diblokir. Suite direktori/proof serta regresi verifikasi/navigasi/sidebar/logout tetap lulus. Agent tidak mengganti data/deployment Google dan tidak mengukur waktu layanan nyata. Perilaku OAuth, history, storage dan sandbox pada deployment HTMLService harus dikonfirmasi pengguna.
