# Verifikasi sesi oleh Admin dan koreksi langsung petugas

Branch feat/verifikasi-sesi-panitia, 28 Oktober 2026, Asia/Jakarta. Melanjutkan fix/navigasi-jenjang-panitia (4fd598f).

## Hasil uji pengguna — 28 Oktober 2026

Pengguna mengonfirmasi pembaruan berhasil, penolakan/pengajuan ulang berjalan, perubahan data saat pengajuan menunggu mencegah persetujuan versi lama, serta alur lengkap QR datang/pulang → koreksi petugas → izin/perilaku → pengajuan → persetujuan Admin → hitung JP → rekap/profil sesuai harapan. Pembaruan dinyatakan selesai dan diterima pada source aplikasi **3064b70**.

Ini mencatat hasil yang dilaporkan pengguna, bukan pengamatan langsung agent atas log/data Google. Skenario transaksi terputus, kelanjutan, tanda terima hilang, rumus dan paket besar telah diuji lokal tetapi belum dikonfirmasi terpisah pada Google. Pembaruan dokumentasi ini tidak mengubah kode dan tidak membutuhkan deployment ulang. Panduan uji di bawah tetap menjadi referensi regresi, bukan daftar pekerjaan yang harus diulang setelah penerimaan.

## Pemasangan

1. Gunakan salinan proyek/database untuk uji awal. Pertahankan manifest, OAuth, akun, penugasan, aktivasi, URL deployment dan struktur Jenjang yang sudah bekerja.
2. Ganti seluruh isi **Akses.gs, Code.gs, Hapus.gs, Index.html bersama**. Tidak ada file aplikasi, tab atau kolom baru. Pengelolaan/Peserta/Profil tetap versi perbaikan navigasi sebelumnya.
3. Simpan. Manage deployments → Edit deployment yang sama → New version → Deploy. Jangan membuat URL baru karena tautan QR dan callback memakai URL yang disimpan.
4. Buka ulang web app. Tidak perlu menyiapkan ulang akun, migrasi atau login-proof terpisah untuk petugas baru yang sudah didaftarkan.

## Alur petugas

- Pilih Program → Jenjang → Sesi di Monitoring. Tombol **Koreksi Petugas Kelas** langsung menyimpan koreksi waktu dengan alasan/dasar, akun pelaku terverifikasi dan riwayat lama. Waktu scan asli tetap, hasil JP lama mengikuti mekanisme menunggu perhitungan yang sudah ada. Status koreksi belum_divalidasi; tidak perlu persetujuan koreksi per peserta.
- Catat izin dan sikap/perilaku seperti biasa; status awal catatan tetap belum_divalidasi.
- Pada card Verifikasi Sesi, tekan **Ajukan Verifikasi**. Periksa peserta, waktu kehadiran, kelengkapan, izin, sikap/perilaku dan keterangan/bukti; isi catatan pengajuan lalu Kirim Pengajuan.
- Satu paket hanya mencakup satu sesi/Jenjang. Petugas lain yang ditugaskan ke Jenjang yang sama juga bisa melihat paket; versi data sama yang masih menunggu/disetujui tidak membuat pengajuan ganda.
- Jika ditolak, koreksi/catatan tidak dibatalkan. Perbaiki sesuai alasan Admin dan ajukan lagi. Jika data berubah, buka kembali ringkasan dan gunakan versi terbaru.

## Alur Admin

- Buka Monitoring. Card Verifikasi Sesi memuat 100 pengajuan terbaru dalam daftar yang dapat digulir; Muat Ulang Pengajuan memperbarui daftar tanpa keluar dari halaman.
- Lihat Pengajuan membuka konteks Program/Jenjang/Sesi, peserta/waktu/kelengkapan, izin dan catatan perilaku, pengaju, catatan, serta status sumber terbaru.
- Isi alasan lalu pilih Setujui Verifikasi atau Tolak Pengajuan. Popup konfirmasi dapat dibatalkan tanpa penulisan.
- Persetujuan memverifikasi baris kehadiran yang tercatat. Kehadiran tanpa kedua waktu tetap belum_lengkap; peserta tanpa baris hadir tetap belum tercatat. Persetujuan bukan perintah menandai semua peserta hadir.
- Catatan izin/perilaku yang belum divalidasi menjadi disetujui. Catatan yang sudah ditolak/disetujui tidak diganti otomatis. Bukti, rentang izin, poin, scan asli dan aturan perhitungan tidak diubah. Hitung JP tetap tindakan Admin terpisah.
- Data sumber berubah setelah diajukan: persetujuan ditolak sebelum penulisan; tolak pengajuan lama, minta petugas mengajukan versi baru. Persetujuan lama adalah riwayat versi yang disetujui, bukan persetujuan untuk semua perubahan masa depan. Saat paket dibuka, sistem memeriksa ulang dan menandai perubahan; perhitungan hasil JP saja tidak membatalkan versi sumber.
- Pengajuan koreksi individu dari versi lama tetap ditangani pada card Pengajuan Koreksi Lama, yang disembunyikan jika kosong.

## Transaksi terputus

Rencana perubahan disimpan dalam bagian-bagian yang dibaca ulang/diverifikasi sebelum baris operasional ditulis. Jurnal menggunakan Riwayat_Akses terpisah (jenis Verifikasi_Sesi dan Rencana_Verifikasi), dengan pelaku, waktu, ringkasan, versi, keputusan serta nilai validasi sebelum/sesudah. Status transaksi audit tetap SELESAI; status alur menunggu/diproses/disetujui/ditolak berada di isi JSON agar tidak disalahartikan sebagai transaksi akun yang belum selesai.

Jika koneksi/penyimpanan terputus, tutup modal dan buka lagi pengajuan. Admin memilih **Lanjutkan Verifikasi** pada status diproses. Sistem memeriksa kelengkapan/hash rencana, identitas target, sumber sesi yang sama dan setiap nilai validasi sesuai sebelum/sesudah. Sel yang sudah sesuai dilewati. Tidak ada rollback otomatis atau pemaksaan status selesai.

Selama transaksi parsial, tindakan operasional yang menggunakan guard bersama ditahan, termasuk simpan scan QR. Membaca dan memeriksa paket tetap tersedia. Jangan mengedit spreadsheet sumber di luar aplikasi. Jika sumber/rencana berubah atau hilang, Admin/pemilik harus memeriksanya terhadap jurnal dan memulihkan sumber yang sesuai sebelum melanjutkan; tombol tidak menimpa perubahan asing.

Batas: 500 keikutsertaan dan 1.500 baris kehadiran/catatan per sesi; rencana maksimal 2 juta karakter, bagian 24.000 karakter, sel jurnal maksimal 40.000 karakter. Kapasitas jurnal akses lama tetap berlaku. Waktu/kuota layanan Google mungkin membatasi ukuran praktis; hasil pengujian lokal bukan ukuran kinerja Google.

## Uji pada salinan Google

1. Petugas Dasar mengoreksi satu peserta dummy; waktu hasil koreksi langsung muncul tanpa keputusan Admin. Alasan/pelaku/riwayat tersimpan; waktu scan asli tetap.
2. Buat satu izin dan satu catatan perilaku belum divalidasi, serta pertahankan contoh catatan yang sudah ditolak.
3. Ajukan paket sesi Dasar. Petugas Lanjutan tidak boleh melihat atau memutuskan paket Dasar. Petugas lain pada Dasar boleh melihatnya.
4. Admin meninjau rincian, batalkan popup keputusan: status dan data tidak berubah. Buka lagi dan setujui. Catatan pending menjadi disetujui; yang ditolak tetap ditolak. Waktu hadir kosong tidak berubah menjadi hadir.
5. Muat ulang paket dan ulangi klik keputusan: tidak ada persetujuan ganda. Jalankan perhitungan JP; paket tidak ditandai berubah hanya karena hasil JP.
6. Paket sesi lain ditolak dengan alasan: data tetap, petugas dapat mengajukan ulang setelah diperiksa.
7. Koreksi/catatan ditambah setelah pengajuan, sebelum Admin menyetujui: Admin harus melihat perubahan dan tidak dapat menyetujui versi lama. Setelah persetujuan, perubahan sumber juga perlu paket baru.
8. Cabut penugasan/nonaktifkan akun: permintaan berikutnya tetap mengikuti pembatasan yang telah diuji; koreksi langsung tidak membuka akses Jenjang lain.
9. Bila Google sendiri mengalami kegagalan simpan, buka kembali status dan gunakan Lanjutkan Verifikasi sesuai petunjuk. Jangan sengaja mengubah sumber produksi untuk mensimulasikan kegagalan.

## Bukti lokal

215 tes Node termasuk 19 baru untuk alur ini; pengajuan lama diuji melalui seed private agar tidak mengasumsikan alur lama masih aktif. Kasus baru meliputi cakupan, koreksi langsung/revokasi, persetujuan/penolakan, gabungan izin/perilaku, data berubah, kehadiran belum lengkap, rencana beberapa bagian dengan 81 peserta, rumus kolom lain, sumber berubah saat pemulihan, tanda terima akhir hilang sebelum/sesudah append dan stabilitas setelah menghitung JP. Chromium menggunakan HTML hasil renderer server dengan bridge Google tiruan: petugas desktop/390 px, submit dan validasi catatan, keputusan Admin dan pembatalan popup, serta alur lama sesi/navigasi/sidebar/login/logout. Suite Jenjang dan direktori juga lulus. Tidak ada deployment atau perubahan data Google oleh agent.
