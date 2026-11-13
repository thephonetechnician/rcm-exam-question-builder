import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createScoreHarness } from './helpers/score-harness.mjs';
const {context,props,cache,sheets,controls}=createScoreHarness();
context.setupScoreMvp_();context.setupScoreMvp_();context.seedScoreDemo_();
const call=data=>context.scoreRoute_(data);
const load=()=>call({action:'score.course',courseRef:'DEMO001'});
let data=load();assert.equal(data.students.length,3);assert.equal(data.locked,false);
assert.equal(call({action:'score.catalogue'}).courses[0].locked,false);
assert.throws(()=>context.seedScoreDemo_(),/empty Score tables/);
const payload=()=>({action:'score.submit',operationId:randomUUID(),courseRef:'DEMO001',revision:load().revision,lecturerName:'Synthetic Lecturer',examDate:'2026-01-01',pin:'TEST-PIN-ONLY',entries:load().students.map(s=>({studentRef:s.ref,ca:'20',exam:'50',name:'FORGED NAME',matNo:'FORGED MATRIC'}))});
let p=payload();
for(const bad of ['',null,true,' ',31,-1,'NaN',1.001]){const x=structuredClone(p);x.entries[0].ca=bad;assert.throws(()=>call(x),/CA for/);}
const duplicate=structuredClone(p);duplicate.entries[1].studentRef=duplicate.entries[0].studentRef;assert.throws(()=>call(duplicate),/duplicate student/);
const unknown=structuredClone(p);unknown.entries[0].studentRef='NOT-REGISTERED';assert.throws(()=>call(unknown),/Missing scores/);
const stale=structuredClone(p);stale.revision='stale';assert.throws(()=>call(stale),/changed/);
const badDate=structuredClone(p);badDate.examDate='2026-02-30';assert.throws(()=>call(badDate),/valid examination date/);
const future=structuredClone(p);future.examDate='2099-01-01';assert.throws(()=>call(future),/valid examination date/);
const weak=structuredClone(p);weak.pin='123';assert.throws(()=>call(weak),/PIN/);
const rosterChange=structuredClone(p);sheets.get('ScoreStudents').data[1][3]='Updated Student';assert.throws(()=>call(rosterChange),/changed/);sheets.get('ScoreStudents').data[1][3]='Sample Student One';
sheets.get('Config').data[4][1]='FALSE';assert.throws(()=>call(p),/closed/);sheets.get('Config').data[4][1]='TRUE';
assert.equal(sheets.get('ScoreSubmissions').data.length,1);
controls.held=true;assert.throws(()=>call(p),/Concurrent lock/);controls.held=false;
// An entries write followed by a failed header write never exposes a partial submission.
controls.failTable='ScoreSubmissions';assert.throws(()=>call(p),/write interruption/);assert.equal(load().locked,false);
const committed=call(p);assert.equal(committed.version,1);assert.equal(committed.saved,3);
assert.equal(call(p).submissionId,committed.submissionId);assert.equal(call(p).replayed,true);
const changedReplay=structuredClone(p);changedReplay.lecturerName='Changed';assert.throws(()=>call(changedReplay),/differs/);
const another=structuredClone(p);another.operationId=randomUUID();assert.throws(()=>call(another),/already submitted/);
assert.equal(load().locked,true);assert.equal(load().students,undefined);
assert.equal(call({action:'score.catalogue'}).courses[0].locked,true);
const snapshot=call({action:'score.download',courseRef:'DEMO001',pin:p.pin}).snapshot;
assert.equal(snapshot.students.length,3);assert.equal(snapshot.students[0].name,'Sample Student One');assert.equal(snapshot.students[0].matNo,'DEMO/001');assert.equal(snapshot.students[0].total,70);assert.equal(snapshot.students[0].grade,'A');
assert.ok(!JSON.stringify(snapshot).includes(p.pin));assert.ok(!JSON.stringify(snapshot).includes('PinHash'));assert.ok(!JSON.stringify(snapshot).includes('FORGED'));
assert.ok(!JSON.stringify(sheets.get('ScoreSubmissions').data).includes(p.pin));
for(let i=0;i<5;i++)assert.throws(()=>call({action:'score.download',courseRef:'DEMO001',pin:'wrong-pin'}),/not recognised/);
assert.throws(()=>call({action:'score.download',courseRef:'DEMO001',pin:p.pin}),/Too many/);
for(const key of props.keys())if(key.startsWith('SCORE_ATTEMPT_'))props.delete(key);
assert.throws(()=>call({action:'score.admin.history',token:'fake'}),/Administrator session/);
assert.throws(()=>call({action:'score.admin.archive',submissionId:committed.submissionId,reason:'Correction',token:'fake'}),/Administrator session/);
assert.throws(()=>call({action:'score.delete'}),/Unknown/);
const adminKey='SYNTHETIC-ADMIN-KEY-ONLY-12345';props.set('SCORE_ADMIN_KEY',adminKey);context.configureScoreAdmin_();assert.equal(props.has('SCORE_ADMIN_KEY'),false);
assert.throws(()=>call({action:'score.admin.login',key:'wrong'}),/not recognised/);
const admin=call({action:'score.admin.login',key:adminKey});
const count=sheets.get('ScoreEntries').data.length;
call({action:'score.admin.archive',token:admin.token,submissionId:committed.submissionId,reason:'Correct an examination score'});
assert.equal(load().locked,false);assert.equal(sheets.get('ScoreEntries').data.length,count);
assert.equal(call({action:'score.admin.history',token:admin.token}).submissions[0].archived,true);
assert.equal(call({action:'score.admin.snapshot',token:admin.token,submissionId:committed.submissionId}).snapshot.students[0].total,70);
assert.throws(()=>call({action:'score.download',courseRef:'DEMO001',pin:p.pin}),/no current/);
const second=payload();second.entries[0].ca='0.29';const v2=call(second);assert.equal(v2.version,2);
// Retrying the old reset must never reopen the newer submission.
assert.equal(call({action:'score.admin.archive',token:admin.token,submissionId:committed.submissionId,reason:'Retry original reset'}).alreadyArchived,true);
assert.equal(load().locked,true);
assert.equal(call({action:'score.admin.history',token:admin.token}).submissions.length,2);
assert.ok(!JSON.stringify(call({action:'score.admin.history',token:admin.token})).includes('PinHash'));
const response=context.scoreResponse_({action:'score.catalogue'},'test');assert.ok(response.html.includes('"http://127.0.0.1:8000"'));assert.ok(!response.html.includes(',"*"'));
props.set('SCORE_ADMIN_KEY','ROTATED-SYNTHETIC-ADMIN-KEY-ONLY');context.configureScoreAdmin_();assert.throws(()=>call({action:'score.admin.history',token:admin.token}),/expired/);
assert.equal(controls.held,false);
// Template import validates all tables and references before its first write.
const imported=createScoreHarness();imported.context.setupScoreMvp_();
const template={
  Courses:[['CourseRef','CourseCode','Title','Units','Session','Semester','Programme','Level/Set'],['C001','CRS101','Test Course',2,'2026/2027','1','BA','100 Level']],
  Students:[['StudentRef','MatNo','AdmissionNo','Name','Programme','Level/Set','Status'],['S001','0001','','Student One','BA','100 Level','Active']],
  Registrations:[['CourseRef','StudentRef','RegistrationType'],['C001','MISSING','Regular']]
};
imported.books.set('template-test',{getId:()=> 'template-test',getSheetByName:name=>template[name]?{getDataRange:()=>({getValues:()=>structuredClone(template[name])})}:null});
imported.props.set('SCORE_IMPORT_SPREADSHEET_ID','template-test');
assert.throws(()=>imported.context.importScoreTemplate_(),/Missing reference/);
assert.equal(imported.sheets.get('ScoreCourses').data.length,1);
template.Registrations[1][1]='S001';template.Registrations.push(['C001','S001','Regular']);
assert.throws(()=>imported.context.importScoreTemplate_(),/duplicate/);
assert.equal(imported.sheets.get('ScoreCourses').data.length,1);
template.Registrations.pop();imported.context.importScoreTemplate_();
assert.equal(imported.sheets.get('ScoreStudents').data[1][1],'0001');
assert.equal(imported.sheets.get('ScoreCourses').data.length,2);
assert.equal(imported.sheets.get('ScoreRegistrations').data.length,2);
assert.throws(()=>imported.context.importScoreTemplate_(),/First-import only/);
console.log('PASS: scores/roster validation, duplicate locks, idempotent retries, interrupted writes, PIN security/lockout, immutable archives, admin access/rotation, versioning and response origin.');
console.log('PASS: template reference/duplicate validation, no writes on invalid input, first import and leading-zero matric numbers.');
