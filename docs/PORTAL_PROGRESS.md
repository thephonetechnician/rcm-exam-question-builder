# Portal checkpoint — 25 November 2026

## Dedicated public score-sheet tracker

Clarified the public tracking activity as Score-sheet submission tracker. Each
class table now has exactly Class, Lecturer, Course and Score-sheet status columns,
one course per row, with Submitted/Not submitted filtering. Reopened courses stay
Not submitted and retain a correction label. Public responses omit exam-paper
fields and skip exam metadata reads; authenticated admin reports still retain
their separate paper tracking. Existing public URL and homepage entry are preserved.
Tests and synthetic browser checks passed; no live deployment or data changes.

## Public class tracking and prominent lecturer score entry

Homepage now leads with a Submit scores section and header shortcut. Sidebar/tools
and score page link to a new public submission-tracking page. The public table groups
lecturers and submitted/outstanding courses by programme/class, with semester,
class, status and search filters. Manual names and unassigned courses are labelled.
Module 13 adds a strict public projection and module 09 routes score.tracking.
Private students, marks, emails, PIN material and audit data are excluded. Admin
reports remain private. Existing paper metadata status is reused with unavailable
data explicitly labelled. Tests/browser checks passed using synthetic records only.
Replace modules 09/13 and sync frontend; see
[installation and behavior](PUBLIC_SUBMISSION_TRACKING.md). No live deployment.

## Faster repeat score-sheet openings

Added an eight-course/five-minute response cache in browser memory, immediate
cached display and a quiet background freshness check. Preview is gated until the
check succeeds. Changed or failed checks keep dirty entries and require explicit
reload; submission still validates server revisions and locks. Cache holds no PINs,
marks or authorized downloads and is cleared after successful submission.
Module 09 indexes students in one pass and returns non-sensitive timing fields.
Unit/regression and artificial-delay browser tests passed. Replace module 09 and
sync frontend; see [behavior and timing guide](FAST_SCORE_OPENING.md).

## Compact score course picker and optional Minimal theme

Six-result course pages with search/programme/class filters replace the endless
catalogue. Course entry hides the picker; return/resume retains in-memory entries.
Changing to another course preserves the existing unsaved-data confirmation.
Minimal theme is available on all four pages, with day/night, remembered personal
choices and authenticated school-default support in module 14. Print styles remain
unchanged. Synthetic 50-course desktop/mobile behavior checked. See
[installation and behavior](COMPACT_COURSES_AND_MINIMAL.md); nothing deployed.

## Assigned lecturer names on score sheets

Module 09 returns the committed course lecturer on score entry and enforces their
name when saving. The assignment participates in revision checks, so changed
assignments invalidate open drafts. Frontend fills a read-only name for assigned
courses and retains required manual names only for unassigned courses. PIN exports
and archives retain the saved name. Tests and synthetic browser course-switching
checks passed. Replace module 09 and sync frontend; see
[installation](ASSIGNED_SCORE_LECTURERS.md). No live deployment performed.

## Reduced loading requests and repeated sheet reads

Module 09 now scopes sheet-read reuse to one request, invalidating before writes
and after write-lock acquisition. Module 13 adds an authenticated combined workspace
action. Frontend workspace initialization/refresh now uses one request instead of
four; directory registration avoids a redundant follow-up directory request.
The synthetic 151-course benchmark reduces sheet data reads from 28 to 11 and
verifies equivalent responses, authorization, mutation isolation and freshness.
All regression tests pass; synthetic browser loading/registration refresh verified.
No live timings or deployments were performed. Replace modules 09/13 and sync the
frontend; see [installation and measurements](LOADING_PERFORMANCE.md).

## Separate admin activities and blank score rows

Replaced anchor scrolling with five activity views and a left sidebar, current-page
indication, URL fragments and mobile navigation. Activity data is loaded on first
opening rather than all during login. Forms and the admin session persist between
views. Lecturer registration/assignments remain grouped in their own activity.

Both score fields may be blank; partial rows and wholly blank submissions fail.
Blank rows stay in the submitted roster with empty scores/grade and null snapshot
values. Explicit zero stays numeric and keeps its grade. Preview and PDF/XLSX
downloads distinguish empty from zero; existing archives are unchanged. Replace
module 09 and sync frontend assets; no schema changes or setup run are needed.
See [installation and behavior](ADMIN_PAGES_AND_BLANK_SCORES.md).

## Comma-separated names and multi-course selection

Added server-generated lecturer IDs with duplicate-name reuse, preview revisions
and retry-safe registration. Existing IDs remain intact. Admin can search/scroll
lecturers and check several courses, filter by code/title/class and preview/confirm
all selected assignments together. Other lecturers' course ownership is protected.
Existing spreadsheet workflows remain available. Bulk registration and two-course
assignment passed synthetic browser checks; mobile layout has no page overflow.
Update module 15 and the frontend, then redeploy; no new tables in this upgrade.

## Lecturer directory before course assignment

Added module 15 with authenticated registration preview/commit/list. Append-only
directory imports use commit markers, payload hashes and revision checks. Module 09
adds two directory tables and private routing; module 13 resolves assignment IDs
through the directory and includes unassigned lecturers in the report. Existing
committed assignment identities remain visible without migration writes.

Admin can download/upload a blank lecturer template, register one lecturer, search
the directory and select registered lecturers for individual course assignments.
Bulk assignment needs only the ID; old matching-name files remain compatible.
Node checks and synthetic browser registration/assignment/download checks passed.
Install using [the directory guide](LECTURER_DIRECTORY.md). No live data was changed,
and these changes have not been committed, pushed or deployed by the agent.

## RCM Examinations & Records branding and themes

Renamed the four main pages. Added authenticated shared logo/default-theme settings
in module 14, with public branding reads routed through module 09. Uploaded images
are resized to PNG; backend validates size, signature and dimensions. Revision
checks prevent stale saves. Settings append to the existing audit-style table.
The shared logo reaches site headers, live paper preview and future Word/PDF/XLSX
downloads. Original logo restoration and offline/older-backend fallback are provided.

Aurora, Classic College and Ocean offer independent day/night modes and persistent
personal choices. Tests cover all palettes, branding authorization and export image
embedding. Synthetic browser checks verified shared upload/restore, saved choices
and mobile page widths. Nothing was pushed or deployed by this implementation.
Follow [the installation guide](BRANDING_APPEARANCE.md) before using it live.

## Lecturer assignment template workflow, checklist and configurable scoring

Implemented site-based Excel/CSV lecturer assignment download/upload/preview/confirm
in the admin page. Template courses are prefilled by active session and semester;
admin fills LecturerID and LecturerName. IDs are text (0001 preserved), exact
duplicates skip and identity/course-owner conflicts block imports. One responsible
lecturer per course in this release. Append/commit-marker imports are retry-safe.

New 13_AdminWorkspace.gs adds authenticated scoring settings and assignment routes.
09_ScoreService.gs adds tables and stores scoring limits with new snapshots. Admin
can explicitly choose 40/60, 30/70 or a positive integer split totaling 100. It does
not silently change live Config. Submitted scores remain unchanged; stale drafts
must refresh. Generic setupScoreMvp_ creates the additional tables without clearing.

Checklist groups assignments by LecturerID and compares course score submissions,
including reopened states. Paper tracking reads metadata columns only from existing
SUBMISSIONS_SHEET_ID, or EXAM_TRACKER_SPREADSHEET_ID if configured separately.
Without a source, paper status says Not connected. Ambiguous course codes require
matching; legacy papers missing IDs are explicitly unverified. This is assignment
completion tracking, not authenticated proof of the person submitting.

Visible loading/saving banner now wraps score/admin API calls, lecturer sign-in and
saved exam requests, handles concurrent operations and clears after errors.
Backend and template tests plus real browser Excel download → filled workbook upload
→ preview → confirm passed with synthetic LecturerID 0001. Browser verified CA max40,
exam max60, mobile layout and night-mode workspace. Full suite, syntax/diff checks
pass. No live records changed, no commit/push/deployment performed.

Install via docs/LECTURER_ASSIGNMENTS.md: normal Git sync, replace09/add13, runsetup,
deploy existing Apps Script version, then choose40/60 and save. Port8000 forwards
Codespaces, so it requires the user's pull. Test server was stopped after QA.

Earlier discussion still to implement in a separate upgrade: data-only exam saving
(current save still uploads a Word copy alongside structured data); rename to RCM
Examinations & Records; shared admin logo upload and selectable theme palettes.
Current day/night toggle is already implemented. Do not claim those pending items
were delivered by this lecturer assignment/settings change.

## Download-format troubleshooting and versioned assets

User reported spacing/Marks/signatures missing from real downloads. Inspection of
two recent downloaded DOCX files confirmed old formatter output. Their stated URL
is http://127.0.0.1:8000/index.html. Local port 8000 is owned by VS Code (forwarded
Codespace), and its HTML does not yet contain these new versioned references.
It is not serving the just-edited Windows checkout. Cache or mixed script versions
remain the likely reason for the prior old-format output; no real records changed.

exam-builder.html now versions all builder script URLs as 2026-11-15.2, uses the
bundled JSZip and shows an updated-format note. The generator exposes a matching
format version; shared new/saved download preparation rejects a mismatched formatter
and preserves the clicked signature option while saved-paper retrieval is pending.

Both actual browser download routes were exercised with tests/preview-exam.mjs,
which replaces all exam storage/PIN calls with synthetic local fixtures. The saved
route uses synthetic prompt input in that test fixture. The downloaded DOCX files
from Generate and Saved submissions were opened as ZIPs and verified for 1.2 spacing,
capitalised Marks, RCM Examiner and Head of Department. All tests pass, including
exam-download-ui.test.mjs for script versions, guards and immutable saved records.

Pending: user commits/pushes the Windows fix, pulls in Codespaces, then hard-refreshes
the port-8000 builder. No Apps Script update is required. Test screenshots and
synthetic downloads are outside the repo; actual exam content was never committed.

## Aurora Academic redesign and night mode

The user's new direction replaces the visible minimal theme with an expressive
indigo/plum/teal design across index, score submission, score admin and Question
Builder. Layered hero, paper illustration, SVG tool/navigation icons, rounded
cards, tinted status chips and refined editor chrome are implemented in
css/academic-theme.css. Previous baseline sheets are retained for compatibility.

js/theme.js runs before paint, follows the device theme initially and remembers
explicit choices locally. Toggle available on all four pages. System changes,
cross-tab changes and restricted storage are handled. Paper preview remains white
with black text. Switching themes preserves entered scores and question text.

All tests pass via node tests/run-all.mjs, including preference handling and colour
contrast checks (main/muted/action/status text 4.5:1, field borders 3:1). Syntax and
diff checks pass. Browser checks: all pages at 375/768/1024/1440px without page
overflow, dark sign-in and admin dialogs, mobile Edit/Preview, form preservation
and print-colour preview. Admin checks used the local synthetic backend only;
no real submissions or records were touched.

Changes remain local pending the user's normal Git sync. No new dependencies,
React migration, backend change or Apps Script deployment. New files are
css/academic-theme.css, js/theme.js and tests/theme.test.mjs; sync the four updated
HTML pages and tests/run-all.mjs too. Design-system MASTER.md describes this
current theme and supersedes the previous minimal direction.

## Examination document spacing and signature option

Word generation now uses 1.2 line spacing, more paragraph separation and a 12pt
gap after the rule before Question 1. Theory allocations use capitalised Marks and
preserve explicit line breaks. The live preview follows these settings.

The checkbox above the editor includes blank examiner/HOD name and signature/date
rows in preview and downloads. This is a per-download presentation option, not a
stored signature, approval or change to saved question text. It remains available
on Saved submissions and applies to PIN-authorised regenerated downloads too.
Previously stored Drive DOCX files and files already downloaded are not overwritten.

All tests pass, including new exam-document-layout.test.mjs coverage for old record
compatibility, unchanged source data, spacing, Marks, escaping and signature options.
A generated reference sample was inspected in native Word (one page, clear question
spacing and both signature rows). The packaged renderer could not run because
LibreOffice is absent; no unrendered DOCX is being delivered. Browser checks verified
the checkbox and matching preview. Original BAM 407_.docx was read only and unchanged.
Changes are local awaiting normal frontend Git sync; no Apps Script update needed.

## Question Builder live preview

The builder now has a polished editor and a local live paper preview derived from
the existing Word XML. Desktop shows both side by side; tablet/mobile use Edit
paper / Paper preview. Fit width and Actual size are available. Theory marks and
subparts, objective options, gap insertion and mixed section ordering were checked
in the browser with synthetic text. HTML-like input remains text; PINs are excluded.
The preview is continuous A4-width content, not exact Word pagination.

Existing test suite, JavaScript syntax and diff checks pass. No backend, save/PIN
logic or Word generation code changed. Sync `exam-builder.html`, `js/ui.js`,
`js/exam-preview.js` and `css/builder-workspace.css` through the usual Git workflow.
No Apps Script deployment is required for this frontend update. Changes remain
local pending the user's Git sync. Design notes: design-system/rcm-academic-portal/pages/exam-builder.md.

## Bulk assignment corrections and same-session transfers

Local admin lists now support row checkboxes, select all visible records and bulk
removal of students or courses. Selected students can transfer to an existing class
in the same active session to correct mistakes. Matric numbers and score snapshots
are preserved; source/destination submitted scores block transfers. Batch commit
markers prevent partial visibility after interrupted writes, with idempotent retries.

All checks pass via `node tests/run-all.mjs`; syntax and diff checks pass. Synthetic
browser checks confirmed transfers and student/course removal. No live data was
used or changed. These changes are local and awaiting manual Git sync and Apps
Script setup/deployment. Follow `docs/BULK_CLASS_CORRECTIONS.md` for installation.

## Assignment corrections, ordering and zero-credit courses

Local additions now provide reversible Remove from class / Remove course / Restore
controls, with reasons and append-only ScoreCorrections events. Submitted score
history blocks assignment corrections. The user reports their mistaken assignments
have no submissions; they will perform the actual corrections after this upgrade.
No live records have been changed by the agent.

Zero credit is accepted in course creation/import/score loading. Student displays,
preview and exports use natural numeric matric order while preserving identifier
text. Tests include very large numbers, leading zeros, blank IDs, safe retries,
restoring assignments and preservation of score input while inserting added rows.

Changes are uncommitted and need frontend sync plus updated modules 09/10/11,
safe setup and staging redeployment. No key/hash/salt reset is needed.

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
# 25 November 2026: submission contention handling

Added short submission lock acquisition with structured busy responses,
request-scoped sheet handle caching and bounded browser retries that preserve the
original operation ID and score payload. Fresh authoritative validation and the
global writer lock remain in place. See `SUBMISSION_CONCURRENCY_FIX.md` for local
verification and staging deployment instructions. No hosted load test was run as
part of this change; ten-user hosted reliability remains to be verified after
deployment.
