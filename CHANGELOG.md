# Changelog

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
