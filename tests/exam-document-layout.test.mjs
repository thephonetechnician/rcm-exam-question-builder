import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../js/document-generator.js',import.meta.url),'utf8'),context);
const old={courseCode:'TEST 201',courseTitle:'A & B',instruction:'Answer all',timeAllowed:'2 Hours',session:'2026/2027',semester:'First',month:'NOVEMBER',year:2026,creditUnit:3,markObtainable:60,questions:[{number:1,parts:[{label:'a',text:'Explain <example>\nSecond line',marks:8},{label:'b',text:'Discuss',marks:7}]}]};
const before=JSON.stringify(old),data=context.submissionToDocData(old),xml=context.buildDocumentXml(data);
assert.equal(JSON.stringify(old),before,'Old submissions must not be modified');
assert.match(xml,/8 Marks/);assert.match(xml,/7 Marks/);assert.doesNotMatch(xml,/\d marks/);
assert.match(xml,/Explain &lt;example&gt;/);assert.match(xml,/<w:br\/>/);
assert.match(xml,/w:after="240"[^>]*w:line="20"/,'Space after question separator');
assert.match(xml,/w:line="288" w:lineRule="auto"/,'Readable 1.2 line spacing');
assert.doesNotMatch(xml,/RCM Examiner|Head of Department/,'Signatures are optional');
const signed=context.buildDocumentXml(context.submissionToDocData({...old,includeSignatureLines:true}));
assert.match(signed,/RCM Examiner/);assert.match(signed,/Head of Department/);assert.match(signed,/Signature \/ Date/);assert.match(signed,/<w:cantSplit\/>/);
for(const paperType of ['Objective','German','Sectioned']){
  const f={...old,paperType,objectiveQuestions:[{number:1,text:'Select',options:[{label:'A',text:'Choice'}]}],germanQuestions:[{number:1,text:'Fill ____________'}],sections:[{type:'German',instruction:'Complete',questions:[{text:'Section blank ____________'}]}]};
  const output=context.buildDocumentXml(context.submissionToDocData(f));
  assert.match(output,paperType==='Objective'?/Choice/:paperType==='German'?/Fill ____________/:/SECTION A/);
}
console.log('PASS: old-submission formatting without mutation, question spacing, capitalised Marks, multiline text and optional signature lines across paper types.');
