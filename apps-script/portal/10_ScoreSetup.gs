/* Run these functions ONLY from the Apps Script editor as the project owner. */
function setupScoreMvp_() {
  scoreLock_(function(){
    const book=scoreBook_();
    Object.keys(SCORE_TABLES_).forEach(function(name){
      let sh=book.getSheetByName(name);
      if(sh&&sh.getLastRow()>0){scoreRead_(book,name);return;}
      if(!sh)sh=book.insertSheet(name);
      sh.getRange(1,1,1,SCORE_TABLES_[name].length).setValues([SCORE_TABLES_[name]]).setFontWeight('bold').setBackground('#1b2a4a').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      // Keep matric numbers, references, session labels and PIN hashes as text.
      sh.getRange(2,1,Math.max(sh.getMaxRows()-1,1),SCORE_TABLES_[name].length).setNumberFormat('@');
    });
    scoreConfig_(book); // Require the existing Config; never seed/overwrite it silently.
    if(typeof scoreEnsureClasses_==='function')scoreEnsureClasses_(book);
  });
}
function configureScoreAdmin_() {
  const p=PropertiesService.getScriptProperties(),key=p.getProperty('SCORE_ADMIN_KEY');
  if(!key||key.length<20||key.length>256)throw new Error('Set a private SCORE_ADMIN_KEY property of 20–256 characters first.');
  const salt=Utilities.getUuid();
  p.setProperty('SCORE_ADMIN_SALT',salt);
  p.setProperty('SCORE_ADMIN_HASH',scoreHash_(salt+'|'+key));
  p.deleteProperty('SCORE_ADMIN_KEY');
  // No key, hash or salt is logged. Changing the key invalidates existing sessions.
}
function seedScoreDemo_() {
  scoreLock_(function(){
    const b=scoreBook_(),cfg=scoreConfig_(b);
    if(scoreRead_(b,'ScoreCourses').length||scoreRead_(b,'ScoreStudents').length||scoreRead_(b,'ScoreRegistrations').length||scoreRead_(b,'ScoreSubmissions').length)throw new Error('Demo seed requires empty Score tables. It will not overwrite your data.');
    scoreAppend_(b,'ScoreCourses',[['DEMO001','DEMO101','Demonstration Course',2,cfg.session,'1','DEMO','Test Class']]);
    scoreAppend_(b,'ScoreStudents',[
      ['DEMO-S001','DEMO/001','','Sample Student One','DEMO','Test Class','Active'],
      ['DEMO-S002','DEMO/002','','Sample Student Two','DEMO','Test Class','Active'],
      ['DEMO-S003','DEMO/003','','Sample Student Three','DEMO','Test Class','Active']
    ]);
    scoreAppend_(b,'ScoreRegistrations',[['DEMO001','DEMO-S001','Regular'],['DEMO001','DEMO-S002','Regular'],['DEMO001','DEMO-S003','Regular']]);
    if(typeof scoreEnsureClasses_==='function'){
      scoreEnsureClasses_(b);
      const c=scoreRead_(b,'ScoreClasses').filter(function(c){return c.Session===cfg.session&&c.Programme==='DEMO'&&c['Level/Set']==='Test Class';})[0];
      scoreAppend_(b,'ScoreClassEnrolments',['DEMO-S001','DEMO-S002','DEMO-S003'].map(function(ref){return [c.ClassRef,ref];}));
    }
  });
}
function importScoreTemplate_() {
  scoreLock_(function(){
    const p=PropertiesService.getScriptProperties(),id=p.getProperty('SCORE_IMPORT_SPREADSHEET_ID');
    if(!id)throw new Error('Upload the completed template as a separate Google spreadsheet and set SCORE_IMPORT_SPREADSHEET_ID.');
    const target=scoreBook_(),source=SpreadsheetApp.openById(id);
    if(source.getId()===target.getId())throw new Error('The import source must be a separate spreadsheet.');
    // Deliberately first-import only. Never erase an existing catalogue or submission.
    ['ScoreCourses','ScoreStudents','ScoreRegistrations','ScoreSubmissions'].forEach(function(n){if(scoreRead_(target,n).length)throw new Error('First-import only: '+n+' must be empty. Existing data has not been changed.');});
    const names={Courses:'ScoreCourses',Students:'ScoreStudents',Registrations:'ScoreRegistrations'},input={};
    Object.keys(names).forEach(function(n){
      const sh=source.getSheetByName(n);if(!sh)throw new Error('Missing template tab: '+n);
      const vals=sh.getDataRange().getValues(),head=vals.shift()||[],expected=SCORE_TABLES_[names[n]];
      if(head.length!==expected.length||expected.some(function(h,i){return h!==head[i];}))throw new Error('Template headers do not match: '+n);
      input[n]=vals.filter(function(r){return r.some(function(v){return scoreText_(v)!=='';});}).map(function(r){const obj={};expected.forEach(function(h,i){obj[h]=scoreText_(r[i]);});return obj;});
    });
    if(!input.Courses.length||!input.Students.length||!input.Registrations.length)throw new Error('Fill all three template tabs before importing.');
    const courses=Object.create(null),students=Object.create(null),mats=Object.create(null),admissions=Object.create(null),pairs=Object.create(null);
    input.Courses.forEach(function(c){
      if(!/^[A-Za-z0-9_-]{1,100}$/.test(c.CourseRef)||courses[c.CourseRef])throw new Error('Missing/duplicate/invalid CourseRef. Use 1–100 letters, numbers, hyphens or underscores.');
      if(!c.CourseCode||!c.Title||!c.Session||!c.Programme||!c['Level/Set']||!['1','2','3'].includes(c.Semester)||!Number.isFinite(Number(c.Units))||Number(c.Units)<=0)throw new Error('Incomplete course: '+c.CourseRef);
      courses[c.CourseRef]=true;
    });
    input.Students.forEach(function(s){
      if(!/^[A-Za-z0-9_-]{1,100}$/.test(s.StudentRef)||students[s.StudentRef]||!s.Name||!s.Programme||!s['Level/Set']||!['Active','Inactive','Withdrawn','Graduated'].includes(s.Status))throw new Error('Missing/duplicate/invalid student: '+s.StudentRef);
      if(s.MatNo&&mats[s.MatNo])throw new Error('Duplicate MatNo.');if(s.AdmissionNo&&admissions[s.AdmissionNo])throw new Error('Duplicate AdmissionNo.');
      students[s.StudentRef]=true;if(s.MatNo)mats[s.MatNo]=true;if(s.AdmissionNo)admissions[s.AdmissionNo]=true;
    });
    input.Registrations.forEach(function(r){const key=r.CourseRef+'|'+r.StudentRef;
      if(!courses[r.CourseRef]||!students[r.StudentRef]||pairs[key]||!['Regular','Carry-over','Additional'].includes(r.RegistrationType))throw new Error('Missing reference, duplicate or invalid registration: '+key);pairs[key]=true;
    });
    // Validate every input first. On a service write failure, partial imported rows
    // must be reviewed by the owner; this function refuses to overwrite them on retry.
    Object.keys(names).forEach(function(n){const headers=SCORE_TABLES_[names[n]];scoreAppend_(target,names[n],input[n].map(function(obj){return headers.map(function(h){return obj[h];});}));});
    SpreadsheetApp.flush();
  });
}
