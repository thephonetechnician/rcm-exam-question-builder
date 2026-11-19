# Compact course selection and Minimal theme

The score submission page shows six course results at a time, with Previous/Next,
search, programme and class/level filters. Filters reset the result page; refresh
retains filters where the values still exist. No matching results gives a message.

Opening a course hides the catalogue and shows the score sheet at the top of the
page. **Choose another course** returns to the same results. **Return to current
score sheet** resumes the in-memory draft, including entered marks, metadata and
PINs. Selecting a different course still asks before discarding unsaved data.
Reloading/closing the page does not save a draft. Search/filter/pagination runs
locally after the catalogue loads and does not request data on every keypress.

The four main pages now offer **Minimal** alongside Aurora, Classic College and
Ocean. Minimal uses neutral colours, simpler corners, fewer shadows and no hero
gradient decorations. It supports independent day/night mode and remembered browser
preferences. Official generated documents retain their formatting. An administrator
can also choose Minimal as the school default under Branding & Appearance.

## Install

1. Commit/push the frontend, pull it into the checkout serving the site and refresh.
2. Replace `14_Branding.gs` in the existing Apps Script project to allow Minimal as
   the school default. Keep all other modules and settings. No setup run required.
3. Update the existing deployment. Use Theme → Minimal to try it. Personal theme
   selection and course pagination work from the frontend update; the backend
   change is needed when saving Minimal as the school default.

## Verification

`node tests/run-all.mjs` checks theme persistence, Minimal day/night contrast and
authenticated school-default publication as well as existing portal workflows.
Synthetic browser checks used 50 courses: six visible at a time, paging, programme
and level filters, zero-result handling, hidden catalogue while editing, retained
entered marks when returning, Minimal day/night, cross-page persistence, and no
horizontal page overflow at 375px. No real records were accessed or deployed.
