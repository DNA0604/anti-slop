# Dashboard Absensi Pelatihan — Flat Design

Pembaruan tampilan untuk file Google Apps Script yang Anda unggah. Desain memakai sidebar putih, aksen teal, panel datar, tab bergaris, serta tabel dengan status berwarna. Tidak membutuhkan framework atau font eksternal baru.

## Isi paket

- `Index.html`: monitoring kehadiran, filter program/sesi, rekap, catatan, izin, nilai, dan dialog QR yang sudah ada.
- `Pengelolaan.html`: program, sesi, jeda, ringkasan peserta, dan pemeriksaan data.
- `Peserta.html`: impor, pratinjau, dan daftar peserta.
- `Profil.html`: identitas dan riwayat peserta.
- `Absensi.html`: halaman peserta saat membuka tautan QR.
- `AdminQR.html`: generator QR dari proyek asli.
- `Code.gs`: salinan backend asli, identik tanpa perubahan.
- `preview/Pratinjau-Desktop.png` dan `preview/Pratinjau-Mobile.png`: tampilan dengan **data simulasi**.
- `Hasil-Pengujian.txt`: hasil validasi lokal.
- `preview/Pratinjau-Interaktif.html`: contoh monitoring dengan data simulasi. Buka di browser untuk mencoba pencarian, filter, menu, dan kepadatan tabel. Jangan salin file pratinjau ini ke Apps Script.

CSS dan interaksi dashboard sudah tertanam pada setiap HTML. Tidak perlu membuat file CSS/JS tambahan atau mengubah fungsi `doGet`.

## Cara memasang

1. Buka spreadsheet dan proyek Apps Script yang digunakan aplikasi saat ini.
2. Simpan salinan enam HTML lama sebagai cadangan sebelum menggantinya.
3. Ganti seluruh isi file HTML dengan isi file bernama sama dari paket ini: `Index`, `Pengelolaan`, `Peserta`, `Profil`, `Absensi`, dan `AdminQR`. Nama file harus tetap sama. Pada editor Apps Script, ekstensi HTML biasanya ditampilkan otomatis.
4. Pertahankan `Code.gs` yang ada. File `Code.gs` dalam ZIP hanya salinan acuan dari unggahan Anda; pembaruan ini tidak memerlukan perubahan backend.
5. Simpan proyek. Untuk Web App yang sudah diterapkan, buka **Deploy → Manage deployments → Edit → New version → Deploy** agar URL deployment tetap digunakan. Jangan membuat URL baru jika tautan QR lama masih digunakan.
6. Muat ulang aplikasi memakai akun yang memiliki akses sesuai pengaturan proyek.

## Interaksi baru

- Tombol menu menutup/membuka sidebar pada desktop. Pada ponsel, sidebar menjadi panel modal yang dapat ditutup dengan tombol, area luar, atau Escape.
- Tombol baris di pojok kanan atas mengubah tabel menjadi ringkas/renggang. Pilihan disimpan pada browser bila penyimpanan tersedia.
- Tekan `/` untuk memfokuskan kolom pencarian yang sedang terlihat.
- Filter status di monitoring: **Semua**, **Lengkap**, **Perlu diperiksa**, dan **Belum absen**. Filter dapat dipakai bersama pencarian nama. Kelompok perlu diperiksa mencakup status selain lengkap dan belum absen.
- Indikator kelengkapan = jumlah absensi lengkap ÷ jumlah peserta sesi. Angka berasal dari data yang ditampilkan oleh aplikasi, bukan nilai contoh yang ditanam pada produksi. Ringkasan tetap mencakup seluruh peserta sesi meskipun tabel difilter.
- Pada layar sempit, tabel dapat digeser mendatar. Area tabel bisa difokuskan dengan keyboard.
- Navigasi sidebar mengikuti URL Web App dari backend dan membawa program yang sedang dipilih. Bila URL belum tersedia, aplikasi memberi petunjuk membuka halaman melalui menu Google Sheets.

## Yang dipertahankan

Seluruh script aplikasi asli, ID elemen, validasi, pemanggilan `google.script.run`, dialog, impor, dan formula bisnis dipertahankan. `Code.gs` tidak berubah. Penambahan hanya mencakup struktur navigasi, CSS, metadata UTF-8, aksesibilitas, filter tampilan tabel, serta interaksi dashboard yang terpisah dari logika asli.

## Validasi dan batasan

Pengujian lokal Chromium menggunakan mock Google Apps Script dan data simulasi, pada desktop 1440 px dan ponsel 390 px. Monitoring, pemilihan sesi, pencarian, kombinasi filter status, indikator kelengkapan, dialog QR, penyimpanan kepadatan tabel, serta menu seluler telah diperiksa. Halaman lainnya diperiksa untuk pemuatan dan responsivitas; profil diuji pada kondisi belum memilih peserta. Sintaks script diperiksa setelah menyimulasikan evaluasi scriptlet template AdminQR.

Belum terhubung ke akun Google atau spreadsheet produksi. Sesudah pemasangan, periksa alur nyata: hak akses, pemilihan program/sesi, impor peserta, profil peserta, QR datang/pulang, penyimpanan absensi, koreksi, dan perhitungan JP. Bukti lolos pengujian lokal bukan bukti operasi tulis ke Google Sheets berhasil.

Halaman AdminQR tetap mengikuti mekanisme template/pembukaan dari backend asli. Keterangan mode pratinjau yang sudah ada pada sumber asli tidak diubah. Tidak ada deployment yang dilakukan dari lingkungan ini.

## Manifest dan batas paket

`appsscript.json` menyediakan runtime V8 dan zona waktu Asia/Jakarta untuk proyek baru. Untuk proyek yang sudah digunakan, pertahankan pengaturan deployment, cakupan OAuth, dan konfigurasi manifest yang berlaku; cukup ganti enam HTML. Jangan mengunggah folder `preview`, README, atau laporan pengujian sebagai kode Apps Script. Aplikasi memakai spreadsheet aktif, sehingga proyek harus terikat pada spreadsheet yang memiliki struktur data sesuai backend asli. Manifest tidak menyiapkan sheet atau data pelatihan.
