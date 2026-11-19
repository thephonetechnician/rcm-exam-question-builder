# Faster score-sheet opening

## Install

1. Commit/push the changes and pull them into the checkout serving the portal.
2. Replace `09_ScoreService.gs` in the existing Apps Script project. Keep all
   settings and other modules. No new tables or setup run are needed.
3. Update the existing deployment and refresh the site. Open a sheet, return to
   courses, open another, then reopen the first to check repeat loading.

## Behavior

The browser keeps up to eight recently opened course responses in memory for five
minutes. Reopening displays that roster immediately and checks the latest data in
the background. Responses are copied so local student additions cannot alter the
cached registered roster. No marks, PINs or PIN-authorized downloads are cached.
Nothing is persisted in localStorage, IndexedDB or on disk. Closing/reloading clears
the in-memory cache. Concurrent loads of the same course share one pending request.
Submission success clears cached responses.

Current unsaved entries remain intact when resuming the same sheet. While a latest
data check runs, preview/submission is disabled but score entry remains possible.
If the roster, lecturer assignment, scoring configuration or submission lock has
changed, entered values stay visible and the page requires **Reload latest score
sheet**. Reload asks before discarding entered values. Failed checks also preserve
the draft and require a reload. No background response silently replaces a dirty
sheet. Saving still performs the backend's fresh revision and lock checks.

First-opening work is reduced by building one master-student ID lookup instead of
searching every master student for each roster member. Duplicate/missing student
checks, inactive-account filtering and natural matric ordering remain intact.

## Measuring actual latency

Course responses now include server, metadata and roster durations in milliseconds.
The browser console prints `[RCM score loading]` with `cached`, `requestMs`,
`serverMs`, `rosterMs` and `renderMs`. These logs contain no names, IDs, scores or
PINs. `requestMs` includes network/iframe/Google startup overhead; comparing it
with `serverMs` helps identify the remaining delay. Measurements are estimates,
not a promise of a particular live response time.

First openings still need Google Apps Script and Sheets. This update improves
repeat display time and roster computation; it cannot remove Google startup or
connection latency. No database migration is required.

## Verification

`node tests/run-all.mjs` covers bounded/expiring cache entries, isolated copies,
deduplication, errors, in-flight invalidation, the single student-ID pass and timing
fields, plus all existing score/lock/archive tests. Synthetic browser tests with an
artificial 1.8-second delay verified that a cached three-student sheet appeared
before validation finished. Entered marks survived resuming; changing scoring
limits in a second test admin tab preserved marks and disabled submission until
reload. No live data or deployment was used for verification.
