# Admin activity pages and optional student scores

## Install

1. Commit/push the frontend changes and pull them into the checkout serving your
   site. Refresh the browser after syncing.
2. Replace `09_ScoreService.gs` in the existing Apps Script project. Keep all
   spreadsheet IDs, credentials and other modules. No new tables or setup run.
3. Update the existing web app deployment to a new version. Test one score sheet
   using designated test records before collecting real scores.

## Admin activities

The left sidebar opens one activity at a time: Branding & Appearance, Score settings,
Lecturer directory & assignments, Classes and rosters, Submission history. On mobile
the menu moves above the activity. Each activity has its own URL fragment, e.g.
`score-admin.html#history`. Browser back/forward works; old section anchors also
resolve to the corresponding activity. This is navigation within the same app,
so changing activity retains the administrator session and unsaved form values.
Reloading the page still requires signing in again.

Data loads when an activity is first opened. Branding, class administration and
history are no longer all requested during login. Scoring/lecturer activities share
the existing workspace loader. Existing refresh buttons retrieve updated data.
Signing out hides every activity and clears loaded session state.

## Blank student rows

Lecturers may leave **both CA and exam blank** for students not offering the course.
Both scores must be present for a scored student; a partially completed row is
rejected. At least one student must have scores before the sheet can be submitted.
The preview counts unscored students and keeps their score cells blank.

Every roster student remains in the locked record. Blank rows have no CA, exam,
total or grade. They are not converted to zero or F. Explicitly entered zero scores
remain real numeric scores and receive the normal grade. Blanks are labelled
"No scores entered" in snapshot metadata; they do not change course registrations
or independently prove a student's registration status.

PIN downloads, admin downloads, PDF and Excel preserve blank cells. Previous saved
scores and archived versions are not rewritten. To correct an already locked sheet,
the administrator uses the existing Archive and reopen workflow.

## Verification

`node tests/run-all.mjs` includes blank/partial/zero score validation, no writes on
invalid submissions, PIN locks and retries, archived versions, and empty vs numeric
cells in actual Excel/PDF generation. Synthetic browser checks cover all five views,
deep links, mobile navigation, logout, mixed blank/zero/scored preview, submission
and PIN download. No live student data was used.
