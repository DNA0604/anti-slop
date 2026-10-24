# Beranda: local validation, 24 October 2026

Status: implemented and locally validated; not deployed to Google Apps Script.

## Backend

Run from repository root: `node --test apps-script/absensi-dashboard/tests/beranda.test.mjs`. All 12 tests passed. The suite evaluates Code.gs with read-only Sheets/Google service mocks and the actual scheduling/profile helpers. Cases cover empty data, totals versus registrations, cancelled memberships, pending/rejected notes, corrected attendance times, future/ongoing sessions, cross-program links, duplicate IDs/memberships, invalid schedules, agenda limits, missing sheets, owner checks before reads, timezone boundaries and existing/default routes.

The mock checks reads and routing, not Google OAuth or actual Google Sheets behavior.

## Browser

Chromium, desktop 1440 px and mobile 390 px. All original page scripts run against a simulated Google bridge. Native clicks/keyboard and rendered layout were checked; this was not a DOM-only simulation.

Pengujian Chromium lokal dengan data simulasi dan Google bridge mock; bukan deployment produksi.

Beranda: data ringkasan, agenda, peringatan, konteks program dan tautan sesi memakai /dev saat backend mengirim /exec.
Pencarian, hasil kosong, filter tindak lanjut, pagination 8 program, dan escaping nama program berfungsi.
Sidebar: collapse eksplisit, hover masuk/keluar, dan posisi dasar ikon Beranda stabil (transform hover bawaan tetap dipertahankan).
Keyboard: Tab dari tombol sidebar membuka rail yang diringkas; Escape menutup peek.
Navigasi nyata Beranda → Pengelolaan → Beranda → Peserta → Beranda → Monitoring → Beranda, konteks program dan /dev terjaga.
Kegagalan akses menyembunyikan angka lama; retry database kosong menampilkan nol dan empty state yang benar.
Mobile 390 px: tidak ada overflow halaman; tabel bergeser di area sendiri; menu modal dan Escape berfungsi.
Tanpa URL Web App yang valid, tautan tetap nonaktif dan tidak menuju #.

Sidebar base geometry was compared after accounting for the existing 3 px link hover transform. Accepted sidebar scripts were byte-compared with the previous commit and remain unchanged.

New screenshots in `../preview/beranda/` use simulated data and are separate from historical flat-design previews. Production Beranda.html contains no mock data or test bridge.

## Static/repository checks

All application inline scripts and Code.gs parse; no duplicate HTML IDs. Existing admin RPC names and sidebar scripts are unchanged. All 13 upstream repository guardrails pass.

## Verify after installation

Open the existing /dev URL without a page parameter, then test Beranda → Monitoring → Pengelolaan → Peserta → Beranda with program context retained; verify a participant profile and an existing arrival/departure QR URL. Compare dashboard counts with the spreadsheet, especially unique participants versus registrations, manual program statuses and finished-session attendance follow-up. Update the existing /exec deployment only after saving all required files, keeping its URL and real manifest/scopes. Production uploads, writes, authentication and scoring are not validated by these local tests.
