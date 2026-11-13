import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createScoreHarness} from './helpers/score-harness.mjs';
const h=createScoreHarness(),{context,props,sheets,controls}=h;
context.setupScoreMvp_();props.set('SCORE_ADMIN_KEY','SYNTHETIC-CLASS-ADMIN-KEY-ONLY');context.configureScoreAdmin_();
const call=data=>context.scoreRoute_(data),token=call({action:'score.admin.login',key:'SYNTHETIC-CLASS-ADMIN-KEY-ONLY'}).token;
const admin=data=>call({...data,token});
assert.throws(()=>call({action:'score.admin.classes',token:'forged'}),/Administrator session/);
const create=(programme,level)=>admin({action:'score.admin.class.create',session:'2026/2027',programme,level}).classRef;
const classRef=create('BA','100 Level');assert.equal(create(' ba ','100 Level'),classRef);
assert.throws(()=>admin({action:'score.admin.class.create',session:'2025/2026',programme:'BA',level:'100 Level'}),/active/);
const preview=(kind,rows,ref=classRef)=>admin({action:'score.admin.import.preview',classRef:ref,kind,semester:'1',rows});
const commit=(p,rows)=>admin({action:'score.admin.import.commit',classRef:p.classInfo.ref,kind:p.kind,semester:p.semester,revision:p.revision,rows});
const courseRows=[{CourseCode:'CRS101',Title:'Introduction',Units:'2'},{CourseCode:'CRS102',Title:'Second Course',Units:'3'},{CourseCode:'CRS101',Title:'Introduction',Units:'2'}];
let p=preview('courses',courseRows);assert.equal(p.counts.add,2);assert.equal(p.counts.skip,1);assert.equal(sheets.get('ScoreCourses').data.length,1);
assert.throws(()=>commit({...p,revision:'stale'},courseRows),/changed/);assert.equal(sheets.get('ScoreCourses').data.length,1);
assert.equal(commit(p,courseRows).added,2);assert.equal(preview('courses',courseRows).counts.skip,3);
const conflict=preview('courses',[{CourseCode:'CRS101',Title:'Changed title',Units:'2'}]);assert.equal(conflict.counts.conflict,1);assert.throws(()=>commit(conflict,[{CourseCode:'CRS101',Title:'Changed title',Units:'2'}]),/conflicting/);
const students=[{Name:'Student One',MatNo:'0001',AdmissionNo:''},{Name:'Student Two',MatNo:'',AdmissionNo:'ADM002'}];
p=preview('students',students);assert.equal(p.counts.add,2);commit(p,students);
assert.equal(sheets.get('ScoreRegistrations').data.length,1); // No per-course registration work.
let detail=admin({action:'score.admin.class.details',classRef});assert.equal(detail.students.length,2);assert.equal(detail.students[0].matNo,'0001');
assert.equal(preview('students',students).counts.skip,2);
assert.equal(preview('students',[{Name:'Different Person',MatNo:'0001'}]).counts.conflict,1);
assert.equal(preview('students',[{Name:'Student Three',MatNo:'0003',AdmissionNo:'ADM002'}]).counts.conflict,1);
const other=create('BA','200 Level'),otherRows=[{CourseCode:'CRS201',Title:'Other class course',Units:'2'}];p=preview('courses',otherRows,other);commit(p,otherRows);
const otherStudents=[{Name:'Other Student',MatNo:'0200'}];p=preview('students',otherStudents,other);commit(p,otherStudents);
const refs=detail.courses.map(c=>c.ref);for(const ref of refs)assert.equal(call({action:'score.course',courseRef:ref}).students.length,2);
const otherCourse=admin({action:'score.admin.class.details',classRef:other}).courses[0];assert.equal(call({action:'score.course',courseRef:otherCourse.ref}).students.length,1);
const load=()=>call({action:'score.course',courseRef:refs[0]});let loaded=load();
const added={ref:'M_'+randomUUID(),name:'Lecturer Added Student',matNo:'EXTRA001',registrationType:'Carry-over',reason:'Approved class correction for this exam'};
const payload=()=>({action:'score.submit',courseRef:refs[0],operationId:randomUUID(),revision:loaded.revision,lecturerName:'Synthetic Lecturer',examDate:'2026-01-01',pin:'TEST-PIN-ONLY',entries:loaded.students.map(s=>({studentRef:s.ref,ca:20,exam:50})),additions:[]});
let body=payload();body.additions=[{...added,matNo:' 0001 '}];body.entries.push({studentRef:added.ref,ca:25,exam:45});assert.throws(()=>call(body),/Duplicate matric/);
body=payload();body.additions=[{...added,reason:'no'}];body.entries.push({studentRef:added.ref,ca:25,exam:45});assert.throws(()=>call(body),/reason/);
body=payload();body.additions=[{...added,matNo:'0200',name:'Forged Identity'}];body.entries.push({studentRef:added.ref,ca:25,exam:45});assert.throws(()=>call(body),/conflict/);
body=payload();body.additions=[added];body.entries.push({studentRef:added.ref,ca:25,exam:45});const submitted=call(body);assert.equal(submitted.saved,3);
let saved=call({action:'score.download',courseRef:refs[0],pin:body.pin}).snapshot;
const manual=saved.students.find(s=>s.ref===added.ref);assert.equal(manual.source,'Lecturer added');assert.equal(manual.reason,added.reason);assert.equal(manual.addedBy,'Synthetic Lecturer');assert.ok(manual.addedAt);assert.match(manual.reviewStatus,/admin review/);
assert.equal(admin({action:'score.admin.class.details',classRef}).students.length,2); // Manual additions do not alter the master roster.
const extra=[{Name:'Student Three',MatNo:'0003'}];p=preview('students',extra);commit(p,extra);
assert.equal(call({action:'score.course',courseRef:refs[1]}).students.length,3);
assert.equal(call({action:'score.download',courseRef:refs[0],pin:body.pin}).snapshot.students.length,3); // Submitted snapshot remains two regular + one manual.
admin({action:'score.admin.archive',submissionId:submitted.submissionId,reason:'Test reopening without deleting prior identities'});
assert.equal(load().students.length,3);assert.equal(admin({action:'score.admin.snapshot',submissionId:submitted.submissionId}).snapshot.students.find(s=>s.ref===added.ref).name,added.name);
// Interrupted class imports can be previewed again and resumed without duplicate students.
const interrupted=[{Name:'Student Four',MatNo:'0004'}];p=preview('students',interrupted);controls.failTable='ScoreClassEnrolments';assert.throws(()=>commit(p,interrupted),/write interruption/);
assert.throws(()=>commit(p,interrupted),/changed/);p=preview('students',interrupted);assert.equal(p.rows[0].newStudent,false);commit(p,interrupted);
assert.equal(sheets.get('ScoreStudents').data.filter(r=>r[1]==='0004').length,1);
assert.equal(admin({action:'score.admin.class.details',classRef}).students.length,4);
// Relevant concurrent changes invalidate the original preview.
const concurrent=[{CourseCode:'CRS103',Title:'Concurrent',Units:'2'}],first=preview('courses',concurrent);commit(preview('courses',concurrent),concurrent);assert.throws(()=>commit(first,concurrent),/changed/);
const previousSubmissionRows=sheets.get('ScoreSubmissions').data.length,previousHistoryRows=sheets.get('ScoreHistory').data.length;context.setupScoreMvp_();context.setupScoreMvp_();assert.equal(sheets.get('ScoreSubmissions').data.length,previousSubmissionRows);assert.equal(sheets.get('ScoreHistory').data.length,previousHistoryRows);
console.log('PASS: admin-only class setup, automatic rosters, duplicate/conflict previews, identifier preservation, safe retries, lecturer additions/provenance and immutable submitted history.');
