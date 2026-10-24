# Monitoring Pelatihan Pegawai — handoff

Snapshot: 24 October 2026, Asia/Jakarta. This snapshot is the latest source accepted in the ChatGPT conversation, superseding the earlier flat-dashboard UI package.

## Current status
The user confirmed the latest sidebar/navigation fix with: "nah, sudah normal ini".
The next requested UI change moves the inline creation disclosures into separate modals. Pengelolaan now has header buttons for adding a program or a session with breaks; Peserta has a header button for adding/searching a participant. This update is implemented locally and has not yet been confirmed on the deployed Apps Script version.
Continue from this source rather than rebuilding the project from scratch.

## Source of truth and files
Directory: apps-script/absensi-dashboard/.
- Code.gs: latest backend supplied by the user as Code(1).gs. It is not copied from an unrelated older hasil/Code.gs file.
- Index.html: Monitoring, session attendance, recap, behavioral notes, leave list, behavior scoring and settings dialogs.
- Pengelolaan.html: programs, sessions, breaks, data checks, and summary of up to 10 participants.
- Peserta.html: dedicated participant search, add/edit and batch import.
- Profil.html: participant identity and program-specific histories.
- Absensi.html: participant attendance reached using an absen token; optimize for phones.
- AdminQR.html: original administrative QR page.
Files named with (1) in uploads were normalized for Apps Script. Use the exact names above.

The app is bound to a spreadsheet with its existing sheets. This handoff contains source, not the live spreadsheet or its data. No fresh schema migration is needed for these UI changes.
The existing appsscript.json from the original branch is a reference. Keep the deployed project's real manifest, OAuth scopes, permissions and deployment settings.

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
See AGENTS.md. Logo is already embedded in all four admin HTMLs. No repeated upload is required.
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
