# Tahap 4 — Login aplikasi dan akses berdasarkan peran/Jenjang

Paket: **feat/login-dan-cakupan-panitia**, 27 Oktober 2026, Asia/Jakarta. Melanjutkan perbaikan URL dan hasil uji identitas Admin/Petugas yang sudah ditunjukkan pengguna. Fitur baru **belum diaktifkan pada Google oleh agent**.

## Login satu alur (28 Oktober 2026)

Paket **ui/login-satu-alur** mengganti tahapan login biasa di panduan historis di bawah: ganti Akses.gs saja lalu perbarui deployment yang sama. Tautan aplikasi menyiapkan tombol Google, callback aplikasi memverifikasi dan membuka Beranda dalam dokumen yang sama. Pendataan tetap; uji identitas hanya diagnostik pemilik. Lihat [LOGIN_SATU_ALUR.md](../docs/LOGIN_SATU_ALUR.md). 220 backend tests dan Chromium app/directory/proof lulus lokal; alur Google baru masih menunggu uji pengguna. Hasil penerimaan verifikasi sesi sebelumnya tetap berlaku.

## Pembaruan alur verifikasi sesi (28 Oktober 2026)

Ketentuan koreksi petugas pada tahap 4 di bawah adalah riwayat versi sebelumnya. Paket **feat/verifikasi-sesi-panitia** menggantinya dengan koreksi langsung dalam cakupan penugasan dan pengajuan bersama kehadiran/izin/perilaku per sesi/Jenjang. Ganti **Akses.gs, Code.gs, Hapus.gs, Index.html** bersama. Pengajuan lama tetap dapat ditinjau. Lihat [VERIFIKASI_SESI.md](../docs/VERIFIKASI_SESI.md) untuk alur, batasan, pemulihan parsial dan uji Google. 215 tes backend serta suite browser lokal lulus; pengguna kemudian mengonfirmasi alur paket, penolakan/pengajuan ulang, pencegahan persetujuan versi lama dan regresi QR hingga JP/rekap/profil berhasil pada 28 Oktober 2026. Source 3064b70 diterima; skenario kegagalan parsial/beban tetap hanya terbukti lokal.

## Perbaikan transisi setelah tahap 4 terpasang

Branch **ui/transisi-halaman-panitia**: ganti **Akses.gs saja**, simpan, perbarui deployment yang sama ke versi baru dan muat ulang. Tidak mengulangi tujuh-file pemasangan bila tahap 4 sudah lengkap, tidak mengubah OAuth/aktivasi, dan tidak mengulang migrasi/pendataan akun.

Selama pemeriksaan sesi, panel hanya menampilkan indikator pemuatan sesuai halaman. Tombol login muncul setelah sesi dinyatakan tidak tersedia/kedaluwarsa. Gangguan sementara menawarkan Coba Lagi, dengan konteks program/Jenjang/sesi/profil tetap dibawa; halaman khusus Admin yang ditolak menawarkan kembali ke Beranda. Konten tetap tertutup sebelum validasi dan saat sesi berakhir. Animasi spinner/fade mengikuti preferensi reduced-motion. Sidebar dan animasinya tetap identik dengan paket sebelumnya; tidak ada SPA atau penyimpanan identitas yang dipercaya sebagai otorisasi.

Pengujian browser diperluas dengan callback verifikasi yang ditahan, koneksi gagal, akses ditahan, kedaluwarsa saat fade, konteks retry tanpa token/code, desktop/mobile dan reduced motion, sambil mempertahankan uji navigasi/sidebar/logout yang lama. Video pengguna mengonfirmasi alur Admin pada versi sebelumnya; perbaikan visual ini masih perlu dicoba pada deployment pengguna. Waktu proses Google Apps Script/jaringan tetap ada.

## Pemasangan pada proyek salinan yang sudah berjalan

Ganti isi lengkap **tujuh file berikut dari branch yang sama**:

| File | Perubahan |
| --- | --- |
| Akses.gs | Login aplikasi, sesi, gateway peran/cakupan, tampilan login, bridge halaman, manajemen akun untuk Admin dan pengajuan koreksi |
| Code.gs | Penjagaan endpoint, sumber database untuk web app, penyaringan statistik/rekap/profil dan identitas audit |
| Hapus.gs | Penjagaan endpoint penghapusan dan pemeriksaan sesi kembali pada operasi yang memakai penjagaan transaksi |
| Laporan.gs | Penjagaan endpoint laporan khusus Admin |
| Jenjang.gs | Endpoint Jenjang dan pilihan Jenjang petugas sesuai penugasan |
| PemetaanJenjang.gs | Sumber database server yang sama, termasuk saat konteks spreadsheet aktif tidak tersedia |
| Index.html | Label pengajuan petugas dan perbaikan tombol koreksi yang tetap nonaktif setelah tabel selesai dimuat |

Tidak menambah Script/HTML/tab spreadsheet, tidak mengulang migrasi Jenjang, dan tidak menghapus akun/penugasan yang sudah didata. File aplikasi lainnya tetap dipertahankan. Simpan kode, lalu:

1. **Deploy → Manage deployments → Edit → New version → Deploy** pada deployment salinan yang URL-nya sudah dipakai untuk uji Google. Pertahankan URL tersebut dan OAuth redirect URI yang sudah benar; tidak perlu membuat OAuth Client baru.
2. Jika proyek mempunyai beberapa deployment web app aktif, perbarui deployment yang masih digunakan ke versi paket lengkap ini. Arsipkan yang tidak dipakai. Versi kode lama pada deployment lain tidak memperoleh penjagaan baru hanya karena properti login diaktifkan. Pertahankan URL deployment yang masih dipakai tautan QR saat memperbarui versinya.
3. Refresh spreadsheet dan buka **Manajemen Pelatihan → Manajemen Akses Panitia** sebagai pemilik. Periksa akun aktif dan penugasan Jenjang.
4. Pada card **Login Aplikasi Utama**, klik **Aktifkan Login Aplikasi**, lalu konfirmasi. Aktivasi menuntut direktori siap, tidak ada transaksi akses tertunda, migrasi/integritas Jenjang siap, konfigurasi Google dan identitas Admin pemilik sudah tertaut melalui uji Google. Sakelar ini hanya tersedia untuk pemilik dari menu spreadsheet.
5. Buka URL web app. Halaman meminta **Masuk dengan Google** → **Siapkan Login Google** → **Lanjutkan ke Google**. Selesaikan pada tab yang sama, kemudian klik **Buka Aplikasi**. Beranda menjadi halaman awal. Pengguna tidak perlu diberi hak edit spreadsheet/proyek Apps Script.
6. Uji Admin dan Petugas pada profil browser/jendela samaran terpisah. Pengaturan akses deployment yang sudah berhasil membuka uji identitas kedua akun tetap diperlukan. Uji identitas `?page=uji-login` tetap tersedia untuk pemeriksaan dan tetap **tidak membuat sesi aplikasi**; sesi hanya dibuat dari alur `?page=masuk`.

Aktivasi awal bernilai nonaktif. Sebelum diaktifkan, aplikasi mempertahankan alur khusus pemilik. Panel native pemilik tetap tersedia untuk penyiapan dan pemulihan. Untuk menonaktifkan tahap ini, gunakan card yang sama dari menu spreadsheet: seluruh sesi lama gugur dan endpoint operasional kembali khusus pemilik. Jangan menghapus properti konfigurasi atau mengubah status audit untuk melewati masalah transaksi.

## Hak yang diterapkan

| Fitur | Admin Pelatihan | Petugas Kelas Pelatihan |
| --- | --- | --- |
| Beranda dan ringkasan | Seluruh database | Hanya program/Jenjang penugasan |
| Sesi, kehadiran, rekap JP/nilai dan CSV rekap | Seluruh program | Hanya cakupan penugasan; CSV berasal dari rekap yang sudah disaring |
| Daftar peserta dan profil | Seluruh program | Peserta pada Jenjang penugasan; keikutsertaan orang yang sama di program lain disembunyikan |
| Terbitkan QR | Diizinkan | Hanya sesi pada Jenjang penugasan |
| Catatan perilaku, izin, unggah bukti | Diizinkan | Hanya peserta/sesi dalam cakupan; catatan tetap belum divalidasi |
| Koreksi waktu | Langsung atau meninjau pengajuan | Mengajukan; tidak langsung mengubah waktu |
| Validasi catatan, perhitungan JP, aturan/indikator | Diizinkan | Ditolak |
| Program/Jenjang/sesi, daftar/impor/edit/hapus peserta | Diizinkan | Ditolak |
| Laporan penuh/PDF, pemeriksaan data dan pemulihan operasional | Diizinkan | Ditolak |
| Akun dan penugasan | Melalui Manajemen Akses di sidebar | Ditolak |
| Konfigurasi OAuth/deployment/sakelar aktivasi | Pemilik melalui menu spreadsheet | Ditolak |

Admin yang bukan pemilik dapat mendata akun dan penugasan, tetapi tidak dapat menonaktifkan/mengganti email/menurunkan peran Admin pemilik. File akses dan editor proyek tetap dibatasi pada pengelola tepercaya. Tidak ada kata sandi lokal atau penyalinan peserta ke direktori akun. File bukti tetap privat; tampilan pratinjau Drive masih memerlukan izin file yang sesuai, tanpa pembagian publik otomatis.

## Cara kerja dan batas sesi

Satu bridge disisipkan server pada HTML aplikasi, sehingga nama/payload RPC lama tetap dipakai UI. Gateway hanya menjalankan daftar fungsi yang diizinkan, dengan identitas dari token sesi Google yang diverifikasi server. Endpoint operasional publik juga dijaga agar pemanggilan langsung tidak melewati gateway. Fungsi penyiapan native masih khusus pemilik; fungsi absensi publik tetap memerlukan token QR yang valid.

- Token sesi acak disimpan pada `sessionStorage`, bukan URL. Server menyimpan record pada ScriptCache dengan kunci hash token, mengikatnya ke akun/Google subject, versi akun, konfigurasi dan epoch aktivasi.
- Maksimal **4 jam**, berakhir setelah **30 menit tanpa aktivitas permintaan terautentikasi di server**. Halaman juga ditutup dengan lapisan login saat batas sesi tercapai; membuka ulang halaman memeriksa sesi server.
- Cache dapat dibuang Google lebih awal. Akibatnya pengguna harus masuk ulang; tidak ada fallback yang membuka data tanpa verifikasi.
- Setiap permintaan memeriksa status akun dan daftar penugasan terkini. Pencabutan Jenjang berlaku pada permintaan berikutnya. Perubahan akun/peran/status atau konfigurasi login mengharuskan masuk ulang. Menonaktifkan lalu mengaktifkan fitur tidak menghidupkan sesi/state lama.
- Pemeriksaan/pembaruan sesi dan logout memakai ScriptLock agar pembacaan sesi yang berjalan tidak menghidupkan kembali token yang sudah keluar. Operasi yang melewati penjagaan transaksi memeriksa ulang sesi/cakupan setelah memperoleh lock, tanpa memperpanjang sesi dari pemeriksaan ulang tersebut.
- Logout menghapus token browser dan mencabut sesi server; logout aplikasi tidak mengeluarkan akun dari seluruh layanan Google. Jika jaringan logout gagal, UI menyatakan bahwa pencabutan server belum terkonfirmasi, sementara token browser tetap dihapus dan batas waktu server tetap berlaku.
- Direct URL halaman khusus Admin tetap tertutup bagi petugas. Nama/peran/menu pada browser hanya mengatur tampilan; mengubahnya tidak mengubah kewenangan server.
- Database utama memakai referensi server `AKSES_DATABASE_ID` ketika tidak ada spreadsheet aktif. Browser tidak menentukan sumber database. Konfigurasi aktivasi disimpan pada `AKSES_APLIKASI|<id-database>`; jangan salin token sesi ke spreadsheet atau log.

## Pengajuan koreksi waktu

Petugas memakai tombol **Ajukan koreksi** pada tabel kehadiran, mengisi waktu usulan, alasan dan dasar verifikasi. Pengajuan dicatat pada jurnal append-only **Riwayat_Akses** dengan `jenis_data=Pengajuan_Koreksi`; tidak mengubah Kehadiran. Payload yang sama pada versi sumber yang sama memiliki identitas pengajuan yang sama agar pengiriman ulang tidak menggandakan usulan.

Card **Pengajuan Koreksi Saya** tersedia bagi petugas pada Beranda/Monitoring. Admin melihat **Pengajuan Koreksi Waktu**, dapat memilih **Tinjau**, mengisi alasan keputusan, lalu **Tolak** atau **Setujui Koreksi**. Persetujuan memiliki konfirmasi tambahan. Daftar menampilkan maksimal 100 pengajuan terbaru; tombol Muat Ulang memperbarui status.

Penolakan tidak mengubah kehadiran. Persetujuan memeriksa ulang versi dan relasi sumber, memakai transaksi koreksi operasional yang tetap, mempertahankan scan asli, mengisi waktu terverifikasi serta menandai JP menunggu perhitungan Admin. Audit operasional mencatat identitas Admin terverifikasi; petugas dicatat pada jurnal pengajuan. Aturan/toleransi/nilai JP dan perilaku tidak diubah.

Status alur pengajuan (`menunggu`, `diproses`, `disetujui`, `ditolak`, `perlu_pemeriksaan`) berada dalam JSON jurnal dan berbeda dari `status_transaksi` akses. Bila jawaban akhir hilang tetapi transaksi operasional sudah SELESAI, **Periksa Hasil** mengonfirmasi keputusan tanpa menulis ulang kehadiran. Bila transaksi operasional PENDING/PERLU_PEMULIHAN atau proses berhenti tanpa bukti hasil, persetujuan tidak diulang secara paksa; Admin perlu memeriksa Riwayat_Validasi. Tidak tersedia tombol paksa selesai atau rollback otomatis. Ini mempertahankan bukti ketidakpastian dan tidak menandai data berhasil sebelum terverifikasi.

Jurnal pengajuan tetap menjadi audit setelah target operasional dihapus. Target yang sudah tidak ada tidak dapat disetujui.

Batas direktori/jurnal tahap 3 tetap berlaku (1.000 akun, 5.000 penugasan, 10.000 baris audit dengan penghentian sebelum batas). Pengajuan menambah baris pada jurnal yang sama; arsip otomatis belum tersedia. File dan status audit tidak diedit manual untuk operasi normal.

## Validasi lokal dan uji Google berikutnya

```sh
node --test apps-script/absensi-dashboard/tests/*.test.mjs
python apps-script/absensi-dashboard/tests/browser/sesi_akses_browser.py
python apps-script/absensi-dashboard/tests/browser/akses_browser.py
python apps-script/absensi-dashboard/tests/browser/jenjang_browser.py
```

Paket saat ini memiliki **196 tes backend** (149 sebelumnya + 47 sesi/akses). Pengujian backend mencakup sesi opt-in, login Google/aplikasi terpisah, token palsu, bypass RPC, akun tanpa Session email, pemisahan dua Jenjang dalam satu program dan program lain, profil peserta lintas program, statistik sebelum agregasi, hak Admin, akun/penugasan dicabut, kedaluwarsa/logout, target campuran, QR publik, catatan/izin dengan actor terverifikasi, usulan/stale/penolakan/persetujuan koreksi, receipt hilang dan pemeriksaan kembali setelah menunggu lock. Tes lama penghapusan, Jenjang, laporan dan UI tetap dijalankan.

Chromium memakai HTML aplikasi yang benar-benar dihasilkan server dan fixture hasil backend, dengan layanan Google tiruan. Mencakup login gate tanpa kebocoran RPC awal, identitas/sidebar, scoped navigation, layar peserta mobile, penolakan direct URL, ajukan/tinjau koreksi, manajemen akun Admin, logout/expired, callback/storage dan sidebar hover. Screenshot memakai data uji.

**Uji identitas Google tahap 3 sudah ditunjukkan pengguna untuk Admin/Petugas. Alur sesi dan pembatasan tahap 4 belum diuji pada deployment Google pengguna.** Sebelum dipakai panitia, periksa pada salinan: login kedua peran, navigasi beberapa halaman, ganti ID ke Jenjang lain, pencabutan akun/penugasan, pengajuan/keputusan koreksi, unggah/izin file bukti, laporan Admin serta QR peserta tanpa login panitia. Tes lokal tidak membuktikan origin/storage HTMLService pada seluruh browser, kuota, native PDF atau keberhasilan write Google sesungguhnya.
