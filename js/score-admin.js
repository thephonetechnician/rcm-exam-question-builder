(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let token='',expiryTimer,records=[],selected,archiving=false;
  function tell(text){$('admin-message').textContent=text;$('admin-message').hidden=!text;}
  function reset(){token='';clearTimeout(expiryTimer);records=[];$('admin-history-list').replaceChildren();$('admin-history-panel').hidden=true;$('admin-login-panel').hidden=false;$('admin-logout').hidden=true;$('archive-dialog').close();}
  async function busy(button,label,fn){const old=button.textContent;button.disabled=true;button.textContent=label;try{await fn();}catch(error){if(/Administrator session expired/i.test(error.message))reset();tell(error.message);}finally{button.disabled=false;button.textContent=old;}}
  async function history(){const session=token;const data=await window.ScoreAPI.request({action:'score.admin.history',token:session});if(session!==token)return;records=data.submissions;render();}
  function render(){
    const term=$('admin-search').value.trim().toLowerCase();
    const shown=records.filter(r=>[r.course.code,r.course.title,r.course.programme,r.course.level,r.course.session,r.lecturerName].join(' ').toLowerCase().includes(term));
    if(!shown.length){const p=document.createElement('p');p.className='muted';p.textContent='No submissions match this search.';$('admin-history-list').replaceChildren(p);return;}
    $('admin-history-list').replaceChildren(...shown.map(r=>{
      const card=document.createElement('article');card.className='admin-submission';
      const title=document.createElement('h3');title.textContent=`${r.course.code} · ${r.course.title} · Version ${r.version}`;
      const meta=document.createElement('p');meta.textContent=`${r.course.programme} · ${r.course.level} · ${r.course.session} · Semester ${r.course.semester}`;
      const info=document.createElement('p');info.textContent=`Lecturer: ${r.lecturerName} · ${r.count} students · Submitted ${r.submittedAt}`;
      const badge=document.createElement('span');badge.className='badge '+(r.archived?'':'ready');badge.textContent=r.archived?'Archived':'Locked';
      card.append(title,meta,info,badge);
      if(r.archive){const note=document.createElement('p');note.textContent=`Archived ${r.archive.at} by ${r.archive.actor}. Reason: ${r.archive.reason}`;card.append(note);}
      for(const [label,kind] of [['Download Excel','excel'],['Download PDF','pdf']]){
        const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent=label;
        button.addEventListener('click',()=>busy(button,'Preparing…',async()=>{const session=token;const data=await window.ScoreAPI.request({action:'score.admin.snapshot',token:session,submissionId:r.submissionId});if(session!==token)return;await window.ScoreExports[kind](data.snapshot);}));card.append(button);
      }
      if(!r.archived){const button=document.createElement('button');button.type='button';button.className='button primary';button.textContent='Archive and reopen';button.addEventListener('click',()=>{selected=r;$('archive-summary').textContent=`${r.course.code} · ${r.course.level} · Version ${r.version}`;$('archive-reason').value='';$('archive-dialog').showModal();});card.append(button);}
      return card;
    }));
  }
  $('admin-login-form').addEventListener('submit',event=>{event.preventDefault();busy($('admin-signin'),'Signing in…',async()=>{
    try{const result=await window.ScoreAPI.request({action:'score.admin.login',key:$('admin-key').value});token=result.token;$('admin-login-panel').hidden=true;$('admin-history-panel').hidden=false;$('admin-logout').hidden=false;expiryTimer=setTimeout(()=>{reset();tell('Your administrator session expired. Sign in again.');},Math.max(0,result.expires-Date.now()));await history();tell('Administrator access verified.');}finally{$('admin-key').value='';}
  });});
  $('admin-refresh').addEventListener('click',()=>busy($('admin-refresh'),'Refreshing…',history));
  $('admin-search').addEventListener('input',render);
  $('cancel-archive').addEventListener('click',()=>$('archive-dialog').close());
  $('archive-dialog').addEventListener('cancel',event=>{if(archiving)event.preventDefault();});
  $('archive-form').addEventListener('submit',event=>{event.preventDefault();busy($('confirm-archive'),'Archiving…',async()=>{
    if(!selected||archiving)return;archiving=true;$('cancel-archive').disabled=true;
    try{await window.ScoreAPI.request({action:'score.admin.archive',token,submissionId:selected.submissionId,reason:$('archive-reason').value.trim()});$('archive-dialog').close();await history();tell('Previous submission archived. The course is available for a new submission.');}
    finally{archiving=false;$('cancel-archive').disabled=false;}
  });});
  $('admin-logout').addEventListener('click',async()=>{const oldToken=token;reset();tell('Signed out.');try{await window.ScoreAPI.request({action:'score.admin.logout',token:oldToken});}catch{tell('Signed out on this page. The server session will expire automatically.');}});
})();
