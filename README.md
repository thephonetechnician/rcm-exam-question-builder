# RCM Academic Portal

The dashboard entry point is `index.html`. The existing Question Builder
is preserved at `exam-builder.html`, using its original scripts, styles
and Apps Script endpoint. The embedded HTML fragment remains unchanged.

The dashboard now includes responsive workspace navigation, a lecturer sign-in
dialog, assigned-course cards and a direct saved-paper shortcut. Lecturer access
is implemented for staging but disabled until its endpoint is configured in
`js/portal-config.js`. See [staging installation](apps-script/portal/README.md).
PIN-based Result Submission and score administration are now implemented in
`score-submission.html` and `score-admin.html`. They require the score service
installation and a new staging deployment described in
[score staging setup](docs/SCORE_MVP_STAGING.md). General Academic Administration
and paper-review eligibility remain deferred.

Run `node tests/portal-auth.test.mjs` to check the read-only authentication service
against synthetic Apps Script services. Real deployment testing is still required.
Run `node tests/score-service.test.mjs` and `node tests/score-exports.test.mjs`
for submission/history and Excel/PDF checks. `node tests/preview-scores.mjs`
serves a local synthetic presentation rehearsal; it never connects to Google.

Before deployment, serve this directory locally and check the dashboard at
desktop and mobile widths. Open the builder, switch its tabs, generate a
sample Word document and return using Portal home. Verify backend operations
only with a designated test paper. Existing backend data stores stay separate.

Modularized version of the latest working HTML.

## Structure
- `index.html` — portal dashboard
- `css/portal.css` — separate dashboard styles
- `css/builder-portal.css` — builder navigation and page margins
- `js/portal.js` — lecturer sign-in, course rendering and POST transport
- `js/portal-config.js` — public staging endpoint configuration (initially empty)
- `apps-script/portal/` — read-only lecturer service and staging instructions
- `exam-builder.html` — builder page structure and script loading
- `css/styles.css` — current interface styling
- `css/print.css` — reserved for future print-specific styling
- `js/config.js` — constants, form defaults, application state
- `js/google-drive.js` — Google Drive/Sheets save, list, and delete communication
- `js/exam-builder.js` — marks distribution and question calculations
- `js/document-generator.js` — Word/DOCX XML and ZIP generation
- `js/validation.js` — form validation
- `js/ui.js` — form and saved-submission rendering plus generation workflow
- `js/app.js` — tab events and application startup

The Google Apps Script backend remains separate as `Code.gs`.
