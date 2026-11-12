# Lecturer access: staging integration

This is a read-only first stage: lecturer sign-in, assigned courses and sign-out.
It does not write scores, modify the existing spreadsheets, grant admin roles,
or enforce paper approval. Do not treat it as a completed release.

## Install on a test deployment

1. Copy the existing **exam backend** Apps Script project to a staging project.
   Keep its seven existing modules. Add `08_PortalService.gs` from this folder.
   Do not paste the score app's `Code.gs` or `Setup.gs` into that project: they
   have conflicting entry points and setup is unnecessary for an existing store.
2. In the staging project's existing `doPost`, immediately after
   `const action = data.action || 'save';`, insert:

   ```js
   if (action.indexOf('portal.') === 0) {
     return portalResponse_(data, requestId);
   }
   ```

   Set Script Properties `PORTAL_SCORE_SPREADSHEET_ID` to the existing score
   spreadsheet ID and `PORTAL_FRONTEND_ORIGIN` to the frontend origin, without
   a trailing slash (for local preview, `http://localhost:4173`; for GitHub Pages,
   `https://thephonetechnician.github.io`). The deploying account must be able
   to read the score spreadsheet. The ID stays out of frontend code.
3. Create a staging web-app deployment that executes as the deploying account,
   with access suitable for lecturers. Set its `/exec` URL in
   `js/portal-config.js`. Test correct/incorrect access codes, an inactive lecturer,
   assigned-course isolation, sign-out, session expiry and existing paper actions
   before updating any live deployment. If anonymous web-app access is disallowed
   by Workspace policy, stop and resolve deployment access rather than bypassing it.

## Data compatibility and limits

Located source snapshots: Downloads/Code/Code.gs, Downloads/Code/Setup.gs and
Downloads/Web Pages/Index.html. The new service reads the documented `Lecturers`,
`Courses` and `Config` tables directly using an explicit spreadsheet ID. It never
trusts client identity, roles or course assignments. It requires email + access
code explicitly; it does not fall back to the deploying account's Google identity.

The existing Courses table has no session column, so these are current configured
assignments, not historical course offerings. The next stage must add offering IDs
and server-side paper eligibility before enabling score writes. The original score
app remains separate and unchanged.

Tokens live only in browser memory and expire after one hour. Reloading or leaving
the dashboard requires another sign-in for now. Cache eviction can end a session
early; an absent token always fails closed. Server response messages target only
the configured frontend origin. Five failed attempts per email cause a 15-minute
lockout. Script Properties hold temporary attempt counts; expired entries are
removed. Broader abuse protection and a production security review remain required.

The test runner uses mocked Apps Script services and synthetic data. It cannot
verify real deployment permissions, browser iframe transport, or live sheet headers.

References: [Properties service](https://developers.google.com/apps-script/guides/properties)
and [Cache service](https://developers.google.com/apps-script/reference/cache/cache-service).
