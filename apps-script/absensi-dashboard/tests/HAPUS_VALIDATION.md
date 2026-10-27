# Validasi penghapusan — 27 Oktober 2026, Asia/Jakarta

Implementasi: feat/hapus-data-pelatihan. Tidak ada deployment, penghapusan spreadsheet Google, perubahan data produksi, atau operasi Drive yang dilakukan dari lingkungan ini.

## Backend lokal

Perintah: `node --test apps-script/absensi-dashboard/tests/*.test.mjs`.

44 pengujian lulus: 18 pengujian penghapusan dan 26 regresi sebelumnya. Pengujian penghapusan memakai Code.gs/Hapus.gs asli di VM dan spreadsheet/lock/properties tiruan. Cakupan:

- Penolakan non-pemilik sebelum pembacaan/penulisan pada endpoint baru dan lima fungsi mutasi lama.
- Pratinjau tanpa penulisan; cascade program/sesi/keikutsertaan, menjaga identitas bersama dan data program lain.
- Penghapusan identitas hanya setelah seluruh pendaftaran dilepas; pencarian identitas tanpa program.
- Konfirmasi ID/persetujuan/alasan/request/version, perubahan setelah pratinjau dan retry idempoten.
- Penolakan ID duplikat, sheet hilang, referensi sheet tambahan, relasi lintas program dan konflik log-token/catatan-kehadiran.
- Snapshot lengkap sebelum penghapusan; tipe tanggal, formula dan Unicode panjang dalam beberapa bagian cadangan.
- Kegagalan sebelum/di tengah penghapusan, respons penghapusan ambigu, pelepasan lock dan penguncian penulisan selama pending.
- Persiapan cadangan tidak lengkap dibatalkan tanpa penghapusan; cadangan lengkap dengan marker PENDING terputus dapat dilanjutkan.
- Cadangan berubah/data terkait baru/record berubah menolak kelanjutan tanpa menghapus baris lain.
- Gagal menulis audit final setelah seluruh data terhapus dapat ditutup tanpa menghapus ulang atau membuat ulang data.
- Batas 3.000 baris, reservasi ID berurutan, transaksi edit/impor lama tertunda dan penolakan snapshot laporan selama hapus pending.

Nilai/formula mock tidak menjalankan kalkulasi spreadsheet, kuota, atau concurrency layanan Google yang sebenarnya. Reservasi ID menggunakan ScriptProperties; penghapusan/restorasi properti secara manual berada di luar pengamanan aplikasi.

## Browser lokal

Chromium dengan HTML aktual dan google.script.run tiruan pada 1440 px dan 390 px. Lulus:

- Tombol program/sesi/keikutsertaan membuka dialog dengan ringkasan relasi.
- Teks menyerupai HTML tetap teks dan tidak dijalankan.
- Alasan/ID/persetujuan diperlukan; ID salah tidak mengaktifkan konfirmasi.
- Escape/tutup diblokir saat permintaan; preview error tidak mengaktifkan hapus.
- Error jaringan mempertahankan ID permintaan dan payload saat retry.
- Transaksi parsial tampil di kartu, konfirmasi ulang melanjutkan, daftar dan pilihan program disegarkan setelah berhasil.
- Hapus sesi mempertahankan pilihan program; program terpilih yang dihapus mengosongkan pilihan.
- Penghapusan keikutsertaan dan pencarian identitas tanpa program; identitas dengan pendaftaran tidak diberi tombol hapus.
- Tidak ada pageerror atau overflow dokumen pada perangkat yang diuji.

Screenshot preview/hapus-data memakai data tiruan. Hasil browser ini tidak membuktikan penulisan/cascade Google Sheets benar di deployment. Script browser pengujian juga disimpan di tests/browser/hapus_browser.py agar dapat dijalankan ulang dengan Python Playwright dan Chromium.

## Pemeriksaan sumber

Sintaks GS dan JavaScript inline diperiksa (placeholder template server AdminQR diganti placeholder netral untuk parser Node). ID HTML unik. Script sidebar/navigasi kedua halaman dibandingkan byte demi byte terhadap baseline dan tidak berubah. Seluruh hash aplikasi diperbarui pada SOURCE_SNAPSHOT.json. Guardrail repository tetap dijalankan.

## Pemeriksaan pada salinan proyek sebelum penggunaan nyata

1. Pasang Hapus.gs, Code.gs, Laporan.gs, Pengelolaan.html, Peserta.html bersama pada salinan spreadsheet terikat/proyek Apps Script terpisah; pastikan akun pemilik dan manifest proyek yang benar.
2. Buat dua program dengan peserta yang sama, sesi/jeda, token/log, kehadiran, serta catatan izin/perilaku. Tambahkan satu identitas tanpa program. Catat seluruh ID/jumlah dan unduh laporan sebelum percobaan.
3. Coba hapus sesi, satu pendaftaran, identitas tanpa program, lalu satu program. Verifikasi seluruh relasi terpilih dihapus dan seluruh data program lain/identitas bersama tetap utuh. Bandingkan Beranda, Monitoring, Profil, CSV/PDF setelah muat ulang.
4. Periksa cadangan dan status SELESAI di Riwayat_Validasi. Pastikan file bukti, katalog indikator dan aturan penilaian tidak dihapus. Tidak ada UI pemulihan otomatis; salinan spreadsheet tetap merupakan cadangan untuk pengujian ini.
5. Coba konfirmasi salah, perubahan sejak pratinjau dan akun non-pemilik. Verifikasi QR sesi yang dihapus ditolak dan QR sesi lain tetap bekerja. Pastikan ID tertinggi yang sudah dihapus tidak digunakan ulang saat membuat data baru.
6. Pada salinan saja, simulasikan kegagalan layanan/permintaan dan periksa kartu transaksi tertunda. Hentikan pengeditan manual selama proses. Perubahan/kerusakan snapshot di luar transaksi memerlukan pemeriksaan manual, bukan paksaan penghapusan.
7. Setelah hasil salinan sesuai, pemasangan pada proyek nyata tetap dilakukan oleh pengelola; pertahankan URL deployment lama saat memperbarui versi. Lingkungan ini tidak melakukan langkah tersebut.
