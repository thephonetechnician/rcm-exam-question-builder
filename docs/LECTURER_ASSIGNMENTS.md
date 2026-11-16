# Lecturer assignment uploads and scoring settings

## Install

1. Sync the Windows changes to GitHub and pull in Codespaces. Port 8000 is the
   VS Code-forwarded Codespace, so it needs that pull. In the existing Apps Script
   project replace `09_ScoreService.gs` and add `13_AdminWorkspace.gs`. Keep all
   existing modules, spreadsheet IDs and admin/PIN properties.
2. Run the existing `setupScoreMvp_()` with a temporary public wrapper if needed:
   `function updateTables() { setupScoreMvp_(); }`. Delete the wrapper after running.
   It adds ScoreLecturerAssignments, ScoreLecturerImports and ScorePortalSettings;
   it does not erase existing sheets or change their headers.
3. Deploy a new version of the same web app and hard-refresh the portal. Sign in
   as admin. Choose **Use CA 40 / Exam 60**, then **Save scoring limits** to apply
   RCM's split. Existing Config defaults are deliberately not silently overwritten.

## Fill and import assignments

In **Lecturer assignments**, select a semester and download the template. Existing
courses for the current session/semester are prefilled. Enter LecturerID and
LecturerName beside each assigned course. Repeat the same ID/name for every course
the person handles. Keep IDs as text, especially IDs such as 0001. Leave both
lecturer cells blank to skip a course. One responsible lecturer per course is
supported in this release. Programme and Level/Set distinguish repeated course codes.

Upload the filled `.xlsx` (or `.csv` with the same columns), click **Preview lecturer
assignments**, inspect Add / Skip / Conflict, then **Confirm lecturer assignments**.
Exact duplicates skip; conflicting identities or existing course owners block the
whole import. Nothing is silently overwritten. Imports accept up to 1,000 rows and
3 MB per file. An interrupted write remains invisible until its final commit marker;
retrying the same confirmed operation does not duplicate assignments.

## Submission checklist

The report groups courses under Lecturer ID and shows submitted, outstanding or
reopened score sheets. Unassigned courses stay visible. Score status follows the
course's latest locked version; archived/reopened sheets are not counted complete.
Typed names and Lecturer IDs are identifiers, not authentication.

Exam paper metadata can be read from the existing `SUBMISSIONS_SHEET_ID` property.
If exam and score services use different projects, add `EXAM_TRACKER_SPREADSHEET_ID`
to this score backend and ensure its owner can read that spreadsheet. Expected
metadata headers: Course Code, Session, Semester; optional Lecturer ID or LecturerID,
Programme and Level/Set. No question, PIN or hash columns are read or returned.

Old papers without Lecturer ID are labelled **Submitted (ID unverified)** when their
course context is unique. Ambiguous repeated course codes show **Needs matching**;
wrong Lecturer IDs show **Lecturer ID needs review**. If the source is missing or
unavailable, the report says **Not connected** rather than inventing outstanding
papers. This is a course-assignment checklist, not proof of who personally submitted.

## Scoring and loading

Admins can select 40/60 or 30/70, or enter custom positive whole-number limits adding
to 100. Previously loaded drafts must refresh after a change; the server rejects
their stale revision. New snapshots retain their split alongside the original
entries, so later changes do not rewrite historical submissions.

A visible loading/saving banner and spinner now accompany score requests, admin
actions, portal sign-in and saved-paper requests. Concurrent requests keep the
banner visible until all finish, including failures. It respects reduced motion
and exposes an accessible status and busy state.

Run `node tests/run-all.mjs`. Synthetic browser QA covers actual Excel template
download, filled workbook upload/preview/confirm and score-limit changes. No real
lecturer assignments, student scores or credentials are used in those checks.
