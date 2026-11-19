(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let coursePage=1,loadingRef='';const pageSize=6;let courses = [], current, snapshot, pending, dirty = false, submitting = false, seq = 0;
  let verified=false,needsReload=false;const courseCache=window.ScoreCourseCache.create(ref=>window.ScoreAPI.request({action:'score.course',courseRef:ref},{background:true}));
  const fields = new Map(),manualStudents=new Map();
  const tell = text => { $('score-message').textContent = text; $('score-message').hidden = !text; };
  function downloadFeedback(text, success=false) {
    $('download-feedback').textContent=text; $('download-feedback').hidden=!text;
    $('download-feedback').classList.toggle('success',success);
  }
  function hidePin() {
    $('download-pin').type='password';$('toggle-download-pin').textContent='Show PIN';$('toggle-download-pin').setAttribute('aria-pressed','false');
  }
  const meta = c => `${c.programme} · ${c.level} · ${c.session} · Semester ${c.semester} · ${c.units} units`;
  async function busy(button, label, fn) {
    const original = button.textContent; button.disabled = true; button.textContent = label;
    try { await fn(); } catch (error) { tell(error.message); } finally { button.disabled = false; button.textContent = original; }
  }
  function choices() {
    const term = $('course-search').value.trim().toLowerCase();
    const found = courses.filter(c => (!$('course-programme').value||c.programme===$('course-programme').value)&&(!$('course-level').value||c.level===$('course-level').value)&& [c.code,c.title,c.programme,c.level,c.session,c.semester].join(' ').toLowerCase().includes(term));
    const pages=Math.max(1,Math.ceil(found.length/pageSize));coursePage=Math.min(coursePage,pages);const offset=(coursePage-1)*pageSize;$('course-pagination').hidden=found.length<=pageSize;$('course-previous').disabled=coursePage===1;$('course-next').disabled=coursePage===pages;$('course-page-status').textContent=`Page ${coursePage} of ${pages}`;
    $('catalogue-status').textContent = courses.length ? `${found.length} matching course${found.length === 1 ? '' : 's'}${found.length?' · Showing '+(offset+1)+'–'+Math.min(offset+pageSize,found.length):' · Try another search or filter'}` : 'No courses are loaded yet. The administrator must import course and student data first.';
    $('score-course-list').replaceChildren(...found.slice(offset,offset+pageSize).map(c => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'score-course-choice'; button.setAttribute('aria-pressed', String(current?.course.ref === c.ref));
      const badge = document.createElement('span'); badge.className = 'badge ' + (c.locked ? '' : 'ready'); badge.textContent = c.locked ? 'Submitted · Locked' : 'Score entry';
      if(loadingRef===c.ref){button.disabled=true;button.setAttribute('aria-busy','true');badge.textContent='Loading score sheet…';const spinner=document.createElement('span');spinner.className='activity-spinner';spinner.setAttribute('aria-hidden','true');badge.prepend(spinner);}
      const code = document.createElement('span'); code.className = 'course-code'; code.textContent = c.code;
      const title = document.createElement('strong'); title.textContent = c.title;
      const details = document.createElement('small'); details.textContent = meta(c);
      button.append(badge, code, title, details); button.addEventListener('click', () => loadCourse(c.ref)); return button;
    }));
  }
  async function catalogue() {
    const data = await window.ScoreAPI.request({action:'score.catalogue'}); courses = data.courses;for(const [id,key,label] of [['course-programme','programme','All programmes'],['course-level','level','All classes']]){const select=$(id),old=select.value;select.replaceChildren(new Option(label,''),...Array.from(new Set(courses.map(c=>c[key]))).sort().map(v=>new Option(v,v)));if(Array.from(select.options).some(o=>o.value===old))select.value=old;}
    $('score-session').textContent = data.config.session;
    if (!data.config.open) tell('Score submission is currently closed. Submitted score sheets can still be downloaded with the correct PIN.');
    choices();
  }
  function updateProgress() {
    let completed = 0,blank=0;
    for (const item of fields.values()) {
      const partial=(item.ca.value==='')!==(item.exam.value==='');item.ca.setCustomValidity(partial?'Enter both CA and exam, or leave both blank.':'');item.exam.setCustomValidity(partial?'Enter both CA and exam, or leave both blank.':'');if(item.ca.value===''&&item.exam.value==='')blank++;const filled = item.ca.value !== '' && item.exam.value !== '' && item.ca.validity.valid && item.exam.validity.valid;
      item.total.textContent = filled ? String(Math.round((Number(item.ca.value)+Number(item.exam.value))*100)/100) : '—';
      if (filled) completed++;
    }
    $('entry-progress').textContent = `${completed} scored · ${blank} with no scores entered · ${fields.size} students`;
  }
  function orderRows(){
    current.students.sort(window.ScoreOrder.compare);
    current.students.forEach((s,index)=>{const row=fields.get(s.ref).row;row.cells[0].textContent=String(index+1);$('score-rows').append(row);});
  }
  function showEntry() {
    const {config,students} = current;
    fields.clear();manualStudents.clear(); $('score-entry-form').reset();
    const lecturer=$('score-lecturer'),assigned=current.assignedLecturer;
    lecturer.value=assigned?assigned.name:'';lecturer.readOnly=Boolean(assigned);lecturer.required=!assigned;
    $('score-lecturer-help').textContent=assigned?'Assigned by the administrator. This name will appear on the submitted score sheet.':'No lecturer is assigned to this course. Enter your full name.';
    $('ca-heading').textContent = `CA / ${config.caMax}`; $('exam-heading').textContent = `Exam / ${config.examMax}`;
    $('score-limits').textContent = `CA: 0–${config.caMax}. Examination: 0–${config.examMax}. Leave both CA and exam blank for a student not offering this course. Enter both scores for everyone else. Blank scores are not zero.`;
    // A date string uses the college timezone, not the browser's device timezone.
    $('score-date').max = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    $('score-rows').replaceChildren(...students.map(scoreRow));
    $('open-add-student').disabled=!config.open;
    $('review-scores').disabled = !config.open;
    $('review-scores').textContent = config.open ? 'Preview score sheet →' : 'Submission is closed';
    updateProgress();
  }
  function scoreRow(s,i) {
      const config=current.config;
      const tr = document.createElement('tr');
      for (const value of [i+1,s.matNo||s.ref,s.name]) { const td=document.createElement('td'); td.textContent=value; tr.append(td); }
      if(s.source==='Lecturer added'){
        const flag=document.createElement('small'),remove=document.createElement('button');flag.className='lecturer-added';flag.textContent='Lecturer added · '+s.registrationType;
        remove.type='button';remove.className='remove-added';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+s.name);
        remove.addEventListener('click',()=>{if(submitting)return;current.students=current.students.filter(student=>student.ref!==s.ref);manualStudents.delete(s.ref);fields.delete(s.ref);tr.remove();Array.from($('score-rows').rows).forEach((row,index)=>row.cells[0].textContent=String(index+1));dirty=true;pending=null;updateProgress();});
        tr.cells[2].append(flag,remove);
      }
      const inputs = {};
      for (const [key,max] of [['ca',config.caMax],['exam',config.examMax]]) {
        const td=document.createElement('td'), input=document.createElement('input');
        input.type='number'; input.inputMode='decimal'; input.min='0'; input.max=String(max); input.step='0.01'; input.required=false; input.placeholder=' '; input.setAttribute('aria-label',`${key === 'ca' ? 'CA' : 'Exam'} for ${s.name}`);
        input.addEventListener('input',()=>{dirty=true;pending=null;updateProgress();}); td.append(input); tr.append(td); inputs[key]=input;
      }
      const total=document.createElement('td'); total.className='score-total'; total.textContent='—';tr.append(total); fields.set(s.ref,{...inputs,total,row:tr}); return tr;
  }
  function displayCourse(data){      current=data; dirty=false; pending=null; snapshot=null; fields.clear();manualStudents.clear();
      $('selected-course').hidden=false; $('selected-code').textContent=data.course.code;
      $('selected-title').textContent=data.course.title; $('selected-meta').textContent=meta(data.course);
      $('course-state').textContent=data.locked?'Submitted · Locked':'Ready for score entry';
      $('score-entry-form').hidden=data.locked; $('locked-course').hidden=!data.locked; $('download-actions').hidden=true; $('download-form').hidden=false; $('download-form').reset();
      $('locked-detail').textContent='Use the submission PIN to retrieve the submitted score sheet.';
      hidePin();downloadFeedback('');
      if (!data.locked) showEntry();

  }
  function freshness(text,ready=false,reload=false){verified=ready;needsReload=reload;$('course-freshness').textContent=text;$('reload-score-course').hidden=!reload;$('review-scores').disabled=!ready||reload||!current?.config?.open;}
  async function loadCourse(ref,force=false){
    if(submitting)return;
    const same=current?.course.ref===ref;
    if(dirty&&(!same||force)&&!window.confirm('Leave this score sheet? Unsaved scores will be lost.'))return;
    const ticket=++seq,started=performance.now(),cached=force?null:courseCache.peek(ref);
    loadingRef=ref;choices();
    const endLoading=window.RCMActivity?.begin(same&&!force||cached?'Checking score sheet updates…':'Loading score sheet. Please wait…')||(()=>{});
    if(same&&!force){openSheet();freshness('Checking the latest roster, lecturer and submission status…');}
    else if(cached){displayCourse(cached);openSheet();freshness('Opened from this session. Checking the latest course data…');}
    else{verified=false;tell('Loading course…');if(current)freshness('Loading the latest course data…');}
    $('course-freshness').classList.add('course-checking');
    try{
      const data=await courseCache.fetch(ref),requestMs=Math.round(performance.now()-started);
      if(ticket!==seq)return;
      const changed=current?.course.ref===ref&&(current.locked!==data.locked||current.revision!==data.revision||current.config?.open!==data.config?.open);
      const renderStart=performance.now();
      if(changed&&dirty&&!force){pending=null;freshness('The roster, lecturer assignment, marking limits or submission status changed. Your entries are kept on this page. Reload the latest sheet before submitting.',false,true);}
      else{
        if(force||!current||current.course.ref!==ref||changed)displayCourse(data);
        freshness(data.locked?'Latest submission status checked.':'Latest course data checked.',true);
        tell(!data.locked&&!data.config.open?'Score submission is currently closed.':'');
      }
      choices();if(!$('course-catalogue').hidden&&(!same||force))openSheet();
      console.info('[RCM score loading]',{cached:!!cached,requestMs,serverMs:data.timing?.serverMs??null,rosterMs:data.timing?.rosterMs??null,renderMs:Math.round(performance.now()-renderStart)});
    }catch(error){if(ticket!==seq)return;courseCache.clear();if(current?.course.ref===ref){freshness('Could not check the latest data. Your entries are kept. Reload before submitting.',false,true);}tell(error.message);}
    finally{endLoading();if(ticket===seq){loadingRef='';$('course-freshness').classList.remove('course-checking');choices();}}
  }
  $('reload-score-course').addEventListener('click',()=>{if(current)loadCourse(current.course.ref,true);});
  function openSheet(){$('course-catalogue').hidden=true;$('selected-course').hidden=false;$('selected-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  $('change-course').addEventListener('click',()=>{if(submitting)return;$('selected-course').hidden=true;$('course-catalogue').hidden=false;$('resume-course').hidden=!current;$('course-search').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});
  $('resume-course').addEventListener('click',()=>{if(current)loadCourse(current.course.ref);});
  $('course-search').addEventListener('input',()=>{coursePage=1;choices();});
  for(const id of ['course-programme','course-level'])$(id).addEventListener('change',()=>{coursePage=1;choices();});
  $('course-previous').addEventListener('click',()=>{if(coursePage>1){coursePage--;choices();}});
  $('course-next').addEventListener('click',()=>{coursePage++;choices();});
  $('refresh-courses').addEventListener('click',()=>busy($('refresh-courses'),'Refreshing…',catalogue));
  $('score-entry-form').addEventListener('input',()=>{dirty=true;pending=null;});
  $('score-entry-form').addEventListener('submit',event=>{
    event.preventDefault(); tell('');if(!verified||needsReload){tell('Wait for the latest course check, or reload the score sheet before submitting.');return;}
    const pin=$('submit-pin').value;
    if(pin!==$('confirm-pin').value){tell('The two PIN entries do not match.');$('confirm-pin').focus();return;}
    if(pin.trim()!==pin){tell('Remove spaces from the beginning or end of your PIN.');return;}
    if(!fields.size){tell('Add at least one student before submitting.');return;}
    if(!Array.from(fields.values()).some(f=>f.ca.value!==''&&f.exam.value!=='')){tell('Enter scores for at least one student. Leave both fields blank for students not offering this course.');return;}if(!pending)pending={action:'score.submit',operationId:crypto.randomUUID(),courseRef:current.course.ref,revision:current.revision,lecturerName:current.assignedLecturer?current.assignedLecturer.name:$('score-lecturer').value.trim(),examDate:$('score-date').value,pin,entries:Array.from(fields,([studentRef,f])=>({studentRef,ca:f.ca.value,exam:f.exam.value})),additions:Array.from(manualStudents.values())};
    $('preview-course-title').textContent=`${current.course.code} · ${current.course.title}`;
    $('preview-course-meta').textContent=meta(current.course);
    $('confirm-summary').textContent=`Lecturer: ${pending.lecturerName} · Examination date: ${pending.examDate} · ${current.students.length} students · ${pending.entries.filter(e=>e.ca===''&&e.exam==='').length} with no scores entered`;
    $('preview-ca-heading').textContent=`CA / ${current.config.caMax}`;
    $('preview-exam-heading').textContent=`Exam / ${current.config.examMax}`;
    const entries=new Map(pending.entries.map(entry=>[entry.studentRef,entry]));
    $('preview-score-rows').replaceChildren(...current.students.map((student,index)=>{
      const entry=entries.get(student.ref),blank=entry.ca===''&&entry.exam==='',ca=blank?'':Number(entry.ca),exam=blank?'':Number(entry.exam),tr=document.createElement('tr');
      for(const value of [index+1,student.matNo||student.ref,student.name+(student.source==='Lecturer added'?' (Lecturer added)':''),ca,exam,blank?'':Math.round((ca+exam)*100)/100]){
        const td=document.createElement('td');td.textContent=String(value);tr.append(td);
      }
      return tr;
    }));
    $('preview-additions').hidden=!manualStudents.size;
    $('preview-additions').replaceChildren(...Array.from(manualStudents.values(),s=>{const p=document.createElement('p');p.textContent=`Lecturer added: ${s.name} (${s.matNo}) · ${s.registrationType}. Reason: ${s.reason}`;return p;}));
    $('confirm-dialog').showModal();
    $('preview-score-rows').parentElement.parentElement.scrollTop=0;
    $('preview-score-rows').parentElement.parentElement.scrollLeft=0;
    $('confirm-dialog').scrollTop=0;$('confirm-title').focus({preventScroll:true});
  });
  $('cancel-submit').addEventListener('click',()=>$('confirm-dialog').close());
  $('open-add-student').addEventListener('click',()=>{$('add-student-form').reset();$('added-error').textContent='';$('add-student-dialog').showModal();});
  $('cancel-add-student').addEventListener('click',()=>$('add-student-dialog').close());
  $('add-student-form').addEventListener('submit',event=>{
    event.preventDefault();if(!current||current.locked||submitting)return;
    const name=$('added-name').value.trim(),matNo=$('added-mat').value.trim(),reason=$('added-reason').value.trim(),norm=v=>String(v).trim().toLowerCase().replace(/\s+/g,' ');
    if(!name||!matNo||reason.length<5){$('added-error').textContent='Enter a name, matric number and a reason of at least 5 characters.';return;}
    if(current.students.length>=1000||manualStudents.size>=100){$('added-error').textContent='This score sheet has reached its student limit.';return;}
    if(current.students.some(s=>s.matNo&&norm(s.matNo)===norm(matNo))){$('added-error').textContent='That matric number is already on this score sheet.';return;}
    const student={ref:'M_'+crypto.randomUUID(),name,matNo,registrationType:$('added-type').value,reason,source:'Lecturer added'};
    current.students.push(student);manualStudents.set(student.ref,student);$('score-rows').append(scoreRow(student,current.students.length-1));orderRows();dirty=true;pending=null;updateProgress();$('add-student-dialog').close();fields.get(student.ref).ca.focus();
  });
  $('confirm-submit').addEventListener('click',()=>busy($('confirm-submit'),'Submitting…',async()=>{
    if(submitting||!pending)return;if(!verified||needsReload)throw new Error('Reload the latest score sheet before submitting.'); submitting=true; $('cancel-submit').disabled=true;
    try {
      const data=await window.ScoreAPI.request(pending);
      courseCache.clear();dirty=false; pending=null; current.locked=true; snapshot=null;
      $('confirm-dialog').close(); $('score-entry-form').reset(); $('score-entry-form').hidden=true; $('locked-course').hidden=false;
      $('course-state').textContent='Submitted · Locked';
      $('locked-detail').textContent=`${data.saved} student records saved. Version ${data.version}. Reference: ${data.submissionId}. Enter your PIN to download.`;
      tell('Scores submitted and locked successfully. Keep your PIN for future downloads.');
      courses=courses.map(c=>c.ref===current.course.ref?{...c,locked:true}:c); choices();
    } catch(error) { $('confirm-dialog').close(); throw error; }
    finally {submitting=false;$('cancel-submit').disabled=false;}
  }));
  $('confirm-dialog').addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
  $('toggle-download-pin').addEventListener('click',()=>{
    const show=$('download-pin').type==='password';
    $('download-pin').type=show?'text':'password';$('toggle-download-pin').textContent=show?'Hide PIN':'Show PIN';$('toggle-download-pin').setAttribute('aria-pressed',String(show));$('download-pin').focus();
  });
  $('download-pin').addEventListener('input',()=>{downloadFeedback('');tell('');});
  $('download-form').addEventListener('submit',event=>{event.preventDefault();busy($('unlock-download'),'Checking PIN…',async()=>{
    const ref=current.course.ref,ticket=seq;
    downloadFeedback('Checking your submission PIN…');
    try {
      const data=await window.ScoreAPI.request({action:'score.download',courseRef:ref,pin:$('download-pin').value});
      if(ticket!==seq||current.course.ref!==ref)return;
      snapshot=data.snapshot;
      $('download-pin').value='';hidePin(); $('download-form').hidden=true; $('download-actions').hidden=false;
      $('download-details').textContent=`Version ${snapshot.version} · ${snapshot.students.length} students · Lecturer: ${snapshot.lecturerName} · Exam: ${snapshot.examDate}`;
      downloadFeedback('PIN verified. Choose Download Excel or Download PDF below.',true);tell('PIN verified. Choose Excel or PDF below.');
      $('download-actions').scrollIntoView({behavior:'smooth',block:'nearest'});
    } catch(error) {
      if(ticket===seq){downloadFeedback(error.message);$('download-pin').focus();}
      throw error;
    }
  });});
  for(const [id,kind] of [['download-excel','excel'],['download-pdf','pdf']]) $(id).addEventListener('click',()=>busy($(id),'Preparing…',()=>window.ScoreExports[kind](snapshot)));
  $('clear-download').addEventListener('click',()=>{snapshot=null;$('download-actions').hidden=true;$('download-form').hidden=false;hidePin();downloadFeedback('');$('download-pin').focus();tell('Downloads closed. Enter the PIN again to retrieve them.');});
  window.addEventListener('beforeunload',event=>{if(dirty||submitting){event.preventDefault();event.returnValue='';}});
  catalogue().catch(error=>{$('catalogue-status').textContent='Courses could not be loaded.';tell(error.message+' The staging score service may still need installation.');});
})();
