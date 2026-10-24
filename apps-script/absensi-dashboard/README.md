# Monitoring Pelatihan Pegawai

Current accepted application source for Pusat Pengembangan Aparatur Komdigi.
Read ../../PROJECT_CONTEXT.md and ../../AGENTS.md first. These supersede the earlier flat UI package notes and old preview/test reports.

## Files to use in Google Apps Script
Code.gs, Beranda.html, Index.html, Pengelolaan.html, Peserta.html, Profil.html, Absensi.html, AdminQR.html.
The project must remain bound to its existing Google Sheet. Retain the deployed manifest/scopes and deployment configuration.

Replace complete contents of files changed for a task. Keep exact file names. Save, and for /exec publish a new version of the existing deployment. Keep the deployment URL so QR links remain valid.

Preview files and Hasil-Pengujian.txt inherited from the older UI branch are historical and do not depict or validate this current snapshot. Do not install preview files as Apps Script application code.

See SOURCE_SNAPSHOT.json for SHA-256 hashes of the eight current HTML/GS source files.

## Memasang halaman Beranda

1. Tambahkan file HTML baru bernama **Beranda** di editor Apps Script, lalu salin seluruh isi Beranda.html.
2. Ganti seluruh isi **Code.gs**, **Index.html**, **Pengelolaan.html**, **Peserta.html**, dan **Profil.html** dari branch yang sama. Menu Beranda pada semua halaman memerlukan pembaruan kelima file ini.
3. Pertahankan **Absensi.html**, **AdminQR.html**, spreadsheet beserta datanya, manifest, dan pengaturan akses/deployment yang sudah digunakan. Folder tests dan preview tidak perlu disalin ke editor Apps Script.
4. Simpan seluruh file. Untuk /dev, buka ulang URL pengujian. Untuk /exec, perbarui deployment yang sudah ada ke versi baru agar URL dan tautan QR tetap sama.
5. Buka URL tanpa parameter: Beranda menjadi halaman awal. Sidebar Monitoring membuka ?page=monitoring. Tautan ?absen=... tetap membuka halaman absensi; nama file Index tetap digunakan untuk Monitoring.

Beranda membaca seluruh database melalui muatBerandaIndex dengan pembatasan akun pemilik yang sudah digunakan aplikasi. Ringkasan bukan filter program terpilih. Jumlah peserta unik berbeda dari jumlah pendaftaran lintas program; program aktif mengikuti status program; sesi mendatang tidak dinilai sebagai absen. Grafik dan angka akan memakai data spreadsheet sebenarnya setelah dipasang, bukan data contoh.

Ringkasan dimuat saat halaman dibuka atau saat Muat Ulang Ringkasan ditekan. Program tanpa sesi/peserta dapat ditelusuri melalui filter. Catatan pending dan absensi yang perlu diperiksa ditindaklanjuti di Monitoring dengan memilih program/sesi terkait. Beranda tidak mengubah data, menjalankan hitung JP, atau menetapkan nilai akhir.

## Validasi Beranda

Dari root repository: `node --test apps-script/absensi-dashboard/tests/beranda.test.mjs` (Node bawaan, tanpa dependency tambahan).

Lihat tests/BERANDA_VALIDATION.md untuk cakupan pemeriksaan lokal dan batasannya. Pemeriksaan produksi tetap perlu dilakukan menggunakan akun Google dan spreadsheet yang sebenarnya. Pratinjau Beranda yang baru memakai data simulasi dan bukan bukti deployment produksi.

## Pembaruan tampilan Absensi QR

Pada branch ui/absensi-komdigi, ganti seluruh isi **Absensi.html** dan **Code.gs** dari branch yang sama. File HTML memakai muatTampilanAbsensiQR untuk menampilkan nama sesi, sehingga kedua file perlu disimpan bersama. Tidak perlu mengubah sheet, ID sesi, token/tautan QR, manifest, atau file admin lainnya untuk pembaruan ini.

Logo sudah tertanam dan sama dengan logo header aplikasi. Halaman menampilkan nama sesi sesuai data pada sheet Sesi setelah token dinyatakan valid. Jika nama belum diisi, halaman menyatakan Nama sesi belum diisi. Pencarian, pemilihan peserta, serta konfirmasi datang/pulang tetap mengikuti backend yang sudah ada.

Simpan kedua file, lalu perbarui versi deployment yang sama agar URL QR tidak berubah. Periksa dengan QR datang dan pulang yang berlaku. Pratinjau pada preview/absensi-komdigi menggunakan data simulasi. Hasil lokal terdapat pada tests/ABSENSI_DISPLAY_VALIDATION.md.

Jalankan seluruh pengujian backend dari root repository: `node --test apps-script/absensi-dashboard/tests/*.test.mjs`.
