# Branding & Appearance

The app is now called **RCM Examinations & Records**. The dashboard, Question
Builder, score submission and administrator pages share the same branding.

## Install this update

1. Sync the frontend files to the checkout serving your site. A Codespaces server
   needs the committed changes pushed from Windows and pulled in Codespaces.
2. In the existing Apps Script project, replace `09_ScoreService.gs` and add
   `14_Branding.gs`. Keep the other modules, spreadsheet IDs and credentials.
   If the previous settings upgrade has not been installed, run `setupScoreMvp_`
   once to create the missing tables; it preserves existing records.
3. Update the existing web app deployment to a new version. Open the administrator
   page, sign in and use **Branding & Appearance**.

## Logo and default theme

Choose a PNG, JPEG or WebP image up to 3 MB, inspect the preview and click
**Save branding**. Uploading alone does not publish it. The browser converts it
to a compact PNG before sending it to the authenticated backend. The setting is
stored in the existing ScorePortalSettings sheet with timestamp and actor.
Conflicting edits require reloading settings before saving again.

The published logo appears on the four site pages and newly generated Word papers,
PDF score sheets and Excel score sheets. The collaborator crest in Word stays
unchanged. Existing downloaded files are not rewritten. **Use original logo**, then
**Save branding**, restores the bundled college logo. Until branding is available,
the app keeps its original logo.

Choose Aurora, Classic College or Ocean as the school default. Each header also
offers these themes and a day/night toggle. Personal choices are remembered in
that browser and override the school default. With no saved day/night preference,
the app follows the device setting. Printed documents retain their official styling.

## Verification

`node tests/run-all.mjs` covers authenticated logo publication, PNG validation,
revision conflicts, restoration, Word/Excel image embedding, PDF generation,
palette persistence and text/control contrast in all six palette/mode combinations.
Browser checks used synthetic data: upload, save, public retrieval, restore,
personal theme persistence and mobile layouts. Live deployment is a separate step.
