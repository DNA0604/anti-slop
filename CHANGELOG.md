# Changelog

## 2026-10-27 — fix false/global transaction locks before deletion
- Corrected latest-explicit audit status handling: legacy blank-status rows do not become new locks or overwrite a real status; terminal statuses normalize whitespace/case. Diagnostic reads preserve the audit unchanged.
- Scoped non-delete blockers to relevant programs/IDs and audit-plan references; unrelated transactions no longer freeze all deletion. Unknown/corrupt/incomplete scope and active deletion transactions remain blocked. Apply repeats the check after preview.
- Added specific blocker IDs/statuses/physical audit rows and existing recovery advice to errors; Pengelolaan/Peserta show a combined read-only transaction diagnostic card and navigation. Existing trash icons and final confirmation remain.
- Added 11 backend reproductions/regressions (55 total passing) and browser diagnostic/error checks. Live spreadsheet rows were not available; no specific production transaction was changed and no deployment was performed.

## 2026-10-27 — simpler deletion confirmation and trash icons
- Removed the typed target-ID field from initial and pending-delete dialogs in Pengelolaan/Peserta; selected IDs are supplied internally through the unchanged RPC payload.
- Replaced table deletion text buttons with accessible inline trash icons and 44 px click areas.
- Added a final native confirmation popup with target/scope, Batal as initial focus, and explicit Ya, Hapus Data / Ya, Lanjutkan. Cancel/Escape preserve the form without a delete request; repeated submissions are guarded and retry payloads remain stable.
- Preserved backend access, stale-data, pending-transaction and audit protections; only two HTML files need replacement after the previous deletion feature. Mocked browser checks cover keyboard, cancellation, confirmation, errors/retry and mobile layout.

## 2026-10-27 — program/session/participant deletion
- Added owner-only Hapus.gs: dependency preview, confirmation/reason, child-first physical cascade, verified chunked backups in existing audit sheet, request idempotency and resumable pending deletion.
- Pengelolaan exposes Hapus program/Hapus sesi; Peserta exposes Hapus dari program and a separate whole-database identity search including participants without memberships. Identity deletion requires zero memberships; shared people/other programs are protected.
- Retained audit backups, scoring rules, indicator catalog and Drive evidence. No new sheet/columns and no automatic restore UI. Unknown-sheet references, duplicates, conflicting links, stale preview and unfinished transactions block deletion.
- Added pending guards under existing mutation locks, owner checks to five legacy mutations, retired numeric-ID maxima in ScriptProperties, and a coordinated/guarded report snapshot read. Existing sidebar/navigation and JP/behavior formulas remain unchanged.
- Added 18 meaningful deletion tests (44 total passing), browser checks at desktop/mobile, installation/recovery instructions and previews. Validation uses service mocks; live Google deletion/auth/quotas still require testing on a separate project/spreadsheet copy. No production data changes or deployment performed.

## 2026-10-25 — completed-program evaluation PDF
- Added owner-protected Laporan.gs with preview and PDF endpoints, strict completed-program checks before/after generation, read-only aggregation, existing JP/behavior snapshots and native Google Docs/Charts rendering.
- Formal PDF contains program identity, executive summary, schedule/breaks, per-session/participant attendance, validation/indicator charts, activity/leave history, JP/behavior status, limitations and follow-up. Pending/rejected notes and unavailable values remain explicit; no new grading formula or Sheets writes.
- Added a status-gated report card/modal to Pengelolaan with explicit PDF download, busy guards, retry/error feedback and Blob cleanup. Export uses temporary owner documents with Trash cleanup; no public sharing link is created.
- Added 9 report tests (26 total passing) and local desktop/mobile browser checks with mocked services. Native Google Docs export, authorization, quotas, pagination and live-data validation still require installation checks. PDF is the initial format; DOCX is not implemented.

## 2026-10-24 — Komdigi public attendance page
- Restyled Absensi.html to the user's blue reference: embedded institutional logo/name, pale blue background, centered white card, responsive fields, blue confirmation button and accessible participant selection.
- Added muatTampilanAbsensiQR to resolve the validated token's session name. The page displays the name and Datang/Pulang instead of the session ID; blank names use a descriptive fallback.
- Kept the original validator, participant lookup and save backend unchanged. Preserved request-ID reuse, response-order guards, disabled states and terminal/retry behavior.
- Five backend display tests and the 12 existing Beranda tests passed. Chromium checks covered desktop/320/390/768 px, validation failures, blank/long/HTML session names, stale search responses, keyboard selection, retry with identical payload and final rejection/success states. No production writes or Google deployment performed.

## 2026-10-24 — Beranda as the default landing page
- Added Beranda.html with whole-database program, unique-participant and session counts; upcoming/today agenda; category/status distribution; follow-up counters; program search, filters and pagination.
- Added an owner-protected, read-only muatBerandaIndex endpoint. Counts distinguish unique participants from registrations, honor spreadsheet timezone, exclude future attendance from follow-up and surface invalid relationships/schedules.
- Changed the default Web App route to Beranda, retained Index for page=monitoring, and preserved participant/profile routes and QR token priority. Added Buka Beranda to the spreadsheet menu.
- Added Beranda to the four existing admin sidebars while retaining the accepted sidebar/navigation implementation and creation modals.
- Added 12 backend tests for aggregation, empty/error cases, owner access, duplicate/foreign relationships, effective corrected times, agenda limits, timezone and routing. Local Chromium checks covered desktop/mobile UI, search/filter/pagination, escaping, sidebar click/hover/keyboard, missing navigation base and navigation round trips with program/dev context.
- Updated installation notes, context and source hashes. No Google deployment, production data writes, new database schema or changes to scoring/JP formulas performed.

## 2026-10-24 — creation forms in separate modals
- Replaced the program/session creation disclosures in Pengelolaan with native dialogs and buttons in the card headers.
- Moved manual participant entry and existing-participant lookup into a dialog opened from the participant registration card; file import remains on the page.
- Preserved drafts on close, focused the relevant form on open, blocked dismissal while saving, and kept errors inside the modal.
- Successful participant preview moves focus to the confirmation card without automatically importing. Program creation still leads to session creation.
- Kept backend contracts, request IDs, sidebar interactions and navigation unchanged. No deployment or production data changes performed.
- Local Chromium checks passed at 1440 px and 390 px with a mocked Google bridge: form focus, draft retention, required-field validation, blocked dismissal during requests, same-ID retry, program-to-session flow, break payloads, participant lookup, error messages and preview confirmation flow. Inline script/GS syntax, unique IDs and all 13 repository guardrails passed; deployed behavior is awaiting user verification.

## 2026-10-24 — accepted Codex continuation baseline
- Synced the four latest admin HTMLs after user confirmation that sidebar and navigation are normal.
- Kept backend, participant attendance page and AdminQR from the latest user-supplied source.
- Navy rounded UI and sticky institution header with embedded Komdigi logo.
- Sidebar with internal hamburger, icon rail, hover expansion/content shift, stable menu positions, Nama/Posisi and settings/logout placeholders.
- Strengthened navigation base selection, sidebar initialization and explicit-collapse behavior.
- Added AGENTS.md and PROJECT_CONTEXT.md for continuation without replaying chat history.

## Prior work included in this baseline
- Separated QR/leave dialogs, optional evidence uploads and in-page previews.
- Dynamic per-program behavioral indicators/rules and positive/negative notes.
- Dedicated participant page and profile with attendance, behavior, leave and correction histories.
- Session-specific leave monitoring.

## Validation
- Inline JavaScript syntax checks.
- DOM simulation of all four pages with Google bridge mocks: desktop/mobile sidebar interactions and dev/exec URL selection.
- User confirmed latest deployed sidebar/navigation behavior is normal.
- Not a claim of complete live-data, upload, security or scoring verification.
