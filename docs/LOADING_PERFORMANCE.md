# Loading performance update — 19 November 2026

## Install

1. Commit/push the changes, pull into the checkout serving the site and refresh.
2. Replace `09_ScoreService.gs` and `13_AdminWorkspace.gs` in the existing Apps
   Script project. Keep spreadsheet IDs, credentials and all other modules.
3. Update the existing web app deployment to a new version. Open the lecturer
   activity, refresh assignments and confirm courses, lecturers and scoring limits.

No new tables, setup function or dependencies are required. Deploy the backend
before testing the updated frontend; it needs the new workspace action.

## What changed

The lecturer workspace previously fetched settings, course context, lecturer
directory and submission report in four sequential iframe requests. One
authenticated `score.admin.assignments.workspace` request now returns those four
parts. Registration confirmation refreshes through that same bundle instead of
fetching the directory separately and then loading it again.

During each backend request, sheet rows are read once and reused by nested helpers.
Previously the same tabs were repeatedly fetched while calculating configuration,
course eligibility, class enrolments, lecturer identities and assignment reports.
Row objects are copied for callers so a helper cannot mutate another helper's data.

The read snapshot is discarded when the request finishes, before writing, and
after acquiring a write lock. The next request always reads fresh sheet data.
There is no persistent browser cache of student records or server cache serving
outdated course locks, credentials or marks. Existing security checks, revisions,
commit markers, retries, PIN lockout and immutable archives are retained.

Admin activities continue to load only when first opened. Existing refresh buttons
request current data. The question-paper formatter and its version remain unchanged.

## Evidence and limits

Run `node tests/run-all.mjs`. The synthetic 151-course test compares the previous
four-call path with the combined request and verifies identical data. Measured
spreadsheet data reads fall from **28 to 11**, with each required tab read once.
The test also checks authorization, fresh reads after writes and lock acquisition,
and fresh results on the next request. Other score/assignment/archive/export tests
remain part of the suite. Browser QA verified combined initial loading, lecturer
registration refresh and actual scoring settings values using synthetic data only.

These are operation counts, not live latency measurements. Google Apps Script
startup, iframe redirects, Google Sheets response times and the user's connection
still affect loading. No live portal or spreadsheet was accessed for this change.
After deployment, compare the same lecturer activity and course at similar times;
if delays remain, record which activity stalls and how long it takes to isolate
transport/startup latency from backend work.
