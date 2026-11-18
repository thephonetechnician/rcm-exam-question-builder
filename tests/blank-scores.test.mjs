import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createScoreHarness} from './helpers/score-harness.mjs';
const {context:c,book,props,sheets}=createScoreHarness();c.setupScoreMvp_();c.seedScoreDemo_();
const call=d=>c.scoreRoute_(d),load=()=>call({action:'score.course',courseRef:'DEMO001'});
const input=()=>({action:'score.submit',courseRef:'DEMO001',revision:load().revision,lecturerName:'Synthetic Lecturer',examDate:'2026-01-01',pin:'SYNTHETIC-BLANK-PIN',operationId:randomUUID(),entries:load().students.map(s=>({studentRef:s.ref,ca:'',exam:''}))});
let payload=input();assert.throws(()=>call(payload),/at least one/);assert.equal(sheets.get('ScoreEntries').data.length,1);
for(const e of [{ca:'20',exam:''},{ca:'',exam:'50'},{ca:null,exam:null},{ca:undefined,exam:undefined}]){payload=input();Object.assign(payload.entries[0],e);assert.throws(()=>call(payload),/both|must be/);assert.equal(sheets.get('ScoreEntries').data.length,1);}
payload=input();Object.assign(payload.entries[0],{ca:'20',exam:'50'});Object.assign(payload.entries[1],{ca:'0',exam:'0'});
const result=call(payload);assert.equal(result.saved,3);assert.equal(call(payload).replayed,true);
let snapshot=call({action:'score.download',courseRef:'DEMO001',pin:payload.pin}).snapshot;
assert.equal(snapshot.students[0].total,70);assert.equal(snapshot.students[1].ca,0);assert.equal(snapshot.students[1].total,0);assert.equal(snapshot.students[1].grade,'F');
assert.equal(snapshot.students[2].ca,null);assert.equal(snapshot.students[2].exam,null);assert.equal(snapshot.students[2].total,null);assert.equal(snapshot.students[2].grade,'');assert.equal(snapshot.students[2].scoreStatus,'No scores entered');
assert.equal(sheets.get('ScoreEntries').data[3][4],'');assert.equal(load().locked,true);
props.set('SCORE_ADMIN_KEY','SYNTHETIC-BLANK-ADMIN-KEY');c.configureScoreAdmin_();const token=call({action:'score.admin.login',key:'SYNTHETIC-BLANK-ADMIN-KEY'}).token;
call({action:'score.admin.archive',token,submissionId:result.submissionId,reason:'Synthetic correction test'});
const next=input();next.entries.forEach(e=>Object.assign(e,{ca:'10',exam:'20'}));assert.equal(call(next).version,2);
snapshot=call({action:'score.admin.snapshot',token,submissionId:result.submissionId}).snapshot;assert.equal(snapshot.students[2].total,null);assert.equal(snapshot.students[1].total,0);
console.log('PASS: blank student rows stay blank, real zero retains its grade, partial/all-blank submissions fail without writes, PIN locks/retries and archived versions preserve blanks.');
