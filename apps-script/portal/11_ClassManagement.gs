/* Class-based administration. Every route requires the score administrator token. */
function scoreNorm_(v){return scoreText_(v).toLowerCase().replace(/\s+/g,' ');}
function scoreClassKey_(session,programme,level){return [session,programme,level].map(scoreNorm_).join('|');}
function scoreEnsureClasses_(book){
  const existing=scoreRead_(book,'ScoreClasses'),keys=Object.create(null),rows=[];
  existing.forEach(function(c){keys[scoreClassKey_(c.Session,c.Programme,c['Level/Set'])]=true;});
  scoreRead_(book,'ScoreCourses').forEach(function(c){const key=scoreClassKey_(c.Session,c.Programme,c['Level/Set']);if(!keys[key]){rows.push(['CL_'+scoreHash_(key).slice(0,24),c.Session,c.Programme,c['Level/Set']]);keys[key]=true;}});
  scoreAppend_(book,'ScoreClasses',rows);
}
function scoreClass_(book,ref,write){
  const rows=scoreRead_(book,'ScoreClasses').filter(function(c){return c.ClassRef===ref;});
  if(rows.length!==1)throw new Error('Class not found or duplicated. Refresh the class list.');
  const c=rows[0];
  if(write&&c.Session!==scoreConfig_(book).session)throw new Error('Only the active session can be changed. Historical classes are read-only.');
  return c;
}
function scoreClassCourses_(book,c){const key=scoreClassKey_(c.Session,c.Programme,c['Level/Set']);return scoreRead_(book,'ScoreCourses').filter(function(r){return scoreClassKey_(r.Session,r.Programme,r['Level/Set'])===key;});}
function scoreClasses_(book){
  const classes=scoreRead_(book,'ScoreClasses'),enrolments=scoreRead_(book,'ScoreClassEnrolments'),courses=scoreRead_(book,'ScoreCourses'),session=scoreConfig_(book).session;
  return {success:true,session:session,classes:classes.map(function(c){return {ref:c.ClassRef,session:c.Session,programme:c.Programme,level:c['Level/Set'],editable:c.Session===session,studentCount:enrolments.filter(function(e){return e.ClassRef===c.ClassRef;}).length,courseCount:courses.filter(function(r){return scoreClassKey_(r.Session,r.Programme,r['Level/Set'])===scoreClassKey_(c.Session,c.Programme,c['Level/Set']);}).length};})};
}
function scoreClassDetails_(book,ref){
  const c=scoreClass_(book,ref,false),students=scoreRead_(book,'ScoreStudents'),enrolments=scoreRead_(book,'ScoreClassEnrolments').filter(function(e){return e.ClassRef===ref;});
  return {success:true,classInfo:{ref:c.ClassRef,session:c.Session,programme:c.Programme,level:c['Level/Set'],editable:c.Session===scoreConfig_(book).session},courses:scoreClassCourses_(book,c).map(scoreCourseObject_),students:enrolments.map(function(e){const s=students.filter(function(r){return r.StudentRef===e.StudentRef;})[0];if(!s)throw new Error('A class enrolment points to a missing student.');return {ref:s.StudentRef,name:s.Name,matNo:s.MatNo,admissionNo:s.AdmissionNo,status:s.Status};})};
}
function scoreCreateClass_(book,data){
  return scoreLock_(function(){
    scoreAdmin_(data.token);
    const session=scoreConfig_(book).session,programme=scoreText_(data.programme).replace(/\s+/g,' '),level=scoreText_(data.level).replace(/\s+/g,' ');
    if(!programme||programme.length>100||!level||level.length>100)throw new Error('Enter a programme and level/set (up to 100 characters each).');
    if(data.session!==session)throw new Error('Select the active academic session.');
    const key=scoreClassKey_(session,programme,level),found=scoreRead_(book,'ScoreClasses').filter(function(c){return scoreClassKey_(c.Session,c.Programme,c['Level/Set'])===key;});
    if(found.length>1)throw new Error('Duplicate class records need administrator review.');
    if(found[0])return {success:true,classRef:found[0].ClassRef,existing:true};
    const ref='CL_'+scoreHash_(key).slice(0,24);scoreAppend_(book,'ScoreClasses',[[ref,session,programme,level]]);SpreadsheetApp.flush();return {success:true,classRef:ref};
  });
}
function scoreImportPlan_(book,data){
  const c=scoreClass_(book,scoreText_(data.classRef),true),kind=data.kind;
  if(kind!=='courses'&&kind!=='students')throw new Error('Select courses or students.');
  if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>1000)throw new Error('Import between 1 and 1,000 rows at a time.');
  const semester=scoreText_(data.semester);
  if(kind==='courses'&&!['1','2','3'].includes(semester))throw new Error('Select semester 1, 2 or 3.');
  const existing=kind==='courses'?scoreClassCourses_(book,c):scoreRead_(book,'ScoreStudents');
  const enrolments=scoreRead_(book,'ScoreClassEnrolments'),seen=Object.create(null),plan=[];
  data.rows.forEach(function(raw,index){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid import row.');
    const row=kind==='courses'?{CourseCode:scoreText_(raw.CourseCode).replace(/\s+/g,' '),Title:scoreText_(raw.Title),Units:scoreText_(raw.Units)}:{Name:scoreText_(raw.Name).replace(/\s+/g,' '),MatNo:scoreText_(raw.MatNo),AdmissionNo:scoreText_(raw.AdmissionNo)};
    if(Object.values(row).some(function(v){return v.length>250;}))throw new Error('Import fields must be 250 characters or fewer.');
    const result={row:Number.isInteger(raw._row)&&raw._row>=2&&raw._row<=1048576?raw._row:index+2,status:'Add',message:'',values:row};
    if(kind==='courses'){
      if(!row.CourseCode||!row.Title||!row.Units||!Number.isFinite(Number(row.Units))||Number(row.Units)<=0||Number(row.Units)>30){result.status='Conflict';result.message='Course code, title and units (greater than 0, up to 30) are required.';}
      const key=scoreNorm_(row.CourseCode)+'|'+semester,signature=JSON.stringify([scoreNorm_(row.Title),Number(row.Units)]);
      if(result.status!=='Conflict'&&seen[key]){result.status=seen[key]===signature?'Skip':'Conflict';result.message=result.status==='Skip'?'Exact duplicate within this upload.':'Conflicting course rows in this upload.';}
      seen[key]=signature;
      const found=existing.filter(function(r){return scoreNorm_(r.CourseCode)===scoreNorm_(row.CourseCode)&&scoreText_(r.Semester)===semester;});
      if(result.status==='Add'&&found.length){if(found.length===1&&scoreNorm_(found[0].Title)===scoreNorm_(row.Title)&&Number(found[0].Units)===Number(row.Units)){result.status='Skip';result.message='Course already exists unchanged.';}else{result.status='Conflict';result.message='Existing course details differ. Nothing will be overwritten.';}}
      result.ref='C_'+scoreHash_(c.ClassRef+'|'+key).slice(0,24);
    }else{
      if(!row.Name||(!row.MatNo&&!row.AdmissionNo)){result.status='Conflict';result.message='Student name and either matric number or admission number are required.';}
      const key=row.MatNo?'mat:'+scoreNorm_(row.MatNo):'adm:'+scoreNorm_(row.AdmissionNo),signature=JSON.stringify([scoreNorm_(row.Name),scoreNorm_(row.MatNo),scoreNorm_(row.AdmissionNo)]);
      if(result.status!=='Conflict'&&seen[key]){result.status=seen[key]===signature?'Skip':'Conflict';result.message=result.status==='Skip'?'Exact duplicate within this upload.':'Conflicting student rows in this upload.';}
      seen[key]=signature;
      // Cross-check both identifiers so two different students cannot be merged.
      const found=existing.filter(function(s){return (row.MatNo&&scoreNorm_(s.MatNo)===scoreNorm_(row.MatNo))||(row.AdmissionNo&&scoreNorm_(s.AdmissionNo)===scoreNorm_(row.AdmissionNo));});
      if(result.status==='Add'&&found.length){
        if(found.length!==1||scoreNorm_(found[0].Name)!==scoreNorm_(row.Name)||(row.MatNo&&scoreNorm_(row.MatNo)!==scoreNorm_(found[0].MatNo))||(row.AdmissionNo&&scoreNorm_(row.AdmissionNo)!==scoreNorm_(found[0].AdmissionNo))){result.status='Conflict';result.message='An existing student identity differs. Review it before importing.';}
        else if(scoreText_(found[0].Status)!=='Active'){result.status='Conflict';result.message='The existing student is not Active. Review the student record first.';}
        else {result.ref=found[0].StudentRef;result.newStudent=false;if(enrolments.some(function(e){return e.ClassRef===c.ClassRef&&e.StudentRef===result.ref;})){result.status='Skip';result.message='Student already enrolled in this class.';}else result.message='Enrol existing student in this session/class; keep the master record unchanged.';}
      }
      if(!result.ref){result.ref='S_'+scoreHash_(key).slice(0,24);result.newStudent=true;}
      // Catch admission-number-only duplicates crossing matric-based rows in the same file.
      for(let prior=0;prior<plan.length;prior++){
        const p=plan[prior].values;
        if(result.status==='Add'&&((row.MatNo&&p.MatNo&&scoreNorm_(row.MatNo)===scoreNorm_(p.MatNo))||(row.AdmissionNo&&p.AdmissionNo&&scoreNorm_(row.AdmissionNo)===scoreNorm_(p.AdmissionNo)))){
          result.status=JSON.stringify(row)===JSON.stringify(p)?'Skip':'Conflict';result.message=result.status==='Skip'?'Exact duplicate within this upload.':'Conflicting identifiers within this upload.';
        }
      }
    }
    plan.push(result);
  });
  const counts={add:0,skip:0,conflict:0};plan.forEach(function(r){counts[r.status.toLowerCase()]++;});
  return {success:true,classInfo:{ref:c.ClassRef,session:c.Session,programme:c.Programme,level:c['Level/Set']},kind:kind,semester:kind==='courses'?semester:'',rows:plan,counts:counts,revision:scoreHash_(JSON.stringify({classRef:c.ClassRef,kind:kind,semester:kind==='courses'?semester:'',plan:plan}))};
}
function scoreCommitImport_(book,data){
  return scoreLock_(function(){
    scoreAdmin_(data.token);const plan=scoreImportPlan_(book,data);
    if(plan.counts.conflict)throw new Error('Resolve every conflicting row before saving. No import rows were written.');
    if(plan.revision!==data.revision)throw new Error('The class data changed after preview. Preview this import again.');
    const c=plan.classInfo,add=plan.rows.filter(function(r){return r.status==='Add';});
    if(plan.kind==='courses')scoreAppend_(book,'ScoreCourses',add.map(function(r){return [r.ref,r.values.CourseCode,r.values.Title,Number(r.values.Units),c.session,plan.semester,c.programme,c.level];}));
    else{
      scoreAppend_(book,'ScoreStudents',add.filter(function(r){return r.newStudent;}).map(function(r){return [r.ref,r.values.MatNo,r.values.AdmissionNo,r.values.Name,c.programme,c.level,'Active'];}));
      SpreadsheetApp.flush();
      scoreAppend_(book,'ScoreClassEnrolments',add.map(function(r){return [c.ref,r.ref];}));
    }
    SpreadsheetApp.flush();return {success:true,added:add.length,skipped:plan.counts.skip};
  });
}
function scoreValidateAdditions_(book,rows,registered){
  if(!Array.isArray(rows)||rows.length>100)throw new Error('Add at most 100 students manually per score sheet.');
  const refs=Object.create(null),mats=Object.create(null),master=scoreRead_(book,'ScoreStudents');
  registered.forEach(function(s){refs[s.ref]=true;if(s.matNo)mats[scoreNorm_(s.matNo)]=true;});
  return rows.map(function(r){
    if(!r||typeof r!=='object')throw new Error('Invalid added student.');
    const ref=scoreText_(r.ref),mat=scoreText_(r.matNo),name=scoreText_(r.name),reason=scoreText_(r.reason),type=scoreText_(r.registrationType);
    if(!/^M_[a-f0-9-]{20,70}$/i.test(ref)||refs[ref]||!mat||mat.length>100||!name||name.length>150||reason.length<5||reason.length>500||!['Regular','Carry-over','Additional'].includes(type))throw new Error('Added students need a unique reference, name, matric number, registration type and reason (5–500 characters).');
    if(mats[scoreNorm_(mat)])throw new Error('Duplicate matric number in the score sheet: '+mat);
    const found=master.filter(function(s){return scoreNorm_(s.MatNo)===scoreNorm_(mat);});
    if(found.length>1||found[0]&&scoreNorm_(found[0].Name)!==scoreNorm_(name))throw new Error('Added student details conflict with an existing student: '+mat);
    if(found[0]&&scoreText_(found[0].Status)!=='Active')throw new Error('This student is not Active. Contact the administrator: '+mat);
    refs[ref]=true;mats[scoreNorm_(mat)]=true;
    return {ref:ref,matNo:mat,name:found[0]?found[0].Name:name,registrationType:type,reason:reason,source:'Lecturer added'};
  });
}
function scoreClassRoute_(book,data){
  switch(data.action){
    case 'score.admin.classes':return scoreClasses_(book);
    case 'score.admin.class.create':return scoreCreateClass_(book,data);
    case 'score.admin.class.details':return scoreClassDetails_(book,scoreText_(data.classRef));
    case 'score.admin.import.preview':return scoreImportPlan_(book,data);
    case 'score.admin.import.commit':return scoreCommitImport_(book,data);
    default:throw new Error('Unknown class administration action.');
  }
}
