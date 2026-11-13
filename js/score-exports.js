(() => {
  'use strict';
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const filename = s => ('RCM_' + s.course.code + '_' + s.course.session + '_v' + s.version).replace(/[^A-Za-z0-9_-]/g, '_');
  let fontPromise;
  function fontData() {
    if (!fontPromise) fontPromise = fetch(new URL('assets/fonts/DejaVuSans.ttf', document.baseURI)).then(async response => {
      if (!response.ok) throw new Error('The PDF font could not be loaded. Refresh and try again.');
      const bytes = new Uint8Array(await response.arrayBuffer()); let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(binary);
    }).catch(error => { fontPromise = null; throw error; });
    return fontPromise;
  }
  const save = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
  function rows(s) {
    return [
      ['REDEEMED COLLEGE OF MISSIONS'], ['SUBMITTED SCORE SHEET'],
      ['Course', s.course.code, s.course.title], ['Units', s.course.units, 'Session', s.course.session],
      ['Programme', s.course.programme, 'Class', s.course.level, 'Semester', s.course.semester],
      ['Lecturer', s.lecturerName, 'Exam date', s.examDate], ['Submission ID', s.submissionId],
      ['Version', s.version, 'Submitted at', s.submittedAt], [],
      ['No.','Matric number / student reference','Student name','CA','Exam','Total','Grade'],
      ...s.students.map((r, i) => [i + 1, r.matNo || r.ref, r.name, r.ca, r.exam, r.total, r.grade])
    ];
  }
  async function excel(s) {
    if (!window.JSZip) throw new Error('Excel export library did not load. Check your connection and refresh.');
    const zip = new window.JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Submitted scores" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml', '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B2A4A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    const data = rows(s).map((row, i) => '<row r="' + (i+1) + '">' + row.map((v,j) => {
      const pos = String.fromCharCode(65+j)+(i+1), style = i===9?' s="1"':'';
      // Explicit inline strings keep matric numbers intact and prevent formula injection.
      return typeof v === 'number' ? `<c r="${pos}"${style}><v>${v}</v></c>` : `<c r="${pos}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    }).join('')+'</row>').join('');
    zip.file('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="10" topLeftCell="A11" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="29" customWidth="1"/><col min="3" max="3" width="45" customWidth="1"/><col min="4" max="7" width="18" customWidth="1"/></cols><sheetData>'+data+'</sheetData><autoFilter ref="A10:G'+(s.students.length+10)+'"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>');
    const blob = await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    save(blob, filename(s)+'.xlsx');
  }
  async function pdf(s) {
    if (!window.jspdf?.jsPDF) throw new Error('PDF export library did not load. Check your connection and refresh.');
    const doc = new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.addFileToVFS('DejaVuSans.ttf', await fontData()); doc.addFont('DejaVuSans.ttf','RCM','normal'); doc.setFont('RCM','normal');
    doc.setFontSize(15); doc.setTextColor(27,42,74); doc.text('REDEEMED COLLEGE OF MISSIONS',14,16);
    doc.setFontSize(11); doc.text('SUBMITTED SCORE SHEET',14,24);
    const details = [
      `${s.course.code} — ${s.course.title} (${s.course.units} units)`,
      `${s.course.programme} / ${s.course.level} · ${s.course.session} · Semester ${s.course.semester}`,
      `Lecturer: ${s.lecturerName} · Examination date: ${s.examDate}`,
      `Submission: ${s.submissionId} · Version ${s.version} · Submitted: ${s.submittedAt}`
    ];
    doc.setFontSize(9); let y=32;
    for(const line of details){const lines=doc.splitTextToSize(line,268);doc.text(lines,14,y);y+=lines.length*4.5+2;}
    if(typeof doc.autoTable!=='function')throw new Error('PDF table library did not load. Refresh and try again.');
    doc.autoTable({startY:y+2,head:[['No.','Matric number / reference','Student name','CA','Exam','Total','Grade']],body:s.students.map((r,i)=>[i+1,r.matNo||r.ref,r.name,r.ca,r.exam,r.total,r.grade]),styles:{font:'RCM',fontStyle:'normal',fontSize:9,cellPadding:2.8},headStyles:{fillColor:[27,42,74],fontStyle:'normal'},alternateRowStyles:{fillColor:[246,247,250]},margin:{bottom:16},didDrawPage:()=>{doc.setFont('RCM','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text('RCM Academic Portal · '+s.course.code+' · '+s.course.session+' · Version '+s.version+' · Page '+doc.internal.getNumberOfPages(),14,202);}});
    save(doc.output('blob'), filename(s)+'.pdf');
  }
  window.ScoreExports = Object.freeze({excel,pdf,rows});
})();
