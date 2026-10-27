# Tahap 3 — Manajemen Akses Panitia dan uji identitas Google

Tanggal: 27 Oktober 2026, Asia/Jakarta. Paket terbaru: branch **fix/url-uji-login-deployment** (lanjutan feat/manajemen-akses-panitia).

Paket lanjutan **feat/login-dan-cakupan-panitia** tersedia setelah uji identitas berhasil. Lihat [SESI_AKSES_VALIDATION.md](SESI_AKSES_VALIDATION.md) untuk pemasangan paket sesi/otorisasi. Panduan di bawah menjelaskan batas paket tahap 3; uji identitas sendiri tetap tidak membuat sesi aplikasi.

## Batas paket tahap 3

Sudah tersedia: direktori akun pada **file spreadsheet terpisah**, Admin awal pemilik, pendataan peran/status, penugasan petugas ke beberapa Jenjang, audit/pemulihan perubahan, konfigurasi OAuth server dan **uji identitas Google**.

**Hasil uji pengguna, 27 Oktober 2026:** setelah perbaikan URL deployment, pengguna menunjukkan hasil Identitas Terverifikasi untuk Admin Pelatihan dan akun Petugas Kelas terpisah. Akun petugas menampilkan penugasan **Pelatihan Sosial Kultural 1 · Jenjang 1**; Admin tidak memerlukan penugasan Jenjang. Ini mengonfirmasi dua alur berhasil pada deployment pengguna, belum membuktikan seluruh skenario penolakan/pencabutan akses, browser lain atau pembatasan fitur operasional.

**Pembatasan fitur aplikasi utama belum diaktifkan.** Seluruh halaman/RPC operasional tetap memakai pembatasan pemilik yang sudah ada. Akun Admin/Petugas yang baru didata belum otomatis dapat menggunakan aplikasi utama. Uji Google tidak menerbitkan sesi aplikasi atau mengaktifkan placeholder Nama/Posisi/Log Out. Setelah uji pada Google berhasil, tahap berikutnya adalah sesi login dan pemeriksaan peran/cakupan pada setiap endpoint, berikut alur pengajuan koreksi petugas.

Tidak ada data Google, OAuth Client, spreadsheet atau deployment dibuat dari lingkungan pengembangan ini. Pengujian otomatis layanan memakai tiruan; uji Google langsung dilakukan pengelola sebagaimana hasil di atas.

## File pemasangan

1. Gunakan salinan database/proyek dengan versi Jenjang terbaru yang sudah berjalan.
2. Buka spreadsheet salinan → **Ekstensi → Apps Script**.
3. Tambahkan satu file **Script Akses**, salin seluruh **Akses.gs**. Tampilan panel dan uji login sudah tertanam; tidak menambah HTML bernama sama.
4. Ganti isi lengkap **Code.gs** dari branch yang sama. Perubahannya hanya pilihan menu baru serta rute uji/callback; default Beranda, navigasi lama dan prioritas token QR dipertahankan.
5. Simpan dan refresh tab spreadsheet. Buka **Manajemen Pelatihan → Manajemen Akses Panitia** sebagai pemilik.

File Jenjang.gs satu paket tetap dipertahankan, bersama file aplikasi lain. Tidak memasang kembali MigrasiJenjang.gs/MigrasiJenjang.html. Tidak perlu mengubah kolom database operasional atau mengulangi migrasi Jenjang untuk fitur akses ini.

## A. Siapkan spreadsheet akses terpisah

1. Pada panel, masukkan **tautan/ID spreadsheet akses yang dimiliki akun pemilik database**, atau kosongkan untuk membuat file baru bernama Manajemen Akses Panitia. Tombol persiapan memerlukan konfirmasi.
2. Sistem menolak ID database utama, file pemilik lain, dan header/formula tidak sesuai pada tab yang sudah berisi data. Data yang sudah terisi tidak ditimpa. Bila memakai file lama berformat lain, gunakan salinan kosong atau siapkan formatnya dengan meninjau data terlebih dahulu.
3. Tiga tab utama disiapkan:

| Tab | Kolom |
| --- | --- |
| Pengguna | id_pengguna, nama, email_google, google_sub, peran, status, created_at, updated_at |
| Penugasan_Jenjang | id_penugasan, id_pengguna, id_program, id_jenjang, status, created_at, updated_at |
| Riwayat_Akses | id_riwayat, jenis_data, id_target, aksi, sebelum, sesudah, oleh, waktu, id_permintaan, status_transaksi |

4. Pemilik database ditambahkan sebagai **Admin Pelatihan aktif** jika belum tercatat. Persiapan ulang memakai konfigurasi/file yang tersimpan, tanpa menambah Admin kedua. File akses yang telah tersambung tidak diganti melalui persiapan ulang.
5. Tambahkan panitia melalui panel: nama, email Google, peran Admin Pelatihan/Petugas Kelas Pelatihan dan aktif/nonaktif. Email dinormalisasi huruf/spasinya; titik dan akhiran `+` tidak digabung otomatis. Gunakan email utama yang dikembalikan Google saat login.
6. Pada Penugasan Petugas, pilih petugas aktif → program → Jenjang. Ulangi untuk Jenjang lainnya bila petugas menangani beberapa kelompok. Acuan memakai ID Program/Jenjang yang ada pada database utama, tanpa menyalin data peserta.
7. Gunakan Nonaktifkan pada akun/penugasan untuk mencabut status. Riwayat dipertahankan; tidak ada hapus fisik akun. Admin pemilik tidak dapat dinonaktifkan/diganti peran/emailnya melalui panel. Akun yang sudah terhubung Google tidak diganti emailnya; buat akun baru dan nonaktifkan yang lama jika diperlukan.

Penugasan dengan program/Jenjang yang sudah hilang tetap ditampilkan untuk diperiksa tetapi tidak menjadi cakupan uji identitas. Tidak ada penghapusan otomatis pada file akses saat program dihapus. Hak aplikasi nantinya harus memeriksa hubungan yang masih valid setiap kali, bukan mempercayai label atau daftar yang disimpan di browser.

File akses dan editor Apps Script dibatasi pada pengelola tepercaya. Panitia tidak perlu diberi akses edit spreadsheet/proyek hanya untuk menggunakan web app di tahap selanjutnya. Tidak ada kata sandi, access token Google, ID token atau Client Secret pada tab direktori/audit. `google_sub` disimpan sebagai teks setelah identitas terverifikasi dan tidak dikirim ke panel daftar akun; riwayat akun tetap berisi data panitia dan perlu dijaga hak aksesnya.

## B. Uji login Gmail pribadi pada salinan

Bagian ini memerlukan konfigurasi Google Cloud milik pengelola. Jika belum ada OAuth Client, pendataan akun/penugasan pada bagian A tetap dapat digunakan terlebih dahulu.

1. Buat/perbarui deployment web app **proyek salinan** dengan Code.gs/Akses.gs versi ini. Jalankan sebagai pemilik dan atur agar akun Google panitia yang diuji dapat membuka URL tersebut. Jangan mengubah deployment utama untuk percobaan ini.
2. Dari **Deploy → Manage deployments**, salin **Web app URL** deployment salinan yang sedang dipakai. Pastikan deployment milik proyek ini dan URL dapat dibuka. Buka panel Manajemen Akses Panitia → Uji Login, lalu tempel pada **URL deployment web app (/exec)**. Gunakan URL persis yang sama, tanpa `?page=uji-login` atau tambahan parameter, pada **Authorized redirect URIs** OAuth Client. URL otomatis Apps Script dapat menunjuk deployment lain; kolom ini dapat diubah pemilik dan URL tersimpan menjadi acuan tombol, authorize dan pertukaran kode. Bentuk domain/path diperiksa server, tetapi kepemilikan/izin/versi deployment harus diperiksa pengelola.
3. Di Google Cloud, gunakan OAuth Client jenis **Web application**. Untuk Gmail pribadi, audience harus mengizinkan pengguna eksternal; bila aplikasi masih Testing, tambahkan email panitia sebagai test user. Siapkan informasi consent screen yang diminta Google. Ikuti pengaturan terbaru di konsol Google.
4. Masukkan **Client ID dan Client Secret melalui panel pemilik**, lalu simpan bersama URL deployment. Jangan mengirim secret melalui chat, menaruhnya di GitHub/HTML atau pada spreadsheet. Secret tersimpan di ScriptProperties dan tidak dimuat kembali ke panel. Kosong saat penyimpanan ulang mempertahankan secret hanya jika Client ID sama.
5. Klik **Buka Uji Login**. Pada tab uji, pilih **Siapkan Login Google**, lalu klik **Lanjutkan ke Google**. Google dibuka pada tab uji yang sama. Setelah memilih akun, callback kembali ke proyek dan memeriksa secret sementara dari penyimpanan sesi browser tersebut.
6. Hasil yang diharapkan: nama/email Google terverifikasi, peran yang tercatat serta penugasan Jenjang aktif/valid. Akun tidak dikenal/nonaktif ditolak; petugas tanpa penugasan ditampilkan tanpa cakupan. Berhasil di sini **belum memberikan akses ke halaman operasional**.
7. Jika muncul sesi browser tidak ditemukan, jangan memasukkan email/token secara manual sebagai jalan pintas. Mulai uji baru pada tab yang sama dan periksa dukungan penyimpanan sesi/origin iframe HTMLService pada deployment sebenarnya. Pemilik perlu mengonfirmasi alur ini berfungsi sebelum tahap pembatasan aplikasi dilanjutkan.

OAuth server memakai authorization code, PKCE S256, state acak, nonce dan secret browser yang tidak dimasukkan ke URL. State berumur maksimal lima menit dan dikonsumsi sekali di bawah ScriptLock; operasi HTTP tidak memegang lock tersebut. Token hanya diperoleh server dari endpoint HTTPS Google tetap; browser tidak dapat mengganti alurnya dengan ID/access token yang dikirim sendiri.

ID token yang berasal langsung dari pertukaran server Google dibaca untuk memeriksa issuer, audience, azp bila ada, nonce, iat/exp dan sub. Sub/email_verified dikonfirmasi lagi lewat endpoint userinfo Google menggunakan access token server. Implementasi tidak melakukan verifikasi RSA lokal atau menerima JWT dari browser; jangan menggunakannya sebagai endpoint pemeriksaan token umum. Redirect HTTP saat pertukaran token/userinfo ditolak dan sertifikat HTTPS divalidasi. Token/secret tidak dicatat atau diberikan pada hasil uji. Pada penautan pertama, google_sub disimpan dengan audit; perubahan sub atau sub yang sudah dipakai akun lain ditolak.

Alur ini masih pembuktian integrasi pada HTMLService. Token jaringan, consent screen Google, perilaku callback/storage, pembatasan akun Google Cloud, kuota dan izin deployment belum dapat dibuktikan oleh tes lokal.

Rujukan konfigurasi:

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/apps-script/guides/html/restrictions

## Jika tombol uji membuka halaman Google Drive yang gagal

Bandingkan URL pada panel dengan Web app URL dari Manage deployments. Jika berbeda, gunakan paket fix/url-uji-login-deployment: **ganti Akses.gs saja** bila paket tahap 3 sudah terpasang. Simpan, refresh spreadsheet, isi URL /exec yang benar pada kolom baru dan simpan konfigurasi. Client ID tetap diperlukan; Client Secret boleh kosong bila Client ID tidak berubah dan secret sebelumnya sudah tersimpan. Perbarui Authorized redirect URIs OAuth Client agar sama persis. Selanjutnya edit deployment salinan yang dipilih → pilih New version → Deploy, dengan mempertahankan URL deployment itu. Mulai uji baru; state dari konfigurasi sebelumnya ditolak.

Bila URL benar masih gagal dibuka, periksa status/izin deployment dan coba satu akun Google pada profil terpisah. Perbedaan URL yang ditemukan pengguna membuktikan ketidaksesuaian target tombol; tes lokal tidak dapat memastikan semua penyebab halaman error Google Drive. Tidak ada URL deployment pengguna yang ditanam dalam kode.

## Izin dan konfigurasi server

ID database utama disimpan oleh persiapan menu pada ScriptProperties `AKSES_DATABASE_ID`, sehingga callback web app dapat membuka sumber yang benar meskipun tidak ada spreadsheet aktif. Browser tidak menentukan ID database utama. Konfigurasi direktori disimpan pada ScriptProperties `AKSES_PANITIA|<id-database>`; konfigurasi OAuth pada `AKSES_GOOGLE_CLIENT|<id-database>`. Pertahankan properti tersebut saat pemulihan. Client Secret dapat dilihat editor proyek tepercaya melalui pengaturan server, sehingga akses editor harus tetap terbatas.

Layanan spreadsheet lintas file memerlukan izin Sheets penuh. Jika manifest produksi menggunakan explicit scopes/current-only, tinjau penambahan `https://www.googleapis.com/auth/spreadsheets`. UrlFetchApp untuk uji login memerlukan `https://www.googleapis.com/auth/script.external_request`. Pertahankan scopes Docs/Drive/UI yang sudah diperlukan aplikasi; manifest referensi di repository tidak menggantikan manifest proyek sebenarnya. Pada proyek dengan scope otomatis, Google dapat meminta otorisasi ulang pemilik saat fungsi baru pertama kali dijalankan. Panitia dalam uji OAuth hanya diminta scope `openid email profile`.

## Transaksi akses terputus

Perubahan akun, penugasan dan penautan Google memiliki request ID, audit PENDING/SELESAI/PERLU_PEMULIHAN, serta snapshot sebelum/sesudah pada file akses. Pengiriman ulang permintaan sama tidak menggandakan akun. Versi lama ditolak ketika data berubah. Seluruh perubahan direktori baru dan hasil uji identitas ditahan selama ada transaksi akses belum selesai.

Klik **Periksa / Pulihkan Transaksi Akses**. Sistem menerapkan ulang hanya bila record masih sama dengan snapshot sebelum atau sudah persis hasil rencana. Perubahan eksternal yang berbeda menghentikan pemulihan. Tidak ada tombol paksa selesai; jangan menyunting status audit untuk melewati masalah. Penyiapan pertama yang terputus menyimpan ID file sehingga persiapan ulang memakai file yang sama.

Batas saat ini: 1.000 akun, 5.000 penugasan, 10.000 baris audit (perubahan baru dihentikan menjelang batas), dan 40.000 karakter per rencana. Daftar akun dipaginasi 20 baris; panel menampilkan 50 baris audit terbaru. Pengarsipan audit otomatis belum tersedia. Pengeditan manual spreadsheet/skrip lain tidak dikoordinasikan oleh ScriptLock; gunakan panel untuk perubahan normal.

## Pengujian dan status penyerahan

```sh
node --test apps-script/absensi-dashboard/tests/*.test.mjs
python apps-script/absensi-dashboard/tests/browser/akses_browser.py
```

149 tes backend (113 sebelumnya + 36 akses): pemilik, file terpisah/bootstrap berulang, header tidak ditimpa, normalisasi email, stale/idempotensi, root tetap aktif, multi-Jenjang, pencabutan, audit/recovery/konflik, secret tidak bocor, state/nonce/PKCE/browser-key, identitas tanpa Session email atau konteks spreadsheet aktif, klaim Google salah/kedaluwarsa/replay, email nonaktif/tidak dikenal, subject berubah/duplikat, cakupan orphan, perubahan konfigurasi, error jaringan, header direorder/subject panjang, prioritas QR/rute callback, perbedaan URL service/deployment, validasi URL /exec, URL tersimpan saat deteksi otomatis berubah/tidak tersedia dan pembatalan state saat callback diganti.

Chromium menggunakan panel HTML yang benar-benar dihasilkan Akses.gs dengan bridge Google tiruan: konfigurasi URL deployment dan tautan setelah simpan, tambah/edit akun, status, penugasan, tampilan secret, reload gagal, teks berbahaya, desktop/mobile, persiapan login pada tab sama, callback berbasis penyimpanan browser dan kegagalan storage yang menutup alur. Semua identitas/gambar preview memakai **data uji**.

Sumber aplikasi lama selain tambahan menu/rute pada Code.gs tetap identik dengan versi Jenjang satu file. Database operasional, formula JP/perilaku, halaman QR, sidebar dan fitur hapus tidak berubah. Uji Google pada bagian A/B dan verifikasi kuota/izin masih perlu dilakukan pada salinan. Jangan menyatakan RBAC aplikasi sudah aktif hanya karena direktori atau hasil uji identitas telah tersedia.
