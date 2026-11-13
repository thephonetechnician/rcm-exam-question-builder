# PIN-based score submission — staging

For the current class-based registration release, follow
[Class administration upgrade](CLASS_ADMIN_UPGRADE.md). The instructions below
describe the original PIN-based score foundation and legacy editor import.

This release defers lecturer login and paper-approval eligibility for score entry.
Lecturers select a course, enter their name/exam date and roster scores, then create
a PIN. A locked course cannot be edited or deleted through the lecturer API. Only
the configured administrator can archive its submission and reopen it. Excel/PDF
downloads contain the saved snapshot, not later changes to student/course tables.

The editor-only setup functions end in `_`. Apps Script treats those functions
as private to HTML Service clients; keep that suffix when copying their names.

## First: install the two new modules

1. In **RCM Academic Portal — Staging**, add `09_ScoreService.gs` and
   `10_ScoreSetup.gs` from `apps-script/portal/`. Keep all existing modules.
2. In `02_WebApp.gs`, immediately after `const action = data.action || 'save';`, add
   this branch before the existing portal branch:

   ```js
   if (action.indexOf('score.') === 0) {
     return scoreResponse_(data, requestId);
   }
   ```

   `PORTAL_SCORE_SPREADSHEET_ID` must point to **Scores — Staging**.
   `PORTAL_FRONTEND_ORIGIN` must exactly match the preview origin, such as
   `http://127.0.0.1:8000` (no trailing slash).
3. Run **setupScoreMvp_** once in the editor. It creates six new `Score…` tabs.
   Existing exam tables, Courses, Students, Lecturers and Results remain untouched.
   It validates the existing Config instead of replacing it.

## Next: choose test data or your completed template

For a quick presentation rehearsal, run **seedScoreDemo_** in the editor. It adds
one clearly labelled DEMO course and three synthetic students, only if the new
score data tables are empty. It will not overwrite an existing catalogue.

For a real first import, use a separate score staging spreadsheet/project from the
synthetic rehearsal, or clear only the synthetic input rows while the ScoreSubmissions
table is still empty. Never clear submitted records or history. Then:

1. Upload the completed template into private Google Drive and open it as a Google
   spreadsheet. Keep the Courses, Students and Registrations tabs/headings intact.
2. Set `SCORE_IMPORT_SPREADSHEET_ID` in the staging project's Script Properties to
   that imported workbook's ID.
3. Run **importScoreTemplate_**. All references/duplicates are checked before writing.
   This is a first-import helper: it refuses to overwrite populated score tables.
   A service failure during writing may leave partial input rows; inspect those
   rows before retrying. The helper never silently replaces them.

Check Config `CURRENT_SESSION`, `CA_MAX`, `EXAM_MAX`, grading thresholds and
`SUBMISSIONS_OPEN`. Set SUBMISSIONS_OPEN to TRUE only for the test/presentation
window. Existing course assignments in the old Courses tab are not used by this MVP;
its roster comes explicitly from ScoreRegistrations and active ScoreStudents.

## Administrator key

1. In Script Properties, set `SCORE_ADMIN_KEY` to your own private random key of
   20–256 characters. Keep a copy in your password manager. Never paste it into
   frontend files, Git, chat or a spreadsheet.
2. Run **configureScoreAdmin_** in the editor. It stores a salted hash and removes
   the temporary plaintext property. No secret is logged. Keep this setup function
   out of the public web router.
3. The key signs in at `score-admin.html`. Sessions last up to 30 minutes; sign-out
   revokes the token. Re-running the setup with a new key revokes prior sessions.

## Deploy and verify

Update the existing **staging** deployment through Deploy → Manage deployments →
Edit → New version → Deploy. Saving editor changes alone does not update `/exec`.
`js/score-config.js` already contains the staging URL supplied in this chat. Keep
`js/portal-config.js` unchanged if lecturer login works in your Codespace.

Check in a private preview:

- Course search and metadata match the selected class/session/semester.
- Roster names/matric numbers cannot be edited; blank and out-of-range scores fail.
- Submit after final review, reload, and verify score entry remains locked.
- Wrong PIN fails; correct PIN downloads matching Excel and PDF records.
- Another browser cannot overwrite the same course after it is submitted.
- Admin archive requires the private key and a correction reason. Reopening retains
  version 1, and a later submission becomes version 2. Both are downloadable by admin.
- Confirm a long roster produces a multi-page PDF. The bundled DejaVu font supports
  accented names; inspect actual names and both downloads before real use.
- Existing exam builder still opens, generates documents and uses its original endpoint.

Do not present staging as a production release until these live checks pass. The
Codespace origin must stay identical to the configured response origin during tests.

## Development checks

```bash
node tests/score-service.test.mjs
node tests/portal-auth.test.mjs
node tests/score-exports.test.mjs
node tests/preview-scores.mjs
```

The last command serves a synthetic local preview on port 4174, with no Google
connection. Its synthetic admin key is `SYNTHETIC-ADMIN-KEY-ONLY-12345`; that value
exists only in the test harness and must never be configured on the deployed backend.
Stop it with Ctrl+C. Ordinary static hosting uses the real staging API instead.

## Data preservation and limits

- ScoreSubmissions stores immutable version metadata and salted PIN hashes.
- ScoreEntries stores the student identities and computed marks for each version.
- ScoreHistory is append-only. An archive event reopens a course without removing
  either its metadata or marks. The owner should restrict direct spreadsheet editing.
- Writes use a script lock and commit the submission header last. Partial orphan
  entry rows are ignored; a retried request returns its original committed result.
- The first release supports up to 1,000 active students per offering. Rows expand
  as needed; Apps Script quotas still apply. PIN attempts are limited per course;
  five failures cause a 15-minute wait. Admin attempts have a separate limit.
- No-login entry intentionally permits anyone with portal access to view an open
  roster and submit under a typed name. A public link is not proof of lecturer identity.
  Use synthetic data for public presentations and keep access restricted for real rosters.
- Downloaded files are ordinary editable files. Editing one does not change the
  authoritative locked server submission. Protecting a download with encryption
  is separate from the portal's PIN check.

Technical references: [Apps Script locks](https://developers.google.com/apps-script/reference/lock/lock-service),
[JSZip](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html),
[jsPDF](https://github.com/parallax/jsPDF), [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable).

