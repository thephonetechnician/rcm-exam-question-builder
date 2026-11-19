# Automatic lecturer names on score sheets

Assigned courses display the administrator-assigned lecturer name automatically.
The name field is read-only and appears in the preview, saved submission and
existing PDF/Excel export letterheads. Courses without an assignment retain a
required editable lecturer-name field. Switching courses clears or fills the field
according to that course, so a previous lecturer name cannot leak into another sheet.

The backend resolves the committed assignment by course reference, session and
semester and uses its name when saving, regardless of the client-supplied name.
Incomplete import batches are ignored. Conflicting assignments block submission
rather than picking a lecturer silently. Assignment details form part of the draft
revision: an assignment made or changed after opening requires a fresh course load.
Successful submission retries remain idempotent, and historical names are preserved.

No lecturer login is introduced. An assignment identifies the responsible lecturer;
it does not authenticate the person entering scores.

## Install

1. Commit/push and pull the frontend into the checkout serving the portal.
2. Replace `09_ScoreService.gs` in the existing Apps Script project. Keep all other
   modules, spreadsheet IDs and credentials. No tables or setup run are required.
3. Update the existing web app deployment, refresh and reopen score sheets to get
   the new draft revision. Test an assigned and an unassigned course.

`node tests/run-all.mjs` covers enforced assignment names, manual-name fallback,
incomplete batches, stale drafts, PIN download, retries and historical snapshots.
Synthetic browser checks verify the read-only assigned field and the required,
empty editable field when switching to an unassigned course. No live records used.
