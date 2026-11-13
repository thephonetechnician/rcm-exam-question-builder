import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../assets/vendor/jszip.min.js');
const context=vm.createContext({window:{JSZip},Blob,URL,setTimeout});
vm.runInContext(fs.readFileSync(new URL('../js/score-imports.js',import.meta.url),'utf8'),context);
const api=context.window.ScoreImports,cls={ref:'CLASS-TEST',session:'2026/2027',programme:'BA',level:'100 Level',semester:'1'};
for(const kind of ['courses','students']){
  const blob=await api.templateBlob(kind,cls),zip=await JSZip.loadAsync(await blob.arrayBuffer()),sheet=await zip.file('xl/worksheets/sheet1.xml').async('string'),meta=await zip.file('xl/worksheets/sheet2.xml').async('string'),workbook=await zip.file('xl/workbook.xml').async('string'),styles=await zip.file('xl/styles.xml').async('string');
  assert.ok(meta.includes('CLASS-TEST'));assert.ok(meta.includes('2026/2027'));assert.ok(workbook.includes('state="hidden"'));assert.ok(styles.includes('numFmtId="49"'));
  for(const field of api.fields[kind])assert.ok(sheet.includes(field));
  assert.ok(!sheet.includes('CourseRef'));assert.ok(!sheet.includes('StudentRef'));assert.equal((sheet.match(/<row /g)||[]).length,101);
}
const csv=text=>({name:'import.csv',size:Buffer.byteLength(text),text:async()=>text});
let rows=await api.read(csv('Name,MatNo,AdmissionNo\r\n"Student, One",0001,\r\nStudent Two,,ADM002\r\n'),'students',cls);
assert.equal(rows[0].MatNo,'0001');assert.equal(rows[0].Name,'Student, One');assert.equal(rows[1].AdmissionNo,'ADM002');
rows=await api.read(csv('Name,MatNo\n\nStudent One,0001'),'students',cls);assert.equal(rows[0]._row,3);
rows=await api.read(csv('Name,AdmissionNo\nStudent Three,ADM003'),'students',cls);assert.equal(rows[0].MatNo,'');
await assert.rejects(()=>api.read(csv('Name\nStudent Without ID'),'students',cls),/MatNo or AdmissionNo/);
await assert.rejects(()=>api.read(csv('Name,MatNo,Programme\nStudent,0001,Diploma'),'students',cls),/different Programme/);
await assert.rejects(()=>api.read(csv('Name,MatNo,Status\nStudent,0001,Withdrawn'),'students',cls),/Only Active/);
await assert.rejects(()=>api.read(csv('Name,MatNo\n"Unclosed,0001'),'students',cls),/Unclosed/);
rows=await api.read(csv('CourseCode,Title,Units\nCRS101,"A title, with a comma",2'),'courses',cls);assert.equal(rows[0].Title,'A title, with a comma');
await assert.rejects(()=>api.read({name:'large.xlsx',size:4*1024*1024},'courses',cls),/smaller than 3 MB/);
console.log('PASS: blank class-specific Excel templates, hidden context, text identifier formats, CSV quoting/leading zeros and mismatched/invalid import rejection.');
