(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let token='',classes=[],current=null,details=null,kind='courses',plan=null,rawRows=null,sequence=0;
  const labels={CourseCode:'Course code',Title:'Course title',Units:'Credit units',Name:'Student full name',MatNo:'Matric number',AdmissionNo:'Admission number (optional)'};
  function tell(text){$('class-message').textContent=text;$('class-message').hidden=!text;}
  function clearPlan(){plan=null;rawRows=null;$('class-import-preview').hidden=true;$('class-preview-rows').replaceChildren();}
  const context=()=>({...current,semester:$('class-semester').value});
  async function request(data){return window.ScoreAPI.request({...data,token});}
  async function busy(button,label,fn){const old=button.textContent;button.disabled=true;button.textContent=label;try{await fn();}catch(error){tell(error.message);}finally{button.disabled=false;button.textContent=old;}}
  function stop(){token='';sequence++;classes=[];current=null;details=null;clearPlan();$('class-management').hidden=true;$('admin-section-nav').hidden=true;$('class-workspace').hidden=true;$('class-upload').value='';$('class-single-fields').replaceChildren();$('class-records-rows').replaceChildren();$('class-picker').replaceChildren();}
  async function list(preferred){
    const session=token,data=await request({action:'score.admin.classes'});if(session!==token)return;
    classes=data.classes;$('class-session').value=data.session;
    const blank=document.createElement('option');blank.value='';blank.textContent=classes.length?'Select a class…':'Create your first class above.';
    $('class-picker').replaceChildren(blank,...classes.map(c=>{const o=document.createElement('option');o.value=c.ref;o.textContent=`${c.session} · ${c.programme} · ${c.level}${c.editable?'':' (read-only)'}`;return o;}));
    if(preferred&&classes.some(c=>c.ref===preferred)){$('class-picker').value=preferred;await choose(preferred);}
  }
  async function start(session){stop();token=session;$('class-management').hidden=false;$('admin-section-nav').hidden=false;try{await list();tell('Choose a class, or create one for the active session.');}catch(error){tell(error.message+' Install the updated class-management backend and run setupScoreMvp_ if these tables are missing.');}}
  async function choose(ref){
    const ticket=++sequence;clearPlan();current=null;details=null;$('class-workspace').hidden=true;$('class-upload').value='';if(!ref)return;
    const data=await request({action:'score.admin.class.details',classRef:ref});if(ticket!==sequence||!token)return;
    current=data.classInfo;details=data;$('class-workspace').hidden=false;$('class-context-label').textContent=`${current.session} · ${current.programme} · ${current.level}`;
    $('class-import-controls').hidden=!current.editable;renderMode();tell(current.editable?'':'Historical session: records are read-only.');
  }
  function renderMode(){
    sequence++;clearPlan();tell('');$('class-upload').value='';
    $('class-courses-mode').setAttribute('aria-pressed',String(kind==='courses'));$('class-students-mode').setAttribute('aria-pressed',String(kind==='students'));
    $('class-semester-field').hidden=kind!=='courses';$('class-import-title').textContent=kind==='courses'?'Add courses to this class':'Register students in this class';
    $('class-import-help').textContent=kind==='courses'?'The template needs only course code, title and units. The selected class, session and semester are attached automatically.':'Fill each student once. Provide a name and matric number, or an admission number if no matric number is assigned. Keep identifier columns as text to preserve leading zeros. No per-course registration rows are needed.';
    $('class-single-title').textContent=kind==='courses'?'Or add one course directly':'Or add one student directly';
    $('class-single-form').closest('details').open=false;
    $('class-single-fields').replaceChildren(...window.ScoreImports.fields[kind].map(name=>{
      const div=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');input.id='class-single-'+name;label.htmlFor=input.id;label.textContent=labels[name];input.name=name;input.maxLength=250;
      input.required=['Name','Title','CourseCode','Units'].includes(name);if(name==='Units'){input.type='number';input.min='0.01';input.max='30';input.step='0.01';}div.append(label,input);return div;
    }));
    renderRecords();
  }
  function renderRecords(){
    const courseMode=kind==='courses',records=courseMode?details.courses.filter(c=>c.semester===$('class-semester').value):details.students;
    $('class-records-title').textContent=courseMode?'Courses in this semester':'Students registered in this class';$('class-records-count').textContent=`${records.length} record${records.length===1?'':'s'}`;
    const tr=document.createElement('tr');for(const label of courseMode?['Code','Title','Units','Semester']:['Matric number','Admission number','Student name','Status']){const th=document.createElement('th');th.scope='col';th.textContent=label;tr.append(th);}$('class-records-head').replaceChildren(tr);
    $('class-records-rows').replaceChildren(...records.map(r=>{const tr=document.createElement('tr');for(const v of courseMode?[r.code,r.title,r.units,r.semester]:[r.matNo||'Not assigned',r.admissionNo||'—',r.name,r.status]){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}return tr;}));
  }
  async function preview(rows){
    const ticket=sequence,session=token,ctx=context(),mode=kind,semester=ctx.semester;
    const result=await request({action:'score.admin.import.preview',classRef:ctx.ref,kind:mode,semester,rows});
    if(ticket!==sequence||session!==token||mode!==kind||semester!==$('class-semester').value)return;
    rawRows=rows;plan=result;$('class-import-preview').hidden=false;
    $('class-preview-counts').textContent=`${result.counts.add} to add · ${result.counts.skip} duplicates to skip · ${result.counts.conflict} conflicts`;
    $('class-confirm-import').disabled=result.counts.conflict>0||result.counts.add===0;
    $('class-confirm-import').textContent=result.counts.conflict?'Resolve conflicts before saving':result.counts.add?'Confirm import':'Nothing new to import';
    $('class-preview-rows').replaceChildren(...result.rows.map(r=>{const tr=document.createElement('tr');tr.className=r.status==='Conflict'?'import-conflict':'';for(const v of [r.row,r.status,Object.values(r.values).filter(Boolean).join(' · '),r.message||'New record']){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}return tr;}));
    $('class-import-preview').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  $('class-create-form').addEventListener('submit',event=>{event.preventDefault();busy($('class-create-button'),'Creating…',async()=>{const result=await request({action:'score.admin.class.create',session:$('class-session').value,programme:$('class-programme').value,level:$('class-level').value});await list(result.classRef);tell(result.existing?'This class already exists. Its workspace is open.':'Class created. Add courses and students below.');});});
  $('class-picker').addEventListener('change',()=>choose($('class-picker').value).catch(error=>tell(error.message)));
  for(const [id,mode] of [['class-courses-mode','courses'],['class-students-mode','students']])$(id).addEventListener('click',()=>{kind=mode;renderMode();});
  $('class-semester').addEventListener('change',()=>{sequence++;clearPlan();tell('');$('class-upload').value='';renderRecords();});
  $('class-upload').addEventListener('change',()=>{clearPlan();tell('');});
  $('class-download-template').addEventListener('click',()=>busy($('class-download-template'),'Preparing…',()=>window.ScoreImports.download(kind,context())));
  $('class-preview-import').addEventListener('click',()=>busy($('class-preview-import'),'Reading…',async()=>{const ticket=sequence,mode=kind,ctx=context();const rows=await window.ScoreImports.read($('class-upload').files[0],mode,ctx);if(ticket!==sequence||mode!==kind)return;await preview(rows);}));
  $('class-single-form').addEventListener('input',clearPlan);
  $('class-single-form').addEventListener('submit',event=>{event.preventDefault();busy($('class-single-preview'),'Checking…',()=>preview([Object.fromEntries(new FormData($('class-single-form')))]));});
  $('class-confirm-import').addEventListener('click',()=>busy($('class-confirm-import'),'Saving…',async()=>{if(!plan||plan.counts.conflict||!plan.counts.add)return;const p=plan,rows=rawRows;const result=await request({action:'score.admin.import.commit',classRef:p.classInfo.ref,kind:p.kind,semester:p.semester,rows,revision:p.revision});await list(p.classInfo.ref);tell(`${result.added} record${result.added===1?'':'s'} added. ${result.skipped} duplicate${result.skipped===1?'':'s'} skipped. Submitted scores were not changed.`);}));
  window.ScoreClassAdmin=Object.freeze({start,stop});
})();
