# Validasi pratinjau pemetaan Jenjang

Pratinjau adalah alat baca saja khusus pemilik spreadsheet. Ini bukan migrasi dan tidak menerbitkan ID Jenjang, menulis audit/properti, memulihkan transaksi, menghitung ulang JP, atau membuat spreadsheet akses.

## Pemasangan pada salinan proyek

1. Buat salinan spreadsheet database beserta proyek Apps Script terikatnya. Pastikan proyek salinan sudah berisi versi aplikasi terbaru yang sebelumnya normal, termasuk Code.gs. Buka spreadsheet salinan dengan akun pemiliknya.
2. Dari **Ekstensi → Apps Script**, tambahkan file **Script** bernama `PemetaanJenjang` dan file **HTML** bernama `PratinjauJenjang`.
3. Salin seluruh isi PemetaanJenjang.gs dan PratinjauJenjang.html dari branch yang sama. Tidak mengganti Code.gs, Pengelolaan.html, atau sepuluh file aplikasi sebelumnya. Jangan membuat sheet/kolom Jenjang secara manual untuk mencoba panel ini.
4. Simpan. Pilih fungsi **bukaPratinjauPemetaanJenjang** pada daftar fungsi editor, lalu klik **Jalankan**. Jika Google meminta otorisasi, gunakan akun pemilik salinan. Kembali ke tab spreadsheet: panel pratinjau tampil di sana, bukan di tab editor atau web app.
5. Tidak perlu deployment baru. Tidak ada menu/sidebar atau rute web app baru. Untuk membuka kembali, jalankan fungsi pembuka yang sama. Fungsi muatPratinjauPemetaanJenjang adalah RPC pembaca, bukan fungsi pembuka panel.

Jika Code.gs pada salinan belum berisi wajibPemilikIndex_, gunakan sumber aplikasi terbaru yang diterima pengguna sebelum menambahkan kedua file. Jangan menambahkan duplikat Code.gs atau menyalin folder tests/preview ke Apps Script. Pertahankan manifest dan deployment asli.

## Yang ditampilkan

- Seluruh program, termasuk selesai dan program tanpa sesi/pendaftaran; ID/nama, Jenjang lama, status program, jumlah sesi, seluruh keikutsertaan dan jumlah berstatus terdaftar.
- Usulan satu Jenjang hanya ketika teks lama tunggal dan tidak ada penghalang yang ditemukan. Ini tetap perlu tinjauan manusia dan tidak menyatakan seluruh data program pasti homogen.
- Status **Perlu penetapan Jenjang** untuk kosong; **Perlu pemetaan manual** untuk penanda teks ambigu; **Periksa migrasi sebelumnya** saat ditemukan sheet Jenjang/kolom id_jenjang; **Terhalang masalah data** untuk ID/relasi/transaksi bermasalah. Penghalang mengambil prioritas status, sementara Jenjang lama/ID baru tetap terlihat di rincian.
- Rincian sesi dan peserta dengan ID serta baris fisik sumber. Status keikutsertaan lain tidak dihapus/disembunyikan. Peserta lintas program tidak digabung sebagai satu pendaftaran.
- Temuan dengan sheet, baris, ID dan saran; pratinjau tidak memperbaiki temuan. Referensi program yang tidak ditemukan dianggap masalah global. Riwayat berstatus kosong tidak menciptakan transaksi baru atau menutup PENDING; status eksplisit terakhir dinormalisasi; cadangan_hapus dilewati seperti klasifikasi fitur hapus yang sudah diterima.
- Karena pemetaan menyiapkan seluruh database, transaksi nonterminal apa pun menahan seluruh usulan. Ini lebih luas daripada penghapusan yang hanya memeriksa transaksi terkait; **aturan fitur hapus tidak diubah**.
- Nama sumber, waktu/zona spreadsheet dan sidik sumber SHA-256 mencakup identitas spreadsheet, nilai bertipe tanggal, formula dan kolom tambahan dari sheet yang dibaca. Sidik bukan otorisasi atau rencana yang dapat diterapkan. Sheet tambahan di luar cakupan belum diaudit.

Tidak mengirim NIP, hash/token QR, bukti atau snapshot audit ke browser. Nama peserta dan ID pendaftaran tetap ditampilkan untuk pemeriksaan penempatan. Semua teks sumber dirender sebagai teks, bukan HTML.

## Batas dan cakupan

Membaca Program, Peserta, Sesi, Keikutsertaan, Kehadiran, Catatan_Perilaku, Jeda_Sesi, Token_QR, Log_Absensi dan Riwayat_Validasi; Jenjang dibaca bila sudah ada. Sheet wajib hilang/header tidak sesuai menghasilkan error, bukan ringkasan nol. Jenjang bersifat opsional, bukan dibuat otomatis.

Memeriksa ID utama, hubungan program/peserta/sesi/jeda/token/log, keunikan pendaftaran/kehadiran, konsistensi catatan-kehadiran/log-token, relasi Jenjang bila sudah ada, dan status transaksi eksplisit. Tidak memverifikasi NIP, kebenaran jadwal, indikator, JP atau formula penilaian. Program campuran tanpa penanda teks tidak dapat diketahui otomatis; peninjauan pengelola tetap wajib.

ScriptLock ditahan hanya selama pembacaan/analisis, maksimum tunggu 10 detik; lock dilepas pada keberhasilan/kegagalan. Lock mengoordinasikan penulisan aplikasi, bukan edit manual spreadsheet atau skrip lain yang tidak menggunakan lock tersebut. Hindari perubahan selama pembacaan.

Batas: 50.000 baris data/600.000 sel keseluruhan, 8 juta karakter serialisasi sumber, 1.000 program dan 4 juta karakter respons. Saat batas terlampaui, tidak ada hasil parsial. Riwayat cadangan dapat mencapai batas lebih dahulu; jangan menghapus audit agar pemeriksaan lolos. Tabel dipaginasi 20 baris; maksimum 1.000 temuan dikirim, rincian program menampilkan maksimum 50 temuan dari daftar itu. Jumlah/status masalah dihitung sebelum pemotongan sehingga temuan yang tidak ditampilkan tetap menjadi penghalang. Tidak tersedia ekspor atau penyimpanan keputusan pemetaan pada tahap ini.

## Pengujian lokal

```sh
node --test apps-script/absensi-dashboard/tests/*.test.mjs
python apps-script/absensi-dashboard/tests/browser/pemetaan_jenjang_browser.py
```

26 kasus backend baru + 55 kasus sebelumnya = **81 lulus**. Layanan tiruan memakai implementasi pemilik Code.gs sebenarnya, tripwire untuk operasi tulis, pemeriksaan sumber sebelum/sesudah, dan uji lock, header/sheet hilang, batas, nomor baris, ID/relasi duplikat/orphan/lintas program, status audit, struktur migrasi sebagian, lintas Jenjang, sidik sumber dan pembatasan data respons.

Chromium menggunakan bridge Google tiruan pada desktop 1440 px dan lebar 320/390/768 px: pencarian/filter/paginasi, rincian sesi/peserta, fokus keyboard/Escape, teks berbahaya, empty/error, reload gagal menyembunyikan hasil lama, pencegahan baca ganda saat loading dan kontrak RPC hanya baca. Gambar preview menggunakan **data simulasi**, bukan spreadsheet pengguna.

Sepuluh file aplikasi sebelumnya diperiksa terhadap SOURCE_SNAPSHOT dan tetap identik. Manifest, navigasi/sidebar, fitur hapus dan formula lama tidak diubah. Dua file pratinjau ditambahkan ke snapshot sumber. Pengujian lokal ini belum membuktikan otorisasi, tampilnya dialog HTMLService atau pembacaan pada layanan Google sebenarnya.

## Uji pada salinan Google oleh pengelola

1. Bandingkan jumlah/ID sumber sebelum dan sesudah menjalankan pratinjau. Tidak ada sheet, kolom, audit, properti atau nilai yang seharusnya berubah karena pratinjau.
2. Cocokkan satu program selesai, satu aktif dan satu tanpa sesi/peserta; periksa jumlah pendaftaran seluruh status dan rincian ID/baris.
3. Pada data uji saja, coba Jenjang kosong, teks gabungan, satu ID ganda/relasi hilang dan satu audit transaksi PENDING. Cocokkan temuan serta prioritas status; tutup panel tanpa menerapkan migrasi.
4. Buka dengan akun bukan pemilik: pembuka/RPC harus menolak tanpa data. Coba ulang setelah kegagalan/koneksi terputus: Muat Ulang hanya membaca kembali.
5. Bila pemetaan terlihat sesuai, catat program mana yang membutuhkan Jenjang baru/penempatan manual untuk pembahasan berikutnya. Jangan mengganti audit menjadi SELESAI atau memindahkan data untuk sekadar menghilangkan peringatan.

Status saat penyerahan: validasi lokal selesai; pengujian salinan Google dan pemetaan database live belum dilakukan dari lingkungan ini.
