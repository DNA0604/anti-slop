# Program report validation — 25 October 2026

Implemented on feat/laporan-program-pdf. No Google deployment, live spreadsheet write or native Google Docs export was performed here.

## Backend

Run `node --test apps-script/absensi-dashboard/tests/*.test.mjs` from repository root. All 26 tests passed (9 report tests plus 17 previous regression tests).

Report tests cover owner/status gates, current registered-membership denominator, future-session exclusion, pending/approved/rejected note separation, exclusive leave classification, cross-program record exclusion, duplicate attendance/membership failures, document/chart construction, temporary document cleanup on success/failure, status reversal while building, and lock release. Google services are mocks: document structure/charts and generated payload are verified, not actual Google PDF pagination/fonts/quota behavior.

## Browser

Chromium 1440 px and 390 px with the actual Pengelolaan scripts and a mocked Google bridge. Checked disabled buttons for active/draft programs; enabling for selesai; preview data/warnings; PDF permission error and retry; prevention of dismissal during export; explicit Blob download with .pdf filename; revocation after close; focus restoration; mobile overflow. No pageerror. Download used simulated bytes and is not proof of a valid native Google PDF.

## Production checks after installing

1. As the spreadsheet owner, run otorisasiLaporanProgram once in the Apps Script editor and grant Docs/Drive access. The helper creates and trashes a test document without changing Sheets data.
2. Verify reports cannot be requested for draft/active programs, including a status change after preview.
3. For a small completed program, preview and export. Open the actual PDF; inspect charts, table pagination, long descriptions, labels, metadata and all sections.
4. Compare participant/session/note counts and JP/behavior rows with Monitoring/Profile. Check no records from another program appear. Confirm dates/timezone and cancelled-member treatment match the stated methodology.
5. Confirm the temporary document is in Drive Trash, not publicly shared; handle a cleanup warning manually. Keep real manifest, scopes and deployment settings. Publish a new version of the existing deployment to retain QR URLs only after review.

The report is an administrative evaluation snapshot, not certification, attendance adjudication or a final institutional grade. It does not recalculate/write JP or scores.
