# Register lecturers before assigning courses

## Install

1. Sync the frontend changes to the checkout serving the site.
2. Replace `09_ScoreService.gs` and `13_AdminWorkspace.gs` in the existing Apps
   Script project. Add `15_LecturerDirectory.gs`. Keep all other modules and settings.
   Run the existing `setupScoreMvp_` function once to create `ScoreDirectoryRows`
   and `ScoreDirectoryImports`; existing records are preserved.
3. Update the existing web app deployment to a new version, refresh the admin page
   and sign in. Open **Lecturer directory & assignments**.

## Register lecturers

Download the lecturer registration template from the admin page. Fill one row per
lecturer: `LecturerID`, `LecturerName`, optional `Email`. Choose permanent IDs such
as L001 or 0001 and keep them as text. Upload the Excel file (or CSV), preview the
rows and confirm. You can also expand **Register one lecturer** and use the form.
Registration does not create a sign-in account or send email.

Exact duplicates are skipped. A reused ID with a different name or conflicting
email blocks the entire import. A missing email can be added by uploading the same
ID and name with an email. An empty email never clears an existing one. This release
does not rename/delete IDs or overwrite existing course owners.

Lecturers from previous committed course assignments appear automatically, keeping
their IDs and assignments. Existing historical submission records remain untouched.
If old assignments contain conflicting names for one ID, the directory reports
the problem for correction rather than choosing a person silently.

## Assign courses

Choose the semester. Select the registered lecturer (the options show ID and name)
and course, preview and confirm. For bulk work, download the assignment template,
fill `LecturerID` beside the relevant courses, upload, preview and confirm.
`LecturerName` is optional; the backend always supplies the directory name. Old
templates with a matching name still work. Unknown IDs must be registered first.

The checklist includes every registered lecturer, including **No courses assigned**
for lecturers with none in the selected session/semester. Submitted/outstanding
status continues to follow course records. PIN-based score submission still needs
no lecturer login.

## Verification

Run `node tests/run-all.mjs`. Directory tests cover authorization, leading-zero
IDs, duplicate/conflicting details, stale previews, interrupted writes, retries,
legacy assignments and unassigned lecturers. Browser QA uses the synthetic local
server and does not connect to Google or real student records.
