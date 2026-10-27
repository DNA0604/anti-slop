# Tahap 1 — Struktur Jenjang dan persiapan akses panitia

Tanggal: 27 Oktober 2026, Asia/Jakarta.

Lanjutan implementasi tahap 2 tersedia pada branch **feat/struktur-jenjang-pelatihan**; lihat [panduan struktur/migrasi](../tests/JENJANG_VALIDATION.md). Bagian berikut mempertahankan rancangan awal sebagai acuan. Pengguna telah mengonfirmasi panel pratinjau terbuka; implementasi migrasi belum diuji pada Google dari lingkungan ini.

Status: pemeriksaan kode dan rancangan awal selesai; alat pratinjau baca saja telah dibuat dan diuji lokal sebagai dua file tambahan. Setelah pengguna melaporkan konteks getUi tidak tersedia dari editor, Code.gs hanya disesuaikan pada fungsi onOpen untuk menambahkan menu pembuka dari spreadsheet. Isi spreadsheet sebenarnya belum tersedia di lingkungan ini; pemetaan per program belum dijalankan. Migrasi dan login belum dibuat/terpasang. Sembilan file aplikasi sebelumnya dan bagian Code.gs di luar onOpen tetap memakai versi yang diterima pengguna, ae1622a.

## Gambaran untuk pengelola

Program merupakan payung pelatihan. Di dalamnya ada satu atau beberapa **Jenjang**. Setiap Jenjang memiliki peserta dan sesinya sendiri. Seorang peserta hanya terdaftar pada satu Jenjang dalam program yang sama, lalu dapat mengikuti seluruh sesi Jenjang tersebut tanpa pendaftaran ulang per sesi.

Contoh berikut hanya ilustrasi, bukan isi database pengguna:

| Program | Jenjang | Peserta | Sesi yang diikuti |
| --- | --- | --- | --- |
| Pelatihan A | Jenjang 1 | Ani, Budi | Pembukaan J1, Materi J1 |
| Pelatihan A | Jenjang 2 | Citra, Dedi | Pembukaan J2, Materi J2 |

Ani tidak dihitung belum hadir pada Materi J2. Jika Materi J1 bernilai 4 JP dan Materi J2 bernilai 6 JP, acuan Ani berasal dari sesi J1 sesuai aturan perhitungan yang berlaku; bukan 10 JP dari kedua Jenjang. Ani tetap dapat mengikuti program lain dengan pendaftaran tersendiri.

## Keputusan yang sudah disepakati

- Istilah data dan pilihan di halaman: **Jenjang**. Hubungan: Program → Jenjang → Sesi.
- Satu peserta hanya memiliki satu Jenjang dalam satu program. Satu identitas peserta dapat digunakan di beberapa program.
- Peran: **Admin Pelatihan** dan **Petugas Kelas Pelatihan**. Penugasan petugas dapat meliputi satu atau beberapa Jenjang.
- Admin mengelola keseluruhan aplikasi. Petugas mengakses data sesuai penugasan; persetujuan, pengaturan, penghapusan dan finalisasi tetap wewenang Admin.
- Panitia dominan memakai Gmail pribadi. Login Google perlu diverifikasi di server; isian email, menu tersembunyi, dan whitelist dengan `Session.getActiveUser()` saja tidak cukup.
- Akun dan penugasan disimpan di **file spreadsheet terpisah** dari database operasional.
- Fitur hapus versi sebelumnya telah dipasang, diuji dan dinyatakan selesai oleh pengguna. Perubahan Jenjang nantinya harus mempertahankan fitur tersebut.

## Temuan pada kode saat ini

| Bagian | Kondisi sekarang | Akibat untuk pengembangan |
| --- | --- | --- |
| Program | `Program.jenjang` berupa satu teks; boleh kosong | Belum mewakili beberapa Jenjang yang memiliki peserta/sesi berbeda |
| Sesi | Menyimpan `id_program`, belum `id_jenjang` | Jadwal belum dapat dipisahkan berdasarkan Jenjang |
| Keikutsertaan | Terhubung ke program dan peserta; pasangan program–peserta harus unik | Aturan unik tetap dipertahankan, ditambah satu referensi Jenjang |
| QR dan Monitoring | Pemilihan peserta berdasarkan program sesi | Pencarian dan penyimpanan harus sama-sama memeriksa Jenjang |
| Profil, JP, laporan | Mengambil sesi pada tingkat program | Acuan dan penyebut harus disesuaikan dengan sesi wajib tiap peserta |
| Hapus | Mendukung relasi lama dan menolak referensi pada sheet tambahan yang belum dikenal | Menambahkan sheet Jenjang saja akan memblokir hapus program sampai skema hapus disesuaikan |
| Akses admin | Pembatasan pemilik spreadsheet | Belum ada akun panitia, login multiuser, atau pembatasan penugasan |

Sumber pemeriksaan: `Code.gs` (`tambahKeikutsertaan`, `tambahProgramIndex`, `tambahSesiIndex`, `cariPesertaAbsensi`, `simpanAbsensiPeserta`, `muatKehadiranIndex`, `muatRekapJPProgramIndex`, `muatProfilPesertaIndex`, `muatBerandaIndex`), `Laporan.gs`, dan `Hapus.gs` (`skemaHapus_`, `rencanaHapus_`). Pemeriksaan ini membuktikan struktur yang dibaca kode, bukan kondisi seluruh data live.

## Rancangan struktur operasional

Ini skema sasaran untuk implementasi berikutnya, bukan instruksi menambah kolom secara manual sekarang.

| Sheet | Rancangan | Aturan |
| --- | --- | --- |
| Program | Pertahankan ID, nama, kategori, periode, status dan versi aturan penilaian | Program tetap payung; status selesai tetap mengendalikan laporan formal |
| Jenjang — baru | `id_jenjang`, `id_program`, `nama_jenjang`, `created_at`, `updated_at` | ID stabil dan unik; program wajib ada; nama tidak ambigu dalam program yang sama |
| Sesi | Tambahkan `id_jenjang`, pertahankan `id_program` dan `id_sesi` | Program sesi wajib sama dengan program Jenjang |
| Keikutsertaan | Tambahkan `id_jenjang`, pertahankan `id_program`, `id_peserta`, `id_keikutsertaan` | Pasangan program–peserta tetap unik; Jenjang wajib milik program tersebut |
| Peserta | Tetap sebagai master identitas | Tidak menyimpan Jenjang di master karena peserta dapat mengikuti program lain |
| Kehadiran dan Catatan_Perilaku | Pertahankan referensi sesi/keikutsertaan yang ada | Referensi harus konsisten program dan Jenjang; catatan cakupan program tetap terkait keikutsertaan |
| Jeda_Sesi, Token_QR, Log_Absensi | Pertahankan relasi yang ada | Cakupan ditelusuri lewat sesi/keikutsertaan, tidak menduplikasi nama Jenjang |

Usulan ID baru menggunakan awalan `JEN`; format akhir diseragamkan dengan generator saat implementasi. ID lama PRG/SES/KST/PST/JDA tidak diubah atau dipakai ulang. Pencadangan batas ID untuk penghapusan perlu diperluas bila entitas Jenjang kelak dapat dihapus.

Kolom lama `Program.jenjang` dipertahankan sebagai data warisan selama peralihan. Sesudah migrasi lengkap, sumber kebenaran adalah sheet Jenjang dan referensinya; kolom lama tidak menjadi isian kedua yang dapat mengubah penempatan peserta. Tampilan/kontrak lama diganti bersama pemakainya, bukan diam-diam mengambil Jenjang pertama.

Untuk rancangan awal, satu sesi menjadi milik satu Jenjang. Sesi bersama beberapa Jenjang belum diputuskan dan tidak diasumsikan otomatis; kebutuhan tersebut perlu dibahas sebelum pelaksanaan migrasi bila memang ada. Perpindahan Jenjang setelah ada aktivitas historis juga tidak termasuk pemindahan otomatis.

## Pemetaan data lama

Langkah pertama berikutnya adalah **pratinjau pemetaan yang hanya membaca data**, dijalankan pada salinan spreadsheet dan proyek Apps Script. Pratinjau harus memperlihatkan ID/nama program, teks Jenjang lama, usulan Jenjang, jumlah sesi, jumlah keikutsertaan, masalah dan status pemeriksaan. Tidak menyimpulkan Jenjang dari nama orang, unit kerja, atau nama sesi.

| Kondisi lama | Usulan pratinjau | Syarat sebelum diterapkan |
| --- | --- | --- |
| Satu Jenjang jelas terisi | Satu Jenjang dengan nama tersebut; seluruh sesi dan keikutsertaan program diarahkan ke sana | Pastikan memang tidak ada kelompok lain yang tercampur |
| Jenjang kosong | Tandai **Perlu penetapan Jenjang**; boleh usulkan nama Umum | Pengelola menentukan nama/penempatan; tidak otomatis menganggap semua data Umum |
| Teks mengandung beberapa kelompok atau pengelola menyatakan campuran | Tandai **Perlu pemetaan manual** | Tentukan Jenjang setiap sesi dan keikutsertaan; jangan memecah teks menjadi kelompok secara otomatis |
| Program lama berbeda ID tetapi namanya mirip | Tetap program terpisah | Tidak menggabungkan program atau mengganti ID hanya karena nama mirip |
| ID duplikat/kosong, relasi hilang, peserta ganda atau transaksi tertunda | Tandai **Terhalang masalah data** | Periksa/pulihkan melalui alur yang ada sebelum migrasi |
| Sudah terdapat Jenjang atau sebagian referensi baru | Tandai **Periksa migrasi sebelumnya** | Cocokkan rencana/hasil terdahulu; jangan menambah ulang atau menimpa |

Pratinjau harus memeriksa kecocokan pasangan sesi–keikutsertaan pada kehadiran, catatan, dan log terhadap pemetaan baru. Jika aktivitas lama akan menjadi lintas Jenjang, hentikan pemetaan tersebut untuk diperiksa; jangan menghapus atau mengubah histori agar lolos pemeriksaan.

Program selesai tetap diperiksa, bukan dilewati. Program tanpa sesi/peserta tetap ditampilkan; master peserta tanpa keikutsertaan tidak perlu diberi Jenjang. Semua status keikutsertaan tetap dipertahankan.

## Cara migrasi nanti dilaksanakan

1. Buat salinan database/proyek; catat jumlah baris, ID, nilai/tanggal/formula, rekap, dan versi aplikasi sebagai pembanding. Simpan cadangan sumber serta properti batas ID yang dipakai aplikasi. Pemeriksaan lokal saat ini belum membuat salinan Google tersebut.
2. Jalankan pratinjau baca saja. Selesaikan kondisi ambigu dan transaksi tertunda, kemudian simpan rencana pemetaan dengan versi/hash sumber.
3. Uji penerapan rencana pada salinan menggunakan kode yang telah mendukung Jenjang di semua alur. Penulisan memegang ScriptLock, memeriksa sumber belum berubah, mencatat kemajuan serta memverifikasi hasil; retry tidak membuat Jenjang baru lagi.
4. Saat terputus, lanjutkan rencana yang sama setelah pemeriksaan; aplikasi tidak boleh memakai struktur separuh termigrasi. Google Sheets tidak menyediakan transaksi atomik lintas sheet, sehingga perlu penanda versi/status migrasi dan penolakan operasi pada keadaan belum lengkap.
5. Bandingkan semua hasil pada salinan. Rencana satu-Jenjang harus mempertahankan hasil lama; pembagian beberapa Jenjang hanya mengubah cakupan yang ditinjau. Rumus JP/perilaku dan status validasi tidak diganti.
6. Migrasi produksi menjadi pekerjaan tersendiri setelah hasil salinan dapat ditinjau. Selama perpindahan, penulisan aplikasi/edit manual dihentikan; jangan menjalankan kode lama dan baru secara bersamaan. Aplikasi baru memeriksa versi skema sebelum membaca/menulis. Pemulihan dilakukan ke cadangan yang cocok dengan kode, bukan sekadar memasang ulang kode lama setelah penulisan baru.

## Bagian aplikasi yang harus menyesuaikan pada tahap 2

| Alur | Perubahan yang diperlukan |
| --- | --- |
| Pengelolaan | Pilihan Program → Jenjang → Sesi; tambah/edit Jenjang; status program tetap pada program |
| Pendaftaran/impor | Pilih Jenjang tujuan; cegah pendaftaran kedua pada Jenjang lain dalam program yang sama; masukkan pilihan Jenjang dalam identitas permintaan/retry |
| QR | Token tetap menunjuk sesi; peserta harus terdaftar aktif di Jenjang sesi baik saat dicari maupun saat disimpan |
| Monitoring, koreksi, izin, perilaku dan bukti | Periksa seluruh hubungan sesi–keikutsertaan di server, termasuk referensi tidak langsung dari ID kehadiran/catatan/unggahan |
| Profil dan JP | Hitung hanya sesi Jenjang peserta dengan aturan waktu/status/JP yang ada; nilai belum tersedia tetap ditampilkan sebagai belum tersedia |
| Beranda, CSV dan PDF | Ringkasan program menggabungkan Jenjang tanpa menggandakan peserta; penyebut kehadiran menjumlahkan peserta yang wajib pada setiap sesi, bukan seluruh peserta × seluruh sesi |
| Hapus dan pemulihan transaksi | Kenali Jenjang sebagai relasi resmi; hapus program mencakup Jenjang miliknya; hapus sesi/keikutsertaan tetap melindungi data Jenjang lain; audit/cadangan tetap dipertahankan |
| Navigasi | Pertahankan program dan Jenjang terpilih, tautan profil, URL QR dan konteks dev/exec; sidebar yang diterima pengguna tetap bekerja |

Tidak menambahkan tombol hapus Jenjang terpisah pada tahap 1. Jika diperlukan nanti, dampak cascade dan konfirmasi harus dirancang tersendiri. Audit/rencana transaksi lama tidak ditulis ulang agar terlihat selesai; pemulihannya harus diperiksa terhadap skema baru.

## Rancangan akses pada tahap selanjutnya

File spreadsheet **Manajemen Akses Panitia** terpisah dari database utama:

| Tab | Rancangan isi |
| --- | --- |
| Pengguna | `id_pengguna`, nama, email Google terverifikasi, peran, status aktif/nonaktif, waktu pembuatan/perubahan |
| Penugasan_Jenjang | ID penugasan, `id_pengguna`, `id_program`, `id_jenjang`, status dan waktu perubahan; memakai ID dari database utama |
| Riwayat_Akses | Perubahan akun/peran/status/penugasan, pelaku, waktu dan nilai sebelum/sesudah |

Email unik setelah normalisasi huruf/spasi; jangan menggabungkan akun Gmail dengan menghapus titik atau akhiran `+`. Admin awal ditetapkan dari pemilik yang sudah terverifikasi. ID spreadsheet akses disimpan pada konfigurasi server, bukan dipercaya dari input browser. File akses tidak dibagikan ke seluruh petugas. Jangan membuka akses jika file konfigurasi gagal dibaca, akun nonaktif atau penugasan tidak valid.

| Kemampuan | Admin Pelatihan | Petugas Kelas Pelatihan |
| --- | --- | --- |
| Ringkasan, jadwal, peserta, profil, kehadiran, rekap JP | Semua program | Jenjang yang ditugaskan |
| Penerbitan QR | Semua sesi | Sesi Jenjang yang ditugaskan |
| Koreksi kehadiran | Memeriksa dan menyetujui | Mengajukan koreksi sesuai penugasan |
| Izin/perilaku dan bukti | Mencatat dan memvalidasi | Mencatat/mengajukan sesuai penugasan; Admin memvalidasi |
| Program/Jenjang/sesi, master peserta dan impor | Mengelola | Tidak mengubah |
| Aturan penilaian, perhitungan JP, finalisasi dan laporan formal | Mengelola/menjalankan | Melihat ringkasan yang diizinkan |
| Hapus, akun dan penugasan | Mengelola | Tidak memiliki akses |

Alur pengajuan koreksi oleh petugas belum ada; ini pekerjaan baru, bukan mengganti label tombol koreksi Admin. Pembatasan harus berlaku pada fungsi baca, ekspor, penulisan, unggahan serta pemulihan, bukan hanya menu. Profil petugas tidak boleh membuka riwayat program lain melalui master identitas yang sama. Pencarian master dan daftar petugas/penugasan juga perlu dibatasi.

Protokol login belum ditentukan. Lakukan pembuktian login Gmail pribadi dan verifikasi identitas di server pada deployment uji, termasuk batas origin/iframe HTMLService, sesi login, kedaluwarsa, logout dan akun nonaktif. Pembuktian ini perlu dilakukan sebelum refaktor akses secara luas. QR peserta tetap alur terpisah dengan pemeriksaan token dan Jenjang; login panitia tidak otomatis diterapkan kepada peserta.

## Pemeriksaan penerimaan

- Satu program, dua Jenjang, sesi berbeda: peserta hanya muncul/dapat absen pada Jenjangnya; mengganti ID lewat permintaan langsung ditolak di server.
- Peserta sama pada dua program tetap memiliki histori yang terpisah; pendaftaran ganda lintas Jenjang dalam satu program ditolak.
- Program lama satu-Jenjang: ID, jumlah baris, histori, rekap JP/perilaku dan penyebut kehadiran cocok sebelum/sesudah migrasi pada salinan.
- Sesi mendatang/jadwal bermasalah tetap mengikuti aturan lama; ketidakhadiran dan JP tidak dihitung dari Jenjang lain.
- Profil, Monitoring, Beranda, CSV dan PDF konsisten dalam cakupan dan total. Laporan formal tetap hanya program selesai.
- Hapus program/sesi/keikutsertaan/master peserta beserta retry, audit dan pemulihannya lulus kembali; Jenjang/program lain terlindungi.
- Pratinjau tidak menulis; penerapan ulang tidak menggandakan data; sumber berubah menghentikan rencana; kegagalan sebagian tidak membuka aplikasi pada skema campuran.
- Untuk akses kelak: Admin, dua petugas beda Jenjang, petugas multi-Jenjang, akun tidak terdaftar/nonaktif dan penugasan dicabut diuji, termasuk permintaan langsung, ekspor dan bukti.

## Hasil tahap ini dan langkah terdekat

Yang telah selesai: pemeriksaan struktur pada kode, pencatatan keputusan pengguna, skema sasaran dan aturan pemetaan/validasi di atas, alat pratinjau **PemetaanJenjang.gs + PratinjauJenjang.html** dengan pengujian lokal, serta menu pembuka dalam **Code.gs**. Belum ada login, spreadsheet akses, kolom baru atau migrasi.

Langkah berikutnya: pasang file pratinjau dan revisi **Code.gs** pada salinan proyek, simpan lalu refresh spreadsheet; pilih **Manajemen Pelatihan → Pratinjau Pemetaan Jenjang**. Pengelola dapat melihat daftar program dan usulan penempatannya tanpa menulis data. Lihat [panduan pemasangan/validasi](../tests/PEMETAAN_JENJANG_VALIDATION.md). Hasil peninjauan salinan menjadi dasar penyusunan rencana pemetaan berikutnya; panel belum menyimpan keputusan atau menerapkan migrasi. ID Spreadsheet dan deployment website tidak diperlukan untuk pratinjau ini.
