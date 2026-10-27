# Monitoring Pelatihan Pegawai

Current accepted application source for Pusat Pengembangan Aparatur Komdigi.
Read ../../PROJECT_CONTEXT.md and ../../AGENTS.md first. These supersede the earlier flat UI package notes and old preview/test reports.

## Files to use in Google Apps Script
Code.gs, Laporan.gs, Hapus.gs, Jenjang.gs, Akses.gs, PemetaanJenjang.gs, Beranda.html, Index.html, Pengelolaan.html, Peserta.html, Profil.html, Absensi.html, AdminQR.html, PratinjauJenjang.html.
The project must remain bound to its existing Google Sheet. Retain the deployed manifest/scopes and deployment configuration.

Replace complete contents of files changed for a task. Keep exact file names. Save, and for /exec publish a new version of the existing deployment. Keep the deployment URL so QR links remain valid.

Preview files and Hasil-Pengujian.txt inherited from the older UI branch are historical and do not depict or validate this current snapshot. Do not install preview files as Apps Script application code.

See SOURCE_SNAPSHOT.json for SHA-256 hashes of all 14 current HTML/GS source files, including the Jenjang preparation tools.

## Perapian transisi halaman

Paket terbaru: **ui/transisi-halaman-panitia**, melanjutkan paket tahap 4. Jika tahap 4 sudah dipasang, cukup ganti **Akses.gs**, simpan, lalu perbarui deployment yang sama ke **New version** dan muat ulang web app. Akun, penugasan, OAuth, aktivasi login dan migrasi Jenjang tetap dipakai.

Saat sesi diperiksa, tampil indikator pemuatan sesuai halaman tanpa tombol login. Setelah valid, panel menghilang perlahan; sesi yang kedaluwarsa tetap meminta login, kegagalan sementara menawarkan Coba Lagi. Animasi sidebar dan seluruh file HTML tetap. Ini merapikan transisi, tidak menghilangkan pemuatan ulang halaman atau waktu proses Google Apps Script.

## Tahap 4: login aplikasi dan akses peran/Jenjang

Paket terbaru: **feat/login-dan-cakupan-panitia**. Jika tahap 3 sudah terpasang dan uji identitas kedua peran berhasil, ganti **Akses.gs, Code.gs, Hapus.gs, Laporan.gs, Jenjang.gs, PemetaanJenjang.gs dan Index.html** bersama. Pertahankan file lainnya, konfigurasi OAuth, direktori akun dan hasil migrasi Jenjang.

Simpan, perbarui versi deployment salinan yang sama, refresh spreadsheet, lalu buka **Manajemen Pelatihan → Manajemen Akses Panitia → Login Aplikasi Utama → Aktifkan Login Aplikasi**. Aktivasi awal nonaktif. Beranda kemudian meminta login Google; Admin dapat mengelola fitur operasional dan akun, petugas hanya mengakses Jenjang penugasan serta mengajukan koreksi untuk ditinjau Admin. Logout dan kedaluwarsa sesi sudah diterapkan pada paket ini; belum diaktifkan/dideploy pada Google oleh agent.

[Panduan lengkap pemasangan tujuh file, aktivasi, hak akses dan pengajuan koreksi](tests/SESI_AKSES_VALIDATION.md). Tidak ada file/tab baru atau migrasi ulang. [Panduan tahap 3](tests/AKSES_VALIDATION.md) tetap menjadi acuan penyiapan awal direktori/OAuth.

## Tahap 3: akun panitia pada spreadsheet terpisah

Paket terbaru: **fix/url-uji-login-deployment** (melanjutkan feat/manajemen-akses-panitia). Tambahkan satu Script **Akses.gs** dan ganti **Code.gs** dari branch yang sama; seluruh file Jenjang satu paket dan halaman lain tetap. Simpan, refresh spreadsheet salinan, lalu buka **Manajemen Pelatihan → Manajemen Akses Panitia**. Isi tautan/ID file akses terpisah atau buat file baru melalui panel, kemudian data akun dan penugasan Jenjang.

Jika tahap 3 sudah terpasang, perbaikan URL ini cukup mengganti **Akses.gs**. Pada Uji Login, isi **URL deployment web app (/exec)** dari Manage deployments, daftarkan URL sama pada OAuth Client, simpan konfigurasi dan perbarui versi deployment salinan yang sama. URL tersimpan digunakan oleh tombol uji dan callback; jangan mengandalkan deteksi otomatis jika berbeda.

Tersedia konfigurasi dan halaman uji identitas Google untuk Gmail pribadi. **Pendaftaran akun/uji Google belum membuka akses petugas pada aplikasi utama**; sesi dan pembatasan semua endpoint masih tahap berikutnya. Client ID/Secret diisi pemilik pada panel setelah menyiapkan OAuth Client dan deployment salinan, tidak melalui chat atau file kode.

[Panduan lengkap direktori, OAuth, scope, pemulihan dan uji Google](tests/AKSES_VALIDATION.md). Tidak ada spreadsheet/deployment Google yang dibuat dari lingkungan pengembangan ini.

## Struktur Jenjang dan migrasi data dummy

Paket terbaru pada branch **refactor/paket-jenjang-satu-file** mendukung beberapa Jenjang per program, sesi/pendaftaran pada satu Jenjang, acuan JP/kehadiran sesuai peserta, serta laporan dan hapus yang memahami relasi baru. Login dan pembagian akses panitia belum termasuk paket ini.

**Pasang/uji pada salinan spreadsheet dan proyek Apps Script.** Tambahkan satu file Script **Jenjang.gs** yang memuat pengelolaan Jenjang, migrasi dan tampilan panel; ganti Code.gs, Hapus.gs, Laporan.gs, PemetaanJenjang.gs, Index.html, Pengelolaan.html, Peserta.html dan Profil.html dari branch yang sama. Simpan, refresh spreadsheet, lalu buka **Manajemen Pelatihan → Persiapan Struktur Jenjang**. Periksa pemetaan sebelum menekan tindakan yang mengubah struktur. Jangan menambah kolom manual atau mencampur sumber versi lama dengan struktur baru.

Jika paket tahap 2 sebelumnya sudah terpasang, cukup ganti **Jenjang.gs** lalu hapus file kode **MigrasiJenjang.gs** lama jika sempat dibuat. HTML migrasi terpisah tidak dipakai lagi. Delapan file aplikasi lainnya tetap sama dengan versi 8f15cba.

[Panduan pemasangan, migrasi, pemulihan dan pengujian Google lengkap](tests/JENJANG_VALIDATION.md). Migrasi lewat menu tidak memerlukan ID Spreadsheet/deployment; pengujian web app dan QR menggunakan deployment milik salinan proyek. Tidak ada migrasi/deployment utama yang dilakukan dari lingkungan ini.

## Pengembangan bertahap: Jenjang dan akses panitia

Bagian ini menjelaskan panel pratinjau sebelumnya. Untuk memasang paket struktur/migrasi terbaru, ikuti daftar lengkap pada bagian di atas.

Lihat [rancangan tahap 1](docs/TAHAP_1_JENJANG_AKSES.md) untuk struktur Program → Jenjang → Sesi, pemetaan data lama dan pembagian akses panitia. Pratinjau telah dicoba pengguna; paket migrasi tersedia pada bagian Struktur Jenjang di atas, tetapi belum dijalankan dari lingkungan ini. Login panitia belum dibuat.

Pratinjau baca saja tersedia sebagai **dua file tambahan**, PemetaanJenjang.gs dan PratinjauJenjang.html. Pada **salinan spreadsheet/proyek**, tambahkan Script `PemetaanJenjang` dan HTML `PratinjauJenjang`, salin isi lengkap keduanya dan ganti **Code.gs** untuk menambahkan menu pembuka pada onOpen. Simpan, kembali ke spreadsheet lalu refresh. Pilih **Manajemen Pelatihan → Pratinjau Pemetaan Jenjang** dengan akun pemilik; jangan mengandalkan Jalankan dari editor karena konteks getUi dapat tidak tersedia. Tidak perlu ID Spreadsheet, sheet/kolom baru, atau deployment baru. Jika dua file awal sudah dipasang, revisi ini hanya memerlukan penggantian **Code.gs + PemetaanJenjang.gs**; HTML tetap. Panduan lengkap, arti status, batas dan pemeriksaan: [PEMETAAN_JENJANG_VALIDATION.md](tests/PEMETAAN_JENJANG_VALIDATION.md).

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

## Penghapusan program, sesi, dan peserta

Branch **feat/hapus-data-pelatihan** melanjutkan seluruh pembaruan sebelumnya. Tambahkan file **Script** baru bernama **Hapus** dengan seluruh isi Hapus.gs. Ganti seluruh isi **Code.gs**, **Laporan.gs**, **Pengelolaan.html**, dan **Peserta.html** dari branch yang sama. Kelima file harus dipasang bersama: backend lama memakai penjagaan transaksi/ID dari Hapus.gs. File HTML/GS lain tersedia lengkap pada folder ini jika pembaruan sebelumnya belum dipasang. Jangan menyalin tests/preview ke Apps Script.

Tidak menambah sheet atau kolom. Pertahankan spreadsheet terikat, manifest/scopes yang sebenarnya, dan URL deployment. Untuk /exec, simpan lalu perbarui versi deployment yang sudah ada. Izin baru tidak diperlukan untuk penghapusan; laporan PDF tetap memerlukan izin Docs/Drive yang sudah dijelaskan di atas.

- **Pengelolaan → Program & Sesi → Hapus program:** menghapus program, pendaftaran, sesi/jeda, kehadiran, catatan perilaku/izin, token QR, serta log absensi terkait. Identitas peserta tetap ada, termasuk peserta yang juga mengikuti program lain.
- **Pengelolaan → Sesi Program → Hapus sesi:** menghapus sesi/jedanya, kehadiran/catatan, token dan log terkait. Pendaftaran peserta serta sesi/program lain dipertahankan. Rekap/laporan berikutnya mengikuti sesi yang tersisa.
- **Peserta Program → Hapus dari program:** menghapus satu keikutsertaan beserta kehadiran, catatan/izin, dan log terkait. Identitas dan riwayat program lain tetap ada.
- **Peserta Program → Identitas Peserta di Database → Cari Identitas:** daftar seluruh database, termasuk peserta tanpa program. **Hapus identitas** hanya tersedia jika tidak ada keikutsertaan pada program mana pun. Gunakan pencarian kosong untuk menampilkan semua, maksimal 50 per halaman. Penghapusan identitas tidak dijalankan otomatis setelah menghapus pendaftaran/program.

Setiap tindakan diawali pratinjau jumlah baris per sheet, alasan wajib, persetujuan dampak, dan pop-up konfirmasi terakhir. Pengelola tidak perlu mengetik ID target. Tombol hapus pada daftar memakai ikon tempat sampah dengan tooltip dan label aksesibel. Berlaku untuk draft/aktif/selesai; tidak perlu mengganti status untuk menghapus program yang dibatalkan. Belum ada status baru dibatalkan. Unduh laporan yang masih diperlukan sebelum menghapus program selesai. Perubahan data sejak pratinjau mewajibkan pemeriksaan baru.

**Ini penghapusan fisik dari sheet operasional, bukan penghapusan seluruh salinan data.** Sebelum menghapus, server menyimpan dan membaca ulang cadangan bertahap di **Riwayat_Validasi**, termasuk nilai, tipe tanggal, formula, header, alasan dan petugas. Riwayat audit/cadangan, katalog indikator, versi aturan penilaian, serta file bukti di Drive tetap disimpan. Cadangan bisa berisi identitas/NIP dan harus mengikuti hak akses/retensi spreadsheet. Belum ada pemulihan otomatis untuk data yang sudah selesai dihapus; cadangan memerlukan pemeriksaan manual jika perlu rekonstruksi. Penghapusan ini bukan fitur pemusnahan data pribadi secara menyeluruh.

Penghapusan hanya untuk akun pemilik dan memakai ScriptLock yang sama dengan penulisan data. Saat transaksi hapus tertunda, penambahan/perubahan lewat aplikasi dan pengambilan snapshot laporan PDF ditolak sampai transaksi ditutup. Buka **Pengelolaan** atau **Peserta**: kartu **Transaksi yang Perlu Diperiksa** otomatis muncul. Pilih **Periksa / lanjutkan**, periksa dampak, setujui, lalu konfirmasi pop-up untuk melanjutkan. Server melanjutkan baris yang tersisa, tanpa mengulang baris yang sudah dihapus. Jika persiapan cadangan terputus sebelum lengkap, proses persiapan ditutup tanpa menghapus baris operasional; buat pratinjau baru. Bila isi data/cadangan berubah di luar transaksi, proses berhenti agar data baru tidak dihapus. Jangan mengedit sheet/audit langsung ketika proses berjalan; ScriptLock mengoordinasikan aplikasi, bukan edit manual Google Sheets.

ID berurutan yang sudah dihapus dicadangkan melalui ScriptProperties per spreadsheet agar PRG/SES/KST/PST/JDA tidak digunakan ulang oleh generator lama maupun baru. Pertahankan properti `BATAS_ID_HAPUS|<spreadsheet-id>` serta Riwayat_Validasi. Perubahan ini juga menambahkan pemeriksaan pemilik pada lima fungsi penulisan lama untuk peserta/keikutsertaan/sesi/jeda/konfirmasi JP. Tidak mengubah formula JP/perilaku atau menghapus file bukti di Drive.

Penghapusan diblokir jika ada transaksi terkait/cakupan tak diketahui yang belum selesai, ID kosong/duplikat, relasi lintas program yang bertentangan, sheet wajib hilang, atau referensi pada sheet tambahan yang belum didukung. Perbaiki/pulihkan sumber masalah terlebih dahulu. Batas per tindakan: 3.000 baris operasional terkait dan 2 juta karakter rencana cadangan; hapus per sesi/pendaftaran untuk program lebih besar. Kuota dan durasi Google dapat membatasi lebih awal. Waktu tunggu lock 30 detik; proses panjang/terputus dapat dilanjutkan lewat kartu transaksi.

Sebelum memakai pada data penting, uji pada **salinan spreadsheet dan proyek Apps Script terpisah**. Pengujian lokal belum menjalankan penghapusan pada layanan Google. Ikuti tests/HAPUS_VALIDATION.md untuk pemeriksaan pemasangan.

## Revisi konfirmasi dan ikon hapus

Pada branch **ui/konfirmasi-hapus**, jika fitur hapus sebelumnya sudah terpasang, cukup ganti seluruh isi **Pengelolaan.html** dan **Peserta.html** dari branch ini. Code.gs, Hapus.gs, Laporan.gs, sheet, scopes dan formula tidak berubah dalam revisi ini. Jika fitur hapus belum dipasang, ikuti pemasangan kelima file pada bagian penghapusan di atas dengan sumber dari branch ini.

Kolom ketik ID Target dihapus dari dialog awal maupun kelanjutan transaksi. Nama/kode data tetap terlihat sebagai informasi; aplikasi memakai pilihan tersebut untuk mengirim ID internal dengan kontrak backend yang sama. Isi alasan dan centang persetujuan, lalu klik **Hapus Data Terkait**. Pop-up **Yakin ingin menghapus data ini?** menampilkan nama dan cakupan data. **Batal** atau Escape kembali ke formulir tanpa mengirim permintaan hapus dan mempertahankan isian. **Ya, Hapus Data** baru mengirim permintaan. Saat melanjutkan transaksi tertunda, pop-up memakai **Ya, Lanjutkan**. Fokus awal berada pada Batal.

Ikon sampah menggantikan teks tindakan hapus program, sesi, pendaftaran dan identitas pada tabel; tombol konfirmasi tetap berteks agar tindakannya jelas. Ikon berukuran area klik 44 × 44 px, memiliki tooltip, label pembaca layar dan dukungan keyboard. Pratinjau gagal tetap mengunci konfirmasi. Pemeriksaan pemilik, versi data, transaksi tertunda, cadangan, dan retry dengan ID permintaan yang sama tetap berlaku.

Pemeriksaan browser lokal memakai layanan tiruan, mencakup pembatalan tanpa RPC, konfirmasi terakhir, keyboard, ikon, error/retry dan kelanjutan transaksi. Pengujian deployment dan data Google yang sebenarnya tetap perlu dilakukan pada salinan proyek.

## Perbaikan pesan transaksi sebelum penghapusan

Pada branch **fix/transaksi-penghapusan**, ganti seluruh isi **Hapus.gs**, **Pengelolaan.html**, dan **Peserta.html** bersama. Code.gs, Laporan.gs, skema sheet, scope dan formula penilaian tidak berubah dalam perbaikan ini. Simpan proyek dan perbarui versi deployment /exec yang sama; muat ulang halaman.

Pemeriksaan sebelumnya mengunci seluruh penghapusan bila ada transaksi nonterminal di mana pun pada audit, termasuk baris lama yang memiliki ID transaksi tetapi status kosong. Pemeriksaan baru memakai status eksplisit terakhir per ID transaksi, menormalkan huruf/spasi status, dan tidak memakai baris tanpa status untuk membuka atau menutup transaksi. PENDING/PERLU_PEMULIHAN sebelumnya tetap aktif jika sesudahnya hanya ada baris berstatus kosong. Tidak ada status audit yang ditulis ulang/ditandai selesai secara otomatis.

Untuk transaksi non-penghapusan, server memeriksa relasi program dan seluruh ID pada snapshot/rencana audit, termasuk transaksi dengan beberapa penulisan. Transaksi program yang terbukti tidak terkait tidak mengunci penghapusan program lain. Transaksi pada program terkait, penulisan yang merujuk identitas yang akan dihapus, status tidak dikenal, audit JSON rusak, atau cakupan yang tidak dapat ditentukan tetap menahan penghapusan. Transaksi penghapusan tertunda sendiri tetap menjadi kunci global, karena penghapusan parsial harus ditutup sebelum operasi baru. Pemeriksaan diulang setelah pratinjau sebelum cadangan/penghapusan dimulai.

Kartu **Transaksi yang Perlu Diperiksa** kini memuat penghapusan tertunda dan transaksi lain, bukan hanya transaksi hapus. Untuk setiap transaksi lain ditampilkan jenis/referensi, ID transaksi, status, program bila diketahui, **nomor baris fisik Riwayat_Validasi**, dan petunjuk penanganan. Tombol **Buka Pengelolaan / Buka Peserta Program** hanya menavigasi ke halaman terkait; tidak otomatis menjalankan pemulihan atau perubahan data. Detail penghalang juga ditampilkan pada pesan pratinjau, dengan tombol **Periksa Rincian Transaksi**.

Pemulihan edit/impor/pembuatan sesi menggunakan kontrol yang sudah ada. Jenis transaksi lain atau audit yang rusak memerlukan pemeriksaan data/audit oleh pengelola; perbaikan ini tidak menyediakan tombol paksa selesai atau pemulihan JP otomatis. Jangan mengosongkan status atau menggantinya menjadi SELESAI untuk menghilangkan pesan tanpa memverifikasi data.

Bug pembacaan status/cakupan direproduksi dengan data tiruan dan diperbaiki pada kode. Baris yang memicu error pada spreadsheet pengguna belum diketahui dari lingkungan ini. Bila setelah pemasangan masih tertahan, rincian kartu memungkinkan identifikasi transaksi sebenarnya tanpa perlu mengirim seluruh spreadsheet. Semua diagnosis otomatis hanya membaca data.
