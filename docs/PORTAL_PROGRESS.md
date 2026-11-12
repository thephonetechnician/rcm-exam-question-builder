# Portal checkpoint — 13 November 2026

Branch: `rcm-academic-portal`. Changes remain local and uncommitted.

Completed: central dashboard with responsive sidebar/mobile navigation,
paper creation shortcut, saved-paper deep link, lecturer login dialog,
assigned-course rendering and server-side read-only lecturer access service.
Existing paper generation, storage transport and embedded fragment are preserved.
Only builder startup adds support for `#saved`.

Verified: dashboard at mobile and desktop widths, sign-in unavailable state,
navigation to builder and builder form initialization. No horizontal page overflow
at the mobile viewport checked. Node tests cover credential validation, course
isolation, client role/identity spoofing, inactive accounts, lockout, logout,
expiry/cache loss and response origin. JavaScript syntax and diff checks pass.

Not yet verified: real Apps Script transport/login, live sheet headers/permissions,
Word download and save/get/delete against a designated test record. No real
credentials or student records were used. Nothing has been deployed or pushed.

Sources located locally (do not ask for them again):

- `C:/Users/record_admin/Downloads/Code/Code.gs`
- `C:/Users/record_admin/Downloads/Code/Setup.gs`
- `C:/Users/record_admin/Downloads/Web Pages/Index.html`
- `C:/Users/record_admin/Downloads/RCM_EXAM_QUESTION_BUILDER_TARGETED_UPDATE (1)/apps-script/`

Next: install the portal service on a copy of the exam Apps Script project,
configure the score spreadsheet ID and frontend origin in Script Properties,
then supply the staging `/exec` URL in the public frontend config and test login.
Follow `apps-script/portal/README.md`; keep both live applications unchanged.
After that, adapt score reads/writes with approved-paper and shared-course
authorization checks before enabling portal result submission.
