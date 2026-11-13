/* Browser-only template download and Excel/CSV reading. No student data leaves
 * the browser until the administrator requests a server-side preview. */
(() => {
  'use strict';
  const fields={courses:['CourseCode','Title','Units'],students:['Name','MatNo','AdmissionNo']};
  const tabs={courses:'Courses',students:'Students'};
  const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function cell(value,ref,style=0){return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;}
  async function templateBlob(kind,context){
    if(!fields[kind])throw new Error('Choose courses or students.');
    const zip=new window.JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rels='http://schemas.openxmlformats.org/package/2006/relationships';
    zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    zip.file('_rels/.rels',`<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${tabs[kind]}" sheetId="1" r:id="rId1"/><sheet name="_Context" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels',`<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml',`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8C1D2B"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    let data=`<row r="1" ht="26" customHeight="1">${fields[kind].map((h,i)=>cell(h,String.fromCharCode(65+i)+'1',1)).join('')}</row>`;
    for(let row=2;row<=101;row++)data+=`<row r="${row}">${fields[kind].map((_,i)=>cell('',String.fromCharCode(65+i)+row,kind==='courses'&&i===2?2:0)).join('')}</row>`;
    zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="${kind==='students'?42:22}" customWidth="1"/><col min="2" max="2" width="${kind==='students'?26:55}" customWidth="1"/><col min="3" max="3" width="26" customWidth="1"/></cols><sheetData>${data}</sheetData></worksheet>`);
    const meta=[['Kind',kind],['ClassRef',context.ref],['Session',context.session],['Programme',context.programme],['Level/Set',context.level],['Semester',kind==='courses'?context.semester:'']];
    zip.file('xl/worksheets/sheet2.xml',`<worksheet xmlns="${ns}"><sheetData>${meta.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>cell(v,String.fromCharCode(65+j)+(i+1))).join('')}</row>`).join('')}</sheetData></worksheet>`);
    return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  async function download(kind,context){
    const blob=await templateBlob(kind,context),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`RCM_${tabs[kind]}_${context.session}_${context.programme}_${context.level}${kind==='courses'?'_S'+context.semester:''}.xlsx`.replace(/[\\/:*?"<>|]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  const elements=(doc,name)=>Array.from(doc.getElementsByTagNameNS('*',name));
  function parseXml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(elements(doc,'parsererror').length)throw new Error('The workbook contains invalid XML. Save it as a fresh .xlsx file.');return doc;}
  function csv(text){
    const rows=[];let row=[],value='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted||value==='')quoted=!quoted;else value+=c;}
      else if(c===','&&!quoted){row.push(value);value='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';}
      else value+=c;
      if(rows.length>1001)throw new Error('Import at most 1,000 rows at a time.');
    }
    if(quoted)throw new Error('Unclosed quoted field in CSV.');if(value||row.length){row.push(value);rows.push(row);}return rows;
  }
  const norm=v=>String(v??'').trim().toLowerCase().replace(/[\s_/-]+/g,'');
  function mapRows(matrix,kind,context){
    const header=(matrix.shift()||[]).map(norm),required=kind==='courses'?['CourseCode','Title','Units']:['Name'];
    const positions={};for(const name of fields[kind]){let index=header.indexOf(norm(name));if(index<0&&name==='Title')index=header.indexOf('coursetitle');if(index<0&&name==='Name')index=header.indexOf('studentname');positions[name]=index;}
    for(const name of required)if(positions[name]<0)throw new Error(`Missing column ${name}. Download the ${tabs[kind]} template for this class.`);
    if(kind==='students'&&positions.MatNo<0&&positions.AdmissionNo<0)throw new Error('Include a MatNo or AdmissionNo column to identify students.');
    const rows=matrix.map((values,index)=>({values,row:Number.isInteger(values._row)?values._row:index+2})).filter(({values})=>values.some(v=>String(v??'').trim()!==''));if(rows.length>1000)throw new Error('Import at most 1,000 rows at a time.');
    return rows.map(({values:r,row:sourceRow})=>{
      const statusColumn=header.indexOf('status');
      if(kind==='students'&&statusColumn>=0&&norm(r[statusColumn])!=='active')throw new Error('Only Active student rows can be registered through this import. Remove inactive, withdrawn or graduated rows first.');
      for(const [label,expected] of [['Session',context.session],['Programme',context.programme],['Level/Set',context.level],['Semester',kind==='courses'?context.semester:'']]){
        const i=header.indexOf(norm(label));if(i>=0&&expected&&norm(r[i])!==norm(expected))throw new Error(`The file contains a different ${label}. Select the matching class or use a class-specific template.`);
      }
      const obj={_row:sourceRow};for(const name of fields[kind])obj[name]=positions[name]<0?'':String(r[positions[name]]??'').trim();return obj;
    });
  }
  async function read(file,kind,context){
    if(!file)throw new Error('Select a filled Excel or CSV file.');if(file.size>3*1024*1024)throw new Error('Use a file smaller than 3 MB. Split a large class into batches.');
    if(/\.csv$/i.test(file.name))return mapRows(csv((await file.text()).replace(/^\uFEFF/,'')),kind,context);
    if(!/\.xlsx$/i.test(file.name))throw new Error('Upload .xlsx or .csv. Older .xls files must be saved as .xlsx first.');
    const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
    async function xmlFile(path){const entry=zip.file(path);if(!entry)throw new Error('Missing Excel file component: '+path);const text=await entry.async('string');if(text.length>12000000)throw new Error('Workbook data is too large. Use a smaller template.');return parseXml(text);}
    const workbook=await xmlFile('xl/workbook.xml'),relationships=await xmlFile('xl/_rels/workbook.xml.rels');
    const shared=zip.file('xl/sharedStrings.xml')?elements(await xmlFile('xl/sharedStrings.xml'),'si').map(si=>elements(si,'t').map(t=>t.textContent).join('')):[];
    async function sheet(name){
      const info=elements(workbook,'sheet').find(s=>s.getAttribute('name')===name);if(!info)return null;
      const id=info.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      const relation=elements(relationships,'Relationship').find(r=>r.getAttribute('Id')===id);if(!relation||relation.getAttribute('TargetMode')==='External')throw new Error('External workbook links are not supported.');
      const raw=relation.getAttribute('Target');let path=raw.startsWith('/')?raw.slice(1):'xl/'+raw;
      const parts=[];for(const p of path.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}path=parts.join('/');
      return elements(await xmlFile(path),'row').map(row=>{
        const values=[];for(const c of elements(row,'c')){
          if(elements(c,'f').length)throw new Error('Remove formulas from import cells. Paste their values before uploading.');
          const ref=c.getAttribute('r')||'',letters=(ref.match(/^[A-Z]+/i)||[])[0];if(!letters)throw new Error('Invalid cell address in workbook.');let col=0;for(const char of letters.toUpperCase())col=col*26+char.charCodeAt(0)-64;
          if(col>30)throw new Error('Too many data columns. Use the downloaded template.');
          const type=c.getAttribute('t'),v=elements(c,'v')[0]?.textContent||'';
          values[col-1]=type==='inlineStr'?elements(c,'t').map(t=>t.textContent).join(''):type==='s'?(shared[Number(v)]??''):v;
        }values._row=Number(row.getAttribute('r'));return values;
      });
    }
    const meta=await sheet('_Context');if(meta){const m=Object.fromEntries(meta.map(r=>[r[0],r[1]]));for(const [key,value] of [['Kind',kind],['ClassRef',context.ref],['Session',context.session],['Programme',context.programme],['Level/Set',context.level],['Semester',kind==='courses'?context.semester:'']])if(norm(m[key])!==norm(value))throw new Error('This template belongs to a different class or semester. Select its original class or download a new template.');}
    const data=await sheet(tabs[kind]);if(!data)throw new Error(`No ${tabs[kind]} sheet found. Keep the template tab name unchanged.`);
    return mapRows(data,kind,context);
  }
  window.ScoreImports=Object.freeze({download,read,templateBlob,fields});
})();
