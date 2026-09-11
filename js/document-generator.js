// ---------------- XML / docx generation ----------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function run(text, opts) {
    opts = opts || {};
    const sz = opts.sz || 24;
    const props = [];
    if (opts.bold) props.push("<w:b/>");
    if (opts.italic) props.push("<w:i/>");
    props.push(`<w:sz w:val="${sz}"/>`, `<w:szCs w:val="${sz}"/>`);
    return `<w:r><w:rPr>${props.join("")}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }
  function para(runsXml, opts) {
    opts = opts || {};
    const pPr = [];
    if (opts.jc) pPr.push(`<w:jc w:val="${opts.jc}"/>`);
    if (opts.tabs) pPr.push(`<w:tabs>${opts.tabs.map(t => `<w:tab w:val="${t.val}" w:pos="${t.pos}"/>`).join("")}</w:tabs>`);
    if (opts.indLeft != null) {
      let attrs = `w:left="${opts.indLeft}"`;
      if (opts.hanging != null) attrs += ` w:hanging="${opts.hanging}"`;
      if (opts.indRight != null) attrs += ` w:right="${opts.indRight}"`;
      pPr.push(`<w:ind ${attrs}/>`);
    } else if (opts.indRight != null) {
      pPr.push(`<w:ind w:right="${opts.indRight}"/>`);
    }
    if (opts.borderBottom) {
      if (opts.fullWidth) {
        // Negative indents extend the paragraph border from margin edge to paper edge.
        pPr.push(`<w:ind w:left="-720" w:right="-720"/>`);
      }
      pPr.push(`<w:pBdr><w:bottom w:val="single" w:sz="24" w:space="4" w:color="000000"/></w:pBdr>`);
    }
    if (opts.spacingBefore != null || opts.spacingAfter != null || opts.line != null) {
      const spacingAttrs = [];
      if (opts.spacingBefore != null) spacingAttrs.push(`w:before="${opts.spacingBefore}"`);
      spacingAttrs.push(`w:after="${opts.spacingAfter || 0}"`);
      if (opts.line != null) {
        spacingAttrs.push(`w:line="${opts.line}"`);
        if (opts.lineRule) spacingAttrs.push(`w:lineRule="${opts.lineRule}"`);
      }
      pPr.push(`<w:spacing ${spacingAttrs.join(" ")}/>`);
    } else {
      pPr.push(`<w:spacing w:after="0"/>`);
    }
    return `<w:p><w:pPr>${pPr.join("")}</w:pPr>${runsXml}</w:p>`;
  }
  function inlineImage(relId, wEmu, hEmu, name) {
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${wEmu}" cy="${hEmu}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="${relId}" name="${name}"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr><pic:cNvPr id="${relId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="rId${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${wEmu}" cy="${hEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline></w:drawing></w:r>`;
  }
  const IN = 914400;

  function buildDocumentXml(data) {
    const logo1RelId = 1; // crest (left)
    const logo2RelId = 2; // emblem (right)

    const headerTable = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10466" w:type="dxa"/>
        <w:tblBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/></w:tblBorders>
        <w:tblLayout w:type="fixed"/>
        <w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="7466"/><w:gridCol w:w="1500"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${inlineImage(logo1RelId, Math.round(0.95*IN), Math.round(0.95*IN), 'university-crest')}</w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="7466" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
          ${para(run(data.collegeName, { bold: true, sz: 32 }), { jc: "center" })}
          ${para(run(data.collaborationLine, { bold: true, sz: 24 }), { jc: "center" })}
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${inlineImage(logo2RelId, Math.round(0.95*IN), Math.round(0.89*IN), 'college-emblem')}</w:p></w:tc>
      </w:tr>
    </w:tbl>`;

    const ruleAfterHeader = para("", { spacingAfter: 0, borderBottom: true, fullWidth: true, line: 20, lineRule: "exact" });

    const infoTable = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10466" w:type="dxa"/>
        <w:tblBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>
        <w:tblLayout w:type="fixed"/>
        <w:tblCellMar><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tblGrid><w:gridCol w:w="5233"/><w:gridCol w:w="5233"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="5233" w:type="dxa"/></w:tcPr>${para(run("Course Code: ", { bold: true }) + run(data.courseCode, { bold: true }))}</w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5233" w:type="dxa"/></w:tcPr>${para(run("Instruction: ", { bold: true }) + run(data.instruction, { bold: true, italic: true }))}</w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="5233" w:type="dxa"/></w:tcPr>${para(run("Course Title: ", { bold: true }) + run(data.courseTitle, { bold: true }))}</w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5233" w:type="dxa"/></w:tcPr>${para(run("Time Allowed: ", { bold: true }) + run(data.timeAllowed, { bold: true }))}</w:tc>
      </w:tr>
    </w:tbl>`;

    const spacer1 = "";
    const examPeriod = para(run(data.examPeriodLine, { bold: true, sz: 28 }), { jc: "center", spacingAfter: 160 });
    const creditLine = para(run("Course Credit: - ", { bold: true }) + run(`${data.creditUnit} Units`, { bold: true }));
    const markLine = para(run(`Mark Obtainable: ${data.markObtainable}%`, { bold: true }), { spacingAfter: 0 });
    const ruleBeforeQuestions = para("", { spacingAfter: 0, borderBottom: true, fullWidth: true, line: 20, lineRule: "exact" });

    const TAB_POS = 450;
    let questionsXml = "";
    data.questions.forEach((q) => {
      if (q.parts.length === 1) {
        const p = q.parts[0];
        questionsXml += para(
          run(`${q.number}.`) + run("\t") + run(`${p.text}  (${p.marks} marks)`),
          { indLeft: TAB_POS, hanging: TAB_POS, tabs: [{ val: "left", pos: TAB_POS }], spacingAfter: 200 }
        );
      } else {
        q.parts.forEach((p, idx) => {
          if (idx === 0) {
            questionsXml += para(
              run(`${q.number}.`) + run("\t") + run(`(${p.label})  ${p.text}  (${p.marks} marks)`),
              { indLeft: TAB_POS, hanging: TAB_POS, tabs: [{ val: "left", pos: TAB_POS }], spacingAfter: 40 }
            );
          } else {
            const isLast = idx === q.parts.length - 1;
            questionsXml += para(
              run(`(${p.label})  ${p.text}  (${p.marks} marks)`),
              { indLeft: TAB_POS, spacingAfter: isLast ? 200 : 40 }
            );
          }
        });
      }
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${headerTable}
    ${ruleAfterHeader}
    ${infoTable}
    ${spacer1}
    ${examPeriod}
    ${creditLine}
    ${markLine}
    ${ruleBeforeQuestions}
    ${questionsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;
  function docRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.png"/>
  <Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  function b64ToUint8(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function generateDocx(data) {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", CONTENT_TYPES);
    zip.file("_rels/.rels", RELS);
    zip.file("word/document.xml", buildDocumentXml(data));
    zip.file("word/_rels/document.xml.rels", docRels());
    zip.file("word/styles.xml", STYLES);
    zip.file("word/media/image1.png", b64ToUint8(LOGO_CREST_B64));
    zip.file("word/media/image2.png", b64ToUint8(LOGO_EMBLEM_B64));
    return zip.generateAsync({ type: "blob" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function submissionToDocData(f) {
    return {
      collegeName: "The Redeemed College of Missions",
      collaborationLine: "In Collaboration with Redeemer's University, Ede, Osun State, Nigeria",
      courseCode: f.courseCode,
      courseTitle: f.courseTitle,
      instruction: f.instruction,
      timeAllowed: f.timeAllowed,
      examPeriodLine: `${f.session} ${f.semester.toUpperCase()} SEMESTER EXAMINATIONS [${f.month}, ${f.year}]`,
      creditUnit: f.creditUnit,
      markObtainable: f.markObtainable,
      questions: f.questions,
    };
  }
