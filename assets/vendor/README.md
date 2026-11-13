# Bundled score export libraries

The score pages use these local copies to avoid depending on a CDN at download time.
The Question Builder keeps its original dependency setup.

- JSZip 3.10.1: `jszip.min.js`, MIT/GPL dual license in `LICENSE-jszip.txt`.
  Source: https://github.com/Stuk/jszip
- jsPDF 4.2.1: `jspdf.umd.min.js`, MIT license in `LICENSE-jspdf.txt`.
  Source: https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js
- jsPDF AutoTable 5.0.2: `jspdf.plugin.autotable.min.js`, MIT license in
  `LICENSE-autotable.txt`.
  Source: https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.2/dist/jspdf.plugin.autotable.min.js

The DejaVu Sans font is in `../fonts/` with its embedded copyright and license
notices in `LICENSE-DejaVu.txt`. Its license permits redistribution with those
notices. Reference: https://dejavu-fonts.github.io/License.html

After changing a library, run `node tests/score-exports.test.mjs` and check both
downloads in a browser. Do not edit the minified distribution files manually.
