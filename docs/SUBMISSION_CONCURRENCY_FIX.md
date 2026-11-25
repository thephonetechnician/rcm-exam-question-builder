# Submission concurrency fix — 25 November 2026

The last two hosted ten-course staging tests each saved four submissions and
returned six lock timeouts. Saved records were correct, but burst handling was
insufficient. The post-fix hosted run `QAD663F348` subsequently saved all ten
synthetic submissions using the portal retry helper. All thirty score rows were
verified independently. Completion ranged from 7.464 to 74.918 seconds, with 64
total attempts. See `TEN_COURSE_STAGING_RESULTS.md` for evidence and limitations.

## Changes

- Submission lock acquisition waits at most one second, then returns a structured
  `SCORE_BUSY` response. The global writer lock remains: spreadsheet appends and
  duplicate checks still require serialization.
- Pure request checks and the idempotency fingerprint run before acquiring that
  lock. Already-submitted courses are rejected before loading their roster.
- Sheet handles are cached within each request for shared read/append helpers.
  Data snapshots are still discarded after acquiring locks and before writes.
- Browser submissions retry busy responses and ambiguous transport timeouts using
  jittered backoff, up to 12 attempts within a two-minute budget. Every retry
  preserves the operation ID, PIN, scores and other submission fields. Each
  transport attempt has a new response request ID and a maximum 45-second timeout.
- The loading indicator stays active and explains retries. Exhaustion gives a
  recovery message. Validation failures are not retried. Downloads, authentication
  and admin mutations do not receive automatic retries.

All authoritative roster, course, assignment and score validation remains inside
the writer lock. A lost successful response can be replayed without saving another
submission. This improves contention handling; it does not make Sheets writes
parallel or guarantee a particular hosted completion time.

## Local validation

Run `node tests/run-all.mjs`. The retry tests cover immutable requests, attempt and
deadline limits, permanent errors, lost-response replay, structured busy responses
and ten simulated clients competing for a writer. The existing worker tests cover
independent concurrent writers. Neither is a hosted load benchmark.

## Deployment and next staging test

1. Publish the changed frontend pages and both API scripts, including the new
   `js/score-submit-retry.js` file.
2. Replace `09_ScoreService.gs` in staging Apps Script and deploy a new version.
   No setup function, schema migration or data reset is required.
3. Then test ten distinct synthetic courses using the browser retry behavior.
   Record first-attempt responses, total attempts, eventual completions and saved
   record integrity separately. An old harness that sends one raw POST per user
   does not exercise the new client retry behavior.

No hosted submissions were sent while implementing this fix. After the user
confirmed deployment, the separate staging run above exercised the new behavior.
