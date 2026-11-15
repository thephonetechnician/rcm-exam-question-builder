/* Bulk assignment correction. Change rows become visible only after the final
 * batch commit marker is written. No student master or score rows are deleted. */
function scoreBatchCorrectionRows_(book){
  if(!book.getSheetByName('ScoreAssignmentBatches'))return [];
  const batches=scoreRead_(book,'ScoreAssignmentBatches');if(!batches.length)return [];
  const changes=scoreRead_(book,'ScoreAssignmentChanges'),out=[];
  batches.forEach(function(b){
    const rows=changes.filter(function(c){return c.BatchID===b.BatchID;});
    if(rows.length!==Number(b.ChangeCount))throw new Error('Assignment history is incomplete. Contact the administrator.');
    rows.forEach(function(c){out.push({OperationID:b.OperationID,Timestamp:b.Timestamp,ClassRef:c.ClassRef,Kind:c.Kind,EntityRef:c.EntityRef,Action:c.Action,Actor:b.Actor,Reason:b.Reason,Mode:b.Mode});});
  });return out;
}
function scoreBatchAssignments_(book,data){
  return scoreLock_(function(){
    const admin=scoreAdmin_(data.token),source=scoreClass_(book,scoreText_(data.classRef),true),mode=data.mode,kind=data.kind,operation=scoreText_(data.operationId),reason=scoreText_(data.reason);
    if(!['remove','transfer'].includes(mode)||!['students','courses'].includes(kind)||mode==='transfer'&&kind!=='students')throw new Error('Choose bulk removal or a student class transfer.');
    if(!Array.isArray(data.refs)||!data.refs.length||data.refs.length>1000||data.refs.some(function(r){return typeof r!=='string'||!r||r.length>100;})||new Set(data.refs).size!==data.refs.length)throw new Error('Select 1–1,000 distinct active records.');
    if(reason.length<5||reason.length>500||!/^[a-z0-9-]{20,80}$/i.test(operation))throw new Error('Enter a correction reason of 5–500 characters.');
    const refs=data.refs.slice().sort(),target=mode==='transfer'?scoreClass_(book,scoreText_(data.targetClassRef),true):null;
    if(target&&(target.ClassRef===source.ClassRef||target.Session!==source.Session))throw new Error('Choose a different class in the same active session. This is a correction, not promotion.');
    const payloadHash=scoreHash_(JSON.stringify({classRef:source.ClassRef,kind:kind,mode:mode,target:target?target.ClassRef:'',refs:refs,reason:reason}));
    const batches=scoreRead_(book,'ScoreAssignmentBatches'),previous=batches.filter(function(b){return b.OperationID===operation;})[0];
    if(previous){if(previous.PayloadHash!==payloadHash)throw new Error('This retry differs from the original batch. Reopen the correction dialog.');return {success:true,changed:refs.length,replayed:true};}
    const events=scoreCorrectionRows_(book),enrolments=scoreEnrolments_(book,events),courses=scoreClassCourses_(book,source),courseRefs=courses.map(function(c){return c.CourseRef;}),submissions=scoreRead_(book,'ScoreSubmissions');
    const allowed=kind==='courses'?courseRefs:enrolments.filter(function(e){return e.ClassRef===source.ClassRef;}).map(function(e){return e.StudentRef;});
    for(const ref of refs){if(!allowed.includes(ref)||scoreAssignmentRemoved_(book,kind,source.ClassRef,ref,events))throw new Error('At least one selection is no longer active in the source class. Refresh and select again.');}
    if(submissions.some(function(s){return kind==='courses'?refs.includes(s.CourseRef):courseRefs.includes(s.CourseRef);}))throw new Error('Submitted score sheets exist in the source selection/class. No selected assignments were changed.');
    if(target){
      const targetCourses=scoreClassCourses_(book,target).map(function(c){return c.CourseRef;});
      if(submissions.some(function(s){return targetCourses.includes(s.CourseRef);}))throw new Error('The destination class has submitted score sheets. No students were transferred.');
      const students=scoreRead_(book,'ScoreStudents');
      for(const ref of refs){
        const match=students.filter(function(s){return s.StudentRef===ref;});
        if(match.length!==1||scoreText_(match[0].Status)!=='Active')throw new Error('Every transferred student must have one Active master record.');
        if(enrolments.some(function(e){return e.ClassRef===target.ClassRef&&e.StudentRef===ref;})&&!scoreAssignmentRemoved_(book,'students',target.ClassRef,ref,events))throw new Error('A selected student already belongs to the destination class. No students were transferred.');
      }
    }
    const batch=Utilities.getUuid(),rows=[];
    refs.forEach(function(ref){rows.push([batch,kind,source.ClassRef,ref,'Remove']);if(target)rows.push([batch,'students',target.ClassRef,ref,'Restore']);});
    scoreAppend_(book,'ScoreAssignmentChanges',rows);SpreadsheetApp.flush();
    scoreAppend_(book,'ScoreAssignmentBatches',[[operation,batch,scoreCorrectionTime_(events),admin.actor,reason,payloadHash,rows.length,mode]]);SpreadsheetApp.flush();
    return {success:true,changed:refs.length};
  });
}
