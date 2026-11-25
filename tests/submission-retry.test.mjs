import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {randomUUID} from 'node:crypto';import {createScoreHarness} from './helpers/score-harness.mjs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../js/score-submit-retry.js',import.meta.url),'utf8'),{window,setTimeout});const run=window.ScoreSubmitRetry.run;
const busy=()=>Object.assign(new Error('busy'),{code:'SCORE_BUSY'}),payload={action:'score.submit',operationId:randomUUID(),pin:'SYNTHETIC-ONLY',entries:[{ca:'20',exam:'40'}]};
let now=0,calls=0;const seen=[];
const result=await run(payload,async(copy,timeout)=>{seen.push(JSON.stringify(copy));assert.ok(timeout<=45000);calls++;if(calls<3){copy.entries[0].ca='MUTATED';throw busy();}return {success:true};},{now:()=>now,sleep:async ms=>{now+=ms;},random:()=>0.5});assert.equal(result.success,true);assert.equal(calls,3);assert.equal(new Set(seen).size,1);assert.equal(payload.entries[0].ca,'20');
calls=0;await assert.rejects(run(payload,async()=>{calls++;throw new Error('Roster changed');},{sleep:async()=>{throw Error('Should not retry');}}),/Roster changed/);assert.equal(calls,1);
calls=0;await assert.rejects(run({action:'score.download'},async()=>{calls++;throw busy();}),/busy/);assert.equal(calls,1);
calls=0;await assert.rejects(run(payload,async()=>{calls++;throw busy();},{maxAttempts:3,sleep:async()=>{},random:()=>0.5}),/busy/);assert.equal(calls,3);
now=0;calls=0;await assert.rejects(run(payload,async()=>{calls++;throw busy();},{budgetMs:1000,now:()=>now,sleep:async ms=>now+=ms,random:()=>0.5}),/busy/);assert.equal(calls,2);
const h=createScoreHarness(),c=h.context;c.setupScoreMvp_();c.seedScoreDemo_();
const loaded=c.scoreRoute_({action:'score.course',courseRef:'DEMO001'}),p={action:'score.submit',operationId:randomUUID(),courseRef:'DEMO001',revision:loaded.revision,pin:'SYNTHETIC-RETRY-PIN',lecturerName:'Synthetic Lecturer',examDate:'2026-01-01',entries:loaded.students.map(s=>({studentRef:s.ref,ca:'20',exam:'40'}))};
calls=0;const replay=await run(p,async copy=>{const response=c.scoreRoute_(copy);if(++calls===1)throw Object.assign(Error('Response lost after saving'),{code:'SCORE_TIMEOUT'});return response;},{sleep:async()=>{}});assert.equal(replay.replayed,true);assert.equal(h.sheets.get('ScoreSubmissions').data.length,2);assert.equal(h.sheets.get('ScoreEntries').data.length,4);
h.controls.held=true;const busyResponse=c.scoreResponse_({...p,operationId:randomUUID()},'busy-test');assert.match(busyResponse.html,/SCORE_BUSY/);assert.match(busyResponse.html,/"retryable":true/);h.controls.held=false;
// Ten independent local clients contend for a simulated slow writer. Actual
// service validation/persistence is used once that transport slot is available.
c.scoreAppend_(h.book,'ScoreCourses',Array.from({length:10},(_,i)=>['RETRY'+i,'RETRY'+i,'Retry test '+i,2,'2026/2027','1','DEMO','Test Class']));
const inputs=Array.from({length:10},(_,i)=>{const d=c.scoreRoute_({action:'score.course',courseRef:'RETRY'+i});return {...p,courseRef:d.course.ref,revision:d.revision,operationId:randomUUID()};});let occupied=false,retries=0;
const results=await Promise.all(inputs.map(input=>run(input,async copy=>{if(occupied)throw busy();occupied=true;try{await new Promise(r=>setTimeout(r,3));return c.scoreRoute_(copy);}finally{occupied=false;}},{sleep:async()=>new Promise(r=>setTimeout(r,5)),onRetry:()=>retries++})));
assert.equal(results.filter(r=>r.success).length,10);assert.equal(new Set(results.map(r=>r.submissionId)).size,10);assert.ok(retries>0);assert.equal(h.sheets.get('ScoreSubmissions').data.length,12);assert.equal(h.sheets.get('ScoreEntries').data.length,34);
console.log('PASS: immutable submission retries, backoff/attempt/deadline limits, permanent failures, lost-response replay, structured busy responses and ten local clients with contention. NOT a hosted load test.');
