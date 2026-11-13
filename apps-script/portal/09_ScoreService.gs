/* PIN-based score MVP. All helpers are private to Apps Script (trailing underscore).
 * Existing exam tables and existing score-app tables are never modified.
 */
const SCORE_TABLES_ = {
  ScoreCourses: ['CourseRef','CourseCode','Title','Units','Session','Semester','Programme','Level/Set'],
  ScoreStudents: ['StudentRef','MatNo','AdmissionNo','Name','Programme','Level/Set','Status'],
  ScoreRegistrations: ['CourseRef','StudentRef','RegistrationType'],
  ScoreSubmissions: ['SubmissionID','CourseRef','Version','SubmittedAt','LecturerName','ExamDate','PinSalt','PinHash','CourseJSON','RecordCount','OperationID','PayloadHash'],
  ScoreEntries: ['SubmissionID','StudentRef','MatNo','Name','CA','Exam','Total','Grade'],
  ScoreHistory: ['EventID','Timestamp','SubmissionID','CourseRef','Action','Actor','Reason']
};
function scoreText_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function scoreHash_(v) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v), Utilities.Charset.UTF_8).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function scoreEqual_(a,b) { a=String(a);b=String(b);let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++) n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0; }
function scoreBook_() {
  const id = PropertiesService.getScriptProperties().getProperty('PORTAL_SCORE_SPREADSHEET_ID');
  if (!id) throw new Error('The score spreadsheet is not configured.');
  return SpreadsheetApp.openById(id);
}
function scoreRead_(book, name) {
  const sh=book.getSheetByName(name);
  if(!sh) throw new Error('Run setupScoreMvp_ first. Missing tab: '+name);
  const values=sh.getDataRange().getValues();
  const headers=(values.shift()||[]).map(String);
  const expected=SCORE_TABLES_[name];
  if(expected && (headers.length!==expected.length || expected.some(function(h,i){return h!==headers[i];}))) throw new Error('Unexpected headers in '+name+'. Do not rename columns.');
  return values.filter(function(r){return r.some(function(v){return v!=='';});}).map(function(r){const o={};headers.forEach(function(h,i){o[h]=r[i];});return o;});
}
function scoreAppend_(book,name,rows) {
  if(!rows.length) return;
  const sh=book.getSheetByName(name), width=rows[0].length;
  const first=sh.getLastRow()+1;
  if(sh.getMaxRows()<first+rows.length-1) sh.insertRowsAfter(sh.getMaxRows(),first+rows.length-1-sh.getMaxRows());
  // Force strings to remain literal: lecturer/student names cannot become formulas.
  const safe=rows.map(function(r){return r.map(function(v){return typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;});});
  sh.getRange(first,1,rows.length,width).setNumberFormat('@').setValues(safe);
}
function scoreLock_(fn) { const lock=LockService.getScriptLock();lock.waitLock(20000);try{return fn();}finally{lock.releaseLock();} }
function scoreConfig_(book) {
  const rows=scoreRead_(book,'Config'), lookup={};
  rows.forEach(function(r){lookup[scoreText_(r.Key)]=r.Value;});
  const caMax=Number(lookup.CA_MAX),examMax=Number(lookup.EXAM_MAX),session=scoreText_(lookup.CURRENT_SESSION);
  if(!session || !Number.isFinite(caMax)||caMax<=0||!Number.isFinite(examMax)||examMax<=0) throw new Error('Review CURRENT_SESSION, CA_MAX and EXAM_MAX in Config.');
  const grades=rows.filter(function(r){return scoreText_(r.Key)!==''&&Number.isFinite(Number(r.Key));}).map(function(r){return {min:Number(r.Key),grade:scoreText_(r.Value)};}).sort(function(a,b){return b.min-a.min;});
  return {session:session,caMax:caMax,examMax:examMax,open:scoreText_(lookup.SUBMISSIONS_OPEN).toUpperCase()==='TRUE',grades:grades};
}
function scoreCourseObject_(r) { return {ref:scoreText_(r.CourseRef),code:scoreText_(r.CourseCode),title:scoreText_(r.Title),units:Number(r.Units),session:scoreText_(r.Session),semester:scoreText_(r.Semester),programme:scoreText_(r.Programme),level:scoreText_(r['Level/Set'])}; }
function scoreLatest_(book, ref) {
  const list=scoreRead_(book,'ScoreSubmissions').filter(function(r){return scoreText_(r.CourseRef)===ref;}).sort(function(a,b){return Number(b.Version)-Number(a.Version);});
  const latest=list[0];
  if(!latest)return null;
  const archived=scoreRead_(book,'ScoreHistory').some(function(e){return e.SubmissionID===latest.SubmissionID&&e.Action==='Archived';});
  return {record:latest,archived:archived};
}
function scoreCourse_(book,ref) {
  const rows=scoreRead_(book,'ScoreCourses').filter(function(c){return scoreText_(c.CourseRef)===ref;});
  if(rows.length!==1) throw new Error('Course not found or its reference is duplicated.');
  const c=scoreCourseObject_(rows[0]),cfg=scoreConfig_(book);
  if(c.session!==cfg.session) throw new Error('This course is not in the active academic session.');
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(c.ref)||!c.code||!c.title||!c.programme||!c.level||!c.semester||!Number.isFinite(c.units)||c.units<=0) throw new Error('The course metadata is incomplete. Contact the administrator.');
  return c;
}
function scoreRoster_(book,ref) {
  const students=scoreRead_(book,'ScoreStudents'),regs=scoreRead_(book,'ScoreRegistrations').filter(function(r){return scoreText_(r.CourseRef)===ref;}),seen={};
  const roster=regs.map(function(r){
    const id=scoreText_(r.StudentRef);if(!id||seen[id])throw new Error('Missing or duplicate student registration. Contact the administrator.');seen[id]=true;
    const found=students.filter(function(s){return scoreText_(s.StudentRef)===id;});
    if(found.length!==1) throw new Error('Student reference missing or duplicated: '+id);
    const s=found[0];if(scoreText_(s.Status)!=='Active')return null;
    if(!scoreText_(s.Name))throw new Error('A registered student has no name.');
    return {ref:id,matNo:scoreText_(s.MatNo),name:scoreText_(s.Name)};
  }).filter(Boolean).sort(function(a,b){return a.ref.localeCompare(b.ref);});
  const matric={};roster.forEach(function(s){if(s.matNo&&matric[s.matNo])throw new Error('Duplicate matric number in this roster.');if(s.matNo)matric[s.matNo]=true;});
  if(!roster.length)throw new Error('No active students are registered for this course yet.');
  if(roster.length>1000)throw new Error('This roster exceeds the first-release limit of 1,000 students.');
  return roster;
}
function scoreRevision_(course,students,cfg) {return scoreHash_(JSON.stringify({course:course,students:students,caMax:cfg.caMax,examMax:cfg.examMax,grades:cfg.grades}));}
function scoreCatalogue_(book) {
  const cfg=scoreConfig_(book),submissions=scoreRead_(book,'ScoreSubmissions'),events=scoreRead_(book,'ScoreHistory');
  const archived={};events.forEach(function(e){if(e.Action==='Archived')archived[e.SubmissionID]=true;});
  const refs={};
  const courses=scoreRead_(book,'ScoreCourses').filter(function(c){return scoreText_(c.Session)===cfg.session;}).map(function(r){
    const c=scoreCourseObject_(r);if(!c.ref||refs[c.ref])throw new Error('Missing or duplicate CourseRef in ScoreCourses.');refs[c.ref]=true;
    const versions=submissions.filter(function(s){return s.CourseRef===c.ref;}).sort(function(a,b){return Number(b.Version)-Number(a.Version);});
    c.locked=Boolean(versions[0]&&!archived[versions[0].SubmissionID]);return c;
  });
  return {success:true,courses:courses,config:{session:cfg.session,caMax:cfg.caMax,examMax:cfg.examMax,open:cfg.open}};
}
function scoreLoad_(book,ref) {
  const course=scoreCourse_(book,ref),latest=scoreLatest_(book,ref),cfg=scoreConfig_(book);
  if(latest&&!latest.archived)return {success:true,locked:true,course:course};
  const students=scoreRoster_(book,ref);
  return {success:true,locked:false,course:course,students:students,revision:scoreRevision_(course,students,cfg),config:{caMax:cfg.caMax,examMax:cfg.examMax,open:cfg.open}};
}
function scoreSafePin_(pin) {if(typeof pin!=='string'||pin.length<8||pin.length>128||pin.trim()!==pin)throw new Error('Use a PIN of 8–128 characters without leading or trailing spaces.');return pin;}
function scoreScore_(v,max,label) {if((typeof v!=='number'&&typeof v!=='string')||String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>max||Math.abs(Math.round(Number(v)*100)-Number(v)*100)>1e-8)throw new Error(label+' must be between 0 and '+max+' with at most two decimal places.');return Number(v);}
function scorePayload_(data) {return scoreHash_(JSON.stringify({courseRef:data.courseRef,revision:data.revision,lecturerName:scoreText_(data.lecturerName),examDate:data.examDate,pinHash:scoreHash_(data.pin),entries:data.entries}));}
function scoreSubmit_(book,data) {
  return scoreLock_(function(){
    const ref=scoreText_(data.courseRef),op=scoreText_(data.operationId),pin=scoreSafePin_(data.pin);
    if(!/^[a-z0-9-]{20,80}$/i.test(op))throw new Error('Submission reference is invalid. Reload the page.');
    if(!Array.isArray(data.entries)||data.entries.length>1000)throw new Error('Invalid score entries.');
    const payloadHash=scorePayload_(data);
    const previous=scoreRead_(book,'ScoreSubmissions').filter(function(s){return s.OperationID===op;})[0];
    if(previous){if(previous.PayloadHash!==payloadHash)throw new Error('This retry differs from the original submission. Refresh the course before continuing.');return {success:true,submissionId:previous.SubmissionID,version:Number(previous.Version),saved:Number(previous.RecordCount),replayed:true};}
    const cfg=scoreConfig_(book);if(!cfg.open)throw new Error('Score submission is currently closed.');
    const course=scoreCourse_(book,ref),latest=scoreLatest_(book,ref);
    if(latest&&!latest.archived)throw new Error('This course is already submitted and locked. Use your PIN to download it.');
    const students=scoreRoster_(book,ref);
    if(data.revision!==scoreRevision_(course,students,cfg))throw new Error('The course, roster or marking settings changed. Reload the course and review the scores.');
    const lecturer=scoreText_(data.lecturerName);if(lecturer.length<2||lecturer.length>150)throw new Error('Enter the lecturer’s full name (2–150 characters).');
    const date=scoreText_(data.examDate),parsed=new Date(date+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>Utilities.formatDate(new Date(),'Africa/Lagos','yyyy-MM-dd'))throw new Error('Enter a valid examination date that is not in the future.');
    const byRef={};data.entries.forEach(function(e){if(!e||typeof e.studentRef!=='string'||byRef[e.studentRef])throw new Error('Invalid or duplicate student score.');byRef[e.studentRef]=e;});
    if(data.entries.length!==students.length)throw new Error('Submit exactly one score for each registered student.');
    const id=Utilities.getUuid(),salt=Utilities.getUuid(),version=latest?Number(latest.record.Version)+1:1;
    const entries=students.map(function(s){const e=byRef[s.ref];if(!e)throw new Error('Missing scores for '+s.ref);const ca=scoreScore_(e.ca,cfg.caMax,'CA for '+s.ref),exam=scoreScore_(e.exam,cfg.examMax,'Exam for '+s.ref),total=Math.round((ca+exam)*100)/100;const grade=cfg.grades.filter(function(g){return total>=g.min;})[0];return [id,s.ref,s.matNo,s.name,ca,exam,total,grade?grade.grade:''];});
    // Commit marker goes LAST. Entries without a submission header are never served.
    scoreAppend_(book,'ScoreEntries',entries);
    SpreadsheetApp.flush();
    scoreAppend_(book,'ScoreSubmissions',[[id,ref,version,new Date().toISOString(),lecturer,date,salt,scoreHash_(salt+'|'+pin),JSON.stringify(course),entries.length,op,payloadHash]]);
    SpreadsheetApp.flush();
    return {success:true,submissionId:id,version:version,saved:entries.length};
  });
}
function scoreAttempt_(scope,fn) {
  return scoreLock_(function(){
    const p=PropertiesService.getScriptProperties(),key='SCORE_ATTEMPT_'+scoreHash_(scope),now=Date.now();
    const raw=p.getProperty(key);let a=raw?JSON.parse(raw):{count:0,expires:now+900000};
    if(a.expires<=now)a={count:0,expires:now+900000};
    if(a.count>=5)throw new Error('Too many attempts. Wait 15 minutes and try again.');
    a.count++;p.setProperty(key,JSON.stringify(a));
    const result=fn();p.deleteProperty(key);return result;
  });
}
function scoreSnapshot_(book,record) {
  const rows=scoreRead_(book,'ScoreEntries').filter(function(e){return e.SubmissionID===record.SubmissionID;});
  if(rows.length!==Number(record.RecordCount))throw new Error('Submission record count does not match. Contact the administrator.');
  return {submissionId:record.SubmissionID,version:Number(record.Version),submittedAt:record.SubmittedAt,lecturerName:record.LecturerName,examDate:record.ExamDate,course:JSON.parse(record.CourseJSON),students:rows.map(function(r){return {ref:r.StudentRef,matNo:r.MatNo,name:r.Name,ca:Number(r.CA),exam:Number(r.Exam),total:Number(r.Total),grade:r.Grade};})};
}
function scoreDownload_(book,data) {
  const ref=scoreText_(data.courseRef);
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(ref)||!scoreRead_(book,'ScoreSubmissions').some(function(r){return r.CourseRef===ref;}))throw new Error('There is no current locked submission for this course.');
  return scoreAttempt_('pin:'+ref,function(){
    const latest=scoreLatest_(book,ref);
    if(!latest||latest.archived)throw new Error('There is no current locked submission for this course.');
    const r=latest.record;
    if(typeof data.pin!=='string'||data.pin.length>128||!scoreEqual_(scoreHash_(r.PinSalt+'|'+data.pin),r.PinHash))throw new Error('Course or PIN not recognised.');
    return {success:true,snapshot:scoreSnapshot_(book,r)};
  });
}
function scoreAdmin_(token) {
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/i.test(token))throw new Error('Administrator session expired. Sign in again.');
  const raw=CacheService.getScriptCache().get('score_admin_'+scoreHash_(token)),p=PropertiesService.getScriptProperties();
  const session=raw?JSON.parse(raw):null;
  if(!session||session.expires<=Date.now()||session.fingerprint!==p.getProperty('SCORE_ADMIN_HASH'))throw new Error('Administrator session expired. Sign in again.');
  return session;
}
function scoreAdminLogin_(data) {
  return scoreAttempt_('admin',function(){
    const p=PropertiesService.getScriptProperties(),hash=p.getProperty('SCORE_ADMIN_HASH'),salt=p.getProperty('SCORE_ADMIN_SALT');
    if(!hash||!salt)throw new Error('Administrator access is not configured.');
    if(typeof data.key!=='string'||data.key.length>256||!scoreEqual_(scoreHash_(salt+'|'+data.key),hash))throw new Error('Administrator key not recognised.');
    const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''),expires=Date.now()+1800000;
    CacheService.getScriptCache().put('score_admin_'+scoreHash_(token),JSON.stringify({expires:expires,fingerprint:hash,actor:'Score administrator'}),1800);
    return {success:true,token:token,expires:expires};
  });
}
function scoreHistory_(book) {
  const events=scoreRead_(book,'ScoreHistory'),archived={};events.forEach(function(e){if(e.Action==='Archived')archived[e.SubmissionID]=e;});
  return scoreRead_(book,'ScoreSubmissions').map(function(r){const c=JSON.parse(r.CourseJSON);return {submissionId:r.SubmissionID,courseRef:r.CourseRef,course:c,version:Number(r.Version),submittedAt:r.SubmittedAt,lecturerName:r.LecturerName,count:Number(r.RecordCount),archived:Boolean(archived[r.SubmissionID]),archive:archived[r.SubmissionID]?{at:archived[r.SubmissionID].Timestamp,reason:archived[r.SubmissionID].Reason,actor:archived[r.SubmissionID].Actor}:null};}).reverse();
}
function scoreArchive_(book,data) {
  return scoreLock_(function(){
    const admin=scoreAdmin_(data.token),reason=scoreText_(data.reason);
    if(reason.length<5||reason.length>500)throw new Error('Enter a reason for reopening (5–500 characters).');
    const records=scoreRead_(book,'ScoreSubmissions').filter(function(r){return r.SubmissionID===data.submissionId;});
    if(records.length!==1)throw new Error('Submission not found.');
    const r=records[0],events=scoreRead_(book,'ScoreHistory');
    if(events.some(function(e){return e.SubmissionID===r.SubmissionID&&e.Action==='Archived';}))return {success:true,alreadyArchived:true};
    const latest=scoreLatest_(book,r.CourseRef);
    if(!latest||latest.record.SubmissionID!==r.SubmissionID)throw new Error('A newer version exists. Refresh the submission list.');
    scoreAppend_(book,'ScoreHistory',[[Utilities.getUuid(),new Date().toISOString(),r.SubmissionID,r.CourseRef,'Archived',admin.actor,reason]]);
    SpreadsheetApp.flush();return {success:true};
  });
}
function scoreRoute_(data) {
  if(data.action==='score.admin.login')return scoreAdminLogin_(data);
  const book=scoreBook_();
  switch(data.action){
    case 'score.catalogue':return scoreCatalogue_(book);
    case 'score.course':return scoreLoad_(book,scoreText_(data.courseRef));
    case 'score.submit':return scoreSubmit_(book,data);
    case 'score.download':return scoreDownload_(book,data);
    case 'score.admin.history':scoreAdmin_(data.token);return {success:true,submissions:scoreHistory_(book)};
    case 'score.admin.snapshot':scoreAdmin_(data.token);const r=scoreRead_(book,'ScoreSubmissions').filter(function(s){return s.SubmissionID===data.submissionId;})[0];if(!r)throw new Error('Submission not found.');return {success:true,snapshot:scoreSnapshot_(book,r)};
    case 'score.admin.archive':return scoreArchive_(book,data);
    case 'score.admin.logout':scoreAdmin_(data.token);CacheService.getScriptCache().remove('score_admin_'+scoreHash_(data.token));return {success:true};
    default:throw new Error('Unknown score action.');
  }
}
function scoreResponse_(data,requestId) {
  const origin=PropertiesService.getScriptProperties().getProperty('PORTAL_FRONTEND_ORIGIN')||'';
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw new Error('Configure PORTAL_FRONTEND_ORIGIN.');
  let result;try{result=scoreRoute_(data);}catch(error){result={success:false,error:error.message||'The score service is unavailable.'};}
  const message=JSON.stringify({type:'RCM_SCORE_RESPONSE',requestId:String(requestId||''),data:result}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage('+message+','+JSON.stringify(origin)+');</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
