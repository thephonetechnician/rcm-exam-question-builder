/* Real parallel workers, shared synthetic workbook and an emulated Apps Script
 * lock. This is a local integrity test, NOT a Google-hosted load benchmark. */
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {createScoreHarness} from './helpers/score-harness.mjs';
const encode=new TextEncoder(),decode=new TextDecoder();
function connect(h,shared){
  const control=new Int32Array(shared.control),bytes=new Uint8Array(shared.bytes);
  const read=()=>JSON.parse(decode.decode(bytes.subarray(0,Atomics.load(control,2))));
  const write=value=>{const text=encode.encode(JSON.stringify(value));assert.ok(text.length<=bytes.length);bytes.set(text);Atomics.store(control,2,text.length);};
  const book={getSheetByName(name){if(!read()[name])return null;return {getDataRange:()=>({getValues:()=>read()[name]}),getLastRow:()=>read()[name].length,getMaxRows:()=>100000,getRange(row,col,height,width){const range={setNumberFormat:()=>range,setValues(values){const all=read();for(let r=0;r<height;r++){all[name][row+r-1]??=[];for(let c=0;c<width;c++){let v=values[r][c];if(typeof v==='string'&&v.startsWith("'"))v=v.slice(1);all[name][row+r-1][col+c-1]=v;}}write(all);return range;}};return range;}};}};
  h.context.scoreBook_=()=>book;
  let waits=[];
  h.context.LockService.getScriptLock=()=>({tryLock(ms){try{this.waitLock(ms);return true;}catch(error){if(/Synthetic lock timeout/.test(error.message))return false;throw error;}},waitLock(ms){const start=Date.now();while(Atomics.compareExchange(control,0,0,1)!==0){if(Date.now()-start>=ms)throw Error('Synthetic lock timeout');Atomics.wait(control,0,1,5);}waits.push(Date.now()-start);assert.equal(Atomics.add(control,3,1),0,'Only one writer may enter');Atomics.store(control,4,Math.max(Atomics.load(control,4),Atomics.load(control,3)));},releaseLock(){Atomics.sub(control,3,1);Atomics.store(control,0,0);Atomics.notify(control,0);}});
  return {control,read,write,waits};
}
if(!isMainThread){
  const h=createScoreHarness(),connection=connect(h,workerData.shared);
  parentPort.postMessage({ready:true});Atomics.wait(connection.control,1,0);
  const started=Date.now();try{const result=h.context.scoreRoute_(workerData.payload);parentPort.postMessage({success:true,result,started,finished:Date.now(),lockWaitMs:connection.waits});}catch(error){parentPort.postMessage({success:false,error:error.message,started,finished:Date.now(),lockWaitMs:connection.waits});}
}else{
  const h=createScoreHarness(),c=h.context;c.setupScoreMvp_();
  const studentRows=Array.from({length:100},(_,i)=>['TEST-S'+i,String(i+1).padStart(5,'0'),'','Synthetic student '+i,'TEST','100 Level','Active']);
  c.scoreAppend_(h.book,'ScoreStudents',studentRows);
  c.scoreAppend_(h.book,'ScoreCourses',Array.from({length:5},(_,i)=>['TEST-C'+i,'TEST'+i,'Synthetic course '+i,2,'2026/2027','1','TEST','100 Level']));
  c.scoreAppend_(h.book,'ScoreRegistrations',Array.from({length:5},(_,i)=>studentRows.map(s=>['TEST-C'+i,s[0],'Regular'])).flat());
  const shared={control:new SharedArrayBuffer(5*4),bytes:new SharedArrayBuffer(4*1024*1024)};
  const connection=connect(h,shared);connection.write(Object.fromEntries([...h.sheets].map(([name,sheet])=>[name,sheet.data])));
  const make=(ref,i)=>{const loaded=c.scoreRoute_({action:'score.course',courseRef:ref});return {action:'score.submit',courseRef:ref,revision:loaded.revision,lecturerName:'Synthetic lecturer '+i,examDate:'2026-01-01',pin:'SYNTHETIC-CONCURRENCY-PIN-'+i,operationId:randomUUID(),entries:loaded.students.map((s,index)=>({studentRef:s.ref,ca:String((index+i)%31),exam:String((index*2+i)%71)}))};};
  const originals=Array.from({length:5},(_,i)=>make('TEST-C'+i,i));
  async function wave(payloads){
    Atomics.store(connection.control,1,0);const workers=payloads.map(payload=>new Worker(new URL(import.meta.url),{workerData:{shared,payload}}));
    const tasks=workers.map(worker=>{let readyResolve,resultResolve,reject;const ready=new Promise((r,j)=>{readyResolve=r;reject=j;}),result=new Promise(r=>resultResolve=r);worker.on('message',message=>message.ready?readyResolve():resultResolve(message));worker.on('error',error=>{reject(error);resultResolve({success:false,error:error.message});});worker.on('exit',code=>{if(code!==0){reject(Error('Worker exited '+code));resultResolve({success:false,error:'Worker exited '+code});}});return {ready,result};});
    try{await Promise.all(tasks.map(t=>t.ready));Atomics.store(connection.control,1,1);Atomics.notify(connection.control,1,workers.length);return await Promise.all(tasks.map(t=>t.result));}finally{await Promise.all(workers.map(w=>w.terminate()));}
  }
  const results=await wave(originals);assert.ok(results.every(r=>r.success),JSON.stringify(results));assert.equal(new Set(results.map(r=>r.result.submissionId)).size,5);
  let all=connection.read();assert.equal(all.ScoreSubmissions.length-1,5);assert.equal(all.ScoreEntries.length-1,500);
  for(const p of originals){const snapshot=c.scoreRoute_({action:'score.download',courseRef:p.courseRef,pin:p.pin}).snapshot;assert.equal(snapshot.students.length,100);const entries=new Map(p.entries.map(e=>[e.studentRef,e]));for(const s of snapshot.students){const expected=entries.get(s.ref);assert.equal(s.ca,Number(expected.ca));assert.equal(s.exam,Number(expected.exam));assert.equal(s.total,s.ca+s.exam);}assert.equal(c.scoreRoute_({action:'score.course',courseRef:p.courseRef}).locked,true);}
  const retries=await wave(originals);assert.ok(retries.every(r=>r.success&&r.result.replayed));assert.equal(connection.read().ScoreSubmissions.length-1,5);assert.equal(connection.read().ScoreEntries.length-1,500);
  // Open a sixth course, then race five independent submissions for that course.
  c.scoreAppend_(c.scoreBook_(),'ScoreCourses',[['RACE','RACE101','Same-course race',2,'2026/2027','1','TEST','100 Level']]);c.scoreAppend_(c.scoreBook_(),'ScoreRegistrations',studentRows.map(s=>['RACE',s[0],'Regular']));
  const raceInputs=Array.from({length:5},(_,i)=>make('RACE',i+10)),race=await wave(raceInputs);assert.equal(race.filter(r=>r.success).length,1);assert.ok(race.filter(r=>!r.success).every(r=>/already submitted and locked/.test(r.error)));assert.equal(connection.read().ScoreSubmissions.length-1,6);assert.equal(connection.read().ScoreEntries.length-1,600);
  const tracking=c.scoreRoute_({action:'score.tracking',semester:'1'});assert.equal(tracking.classes.flatMap(g=>g.lecturers.flatMap(l=>l.courses)).filter(c=>c.scoreStatus==='Submitted').length,6);assert.equal(Atomics.load(connection.control,4),1);
  console.log(JSON.stringify({test:'LOCAL ONLY: five parallel worker submissions',studentsPerCourse:100,differentCourses:{submitted:5,verifiedStudentRows:500},sameOperationRetries:{replayed:5,duplicateSubmissions:0},sameCourseRace:{accepted:1,rejectedAsLocked:4},maxConcurrentWriters:1,startSpreadMs:Math.max(...results.map(r=>r.started))-Math.min(...results.map(r=>r.started)),googleLoadTest:false},null,2));
}
