# Validasi penghapusan — 27 Oktober 2026, Asia/Jakarta

Implementasi backend: feat/hapus-data-pelatihan; revisi UI: ui/konfirmasi-hapus; perbaikan kunci/diagnostik: fix/transaksi-penghapusan. Tidak ada deployment, penghapusan spreadsheet Google, perubahan data produksi, atau operasi Drive yang dilakukan dari lingkungan ini.

## Backend lokal

Perintah: `node --test apps-script/absensi-dashboard/tests/*.test.mjs`.

55 pengujian lulus: 29 pengujian penghapusan dan 26 regresi sebelumnya. Pengujian penghapusan memakai Code.gs/Hapus.gs asli di VM dan spreadsheet/lock/properties tiruan. Cakupan:

- Penolakan non-pemilik sebelum pembacaan/penulisan pada endpoint baru dan lima fungsi mutasi lama.
- Pratinjau tanpa penulisan; cascade program/sesi/keikutsertaan, menjaga identitas bersama dan data program lain.
- Penghapusan identitas hanya setelah seluruh pendaftaran dilepas; pencarian identitas tanpa program.
- Kesesuaian ID payload/persetujuan/alasan/request/version, perubahan setelah pratinjau dan retry idempoten.
- Penolakan ID duplikat, sheet hilang, referensi sheet tambahan, relasi lintas program dan konflik log-token/catatan-kehadiran.
- Snapshot lengkap sebelum penghapusan; tipe tanggal, formula dan Unicode panjang dalam beberapa bagian cadangan.
- Kegagalan sebelum/di tengah penghapusan, respons penghapusan ambigu, pelepasan lock dan penguncian penulisan selama pending.
- Persiapan cadangan tidak lengkap dibatalkan tanpa penghapusan; cadangan lengkap dengan marker PENDING terputus dapat dilanjutkan.
- Cadangan berubah/data terkait baru/record berubah menolak kelanjutan tanpa menghapus baris lain.
- Gagal menulis audit final setelah seluruh data terhapus dapat ditutup tanpa menghapus ulang atau membuat ulang data.
- Batas 3.000 baris, reservasi ID berurutan, transaksi edit/impor lama tertunda dan penolakan snapshot laporan selama hapus pending.

Nilai/formula mock tidak menjalankan kalkulasi spreadsheet, kuota, atau concurrency layanan Google yang sebenarnya. Reservasi ID menggunakan ScriptProperties; penghapusan/restorasi properti secara manual berada di luar pengamanan aplikasi.

## Reproduksi error transaksi dan batas diagnosis

11 kasus tambahan mereproduksi riwayat kosong, status terminal dengan perbedaan huruf/spasi, baris kosong setelah pending/selesai, transaksi kehadiran program lain dengan peserta bersama, penghalang program terkait, impor program lain yang tetap melindungi identitas target, rencana multi-record, JSON/status/relasi tak dikenal, indikator global yang tidak terkait, pemeriksaan ulang setelah preview, serta konsistensi status pada recovery/mutation guards. Nomor baris fisik diuji dengan baris sheet kosong di antara record. Diagnosis/pratinjau tidak mengubah audit atau menandai status selesai.

Baris audit produksi belum tersedia. Temuan kode terkonfirmasi pada fixture, bukan bukti penyebab tunggal error di spreadsheet pengguna. Jika transaksi memang belum selesai pada data terkait, penghapusan tetap ditahan dan rincian baru mengarahkan pemeriksaan; tidak ada auto-repair/force-complete.

## Browser lokal

Chromium dengan HTML aktual dan google.script.run tiruan pada 1440 px dan 390 px. Lulus:

- Tombol program/sesi/keikutsertaan membuka dialog dengan ringkasan relasi.
- Teks menyerupai HTML tetap teks dan tidak dijalankan.
- Tidak ada isian ID target. Alasan/persetujuan tetap diperlukan.
- Ikon sampah memiliki tooltip/label, dapat dibuka melalui keyboard, dan menggantikan teks tombol pada tabel.
- Pop-up terakhir menampilkan target/cakupan, fokus awal Batal. Batal/Escape tidak mengirim RPC penghapusan dan mempertahankan isian; hanya persetujuan akhir mengirim RPC.
- Pop-up juga diperlukan pada retry dan kelanjutan transaksi; payload ID internal tetap cocok dengan backend.
- Escape/tutup diblokir saat permintaan; preview error tidak mengaktifkan hapus.
- Error jaringan mempertahankan ID permintaan dan payload saat retry.
- Transaksi parsial tampil di kartu, konfirmasi ulang melanjutkan, daftar dan pilihan program disegarkan setelah berhasil.
- Hapus sesi mempertahankan pilihan program; program terpilih yang dihapus mengosongkan pilihan.
- Penghapusan keikutsertaan dan pencarian identitas tanpa program; identitas dengan pendaftaran tidak diberi tombol hapus.
- Pesan pratinjau transaksi menampilkan rincian; kartu menampilkan transaksi non-penghapusan, baris audit dan petunjuk. Teks menyerupai HTML tetap aman; preview gagal tidak mengirim mutation RPC.
- Tidak ada pageerror atau overflow dokumen pada perangkat yang diuji.

Screenshot preview/hapus-data memakai data tiruan. Hasil browser ini tidak membuktikan penulisan/cascade Google Sheets benar di deployment. Script browser pengujian juga disimpan di tests/browser/hapus_browser.py agar dapat dijalankan ulang dengan Python Playwright dan Chromium.

## Pemeriksaan sumber

Sintaks GS dan JavaScript inline diperiksa (placeholder template server AdminQR diganti placeholder netral untuk parser Node). ID HTML unik. Script sidebar/navigasi kedua halaman dibandingkan byte demi byte terhadap baseline dan tidak berubah. Seluruh hash aplikasi diperbarui pada SOURCE_SNAPSHOT.json. Guardrail repository tetap dijalankan.

## Pemeriksaan pada salinan proyek sebelum penggunaan nyata

1. Jika fitur hapus sudah terpasang, perbaikan ini mengganti Hapus.gs, Pengelolaan.html dan Peserta.html. Untuk pemasangan awal pasang Hapus.gs, Code.gs, Laporan.gs, Pengelolaan.html, Peserta.html bersama pada salinan spreadsheet terikat/proyek Apps Script terpisah; pastikan akun pemilik dan manifest proyek yang benar.
2. Buat dua program dengan peserta yang sama, sesi/jeda, token/log, kehadiran, serta catatan izin/perilaku. Tambahkan satu identitas tanpa program. Catat seluruh ID/jumlah dan unduh laporan sebelum percobaan.
3. Coba hapus sesi, satu pendaftaran, identitas tanpa program, lalu satu program. Verifikasi seluruh relasi terpilih dihapus dan seluruh data program lain/identitas bersama tetap utuh. Bandingkan Beranda, Monitoring, Profil, CSV/PDF setelah muat ulang.
4. Periksa cadangan dan status SELESAI di Riwayat_Validasi. Pastikan file bukti, katalog indikator dan aturan penilaian tidak dihapus. Tidak ada UI pemulihan otomatis; salinan spreadsheet tetap merupakan cadangan untuk pengujian ini.
5. Coba Batal/Escape pada pop-up, persetujuan yang belum dicentang, perubahan sejak pratinjau dan akun non-pemilik. Verifikasi QR sesi yang dihapus ditolak dan QR sesi lain tetap bekerja. Pastikan ID tertinggi yang sudah dihapus tidak digunakan ulang saat membuat data baru.
6. Pada salinan saja, simulasikan kegagalan layanan/permintaan dan periksa kartu transaksi tertunda. Hentikan pengeditan manual selama proses. Perubahan/kerusakan snapshot di luar transaksi memerlukan pemeriksaan manual, bukan paksaan penghapusan.
7. Setelah hasil salinan sesuai, pemasangan pada proyek nyata tetap dilakukan oleh pengelola; pertahankan URL deployment lama saat memperbarui versi. Lingkungan ini tidak melakukan langkah tersebut.

8. Pada salinan saja, sediakan riwayat lama dengan ID transaksi/status kosong serta terminal berhuruf kecil/spasi. Pastikan tidak menjadi penghalang palsu. Sediakan PENDING yang sah di program lain dan program terkait: hanya transaksi terkait/tidak diketahui yang menahan penghapusan; transaksi hapus pending tetap global. Pastikan kartu/error menyebut ID dan baris yang tepat tanpa mengubah status otomatis.
