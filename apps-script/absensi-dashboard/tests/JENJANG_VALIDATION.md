# Struktur Jenjang — pemasangan dan pengujian pada salinan

Status: implementasi dan pengujian lokal selesai. Belum ada migrasi/deployment Google yang dijalankan dari lingkungan pengembangan ini. Login/peran panitia dan spreadsheet akses terpisah belum termasuk perubahan ini.

## Perilaku baru

- Program memiliki satu atau beberapa **Jenjang**; setiap Sesi dan Keikutsertaan memiliki `id_jenjang` yang harus merujuk Jenjang pada program yang sama.
- Satu peserta tetap hanya memiliki satu Keikutsertaan/Jenjang per program. Peserta yang sama dapat mengikuti program lain. Peserta tidak didaftarkan ulang per sesi.
- Pengelolaan menampilkan Jenjang program, penambahan melalui modal, dan edit nama melalui transaksi edit yang ada. Sesi baru wajib memilih Jenjang; satu-satunya Jenjang dapat dipilih otomatis. Program baru otomatis memiliki Jenjang awal sesuai nama yang diisi atau **Umum** bila kosong.
- Peserta memiliki pilihan Jenjang tujuan/filter. Pilihan Semua Jenjang hanya untuk melihat; pada program multi-Jenjang penambahan/impor harus memilih tujuan. Identitas yang sudah terdaftar pada Jenjang lain dalam program yang sama dilewati, bukan digandakan/dipindahkan.
- Monitoring yang sudah memakai struktur baru memilih Kategori → Program → Jenjang → Sesi. Nama Jenjang ikut terlihat pada daftar sesi admin. Link sesi menentukan Jenjangnya; navigasi Monitoring/Peserta/Pengelolaan membawa program/Jenjang melalui URL. Profil mengikuti Jenjang keikutsertaan peserta.
- QR mencari peserta aktif Jenjang sesi dan memeriksa kembali saat simpan/retry. Koreksi, izin, perilaku dan unggahan tetap memeriksa relasi server; menu tersembunyi bukan kontrol akses.
- JP setiap peserta memakai sesi Jenjangnya. Rekap program tetap dapat menampilkan seluruh Jenjang dengan acuan pada tiap peserta; acuan tunggal program dikosongkan bila ada beberapa Jenjang sesi. CSV menyertakan `id_jenjang`. Rumus JP, toleransi waktu, aturan perilaku/versinya dan syarat selesai pada laporan tidak diganti.
- Profil tidak menghitung sesi Jenjang lain sebagai ketidakhadiran. Laporan program menjumlahkan kesempatan peserta-sesi yang sesuai Jenjang, bukan seluruh peserta × seluruh sesi. Beranda tetap merangkum seluruh database.
- Hapus program mencakup Jenjang miliknya; hapus sesi/keikutsertaan tetap melindungi Jenjang lain, master peserta dan program lain. ID JEN yang terhapus ikut dicadangkan. Tidak ada tombol hapus Jenjang mandiri atau fitur perpindahan Jenjang historis.

## Bukti dari pengguna sebelum implementasi

Pada 27 Oktober 2026 pengguna mengonfirmasi panel pratinjau sudah terbuka. Gambar menunjukkan 3 program, 4 sesi, 41 keikutsertaan dan 0 masalah dalam cakupan panel. Tabelnya: PRG001 Pelatihan Teknis AI Agent, Dasar, 2 sesi/22 pendaftaran; PRG002 Leadership AI Training, kosong, 1 sesi/10 pendaftaran; PRG003 Pelatihan Sosial Kultural 1, Jenjang 1, 1 sesi/9 pendaftaran. Pengguna menjelaskan ini data dummy awal dan Leadership tidak memiliki tingkatan. Pemetaan awal yang dibahas: Dasar / Umum / Jenjang 1.

Itu konfirmasi pembacaan pratinjau, bukan konfirmasi migrasi atau kebenaran setiap histori. Form persiapan menampilkan pemetaan yang harus ditinjau kembali dari data salinan sebenarnya, tanpa mengandalkan jumlah/ID contoh yang ditanam di kode.

## File yang diperlukan

Gunakan seluruh file dari satu branch **refactor/paket-jenjang-satu-file**. Paket ini memuat fitur tahap 2 yang sama; tiga file baru sebelumnya telah digabung menjadi satu.

Tambahkan:

- Script **Jenjang** → **Jenjang.gs**. File ini memuat pengelolaan Jenjang, backend migrasi dan HTML panel tertanam. Tidak perlu file Script/HTML MigrasiJenjang terpisah.

Ganti isi lengkap delapan file yang sudah ada:

- Code.gs, Hapus.gs, Laporan.gs, PemetaanJenjang.gs.
- Pengelolaan.html, Peserta.html, Index.html, Profil.html.

Pertahankan Absensi.html, AdminQR.html, Beranda.html dan PratinjauJenjang.html yang sudah dipasang. Manifest/scopes/deployment asli tidak diganti. Tests, support, preview, markdown dan SOURCE_SNAPSHOT.json bukan file editor Apps Script.

Jika sudah memasang paket tahap 2 sebelumnya: cukup ganti isi lengkap **Jenjang.gs**. Setelah tersimpan, hapus file kode **MigrasiJenjang.gs** lama jika sempat dibuat, agar tidak ada fungsi ganda. HTML migrasi terpisah tidak dipakai lagi dan dapat dihapus jika sebelumnya dibuat dengan nama lain. Delapan file aplikasi di atas tidak berubah dari commit 8f15cba, sehingga tidak perlu disalin ulang jika versi itu sudah terpasang. Jangan menghapus sheet, audit atau properti migrasi saat merapikan file kode.

Jika tahap 2 belum dipasang: tambahkan satu Script Jenjang dan ganti delapan file lama di atas; file lengkap tersedia pada branch yang sama.

Seluruh sumber yang diperlukan harus dipasang bersama. Dukungan kompatibilitas data lama dimaksudkan untuk pengujian sebelum migrasi, bukan izin mencampur kode versi lama dengan database yang sudah dimigrasikan. Jangan menghapus Jenjang.gs/properti migrasi atau memasang ulang kode lama pada struktur baru.

## Urutan uji Google

1. Gunakan **salinan spreadsheet beserta proyek Apps Script terikatnya**, dengan akun pemilik. Simpan cadangan penuh dan konfigurasi/properti yang sebelumnya digunakan, termasuk batas ID terhapus `BATAS_ID_HAPUS|<id-spreadsheet>`. Jangan menyalin hanya data tanpa riwayat/aturan. Jangan menyunting sumber selama migrasi.
2. Buka **salinan spreadsheet → Ekstensi → Apps Script**. Pasang seluruh file di atas, simpan, kembali ke spreadsheet dan refresh. Tidak perlu ID Spreadsheet, onOpen kedua, atau trigger baru.
3. Pilih **Manajemen Pelatihan → Persiapan Struktur Jenjang**. Panel memeriksa ulang sumber. Untuk data dummy yang dibahas, periksa Dasar, Umum, Jenjang 1 serta jumlah masing-masing program. Ubah nama usulan hanya jika memang diperlukan. Program kosong/ambigu/ID atau relasi salah/transaksi tertunda harus ditinjau dahulu; tidak diperbaiki otomatis.
4. Pastikan benar-benar memakai salinan, tinjau pemetaan satu kelompok per program, centang kedua pernyataan, klik **Siapkan Struktur Jenjang**, lalu konfirmasi. Panel ini menulis struktur pada salinan; berbeda dari panel Pratinjau yang hanya membaca.
5. Hasil yang diharapkan: sheet **Jenjang** berisi satu baris per program lama; kolom **id_jenjang** ditambahkan di ujung Sesi dan Keikutsertaan. `Program.jenjang` lama tetap sebagai warisan dan tidak menjadi isian edit setelah migrasi. Tidak ada penggantian PRG/SES/KST/PST/JDA atau penghitungan ulang nilai.
6. Setelah selesai, gunakan menu Pengelolaan/Peserta/Monitoring pada salinan. Untuk uji web app/QR, buat atau perbarui **deployment proyek salinan** dan gunakan URL salinan; jangan memakai QR/URL proyek utama. Migrasi lewat menu sendiri tidak memerlukan deployment web app baru. Deployment utama belum menjadi bagian langkah ini.
7. Bandingkan ID, jumlah baris operasional lama, waktu, formula, nilai JP/perilaku, histori dan rekap dengan sebelum migrasi. Perubahan yang diharapkan hanyalah sheet/kolom relasi baru serta audit/properti persiapan.
8. Pada program dummy, tambahkan Jenjang kedua, buat sesinya dan daftarkan peserta lain. Pastikan peserta tidak muncul/dapat absen pada sesi Jenjang pertama dan sebaliknya; jangan menggandakan keikutsertaan peserta yang sama dalam satu program.
9. Uji QR datang/pulang dan retry, koreksi, izin, catatan/bukti, hitung JP, profil, CSV dan laporan PDF program selesai. Acuan/penyebut mengikuti Jenjang. Uji kembali hapus sesi, satu pendaftaran, identitas tanpa pendaftaran, dan program beserta Jenjang; data program/Jenjang lain harus tetap ada.

## Transaksi terputus dan pembatasan

Sebelum perubahan struktur, rencana sumber Program/Sesi/Keikutsertaan (nilai bertipe tanggal, formula, posisi kolom) serta hasil Jenjang diserialisasi menjadi potongan teks pada **Riwayat_Validasi** dengan tindakan **cadangan_migrasi_jenjang**. Rencana dibaca ulang dan diperiksa SHA-256. ScriptProperties per spreadsheet **MIGRASI_JENJANG|<id>** menyimpan identitas permintaan, sidik rencana, versi skema dan status. Backup audit/properti tidak dihapus saat selesai.

ScriptLock mengoordinasikan pembacaan/penerapan dengan penulisan aplikasi. Pratinjau dibandingkan ulang di bawah lock; sumber berubah menolak rencana. Karena Sheets bukan transaksi atomik lintas sheet, status MENYIAPKAN/PENDING menahan operasi normal sampai diperiksa. Edit manual/skrip eksternal yang mengabaikan lock tidak dikoordinasikan.

- **MENYIAPKAN:** cadangan mungkin belum lengkap, struktur belum boleh berubah. Buka kembali panel, gunakan **Periksa / Lanjutkan** bila cadangan lengkap. **Batalkan Persiapan** hanya tersedia sebelum sheet Jenjang/kolom baru ada; audit tetap disimpan, lalu dapat membuat pratinjau baru.
- **PENDING:** proses dapat terputus setelah sebagian struktur ditulis. Buka panel → **Periksa / Lanjutkan** → konfirmasi kembali. Server menerima hanya sel baru yang kosong atau persis sesuai rencana dan memastikan seluruh sumber lama/formula tetap sama. Tidak menggandakan Jenjang dan tidak memindahkan data baru di luar rencana.
- **SELESAI:** versi skema 1 siap untuk kode baru. Permintaan sama yang dikirim ulang tidak membuat baris kedua. Jangan menghapus properti migrasi; bila salinan struktur baru tidak memiliki properti tersebut, aplikasi menolak sampai konteks cadangan/konfigurasi dipastikan.
- Bila sumber/cadangan berubah, proses berhenti. Jangan memaksa status SELESAI. Tidak tersedia rollback otomatis; pemulihan memakai cadangan/salinan yang cocok dengan kode dan harus menjaga seluruh penulisan setelah snapshot. Jangan sekadar memasang kode lama atau menghapus kolom baru.

Migrasi awal hanya mendukung **satu Jenjang per program lama yang telah ditinjau**, maksimal 5.000 baris Sesi+Keikutsertaan dan 2 juta karakter rencana. Batas baca pratinjau tetap berlaku (50.000 baris/600.000 sel, 8 juta karakter sumber, 1.000 program). Data lama campuran beberapa Jenjang memerlukan rencana khusus, bukan pemisahan otomatis berdasarkan nama. Sesi bersama beberapa Jenjang dan transfer peserta historis belum didukung.

## Validasi lokal

```sh
node --test apps-script/absensi-dashboard/tests/*.test.mjs
python apps-script/absensi-dashboard/tests/browser/jenjang_browser.py
python apps-script/absensi-dashboard/tests/browser/hapus_browser.py
python apps-script/absensi-dashboard/tests/browser/pemetaan_jenjang_browser.py
```

113 tes backend = 83 sebelumnya + 29 integrasi struktur/migrasi + 1 pemeriksaan pembukaan panel tertanam tanpa file HTML eksternal. Akses bukan pemilik juga diperiksa sebelum panel dirender. Menggunakan sumber Code/Jenjang/Migrasi/Hapus/Laporan/Pemetaan sebenarnya dalam VM dengan spreadsheet/lock/properti tiruan. Cakupan: source stale, owner, konfirmasi, mapping lengkap, backup rusak/terputus, lost response, resume/cancel, tipe tanggal/formula/header, ID tetap dan ID pensiun, satu peserta per program, tambah/rename Jenjang, program baru, impor/retry tujuan, Monitoring/QR, JP/profil, penyebut laporan dan cascade hapus.

Chromium memakai fixture yang dihitung oleh backend VM serta bridge Google tiruan. Mencakup modal sesi/Jenjang, filter peserta, Monitoring multi-Jenjang, tautan sesi langsung, navigasi antarhalaman dengan konteks Jenjang, sidebar hover/collapse, konfirmasi migrasi tanpa RPC saat batal, kegagalan/resume dan desktop/mobile. Browser regresi hapus/pratinjau lama tetap dijalankan. Tampilan tertanam dibandingkan byte demi byte dengan HTML versi sebelumnya dan tetap identik. Browser mengambil HTML langsung dari fungsi pada Jenjang.gs agar tidak mengandalkan file yang sudah dihapus. Gambar preview adalah **data simulasi**, bukan bukti migrasi pengguna.

Belum terbukti lokal: otorisasi Google, dialog/menu pada pemasangan baru, kuota/durasi/serialisasi Sheets sebenarnya, penyimpanan/scan QR/evidence dan tata letak PDF native setelah migrasi. Uji salinan di atas diperlukan sebelum pembahasan pemakaian utama.
