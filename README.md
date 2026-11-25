# RCM Examinations & Records

Lecturers can use the prominent **Submit scores** action and public class-based
submission tracking without signing in. See [public tracking setup and scope](docs/PUBLIC_SUBMISSION_TRACKING.md).

The lecturer workspace loads settings, courses, lecturers and reports in one
request. Backend helpers reuse sheet reads within that request, with fresh reads
after writes and on subsequent requests. See [loading update installation and
measurements](docs/LOADING_PERFORMANCE.md).

Admin activities now open individually from a left sidebar. Lecturers can leave
both CA/exam blank for students not offering a course; blanks stay empty in saved
score sheets and downloads. See [installation and behavior](docs/ADMIN_PAGES_AND_BLANK_SCORES.md).

Administrators can register lecturers first through a downloadable Excel template
or a single-lecturer form, then assign courses using the registered Lecturer ID.
Existing assignments are preserved. See [lecturer directory setup](docs/LECTURER_DIRECTORY.md).

Shared college logo settings and three themes (Aurora, Classic College and Ocean)
are available, each with day/night mode. Administrators publish the logo and school
default under Branding & Appearance; personal theme choices stay in the browser.
See [branding installation and usage](docs/BRANDING_APPEARANCE.md). This update
requires adding the branding Apps Script module and updating the deployment.

Admins can download lecturer/course assignment templates, fill Lecturer IDs and
names, upload Excel/CSV, preview and confirm. The checklist groups expected courses
by Lecturer ID. School CA/exam limits can be set to 40/60, 30/70 or a custom split.
See [installation and usage](docs/LECTURER_ASSIGNMENTS.md) before enabling these
features; this update adds Apps Script tables and requires a new deployment.

The Aurora Academic interface includes day/night mode on the dashboard, score
submission, administrator and Question Builder pages. Use the header toggle; it
remembers your choice locally and otherwise follows the device setting. The live
paper preview retains print colours. Shared branding additionally needs the Apps
Script update described above; no new frontend dependencies are needed.

Admin class lists support checkbox selection for bulk student/course removal and
same-session student transfers to correct registration mistakes. See
[bulk corrections and installation](docs/BULK_CLASS_CORRECTIONS.md).

## Class administration

The score administrator can create a session/programme/class, add one course or
student, or download class-specific Excel templates and preview Excel/CSV imports.
Active class students automatically populate its regular course rosters. Lecturer
additions are included with a reason and marked for administrator review.

Install the updated backend using [the class administration upgrade](docs/CLASS_ADMIN_UPGRADE.md).
It adds tables without replacing existing scores, PIN hashes or archive history.
The old preparation workbook's Registrations tab is unnecessary for regular class
enrolment in this workflow. Do not put filled student workbooks in this repository.

Run `node tests/run-all.mjs` for the complete authentication, submission,
class/import/roster, template and export checks.

Unsubmitted assignments can be removed/restored from the admin class lists with
recorded reasons. Student masters and score history are retained. Course units may
be zero. Rosters, preview and downloads use natural matric-number order.

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
