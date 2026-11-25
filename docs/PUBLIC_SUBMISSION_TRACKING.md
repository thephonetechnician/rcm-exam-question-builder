# Public score-sheet submission tracker

## Install

1. Commit/push the frontend and pull into the checkout serving the portal.
2. Replace `09_ScoreService.gs` and `13_AdminWorkspace.gs` in the existing Apps
   Script project. Keep all other modules, spreadsheet IDs and credentials. No new
   tables or setup run are needed.
3. Update the existing web app deployment and refresh. Open **View submission
   tracking** from the homepage or share `submission-tracking.html` on your site.

## Lecturer entry points

The homepage has a Submit scores button in the header and a prominent **Submit your
course scores** section before the question-paper hero. It explains that lecturer
sign-in is not required. Public tracking is linked from that section, the sidebar,
the tools cards and the score submission header. The tracker has Submit scores
buttons so a lecturer can move directly from outstanding courses to score entry.

## Public status table

The tracker needs no login. It uses the active academic session and selected semester,
with a table per programme/class. Each lecturer's row lists submitted and outstanding
courses. Score statuses distinguish all courses submitted, partly submitted and no
current submissions. Reopened sheets remain outstanding until resubmitted. Search,
class and status filtering run locally; Refresh retrieves updated data and timestamp.

The public projection contains class labels, lecturer names, course codes/titles,
submission statuses and general paper-tracking availability only. No student data,
scores, emails, PINs/hashes, credentials, submission references or admin audit details
are returned. The existing administrator report remains authenticated.

Assigned names come from committed course assignments. If an unassigned course has
a score sheet, its recorded lecturer name appears as **Name on score sheet**; that
name is not authenticated. A course without an assigned name or submission appears
as **No lecturer assigned**. Lecturers without courses have no class to appear under.
Completion refers to course records, not proof of who physically entered the scores.

This public tracker is dedicated to score sheets. It neither shows exam-paper
columns nor requests exam metadata. The authenticated administrator report keeps
its existing separate paper tracking.

## Verification

`node tests/run-all.mjs` includes public projection checks, class/semester grouping,
mixed and reopened score states, manual-name fallback and private-data exclusion.
Synthetic browser checks covered public access, a score submission appearing as
completed, filters/no results, prominent homepage entry and 375px layouts. Nothing
was pushed or deployed by the implementation; all test data stayed local.
