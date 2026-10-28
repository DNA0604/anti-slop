# Changelog

## 2026-10-28 — one app URL and one Google login action
- Ordinary login automatically prepares a user-clicked Google link; the authenticated callback opens protected Beranda in-place after the existing server verification/session check. Removes normal prepare/continue/open-app stages without automatic top-frame navigation. Existing sessions bypass the login card.
- Added a copyable app-entry URL in access management and separated optional owner identity diagnostics from staff login. Account/assignment forms and storage, auth/session/permission checks, accepted verification and sidebar stay unchanged.
- Replace Akses.gs only and update the same deployment. Passed 220 backend tests, 61 source/generated script parses/IDs, source hashes and expanded actual-renderer Chromium app/directory/proof checks with mocked Google. Live OAuth/HTMLService behavior still needs user validation; no agent Google changes or guaranteed processing-time reduction.

## 2026-10-28 — session verification update accepted by user
- User confirmed the installed update, rejection/resubmission, stale-data approval prevention, and the proposed QR → correction → leave/behavior → session verification → JP → recap/profile regression with the expected outcomes.
- Record the session verification/direct-correction update as completed and user-accepted at application source 3064b70. This is user-reported verification of the exercised flows, not independent logs or a claim of live fault-injection/load/report tests.
- Documentation-only acceptance record; all application sources/snapshots remain unchanged. No replacement files, migration, activation or deployment needed; agent made no Google changes.

## 2026-10-28 — session verification packets and direct staff corrections
- User confirmed the agreed role/Jenjang login/isolation/shared-data/revocation tests, then requested direct staff corrections and collective Admin verification covering attendance, leave and behavior per session/Jenjang.
- Staff corrections now use the existing scoped/audited write immediately, marked pending validation. Added Monitoring packet preview/submission/review/approve/reject with reasons, stale-data detection and unchanged scan/JP rules. Legacy correction requests remain reviewable.
- Verified chunked approval plans in the separate access journal support safe resume and lost-receipt checks; partial approval blocks coordinated operational writes. Incomplete attendance and previously rejected notes retain their appropriate status; no new tabs/columns/files or automatic points/JP calculation.
- Replace Akses.gs, Code.gs, Hapus.gs and Index.html together. Passed 215 backend tests, generated-app desktop/mobile and prior Jenjang/directory browser checks, source/generated syntax/IDs and snapshots. Agent did not change/deploy Google data; live packet workflow needs user testing.

## 2026-10-28 — fix selected-Jenjang page-not-found navigation
- Reproduced a 404 after selecting a Jenjang: four sidebar builders appended `&jenjang=...` to `/exec` before `?page`, corrupting the deployment path. Keep the base path separate and append the Jenjang once in the query. Profile navigation also stops mixing Jenjang into the program ID and preserves it on content back links.
- Replace Index.html, Pengelolaan.html, Peserta.html and Profil.html together on the existing deployment. No backend/auth/data/schema/sidebar animation changes; retain the prior Akses.gs transition update.
- Tightened Chromium mock routing to return 404 for malformed deployment paths (previous mocks accepted any path). New test failed before the fix with Page not found, passed after; added staff desktop/mobile profile round trips, Admin management round trips and /dev preservation. Existing 196 backend tests and Jenjang browser suite pass. Actual Google deployment remains for user validation.

## 2026-10-27 — neutral loading transition with sidebar animation preserved
- User Admin video shows existing-session navigation and logout display. Startup checks had shown a login button while pending; replaced that display with a page-specific spinner/skeleton and short fade, with reduced-motion support. Login appears for missing/expired sessions, retry for temporary failures/held access, and a Beranda link for a denied page.
- Only Akses.gs application source changes. Sidebar/navigation HTML and all server session/permission functions remain identical to ed7d655; no SPA or cached-identity shortcut. Retry preserves page context without copying token/code parameters, and expiry cancels an in-progress fade so protected data stays covered.
- Passed existing 196 backend tests and expanded Chromium desktop/mobile/slow/error/reduced-motion/expiry checks plus prior application navigation/sidebar/logout flows. Replace Akses.gs and update the same deployment version; no new files, migration, configuration or agent Google deployment.

## 2026-10-27 — application login and role/Jenjang enforcement (opt-in)
- Added Google-backed application sessions, logout/expiry, live account/assignment checks, a fixed RPC gateway and direct operational endpoint guards. Shared server-injected bridge preserves page contracts; sidebar shows verified identity, role-specific menus and Admin access management. Native owner controls activation/OAuth and retains recovery access.
- Scoped staff dashboards, statistics, session/participant/profile/JP/behavior reads and QR/evidence/leave/behavior writes. Admin retains full operational features. Staff corrections are audited requests reviewed by Admin with stale/relationship checks, original scans preserved and receipt confirmation without duplicate writes; uncertain transactions remain blocked for review.
- Unified server database fallback across GS modules. Active login uses selected deployment for new QR/navigation links while public attendance remains token-based. Fixed Monitoring correction buttons remaining disabled after data loading. Seven complete existing application files require replacement; no new sheets/files or migrations. Activation checks package features before switching on.
- Passed 196 Node tests (47 new), 57 script syntax/ID checks and Chromium checks of actual injected HTML plus prior directory/Jenjang suites, plus installation/role/recovery documentation and synthetic previews. Previous identity-only login is user-verified; new application sessions and permission enforcement still require Google-copy checks. Agent did not deploy, activate or modify live Google data.

## 2026-10-27 — user verifies Admin and Petugas Google identity results
- User screenshots after the URL correction show a verified Admin Pelatihan and a separate verified Petugas Kelas Pelatihan assigned to Pelatihan Sosial Kultural 1 · Jenjang 1. Record successful user-observed login/role/scope display for these two paths; no personal account identifiers copied into the repository.
- Main-app sessions and server-side role/Jenjang enforcement remain the next stage. Rejection/revocation and broader live regression checks are not established by these screenshots. Documentation-only update; no code replacement, deployment or Google data changes performed by the agent.

## 2026-10-27 — select the deployed URL for Google login proof
- User reported Google Drive opening failure and supplied a Manage deployments URL different from the panel target. Added owner-editable canonical /exec URL in Akses.gs; saved callback overrides automatic service discovery and drives the test link, authorization and code exchange consistently. No user URL hardcoded.
- Preserve existing directory/credentials, reject invalid host/path/query URLs, hide the old link during unsaved edits, and reject pending login states after callback changes. Only Akses.gs must be replaced for an installed stage 3. Update OAuth redirect URI and the selected deployment version on a copy.
- Passed 149 backend tests (4 new regressions) and generated-panel Chromium desktop/mobile checks including callback save/link consistency. Google live deployment/permissions/consent/storage remain unverified; no Google data or deployment changed.

## 2026-10-27 — separate organizer access directory and Google identity proof
- Added one Script Akses.gs with embedded owner panel: separate-spreadsheet setup/bootstrap, account roles/status, multi-Jenjang assignments, audit/versioned idempotent writes and pending recovery. No operational data copied or application permissions broadened.
- Added optional Google identity proof using server code exchange with PKCE/state/nonce/browser binding and userinfo checks, active-directory/sub matching and valid scope filtering; client secret stays in server properties. The proof issues no main-app session and does not activate staff RBAC/login placeholders.
- Owner setup also saves a server-only main-database pointer for callbacks without active spreadsheet context. Code.gs adds a guarded spreadsheet menu and dedicated proof/callback routing, preserving public QR priority and existing page routes. Other 12 application sources remain byte-identical to the consolidated Jenjang baseline.
- Added 32 backend cases (145 total), generated-panel Chromium checks, configuration/recovery guide and simulated previews. Snapshot now contains 14 files. Owner must configure/test a Google OAuth Client on a copy; no live Google files, deployments or data were changed from this environment.

## 2026-10-27 — one-file Jenjang installation
- Combined Jenjang runtime, migration backend and embedded migration HTML into one Script Jenjang.gs. Removed MigrasiJenjang.gs/MigrasiJenjang.html from the active bundle, resolving the separate same-name file installation issue and reducing three new files to one.
- Preserved menu/RPC names, panel HTML byte-for-byte, schema, backups/guards and behavior. All other retained application sources remain identical to structural baseline 8f15cba; no Google operations/deployment performed.
- Added owner/embedded-opener checks (113 backend tests) and changed the modern browser suite to render the actual HTML returned from GS. Updated installation/cleanup guidance and snapshot to 13 files.

## 2026-10-27 — Jenjang structure and reviewed migration on a copy
- User confirmed the preview opens and shared dummy inventory (3 programs, 4 sessions, 41 memberships, no detected relationship issues). Recorded Dasar / Umum / Jenjang 1 as the working mapping.
- Added Jenjang.gs and a spreadsheet-menu migration panel with reviewed mapping, source fingerprints, verified chunked audit backups, schema-state guards and resumable writes that preserve old IDs/values/formulas/history. Initial migration supports one Jenjang per old program on a separate copy; no Google migration/deployment performed here.
- Added audited Jenjang creation/renaming and initial Jenjang for new programs, destination fields for sessions/import, participant filtering, program/Jenjang/session Monitoring, Jenjang navigation context and per-membership Profile/JP/report obligations. QR/notes/evidence and mutation guards reject inconsistent relationships. CSV includes Jenjang ID; grading formulas and program rule versions remain.
- Extended program deletion to include its Jenjang, preserve other groups and reserve deleted JEN numbers. Retained accepted deletion confirmation/recovery, sidebar animations and public attendance design.
- Added 29 backend integration tests (112 total) and modern Chromium workflow checks; existing deletion/preview browser regressions pass. Added full installation/recovery/Google-copy validation guide and simulated previews. Gmail login, organizer roles and separate access spreadsheet are not implemented.

## 2026-10-27 — open Jenjang preview from spreadsheet menu
- User reported Cannot call SpreadsheetApp.getUi() from this context when opening from the editor. Added a guarded Pratinjau Pemetaan Jenjang item to the existing Manajemen Pelatihan menu in Code.gs/onOpen; use the menu after reloading the bound spreadsheet, without entering a spreadsheet ID.
- Preview opener gives actionable context guidance when getUi is unavailable. Owner checks and read-only loader are unchanged; no trigger, scope, deployment or data changes. Existing menu choices still work if the optional preview file is absent.
- Added two reproductions/menu tests (83 backend tests total). Replaced earlier editor-run installation guidance throughout the docs. Local tests cannot establish the exact reason UI context was unavailable in the user's project; live menu/dialog verification remains pending.

## 2026-10-27 — read-only Jenjang mapping preview
- Added optional PemetaanJenjang.gs and PratinjauJenjang.html: owner-only spreadsheet dialog with legacy Jenjang proposals, session/membership details, review states, physical-row diagnostics, search/filter/pagination and source fingerprint.
- Reads under ScriptLock; validates key relationships/duplicates, partial Jenjang references and latest explicit transaction status. Missing/oversized sources fail instead of producing partial counts. Unknown program references are global blockers; blank-status audit rows do not reopen/close transactions.
- No migration/apply/write/export endpoint, new sheets/columns, auth implementation or Google deployment. The ten accepted application files, formulas, deletion, sidebar/navigation and manifest are unchanged. Two added files are included in the source snapshot.
- Added 26 meaningful backend tests (81 total), mocked Chromium checks at desktop/320/390/768 px, installation/validation guide and simulated-data preview images. Live Google dialog/authorization/data checks remain for the separate project copy.

## 2026-10-27 — stage 1 Jenjang and organizer access design
- Reviewed the current program/session/membership, QR, recap/report and deletion relationships; recorded the approved Program → Jenjang → Sesi and two-role direction, personal Gmail constraint and separate access spreadsheet.
- Added Indonesian stage-1 design with a minimal target schema, legacy-data mapping cases, ambiguity/transaction safeguards, staged migration/recovery, affected flows, access matrix and acceptance checks.
- Source review/design only: no application/schema changes, live-data mapping, migration, authentication implementation or deployment. Next unit is a read-only mapping preview for a separate test copy; ten accepted application files and source hashes remain unchanged.

## 2026-10-27 — deletion feature accepted and completed
- User confirmed implementing/deploying the latest update, running tests with the expected results, and declaring the deletion feature complete.
- Accepted application source: ae1622a on fix/transaksi-penghapusan, including trash icons, final confirmation without typed IDs and the transaction-blocker fix.
- Recorded user verification separately from prior local/mock checks. This acceptance does not claim exhaustive testing of unrelated features or native Google Docs export. Documentation only; no application changes or new deployment needed.

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
