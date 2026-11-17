/* Lecturer directory imports use commit markers: incomplete batches stay invisible. */
function scoreLecturerDirectory_(book){
  const people=Object.create(null);
  scoreLecturerAssignments_(book).forEach(function(r){const key=scoreNorm_(r.LecturerID);if(people[key]&&scoreNorm_(people[key].name)!==scoreNorm_(r.LecturerName))throw new Error('Existing assignments have conflicting names for LecturerID '+r.LecturerID+'. Resolve this before importing lecturers.');people[key]={id:r.LecturerID,name:r.LecturerName,email:''};});
  const changes=book.getSheetByName('ScoreDirectoryRows')?scoreRead_(book,'ScoreDirectoryRows'):[],commits=book.getSheetByName('ScoreDirectoryImports')?scoreRead_(book,'ScoreDirectoryImports'):[];
  commits.forEach(function(c){const rows=changes.filter(function(r){return r.BatchID===c.BatchID;});if(rows.length!==Number(c.RowCount))throw new Error('Lecturer directory history is incomplete. Contact the administrator.');rows.forEach(function(r){people[scoreNorm_(r.LecturerID)]={id:r.LecturerID,name:r.LecturerName,email:r.Email};});});
  return Object.keys(people).map(function(k){return people[k];}).sort(function(a,b){return a.id.localeCompare(b.id,undefined,{numeric:true});});
}
function scoreDirectoryPlan_(book,data){
  const directory=scoreLecturerDirectory_(book),known=Object.create(null),seen=Object.create(null);directory.forEach(function(p){known[scoreNorm_(p.id)]=p;});
  if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>1000)throw new Error('Upload 1–1,000 lecturer rows.');
  const rows=data.rows.map(function(raw,i){const v={LecturerID:scoreText_(raw.LecturerID),LecturerName:scoreText_(raw.LecturerName),Email:scoreText_(raw.Email)},r={row:Number(raw._row)||i+2,values:v,status:'Add',message:'Register lecturer'},key=scoreNorm_(v.LecturerID),prior=seen[key]||known[key];
    function conflict(message){r.status='Conflict';r.message=message;return r;}
    if(!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(v.LecturerID)||v.LecturerName.length<2||v.LecturerName.length>150)return conflict('Enter a unique LecturerID and a full name (2–150 characters).');
    if(v.Email&&(v.Email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.Email)))return conflict('Enter a valid email address or leave Email blank.');
    if(seen[key]&&scoreNorm_(seen[key].email)!==scoreNorm_(v.Email))return conflict('This file repeats a LecturerID with different email details. Keep one row per lecturer.');
    if(prior){if(scoreNorm_(prior.name)!==scoreNorm_(v.LecturerName)||v.Email&&prior.email&&scoreNorm_(prior.email)!==scoreNorm_(v.Email))return conflict('This LecturerID already belongs to different lecturer details.');if(v.Email&&!prior.email&&!seen[key]){r.message='Add email to existing lecturer';}else{r.status='Skip';r.message='Already registered';}}
    seen[key]={id:v.LecturerID,name:v.LecturerName,email:v.Email||prior&&prior.email||''};return r;
  });const counts={add:0,skip:0,conflict:0};rows.forEach(function(r){counts[r.status.toLowerCase()]++;});return {success:true,rows:rows,counts:counts,revision:scoreHash_(JSON.stringify(directory))};
}
function scoreDirectoryCommit_(book,data){return scoreLock_(function(){
  const admin=scoreAdmin_(data.token),op=scoreText_(data.operationId);if(!/^[a-z0-9-]{20,80}$/i.test(op))throw new Error('Preview the lecturers again.');
  const hash=scoreHash_(JSON.stringify(data.rows)),prior=scoreRead_(book,'ScoreDirectoryImports').filter(function(r){return r.OperationID===op;})[0];
  if(prior){if(prior.PayloadHash!==hash)throw new Error('This retry differs from the original lecturer import.');return {success:true,added:Number(prior.RowCount),replayed:true};}
  const plan=scoreDirectoryPlan_(book,data);if(plan.counts.conflict)throw new Error('Resolve every lecturer conflict. Nothing was saved.');if(plan.revision!==data.revision)throw new Error('The lecturer directory changed. Preview again.');
  const adds=plan.rows.filter(function(r){return r.status==='Add';});if(!adds.length)return {success:true,added:0};const batch=Utilities.getUuid();
  scoreAppend_(book,'ScoreDirectoryRows',adds.map(function(r){return [batch,r.values.LecturerID,r.values.LecturerName,r.values.Email];}));SpreadsheetApp.flush();
  scoreAppend_(book,'ScoreDirectoryImports',[[op,batch,hash,adds.length,new Date().toISOString(),admin.actor]]);SpreadsheetApp.flush();return {success:true,added:adds.length};
});}
function scoreDirectoryRoute_(book,data){
  if(data.action==='score.admin.lecturers.list')return {success:true,lecturers:scoreLecturerDirectory_(book)};
  if(data.action==='score.admin.lecturers.preview')return scoreDirectoryPlan_(book,data);
  if(data.action==='score.admin.lecturers.commit')return scoreDirectoryCommit_(book,data);
  throw new Error('Unknown lecturer directory action.');
}
