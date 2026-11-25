# Ten different course submissions — Google staging

Date: 25 November 2026. Fixture prefix: QAECB033A4.

After the Drive connection switched to the project account, the existing ten-course
run created by the other project chat was discovered and independently checked
against the live staging sheet. No duplicate burst was sent during verification.
The recorded run is `outputs/staging-QAECB033A4-report.json` in the parent workspace.

## Test scope

- Ten distinct synthetic courses; three synthetic students per course.
- Thirty synthetic students and thirty explicit course registrations verified.
- Ten Google-hosted submission requests dispatched within 1.9 milliseconds.
- Different course references and operation IDs; this is not a same-course race.
- No automatic retry during the measured burst.

| Course suffix | Outcome | Request duration |
| --- | --- | ---: |
| 01 | Saved | 32.403 s |
| 02 | Saved | 22.248 s |
| 03 | Lock timeout | 21.673 s |
| 04 | Saved | 6.694 s |
| 05 | Lock timeout | 21.510 s |
| 06 | Lock timeout | 21.882 s |
| 07 | Lock timeout | 21.903 s |
| 08 | Lock timeout | 22.102 s |
| 09 | Lock timeout | 21.485 s |
| 10 | Saved | 14.121 s |

## Independent live-sheet verification

Read the synthetic fixtures and submission records from the user-supplied staging
spreadsheet using the connected project account. Four distinct headers at version 1
match the successful responses: 04, 10, 02 and 01. Their twelve score rows each match
the expected student reference, CA, exam and total. No duplicate course headers
were present for this run. No entries for the six failed courses were present.
PIN download/retry checks were not repeated for this run; the runner did not retain
the generated PINs in its report. Do not confuse this with the separately verified
five-request same-course test.

## Conclusion

**Failed the ten-user simultaneous submission test: four saved, six lock timeouts.**
The script-wide lock serializes writes across different courses. Waiting requests
can exceed the configured 20-second acquisition timeout. Raising a timeout alone
does not increase throughput. Reduce work held inside the write lock and add
bounded, idempotent retry handling, then repeat with fresh synthetic courses.

Only three students per course were used. This result cannot establish reliability
for larger real classes. Successful records were correct, but delivery reliability
under this burst was insufficient. Synthetic records remain as test evidence;
ordinary exam records were not modified during verification.
