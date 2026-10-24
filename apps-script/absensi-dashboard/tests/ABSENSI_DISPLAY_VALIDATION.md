# Public attendance display validation — 24 October 2026

Implemented on ui/absensi-komdigi. No Google deployment or production data writes performed.

## Backend and static checks

`node --test apps-script/absensi-dashboard/tests/*.test.mjs` passed all 17 tests: 5 display metadata tests and 12 existing Beranda regression tests. The new tests stub the existing token validator and check that the display endpoint resolves only the validated session, performs no lookup on invalid/revoked/expired/duplicate token results, preserves metadata without mutation, handles missing/duplicate matches, and leaves a blank session name available for the UI fallback. These tests do not independently verify Google's token/storage services.

Byte comparison against the previous commit confirmed that Code.gs is unchanged except for the appended display function. The entire client confirmation/save/retry function is identical; the embedded logo URI matches Index.html. All application scripts and the GS source parse; HTML IDs are unique. Existing repository guardrails pass.

## Rendered browser checks

Pengujian lokal Chromium dengan mock Google bridge; tidak terhubung ke spreadsheet produksi.

Desktop: logo tertanam, identitas instansi, warna biru, nama sesi tanpa ID, pencarian minimal 2 karakter, hasil kosong/error, respons pencarian lama diabaikan, pemilihan dengan keyboard.
Konfirmasi/retry: hanya satu permintaan selama proses, input/pilihan terkunci, retry memakai token/peserta/ID permintaan yang sama, hasil sukses final tetap terkunci.
320/390/768 px: tidak ada overflow mendatar, nama sesi dan pilihan peserta membungkus, tombol dan input dapat digunakan; Pulang tampil dengan benar.
Token kosong, tidak valid/kedaluwarsa, atau kegagalan validasi tidak membuka form dan tidak menampilkan nama sesi yang belum terverifikasi.
Nama sesi kosong tidak diganti ID; nama panjang tidak merusak layout; nama berisi HTML ditampilkan sebagai teks.
Penolakan bisnis tetap menjadi hasil terminal; tidak mengaktifkan ulang tombol atau membuat permintaan baru.

The page ran its actual inline script in Chromium with a mocked Google script bridge. Names and token values in tests/screenshots are simulated. Screenshots in preview/absensi-komdigi are design evidence only, not production scan results.

## Manual deployment follow-up

Replace Absensi.html and Code.gs together, save and update the same deployment version to preserve QR URLs. Verify a real valid arrival QR, departure QR, expired QR, participant lookup and confirmation using the deployed Google application. Keep existing spreadsheet schema, IDs, manifest, permissions and request retry rules.
