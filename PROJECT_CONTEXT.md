# Monitoring Pelatihan Pegawai — handoff

Status updated: 27 October 2026, Asia/Jakarta. The accepted sidebar/navigation baseline originated on 24 October; the latest deletion feature and transaction fix were subsequently deployed, tested and accepted by the user on 27 October. Continue from this cumulative source, superseding the earlier flat-dashboard UI package.

## Current status
The user confirmed the latest sidebar/navigation fix with: "nah, sudah normal ini".
The creation-modal update is committed on ui/modal-penambahan-pelatihan. Beranda is committed on feat/beranda-pelatihan; the public QR page update is on ui/absensi-komdigi. Completed-program reports are committed on feat/laporan-program-pdf. Physical deletion with dependency previews/audit backups is committed on feat/hapus-data-pelatihan. The UI confirmation update is committed on ui/konfirmasi-hapus. Current branch fix/transaksi-penghapusan corrects false/global audit locks and adds actionable transaction diagnostics after the user reported deletion blocked by a generic unfinished-transaction error. On 27 October 2026 the user confirmed installing/deploying the latest update, completing their tests with the expected results, and closing the deletion feature. The accepted application source is commit ae1622a on fix/transaksi-penghapusan. Treat deletion as completed and user-verified; do not reopen it as unfinished work without a new request. This confirmation does not establish native Google Docs PDF export or an exhaustive test of unrelated features.
Continue from this source rather than rebuilding the project from scratch.

User acceptance: "sudah saya implementasikan dan deploy yang terbaru. uji coba sudah dilaksanakan dan hasilnya sesuai yang diharapkan. untuk itu kita nyatakan update fitur hapus sudah selesai."
The acceptance commit only records verification in documentation; no application changes or new deployment were required.

## Next development — Jenjang and organizer access (planning)
On 27 October the user agreed to progress slowly through the previously discussed access work and begin stage 1 while learning the structure. The source review and initial design are documented in [TAHAP_1_JENJANG_AKSES.md](apps-script/absensi-dashboard/docs/TAHAP_1_JENJANG_AKSES.md). This is a design artifact, not an implemented schema or auth feature; all ten accepted application files remain unchanged.

Agreed decisions: Program → Jenjang → Sesi (use Jenjang as the entity name); each participant belongs to one Jenjang per program and attends its sessions, with independent memberships in other programs. Admin Pelatihan manages all features; Petugas Kelas Pelatihan is scoped to assigned Jenjang, issues QR, monitors participants/attendance/JP, records leave/behavior/evidence and submits corrections. Admin approves corrections/validations and retains creation/import/settings/finalization/report/deletion/access management. Staff can have multiple Jenjang assignments. Account/assignment data belongs in a separate spreadsheet file with Pengguna, Penugasan_Jenjang and Riwayat_Akses, referencing stable operational IDs.

Current code stores only Program.jenjang text; Sesi and Keikutsertaan have program relationships without id_jenjang. Migration must preserve IDs/history/formulas, retain program–participant uniqueness and adjust every scope/denominator, including QR saves, profiles, reports and accepted deletion. Unknown-sheet checks in Hapus.gs mean simply adding Jenjang would block program deletion until officially supported. Propose a Jenjang sheet plus id_jenjang on sessions/memberships; retain the old Program.jenjang as legacy during transition. Ambiguous/blank/mixed live data must be reviewed, not silently inferred. Shared sessions across Jenjang and historical transfers remain unresolved, not approved assumptions.

Most organizers use personal Gmail. Authentication requires server-verified Google identity; Session.getActiveUser email in execute-as-owner deployments and a whitelist alone are insufficient. No auth protocol/client/setup has been implemented. Prove login in a test HTMLService deployment before broad access refactoring; scope reads/writes/exports/uploads/recovery in the server and reject unavailable access configuration. Public QR remains a distinct flow.

Stage 1 source review/design is complete; live-data inventory and mapping remain pending because spreadsheet data is unavailable here. Next implementation unit: read-only mapping preview with local tests, intended for a separate spreadsheet/project copy. No production edits/deployment/migration or new Google spreadsheet have occurred.

## Source of truth and files
Directory: apps-script/absensi-dashboard/.
- Code.gs: latest backend supplied by the user as Code(1).gs. It is not copied from an unrelated older hasil/Code.gs file.
- Beranda.html: default landing page, global program/participant/session overview, agenda, category/status distribution, follow-up counters and searchable/paginated program list.
- Index.html: Monitoring at ?page=monitoring, session attendance, recap, behavioral notes, leave list, behavior scoring and settings dialogs.
- Pengelolaan.html: programs, sessions, breaks, data checks, and summary of up to 10 participants.
- Peserta.html: dedicated participant search, add/edit and batch import.
- Profil.html: participant identity and program-specific histories.
- Absensi.html: participant attendance reached using an absen token; optimize for phones.
- AdminQR.html: original administrative QR page.
- Laporan.gs: owner-only, completed-program PDF report preview, aggregation and native Google Docs/Charts export.
- Hapus.gs: owner-only program/session/membership/unused-identity deletion, read-only previews, chunked audit backups, resumable transactions and retired-ID reservation.
Files named with (1) in uploads were normalized for Apps Script. Use the exact names above.

The app is bound to a spreadsheet with its existing sheets. This handoff contains source, not the live spreadsheet or its data. No fresh schema migration is needed for these UI changes.
The existing appsscript.json from the original branch is a reference. Keep the deployed project's real manifest, OAuth scopes, permissions and deployment settings. SOURCE_SNAPSHOT.json records SHA-256 hashes for the current ten HTML/GS application files. Report export requires Docs and Drive authorization; preserve existing explicit scopes when adding those permissions.

## Functional scope already built
- Categories: Manajerial, Sosial Kultural, Teknis; programs can have jenjang and multiple sessions.
- Per-session QR for arrival/departure, token validity, corrections with reason/history.
- Session summary includes program/session/date/time, late participants and recorded leave.
- QR generation and leave recording open in separate cards/dialogs.
- Attendance lateness uses the existing tolerance: strictly more than 10 minutes.
- Leave count: unique participants with non-rejected leave in a selected session; pending validation may be included. History can retain rejected entries.
- Leave and behavior evidence: text/file optional, reason/description required. One PDF/JPG/PNG up to 5 MB, private owner Drive folder. Setup function siapkanPenyimpananBukti authorizes Drive.
- Evidence preview in the page; actual access still depends on Google account permission.
- Positive and negative behavioral notes separated with totals and pending count; all-status history includes rejected notes.
- Dynamic indicators managed via web: code/description/type/default points/active state; per-program versioned point rules. Default points do not automatically modify an existing program rule.
- Previously tested by the user: a new indicator worked in two sessions of one program. MAKAN_SAAT_SESI / IND009 and KONTRIBUSI_TIM were examples discussed, not guaranteed current data.
- Dedicated participant page; main management page retains a 10-person summary.
- Participant profile has no photo: name, NIP, home unit and unit during training, program selector, attendance/leave/JP/behavior summaries.
- Profile tabs: Kehadiran, Sikap & Perilaku, Riwayat Izin, Riwayat Koreksi. Leave history is between behavior and corrections.
- Monitoring leave list is limited to the selected session and supports evidence preview.
- Attendance session percentage differs from JP fulfillment; future sessions are excluded from absence calculations and incomplete attendance is flagged for review.
- Missing JP/behavior values are shown as unavailable rather than a fabricated zero.

## Evaluation constraints
Overall institutional scoring rules remain to be confirmed; do not invent a final composite formula. Earlier working behavior weight was 20%, distinct from per-indicator point values.
Actualization JP may be entered manually. Some activities have no JP. Preserve implemented backend rules rather than inferring new ones from this summary.

## Accepted UI
See AGENTS.md. Logo is already embedded in all five admin HTMLs, including Beranda. No repeated upload is required.
The latest sidebar revision moved hamburger into the sidebar, removed duplicate book branding, added Nama/Posisi and placeholder settings/logout.
Hover expands icon rail with a smooth push of the content. Mobile has a toggleable compact rail/panel.

## Creation modal update
- Pengelolaan.html: program and session forms are native dialogs, opened from the right side of their cards. The existing newProgramDetails/newSessionDetails IDs now identify dialogs, so use showModal()/close() rather than assigning open.
- Saving a new program still selects it and leads to session creation. Saving a session closes its modal after the list refresh. Closing an unsaved modal preserves the draft.
- Peserta.html: manual participant entry and old-participant lookup share a modal; file import stays in its existing card. Successful manual preview closes the modal and focuses the preview/confirmation card. Import still requires explicit confirmation.
- Errors remain visible in the form modal. Close buttons and Escape are blocked while saving/checking a preview.
- Existing backend, RPC names/payloads, request IDs, schema, sidebar code and navigation remain unchanged. Only Pengelolaan.html and Peserta.html need replacement in Apps Script for this UI change.
- Local browser checks passed on desktop/mobile with Google bridge mocks, including validation/failure paths and focus handling. The update has not been deployed or confirmed with live spreadsheet data.

## Latest regression and fix
Observed by user: initial Monitoring worked; after visiting Pengelolaan/Peserta, sidebar failed and return navigation could be blank.
Local initial simulation did not reproduce the deployed issue. Browser access to the user's /dev URL was blocked by Google sign-in; screenshot showed local-network-access warnings only.
Latest fix strengthened dev/exec base resolution from current/referrer URL, normalized backend navigation bases, separated sidebar setup from navigation, suppressed immediate hover reopening after explicit collapse, and retained sidebar preference via sessionStorage.
DOM tests used all original inline scripts with a mocked Google bridge, desktop/mobile states and intentionally different dev/exec URLs. They passed. User subsequently confirmed normal behavior. Do not claim a specific root cause was conclusively proven.

## Beranda overview and routing
- An empty page parameter or page=beranda opens Beranda.html. page=monitoring continues to open Index.html. Nonempty absen tokens retain priority over every admin page route; participant/profile routes and the legacy pengelolaan&tab=peserta route are retained.
- muatBerandaIndex checks the existing spreadsheet-owner access rule before reading Program, Peserta, Keikutsertaan, Sesi, Kehadiran and Catatan_Perilaku once each. It writes no data, runs no JP calculation and adds no sheets/scopes.
- Participants are unique Peserta IDs; registrations count valid cross-program memberships whose status is terdaftar. Active programs use status_program=aktif rather than inferring status from dates. Total sessions include sessions without JP and those with invalid schedules; invalid schedules are excluded from timed counts/agenda with a visible warning.
- Pending notes use status_validasi=belum_divalidasi, including leave notes. Attendance follow-up counts existing incomplete/problematic records on finished sessions, using the same effective/corrected times and status helper as Profile. It excludes ongoing/future sessions and is not a count of all missing scans.
- Duplicate/empty IDs and duplicate memberships/attendance cause a data error rather than inflated statistics. Invalid foreign-program/orphan links are excluded with a visible warning. An unavailable sheet or denied access does not show a zero-filled dashboard.
- Program/category/status totals cover the entire database. Agenda shows at most six valid sessions: ongoing first, then today's upcoming/ended sessions, then future dates. Search/filter/pagination apply only to the program table.
- Sidebar setup and hover/collapse code are preserved on all pages; a Beranda link was added to each admin sidebar. Program context and dev/exec base resolution remain in place.
- Install Beranda.html as a new Apps Script HTML file; replace Code.gs, Index.html, Pengelolaan.html, Peserta.html and Profil.html together. Absensi.html, AdminQR.html and the real deployed manifest are unchanged.
- Node test command: node --test apps-script/absensi-dashboard/tests/beranda.test.mjs. Browser validation uses a mocked Google bridge and does not establish live database/deployment success.

## Public QR attendance display
- Absensi.html follows the user's second reference image: pale blue background, centered white card, title Absensi Peserta / Pelatihan Komdigi, institution masthead and blue confirmation button. It embeds the same official logo data URI already used by the admin header; no external image/font dependency.
- muatTampilanAbsensiQR(token) calls the existing validasiTokenQR first and reads only the matching session ID/name after validation. Invalid tokens do not trigger a session lookup. The existing token validator and search/save backend functions remain unchanged.
- The page shows nama_sesi plus Datang/Pulang. Missing names use Nama sesi belum diisi, never the raw session ID. Text is rendered with textContent rather than interpreted as HTML. Missing/duplicate session matches fail validation display rather than showing another session.
- Participant search, stale-response protection, selected participant, save payload, single pending request, locked inputs, same-ID retry and final success/rejection behavior are preserved. Selection styling now uses aria-pressed.
- For this update, replace only Absensi.html and Code.gs together; keep deployment URL, manifest/scopes and existing sheet data. Tests and preview images are not Apps Script application files.
- Local backend tests (5 display cases plus 12 Beranda regression cases) and Chromium desktop/320/390/768 px checks passed using mocks. Actual Google deployment, writes and production QR scans have not been exercised from this environment.

## Completed-program evaluation report
- Add Script file Laporan.gs and replace Pengelolaan.html together. No Code.gs, sheet schema, grading formula or sidebar changes are required for this feature.
- Pengelolaan has a report card, enabled only for the selected completed program. Both preview/export require the owner and recheck status=selesai; PDF generation rechecks after rendering/export. Report lock prevents overlapping exports for the same user.
- PDF format only: institution/program cover, executive summary, session/break schedule, per-session and per-participant attendance, three data charts (when available), activity/leave validation, existing JP/behavior snapshots, limitations/recommendations and all-status activity appendix. No final institutional grade or invented evaluation conclusions.
- Denominator: current terdaftar memberships × valid ended sessions, including sessions without JP. Other memberships are listed but excluded; future/invalid sessions are not counted as absent. Missing attendance is labelled unrecorded, not adjudicated absence. Pending/rejected notes remain separate and leave is exclusive from positive/negative note categories.
- Global duplicate selected session/membership IDs fail to prevent cross-program contamination; duplicate attendance and membership/person relations also fail. Foreign/unresolved activity links are excluded with warnings. Unavailable/partial JP and behavior values remain explicitly unavailable/temporary.
- Uses DocumentApp and Charts in a temporary document; exported PDF bytes are returned for explicit browser Blob download, and temporary Docs are moved to Trash. No public file sharing or Sheets writes. Cleanup failure warns the owner. Limits: 1,000 participants, 300 sessions, 3,000 notes, 8 MB PDF; Google service quotas may impose lower effective limits.
- Run otorisasiLaporanProgram in the editor as owner once to authorize Docs/Drive. Actual Google PDF layout/export and production data are not validated locally. See tests/LAPORAN_VALIDATION.md and README installation instructions.
- 26 Node tests (9 report + 17 existing) pass. Chromium mocked-service checks cover eligibility, preview/errors/retry, busy modal guards, explicit download, cleanup/focus and mobile layout. They do not prove native Google Docs export or live OAuth works.

## Program/session/participant deletion — 27 October 2026
- Branch feat/hapus-data-pelatihan continues all previous changes. Install new Script Hapus.gs and replace Code.gs, Laporan.gs, Pengelolaan.html and Peserta.html together. No new sheets/columns or deletion-specific scopes.
- Physical cascade deletion for Program and Sesi; remove one Keikutsertaan with attendance/notes/logs without removing the person or another program. Peserta identity can only be removed with zero memberships, through the new whole-database identity search card (including orphan/unregistered people).
- Only owner can preview/delete/continue. Preview counts + reason + explicit acknowledgement + final confirmation popup; no typed ID field. Target IDs are supplied internally with the unchanged RPC payload and hash checked again under ScriptLock. Completed status does not prevent deletion. No automatic status cancellation/finalization is introduced.
- Full header/value/date/formula plan is saved as JSON string chunks in existing Riwayat_Validasi and verified before source deletion. Audit, rule versions, indicator catalog, person masters during program/membership deletion and Drive evidence files remain. This is not personal-data erasure and there is no automatic restore UI.
- Child-first deletion with repeat-safe recovery; incomplete staging closes without source deletion. Pending deletion locks all existing ScriptLock mutation paths and report snapshot reads. Recovery card auto-loads in Pengelolaan/Peserta; acknowledgement/final confirmation required again, without typed ID. Existing unfinished transactions, duplicate IDs, conflicting cross-program relations and references in unknown sheets block deletion. External changes to remaining data or backups stop continuation.
- Numeric IDs PRG/SES/KST/PST/JDA retired by deletion are reserved in ScriptProperties BATAS_ID_HAPUS|<spreadsheet-id>; legacy/current generators honor these maxima. Preserve this property and audit history. Five legacy admin mutations now also check owner.
- Limits 3,000 operational rows and 2 million serialized-plan characters per deletion; Google limits may be lower. Use per-session/membership deletion for large programs. Direct manual Sheets edits are not coordinated by ScriptLock and must be avoided while running.
- 44 Node tests (18 deletion + 26 previous) and desktop/mobile mocked browser checks pass. Production deletion, quotas, Google serialization/formulas and deployed auth require verification on a separate spreadsheet/project copy; no real deletions/deployment performed here.

## Deletion confirmation UI revision — 27 October 2026
- Branch ui/konfirmasi-hapus: only replace Pengelolaan.html and Peserta.html if the prior deletion feature is already installed. Backend files, schemas, scopes and mutation rules are byte-preserved for this revision.
- Removed typed target-ID input from both initial and pending-delete dialogs. Matching ID is supplied from the selected target using the existing konfirmasi payload, not a new RPC contract.
- Table deletion buttons are compact inline SVG trash icons (44 px click target), with title/aria-label/keyboard support; final action buttons retain text.
- After reason/acknowledgement, Hapus Data Terkait opens a second native modal showing target name and scope. Default focus is Batal. Batal/Escape preserve the draft and send no mutation RPC; only Ya, Hapus Data / Ya, Lanjutkan starts the request. Confirmation state prevents duplicate submissions. Error/retry retains the same request payload and final confirmation is shown again on retry.
- Preview failures leave form/confirmation disabled. Existing pending-transaction errors still require examination through the original recovery workflow; UI confirmation does not bypass server validation.
- 44 existing Node tests plus local Chromium desktop/mobile checks pass with mocks. Sidebar/navigation unchanged. No Google deployment or production data changes.

## Deletion transaction blocker fix — 27 October 2026
- User reports generic Ada transaksi belum selesai... during deletion. Live spreadsheet audit rows are unavailable here; no specific live transaction has been identified or modified.
- Confirmed code defects reproduced locally: any audit row with transaction ID and blank status was treated as unfinished; lower-case/padded terminal statuses failed comparison; unrelated programs were globally blocked by non-delete transactions.
- Branch fix/transaksi-penghapusan replaces Hapus.gs, Pengelolaan.html and Peserta.html together. Latest explicit status is normalized; blank-status history neither opens nor closes an existing transaction. No automatic audit/data changes during diagnosis.
- Non-delete blockers are scoped using selected/deleted IDs, related program IDs, stored table relationships and all references in before/after audit snapshots, including multi-record plans. Proven unrelated transactions do not block. Related/unknown/corrupt audit state stays blocked; pending deletion remains global. Apply repeats the check under ScriptLock after preview.
- Recovery card renamed Transaksi yang Perlu Diperiksa and shows non-delete diagnostics: transaction/root/status/physical audit row, program, existing workflow advice and navigation only. Preview errors expose the specific blockers and a detail button. No force-complete, JP recovery or auto-repair endpoint added.
- 55 Node tests (29 deletion + 26 prior) and mocked Chromium desktop/mobile checks pass. Added reproductions for legacy blank statuses, terminal normalization, related/unrelated program isolation, imports protecting unused identities, multi-write audits, malformed/unknown metadata, physical row numbers and post-preview checks. UI validates safe diagnostic text and zero mutation calls on failed preview.
- Prior icons/no-ID-entry/final confirmation and sidebar/navigation preserved. At implementation time, deployment verification was pending and the agent performed no production writes. On 27 October the user subsequently confirmed the latest deployment/test results matched expectations and declared the deletion update completed. The exact triggering audit row was not supplied, so do not claim a specific live root cause was independently proven.

## Remaining candidate work (not automatically authorized)
- Real authentication and roles for the user account/settings/logout placeholders.
- Cross-program participant isolation verification for attendance, leave, JP, behavior and correction histories.
- Corrections/schedule changes and JP recalculation consistency.
- Compare Profile, Program Recap and CSV export totals.
- Short admin guide and final institutional scoring rules.
- Further UI refinement only as requested by the user.

## Deployment workflow
For /dev, save the Apps Script project and reopen the test URL. For /exec, update the existing deployment to a new version, preserving its URL for QR links.
After navigation edits test Monitoring -> Pengelolaan -> Monitoring -> Peserta -> Monitoring plus profile and program preservation.
The source snapshot does not establish that all production write/upload/scoring paths have been exercised after every UI edit.
