# RCM EXAM QUESTION BUILDER

Modularized version of the latest working HTML.

## Structure
- `index.html` — page structure and script loading
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
