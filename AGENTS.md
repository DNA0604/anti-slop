# Project Database — Codex instructions

Read PROJECT_CONTEXT.md before editing. Active application: apps-script/absensi-dashboard/.
This repository also contains the upstream anti-slop project. Keep unrelated upstream files intact.

## User and workflow
- Communicate in Indonesian, plainly and concisely. Continue from the current source; do not ask the user to resend code already in this repository.
- This is a student innovation prototype for Admin SDM at Pusat Pengembangan Aparatur Komdigi.
- Technology: spreadsheet-bound Google Apps Script + Google Sheets + HTML/CSS/vanilla JS. Do not introduce SQL, React, build frameworks, or a new database without a specific request.
- Follow the user's latest requested scope. Keep existing business rules, sheet schema, data relationships, IDs, and google.script.run contracts intact during UI work.
- Describe what changed and exactly which Apps Script files must be replaced. Deliver complete changed HTML/GS files, rather than fragments, when the user needs manual installation.
- The user cannot download chat attachments reliably. Deliver complete updated files through a dedicated GitHub branch and provide direct file links for copying with GitHub Raw; do not rely on sandbox download links. Keep main unchanged unless merging is explicitly requested.
- Do not deploy to Google, edit real spreadsheet data, or merge branches merely to implement a UI request.

## Current accepted UI
- Navy (#192e50/#203960), rounded white cards about 24px, pale blue-gray background.
- Font stack: Avenir Next, Avenir, Segoe UI, Arial. No external font dependency.
- Sticky header: official uploaded Komdigi logo embedded as a data URI, Pusat Pengembangan Aparatur Komdigi, Monitoring Pelatihan Pegawai, current weekday/date in Asia/Jakarta.
- Header has no hamburger, breadcrumb, back button, density toggle, or decorative book icon. Back controls belong to page content.
- Hamburger lives in sidebar with Sidebar text. Above Ruang Kerja is a user placeholder with icon, Nama, Posisi.
- Sidebar has expanded and icon-only states. Hover opens a compact sidebar and smoothly pushes page content. Preserve that animation. The user explicitly reaffirmed this behavior after reviewing the organizer-login video; current transition work must not replace it with a fixed shell or SPA navigation.
- Keep menu icons at fixed x/y positions across states. Footer contains Pengaturan and Log Out placeholders.
- Organizer login/role/Jenjang access is opt-in in the stage-4 source. Before owner activation, account/settings/logout remain placeholders. Active mode uses the server-injected authenticated bridge and guarded RPC gateway; browser role labels or hidden menus never grant authority. User has verified the exercised login/role/Jenjang isolation/revocation paths and accepted the session verification/direct-correction update, including its QR-to-JP/recap/profile regression. See PROJECT_CONTEXT.md for exact coverage; do not treat untested fault/load scenarios as live-verified. Preserve native owner bootstrap/recovery and the separate public QR flow.
- Public Absensi follows the user-provided blue design: pale blue background, white centered card, the same embedded Komdigi logo/agency identity as the header, and a blue confirmation button. Display the validated session name rather than its ID; preserve attendance selection, request-ID reuse and retry behavior.

## Navigation and known regression
- Latest user confirmation: sidebar and Monitoring -> Pengelolaan/Peserta -> Monitoring navigation are normal after the latest fix.
- Preserve resolveDatabaseBase(), separate sidebar setup, readyState-safe initialization, hover suppression after explicit collapse, and mobile handling.
- Do not assume a DOM simulator passing is proof of deployed Apps Script success.
- Maintain the current program when navigating, keep dev/exec context when available, and never navigate a not-yet-ready link to # at the top frame.
- Public profile/recap links and participant QR routes must continue working.

## Verification
- Parse all inline JavaScript with Node vm.Script; GS can be syntax-checked as JavaScript.
- Check duplicate HTML IDs, changed RPC names and payloads, back links and program context.
- For sidebar edits, test real clicks and hover enter/leave, including explicit collapse while pointer remains inside, keyboard focus, and mobile opening/closing.
- Use browser rendering if available. DOM simulation cannot establish CSS geometry or animation quality.
- Production authentication, uploads, writes, QR attendance and JP calculation require deployment checks. Clearly state what was and was not tested.
- Update PROJECT_CONTEXT.md and CHANGELOG.md when material behavior or status changes.
