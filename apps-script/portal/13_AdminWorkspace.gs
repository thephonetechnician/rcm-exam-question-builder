/* Lecturer/course assignments and school scoring settings. No master rows deleted. */
function scoreSchoolSettings_(book){
  if(!book.getSheetByName('ScorePortalSettings'))return null;
  const rows=scoreRead_(book,'ScorePortalSettings').filter(function(r){return r.Setting==='scoring';});
  return rows.length?JSON.parse(rows[rows.length-1].Value):null;
}
function scoreSettingsSave_(book,data){return scoreLock_(function(){
  const admin=scoreAdmin_(data.token),ca=Number(data.caMax),exam=Number(data.examMax);
  if(!Number.isInteger(ca)||!Number.isInteger(exam)||ca<=0||exam<=0||ca+exam!==100)throw new Error('CA and exam limits must be positive whole numbers adding up to 100.');
  scoreAppend_(book,'ScorePortalSettings',[['scoring',JSON.stringify({caMax:ca,examMax:exam}),new Date().toISOString(),admin.actor]]);
  return {success:true,caMax:ca,examMax:exam};
});}
function scoreLecturerAssignments_(book){
  const commits=scoreRead_(book,'ScoreLecturerImports'),changes=scoreRead_(book,'ScoreLecturerAssignments'),out=[];
  commits.forEach(function(c){const rows=changes.filter(function(r){return r.BatchID===c.BatchID;});if(rows.length!==Number(c.RowCount))throw new Error('Lecturer assignment history is incomplete. Contact the administrator.');Array.prototype.push.apply(out,rows);});return out;
}
function scoreAssignmentContext_(book,semester){
  const catalogue=scoreCatalogue_(book);semester=scoreText_(semester);
  if(!['1','2','3'].includes(semester))throw new Error('Choose a semester.');
  return {session:catalogue.config.session,semester:semester,courses:catalogue.courses.filter(function(c){return c.semester===semester;})};
}
function scoreLecturerPlan_(book,data){
  const ctx=scoreAssignmentContext_(book,data.semester),existing=scoreLecturerAssignments_(book),seen=Object.create(null),names=Object.create(null),byCourse=Object.create(null);
  existing.forEach(function(r){names[scoreNorm_(r.LecturerID)]=scoreNorm_(r.LecturerName);byCourse[r.CourseRef]=r;});
  if(!Array.isArray(data.rows)||data.rows.length<1||data.rows.length>1000)throw new Error('Upload 1–1,000 assignment rows.');
  const rows=data.rows.map(function(raw,i){
    const row={row:Number(raw._row)||i+2,status:'Add',message:'New assignment',values:{}};
    ['LecturerID','LecturerName','CourseCode','Programme','Level/Set'].forEach(function(k){row.values[k]=scoreText_(raw[k]);});
    const v=row.values,id=scoreNorm_(v.LecturerID),name=scoreNorm_(v.LecturerName);
    function conflict(message){row.status='Conflict';row.message=message;return row;}
    if(!v.LecturerID&&!v.LecturerName){row.status='Skip';row.message='No lecturer entered for this course';return row;}
    if(!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(v.LecturerID)||v.LecturerName.length<2||v.LecturerName.length>150)return conflict('Enter a valid LecturerID and full name. Keep IDs as text.');
    const matches=ctx.courses.filter(function(c){return scoreNorm_(c.code)===scoreNorm_(v.CourseCode)&&scoreNorm_(c.programme)===scoreNorm_(v.Programme)&&scoreNorm_(c.level)===scoreNorm_(v['Level/Set']);});
    if(matches.length!==1)return conflict('Course not found or ambiguous in this session/semester. Check programme and class.');
    row.courseRef=matches[0].ref;
    if(names[id]&&names[id]!==name)return conflict('This LecturerID already has a different name.');
    names[id]=name;
    const prior=seen[row.courseRef]||byCourse[row.courseRef];
    if(prior){if(scoreNorm_(prior.LecturerID)===id&&scoreNorm_(prior.LecturerName)===name){row.status='Skip';row.message='Exact duplicate';}else return conflict('This course already has a different responsible lecturer. No overwrite is allowed.');}
    seen[row.courseRef]=v;return row;
  });
  const counts={add:0,skip:0,conflict:0};rows.forEach(function(r){counts[r.status.toLowerCase()]++;});
  const revision=scoreHash_(JSON.stringify({ctx:ctx,existing:existing}));
  return {success:true,session:ctx.session,semester:ctx.semester,rows:rows,counts:counts,revision:revision};
}
function scoreLecturerCommit_(book,data){return scoreLock_(function(){
  const admin=scoreAdmin_(data.token),op=scoreText_(data.operationId);
  if(!/^[a-z0-9-]{20,80}$/i.test(op))throw new Error('Reopen the assignment preview and try again.');
  const hash=scoreHash_(JSON.stringify({semester:data.semester,rows:data.rows})),prior=scoreRead_(book,'ScoreLecturerImports').filter(function(r){return r.OperationID===op;})[0];
  if(prior){if(prior.PayloadHash!==hash)throw new Error('This retry differs from the original assignment import.');return {success:true,added:Number(prior.RowCount),replayed:true};}
  const plan=scoreLecturerPlan_(book,data);
  if(plan.counts.conflict)throw new Error('Resolve every conflict before confirming. No assignments were saved.');
  if(plan.revision!==data.revision)throw new Error('Assignments or courses changed. Preview the file again.');
  const adds=plan.rows.filter(function(r){return r.status==='Add';});if(!adds.length)return {success:true,added:0};
  const batch=Utilities.getUuid();scoreAppend_(book,'ScoreLecturerAssignments',adds.map(function(r){return [batch,r.values.LecturerID,r.values.LecturerName,r.courseRef,plan.session,plan.semester];}));SpreadsheetApp.flush();
  scoreAppend_(book,'ScoreLecturerImports',[[op,batch,hash,adds.length,new Date().toISOString(),admin.actor]]);SpreadsheetApp.flush();return {success:true,added:adds.length};
});}
function scoreExamMetadata_(ctx){
  const props=PropertiesService.getScriptProperties(),id=props.getProperty('EXAM_TRACKER_SPREADSHEET_ID')||props.getProperty('SUBMISSIONS_SHEET_ID');
  if(!id)return {available:false,rows:[],message:'Connect the existing exam submissions spreadsheet to enable paper tracking.'};
  try{
    const source=SpreadsheetApp.openById(id),sheet=source.getSheetByName('Submissions')||source.getSheets()[0],width=sheet.getLastColumn(),height=sheet.getLastRow();
    const headers=sheet.getRange(1,1,1,width).getValues()[0].map(String),required=['Course Code','Session','Semester'];
    if(required.some(function(k){return headers.indexOf(k)<0;}))throw new Error('Unsupported exam metadata headers');
    // Read metadata columns only, never question text, hashes or PIN columns.
    const keys=['Course Code','Session','Semester','Lecturer ID','LecturerID','Programme','Level/Set'],columns={};
    keys.forEach(function(k){const at=headers.indexOf(k);if(at>=0)columns[k]=height>1?sheet.getRange(2,at+1,height-1,1).getValues().map(function(r){return scoreText_(r[0]);}):[];});
    const semester=function(v){const n=scoreNorm_(v).replace(/\s+/g,'');return /^(1|first|firstsemester)$/.test(n)?'1':/^(2|second|secondsemester)$/.test(n)?'2':/^(3|third|thirdsemester)$/.test(n)?'3':n;};
    const rows=[];for(let i=0;i<height-1;i++){const row={};keys.forEach(function(k){row[k]=columns[k]?columns[k][i]:'';});if(row.Session===ctx.session&&semester(row.Semester)===ctx.semester)rows.push(row);}
    return {available:true,rows:rows,message:'Paper status matches course metadata. Older records without Lecturer IDs are labelled ID unverified; ambiguous courses need matching.'};
  }catch(_){return {available:false,rows:[],message:'Exam metadata is unavailable. Check the exam spreadsheet ID, headers and backend access. Score tracking remains available.'};}
}
function scoreAssignmentReport_(book,semester){
  const ctx=scoreAssignmentContext_(book,semester),assignments=scoreLecturerAssignments_(book).filter(function(r){return r.Session===ctx.session&&r.Semester===ctx.semester;}),subs=scoreRead_(book,'ScoreSubmissions'),events=scoreRead_(book,'ScoreHistory'),archived={};
  events.forEach(function(e){if(e.Action==='Archived')archived[e.SubmissionID]=true;});
  const lecturers=Object.create(null),papers=scoreExamMetadata_(ctx);
  const courses=ctx.courses.map(function(c){
    const a=assignments.filter(function(r){return r.CourseRef===c.ref;})[0],latest=subs.filter(function(s){return s.CourseRef===c.ref;}).sort(function(x,y){return Number(y.Version)-Number(x.Version);})[0];
    const status=latest&&!archived[latest.SubmissionID]?'Submitted':latest?'Reopened':'Outstanding';
    const candidates=papers.rows.filter(function(r){return scoreNorm_(r['Course Code'])===scoreNorm_(c.code)&&(!r.Programme||scoreNorm_(r.Programme)===scoreNorm_(c.programme))&&(!r['Level/Set']||scoreNorm_(r['Level/Set'])===scoreNorm_(c.level));});
    let paperStatus=papers.available?'Outstanding':'Not connected';
    if(candidates.length){const ambiguous=candidates.some(function(r){return !r.Programme&&!r['Level/Set']&&ctx.courses.filter(function(other){return scoreNorm_(other.code)===scoreNorm_(c.code);}).length>1;}),r=candidates[candidates.length-1],id=r['Lecturer ID']||r.LecturerID;paperStatus=ambiguous?'Needs matching':id&&a&&scoreNorm_(id)!==scoreNorm_(a.LecturerID)?'Lecturer ID needs review':id?'Submitted':'Submitted (ID unverified)';}
    if(a){const key=scoreNorm_(a.LecturerID);if(!lecturers[key])lecturers[key]={id:a.LecturerID,name:a.LecturerName,total:0,submitted:0,papersSubmitted:0};lecturers[key].total++;if(status==='Submitted')lecturers[key].submitted++;if(paperStatus.indexOf('Submitted')===0)lecturers[key].papersSubmitted++;}
    return {course:c,lecturerId:a?a.LecturerID:'',lecturerName:a?a.LecturerName:'',scoreStatus:status,submittedAt:latest?latest.SubmittedAt:'',paperStatus:paperStatus};
  });
  return {success:true,session:ctx.session,semester:ctx.semester,courses:courses,lecturers:Object.keys(lecturers).map(function(k){return lecturers[k];}),paperTrackingAvailable:papers.available,paperTrackingMessage:papers.message};
}
function scoreWorkspaceRoute_(book,data){
  if(data.action==='score.admin.settings')return {success:true,config:scoreConfig_(book)};
  if(data.action==='score.admin.settings.save')return scoreSettingsSave_(book,data);
  if(data.action==='score.admin.assignments.context')return Object.assign({success:true},scoreAssignmentContext_(book,data.semester));
  if(data.action==='score.admin.assignments.preview')return scoreLecturerPlan_(book,data);
  if(data.action==='score.admin.assignments.commit')return scoreLecturerCommit_(book,data);
  if(data.action==='score.admin.assignments.report')return scoreAssignmentReport_(book,data.semester);
  throw new Error('Unknown administrator workspace action.');
}
