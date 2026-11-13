# Portal checkpoint — 14 November 2026

## Current priority: class registration and roster management

The new class-first admin workspace supports class creation, one-at-a-time records,
downloadable class-specific Excel templates, Excel/CSV import previews and confirmed
append-only imports. Student enrolment is session/class-based; regular course rosters
are automatic. Existing explicit course registrations remain supported as exceptions.

Lecturers can add missing/carry-over/additional students to an open score sheet.
Duplicate/identity checks run on the server; reasons, typed lecturer identity and
timestamps are stored. Added students appear in preview/downloads and admin review.
They do not silently become permanent class members. Submission locks and archived
versions remain unchanged.

Changes remain local and uncommitted. Install all updated backend modules (09, 10,
and new 11), run setup via a temporary public wrapper, remove that wrapper, then
redeploy staging. No router/key/property changes are required. See
`CLASS_ADMIN_UPGRADE.md`. The user's filled workbook should stay private.

Synthetic tests passed for safe imports/retries, class/session isolation, automatic
rosters, manual additions/provenance and saved snapshot preservation. Browser tests
imported two Excel courses and two students (including leading-zero matric numbers),
loaded the automatic roster, and previewed/submitted one lecturer-added student.
Real staging installation and live verification remain for the user to perform.

## Current priority: PIN-based score MVP

Lecturer login / assigned-course work is deferred for the presentation release.
The local implementation now includes `score-submission.html`, `score-admin.html`,
the `09_ScoreService.gs` and `10_ScoreSetup.gs` modules, PIN-verified Excel/PDF
exports, an append-only archive/reopen workflow, and template import/demo setup.
Follow `SCORE_MVP_STAGING.md` for installation. No live score deployment has been
updated by the agent, and these changes are not committed or pushed yet.

Synthetic backend tests and a browser rehearsal verified course selection, roster
entry, final submission, PIN verification, admin archive and reopened entry.
Export tests generated a seven-page 120-student PDF, checked accented names and
the last student, and checked XLSX structure/text identifiers/formula safety.
Real Apps Script transport, permissions and score writes still need staging tests.
The original exam-generation and storage scripts were not changed in this stage.

## Earlier portal foundation checkpoint

Branch: `rcm-academic-portal`. Changes remain local and uncommitted.

Completed: central dashboard with responsive sidebar/mobile navigation,
paper creation shortcut, saved-paper deep link, lecturer login dialog,
assigned-course rendering and server-side read-only lecturer access service.
Existing paper generation, storage transport and embedded fragment are preserved.
Only builder startup adds support for `#saved`.

Verified: dashboard at mobile and desktop widths, sign-in unavailable state,
navigation to builder and builder form initialization. No horizontal page overflow
at the mobile viewport checked. Node tests cover credential validation, course
isolation, client role/identity spoofing, inactive accounts, lockout, logout,
expiry/cache loss and response origin. JavaScript syntax and diff checks pass.

Not yet verified: real Apps Script transport/login, live sheet headers/permissions,
Word download and save/get/delete against a designated test record. No real
credentials or student records were used. Nothing has been deployed or pushed.

Sources located locally (do not ask for them again):

- `C:/Users/record_admin/Downloads/Code/Code.gs`
- `C:/Users/record_admin/Downloads/Code/Setup.gs`
- `C:/Users/record_admin/Downloads/Web Pages/Index.html`
- `C:/Users/record_admin/Downloads/RCM_EXAM_QUESTION_BUILDER_TARGETED_UPDATE (1)/apps-script/`

Next: install the portal service on a copy of the exam Apps Script project,
configure the score spreadsheet ID and frontend origin in Script Properties,
then supply the staging `/exec` URL in the public frontend config and test login.
Follow `apps-script/portal/README.md`; keep both live applications unchanged.
After that, adapt score reads/writes with approved-paper and shared-course
authorization checks before enabling portal result submission.
