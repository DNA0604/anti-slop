# Monitoring Pelatihan Pegawai

Current accepted application source for Pusat Pengembangan Aparatur Komdigi.
Read ../../PROJECT_CONTEXT.md and ../../AGENTS.md first. These supersede the earlier flat UI package notes and old preview/test reports.

## Files to use in Google Apps Script
Code.gs, Laporan.gs, Beranda.html, Index.html, Pengelolaan.html, Peserta.html, Profil.html, Absensi.html, AdminQR.html.
The project must remain bound to its existing Google Sheet. Retain the deployed manifest/scopes and deployment configuration.

Replace complete contents of files changed for a task. Keep exact file names. Save, and for /exec publish a new version of the existing deployment. Keep the deployment URL so QR links remain valid.

Preview files and Hasil-Pengujian.txt inherited from the older UI branch are historical and do not depict or validate this current snapshot. Do not install preview files as Apps Script application code.

See SOURCE_SNAPSHOT.json for SHA-256 hashes of the nine current HTML/GS source files.

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

## Laporan evaluasi per program (PDF)

Pada branch **feat/laporan-program-pdf**, tambahkan file **Script** baru bernama **Laporan** lalu salin seluruh isi **Laporan.gs**. Ganti seluruh isi **Pengelolaan.html** dari branch yang sama. Fungsi pada Laporan.gs menggunakan helper Code.gs yang sudah ada; Code.gs tidak berubah untuk fitur ini. Jangan membuat file HTML bernama Laporan untuk script backend ini.

Dengan akun pemilik spreadsheet, jalankan **otorisasiLaporanProgram** sekali dari editor Apps Script untuk memberikan izin Google Docs/Drive. Helper hanya membuat dokumen uji lalu memindahkannya ke Sampah. Jika proyek memakai daftar oauthScopes eksplisit, pertahankan scopes lama dan tambahkan `https://www.googleapis.com/auth/documents` serta `https://www.googleapis.com/auth/drive` melalui manifest proyek yang sebenarnya. Tidak perlu mengubah skema sheet atau mengisi kredensial di chat. Proyek dengan deteksi scopes otomatis akan meminta izin layanan yang digunakan script.

Simpan file; untuk /exec, perbarui versi deployment yang sama agar URL QR tetap berlaku. Buka **Pengelolaan**, pilih program yang statusnya **selesai**, lalu **Laporan Program → Buat PDF → Unduh PDF**. Tombol terkunci untuk status lainnya; server memeriksa ulang status dan pemilik pada setiap permintaan. Setelah mengubah status program, muat ulang daftar jika diperlukan.

PDF berisi identitas instansi/program, ringkasan eksekutif, jadwal/jeda/durasi sesi, rekap kehadiran per sesi/peserta, grafik distribusi kehadiran dan status catatan, grafik hingga 10 indikator dengan catatan disetujui terbanyak, rekap JP/nilai perilaku yang sudah tersedia, keterbatasan/tindak lanjut, serta lampiran aktivitas semua status. Grafik indikator bukan peringkat peserta. Bukti file tidak dimasukkan; akses bukti tetap melalui aplikasi.

Persentase kelengkapan menggunakan peserta yang saat ini berstatus terdaftar × sesi berjadwal valid yang telah berakhir, termasuk sesi tanpa JP. Peserta dengan status lain tetap tercantum tetapi dikeluarkan dari penyebut. Sesi mendatang/invalid tidak diasumsikan sebagai tidak hadir. Belum tercatat bukan otomatis tidak hadir. Catatan pending/ditolak tidak diperlakukan sebagai catatan disahkan. Data yang belum tersedia ditandai —, bukan nol; rekap sementara diberi status. Tidak ada hitung ulang atau penulisan JP/nilai, formula nilai akhir baru, atau penetapan kelulusan.

Dokumen Google sementara dibuat untuk menyusun PDF beserta grafik dan dipindahkan ke Sampah setelah ekspor; fitur tidak membuat tautan berbagi publik. Jika pembersihan gagal, peringatan akan meminta pengelola menghapus dokumen TEMP Laporan Pelatihan secara manual. File hasil diunduh dari browser dengan klik eksplisit. Ukuran PDF dibatasi 8 MB, maksimal 1.000 peserta/300 sesi/3.000 catatan per program; batas ini bukan jaminan quota/waktu eksekusi Google cukup untuk seluruh data sebesar itu. Kesalahan quota/izin ditampilkan dan dokumen sementara dibersihkan sejauh diizinkan layanan.

Format awal adalah PDF, belum DOCX. Baca **tests/LAPORAN_VALIDATION.md** untuk batas pengujian lokal dan checklist ekspor Google yang sebenarnya. Jangan menyalin folder tests/preview ke editor Apps Script.
