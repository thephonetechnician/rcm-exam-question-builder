(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let courses = [], current, snapshot, pending, dirty = false, submitting = false, seq = 0;
  const fields = new Map();
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
    const found = courses.filter(c => [c.code,c.title,c.programme,c.level,c.session,c.semester].join(' ').toLowerCase().includes(term));
    $('catalogue-status').textContent = courses.length ? `${found.length} matching course${found.length === 1 ? '' : 's'}` : 'No courses are loaded yet. The administrator must import course and student data first.';
    $('score-course-list').replaceChildren(...found.map(c => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'score-course-choice'; button.setAttribute('aria-pressed', String(current?.course.ref === c.ref));
      const badge = document.createElement('span'); badge.className = 'badge ' + (c.locked ? '' : 'ready'); badge.textContent = c.locked ? 'Submitted · Locked' : 'Score entry';
      const code = document.createElement('span'); code.className = 'course-code'; code.textContent = c.code;
      const title = document.createElement('strong'); title.textContent = c.title;
      const details = document.createElement('small'); details.textContent = meta(c);
      button.append(badge, code, title, details); button.addEventListener('click', () => loadCourse(c.ref)); return button;
    }));
  }
  async function catalogue() {
    const data = await window.ScoreAPI.request({action:'score.catalogue'}); courses = data.courses;
    $('score-session').textContent = data.config.session;
    if (!data.config.open) tell('Score submission is currently closed. Submitted score sheets can still be downloaded with the correct PIN.');
    choices();
  }
  function updateProgress() {
    let completed = 0;
    for (const item of fields.values()) {
      const filled = item.ca.value !== '' && item.exam.value !== '' && item.ca.validity.valid && item.exam.validity.valid;
      item.total.textContent = filled ? String(Math.round((Number(item.ca.value)+Number(item.exam.value))*100)/100) : '—';
      if (filled) completed++;
    }
    $('entry-progress').textContent = `${completed} of ${fields.size} completed`;
  }
  function showEntry() {
    const {config,students} = current;
    fields.clear(); $('score-entry-form').reset();
    $('ca-heading').textContent = `CA / ${config.caMax}`; $('exam-heading').textContent = `Exam / ${config.examMax}`;
    $('score-limits').textContent = `CA: 0–${config.caMax}. Examination: 0–${config.examMax}. Names and matric numbers come from the registered roster.`;
    // A date string uses the college timezone, not the browser's device timezone.
    $('score-date').max = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    $('score-rows').replaceChildren(...students.map((s, i) => {
      const tr = document.createElement('tr');
      for (const value of [i+1,s.matNo||s.ref,s.name]) { const td=document.createElement('td'); td.textContent=value; tr.append(td); }
      const inputs = {};
      for (const [key,max] of [['ca',config.caMax],['exam',config.examMax]]) {
        const td=document.createElement('td'), input=document.createElement('input');
        input.type='number'; input.inputMode='decimal'; input.min='0'; input.max=String(max); input.step='0.01'; input.required=true; input.placeholder=' '; input.setAttribute('aria-label',`${key === 'ca' ? 'CA' : 'Exam'} for ${s.name}`);
        input.addEventListener('input',()=>{dirty=true;pending=null;updateProgress();}); td.append(input); tr.append(td); inputs[key]=input;
      }
      const total=document.createElement('td'); total.className='score-total'; total.textContent='—';tr.append(total); fields.set(s.ref,{...inputs,total}); return tr;
    }));
    $('review-scores').disabled = !config.open;
    $('review-scores').textContent = config.open ? 'Review and submit scores →' : 'Submission is closed';
    updateProgress();
  }
  async function loadCourse(ref) {
    if (submitting) return;
    if (dirty && !window.confirm('Leave this score sheet? Unsaved scores will be lost.')) return;
    const ticket = ++seq; tell('Loading course…');
    try {
      const data = await window.ScoreAPI.request({action:'score.course',courseRef:ref});
      if (ticket !== seq) return;
      current=data; dirty=false; pending=null; snapshot=null; fields.clear();
      $('selected-course').hidden=false; $('selected-code').textContent=data.course.code;
      $('selected-title').textContent=data.course.title; $('selected-meta').textContent=meta(data.course);
      $('course-state').textContent=data.locked?'Submitted · Locked':'Ready for score entry';
      $('score-entry-form').hidden=data.locked; $('locked-course').hidden=!data.locked; $('download-actions').hidden=true; $('download-form').hidden=false; $('download-form').reset();
      $('locked-detail').textContent='Use the submission PIN to retrieve the submitted score sheet.';
      hidePin();downloadFeedback('');
      if (!data.locked) showEntry();
      tell(!data.locked && !data.config.open ? 'Score submission is currently closed.' : ''); choices();
      $('selected-course').scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) { if(ticket===seq)tell(error.message); }
  }
  $('course-search').addEventListener('input',choices);
  $('refresh-courses').addEventListener('click',()=>busy($('refresh-courses'),'Refreshing…',catalogue));
  $('score-entry-form').addEventListener('input',()=>{dirty=true;pending=null;});
  $('score-entry-form').addEventListener('submit',event=>{
    event.preventDefault(); tell('');
    const pin=$('submit-pin').value;
    if(pin!==$('confirm-pin').value){tell('The two PIN entries do not match.');$('confirm-pin').focus();return;}
    if(pin.trim()!==pin){tell('Remove spaces from the beginning or end of your PIN.');return;}
    if(!pending)pending={action:'score.submit',operationId:crypto.randomUUID(),courseRef:current.course.ref,revision:current.revision,lecturerName:$('score-lecturer').value.trim(),examDate:$('score-date').value,pin,entries:Array.from(fields,([studentRef,f])=>({studentRef,ca:f.ca.value,exam:f.exam.value}))};
    $('confirm-summary').textContent=`${current.course.code} · ${current.course.title} · ${current.students.length} students · ${pending.lecturerName} · Exam ${pending.examDate}.`;
    $('confirm-dialog').showModal();
  });
  $('cancel-submit').addEventListener('click',()=>$('confirm-dialog').close());
  $('confirm-submit').addEventListener('click',()=>busy($('confirm-submit'),'Submitting…',async()=>{
    if(submitting||!pending)return; submitting=true; $('cancel-submit').disabled=true;
    try {
      const data=await window.ScoreAPI.request(pending);
      dirty=false; pending=null; current.locked=true; snapshot=null;
      $('confirm-dialog').close(); $('score-entry-form').reset(); $('score-entry-form').hidden=true; $('locked-course').hidden=false;
      $('course-state').textContent='Submitted · Locked';
      $('locked-detail').textContent=`${data.saved} student scores saved. Version ${data.version}. Reference: ${data.submissionId}. Enter your PIN to download.`;
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
