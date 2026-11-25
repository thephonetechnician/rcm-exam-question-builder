# Five concurrent submissions — local integrity check

## Google-hosted follow-up — 25 November 2026

The user confirmed the configured endpoint is the staging deployment. Read-only
inspection found 141 courses, including regular college course metadata and only
one clearly synthetic demonstration course. No ordinary course was submitted.
DEMO101 contained exactly Sample Student One/Two/Three, was open, and was selected
for a same-course contention test. Five requests were dispatched within 3 ms.

| Request | Duration | Result |
| --- | ---: | --- |
| 1 | 8.405 seconds | Saved three students, version 2 |
| 2 | 21.991 seconds | Script lock timeout |
| 3 | 22.389 seconds | Rejected: course already submitted and locked |
| 4 | 16.708 seconds | Rejected: course already submitted and locked |
| 5 | 12.152 seconds | Rejected: course already submitted and locked |

**Result: not a clean concurrency pass.** One request timed out on the script-wide
write lock. The successful submission was subsequently downloaded using its test
PIN; all three CA/exam/total rows matched the winning request. Retrying that exact
operation returned replayed=true and version 2. A fresh course read confirmed the
course remained locked. No ordinary course or student records were submitted.

The demonstration course remains locked at version 2; retain it as test evidence,
or use the existing administrator Archive and reopen flow if it is needed again.
The generated synthetic PIN and request payloads remain outside the repository in
the workspace outputs folder; they are intentionally omitted from this report.

This tested five simultaneous requests competing for **one three-student course**.
It did not test five independent successful Google-hosted course submissions or
100-student live courses. That requires four additional isolated synthetic courses.
The local 100-student-per-course results below must not be confused with this live run.

Before a broader launch, address lock contention and safe retry handling, then
repeat both same-course and different-course staging tests. No production runtime
code or lock timeout settings were changed during this verification.

## Original local integrity test

Run `node tests/five-concurrent-submissions.test.mjs` or `node tests/run-all.mjs`.

This test starts five actual Node worker threads, each with its own Apps Script VM.
All workers share one synthetic workbook in shared memory and an atomic emulation
of the script lock. A barrier releases all five after they report ready. Unlike
Promise.all around synchronous functions, this creates independent parallel callers.
It does not contact Google or any configured portal endpoint.

The checked run passed:

- Five distinct courses, 100 students each: five committed submissions and all 500
  student rows verified against the corresponding input, with correct course locks.
- Five concurrent retries of those same operations: existing submissions returned;
  no duplicate submission headers or entries.
- Five independent submissions racing for the same new course: exactly one saved,
  four rejected because the course was already locked; 100 entries stored once.
- Public score-sheet tracker reported the six committed courses as submitted.
- At most one worker was inside the emulated write lock at a time.

## What this does not establish

The workbook, lock service and Apps Script services are emulated. This test cannot
measure Google Sheets latency, Apps Script quotas/cold starts, the real lock queue,
iframe transport or practical live-user capacity. Local durations must not be used
as a production performance estimate or availability guarantee.

A Google-hosted test still requires a confirmed test-only Apps Script deployment and
spreadsheet containing synthetic courses/students. The endpoint labelled staging
in frontend config has been used during real portal setup, so its comment alone
does not prove it is safe for disposable test writes. Do not send load-test
submissions to it until its destination is confirmed.

For the hosted test, release five submissions for distinct synthetic courses together,
record each outcome/latency, verify all stored scores and PIN downloads, retry the
same operation IDs, then separately race five requests for one synthetic course.
Check Apps Script executions for quota/timeout/lock errors. Keep the test records
separate from real exam records. No new runtime deployment is needed for this local
test file itself.
