# Bulk removal and class transfers

## Use in the administrator portal

Choose a class, then **Manage students** or **Manage courses**. Tick individual
records or the header checkbox to select all visible active records. **Remove
selected** asks for a reason and confirms the selected names/courses before saving.
This removes class assignments; it does not delete student identities or scores.
Use **Show removed assignments** to restore removed records individually.

For a mistaken student registration, select one or several students and choose
**Transfer selected students**. Choose an existing destination class and enter a
reason. Both classes must be active in the same academic session. This corrects
class membership; it does not promote students, change matric numbers or change
past results. The students enter the destination class's automatic regular course
rosters. Existing individual course registrations remain unchanged.

To undo a transfer, select the student in the destination and transfer them back.
Do not restore the original source assignment separately. Transfers are blocked
when either class has submitted scores; course removals are blocked when that
course has submitted scores. Archived submissions also count. Up to 1,000 records
may be selected per operation. Every selection is checked before any change takes
effect; one blocked selection blocks the entire batch.

## Install this update

1. Sync the frontend through the usual Windows commit/push and Codespace pull.
   In the existing score Apps Script project replace **09_ScoreService.gs** and
   **11_ClassManagement.gs**, and add **12_BulkAssignments.gs** from this repository.
   Keep existing Script Properties and the score/portal routing unchanged.
2. Run `setupScoreMvp_()` using a temporary public wrapper if it is not listed:
   ```js
   function updateTables() { setupScoreMvp_(); }
   ```
   Run `updateTables`, then remove the wrapper. This adds the two assignment ledger
   tabs without clearing existing data or changing the administrator key.
3. Deploy a new version of the existing web app, then refresh the frontend. Test
   with disposable class assignments before correcting the real imports.

## Recovery and validation

`ScoreAssignmentChanges` stores proposed changes. `ScoreAssignmentBatches` stores
the final commit marker, reason, actor and retry identity. Changes without a
committed marker are ignored, so interrupted writes cannot leave a half-transfer.
Retrying the same operation does not repeat it. Keep both tabs intact; do not
manually edit the audit ledger.

Run `node tests/run-all.mjs` from the repository directory. Tests cover bulk
validation, authentication, interrupted writes, retries, reverse transfers,
individual restore interactions and submitted-score protection. Synthetic browser
checks exercised student transfer, student bulk removal and course removal without
connecting to the live spreadsheet.
