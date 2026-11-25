(() => {
  'use strict';
  const $=id=>document.getElementById(id);let data,ticket=0;
  const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
  function render(){
    if(!data)return;const q=$('tracking-search').value.trim().toLowerCase(),selected=$('tracking-class').value,status=$('tracking-state').value;
    const groups=data.classes.map(g=>({...g,rows:g.lecturers.flatMap(p=>p.courses.map(c=>({name:p.lecturerName,source:p.assignmentSource,...c}))).filter(r=>(!status||(r.scoreStatus==='Submitted'?'Submitted':'Not submitted')===status)&&(!q||(r.name+' '+r.code+' '+r.title).toLowerCase().includes(q)))})).filter(g=>(!selected||JSON.stringify([g.programme,g.level])===selected)&&g.rows.length);
    const rows=groups.flatMap(g=>g.rows),submitted=rows.filter(r=>r.scoreStatus==='Submitted').length;
    $('tracking-summary').replaceChildren(node('strong',groups.length+' classes'),node('span',rows.length+' course score sheets'),node('span',submitted+' submitted'),node('span',(rows.length-submitted)+' not submitted'));
    $('tracking-tables').replaceChildren(...groups.map(g=>{
      const section=node('section',undefined,'score-panel'),heading=node('h2',g.programme+' · '+g.level),table=node('table',undefined,'score-table tracking-table'),caption=node('caption',g.programme+' · '+g.level+' — Score-sheet submission tracker'),thead=node('thead'),head=node('tr');
      ['Class','Lecturer','Course','Score-sheet status'].forEach(text=>{const th=node('th',text);th.scope='col';head.append(th);});thead.append(head);const tbody=node('tbody');
      g.rows.forEach(r=>{const tr=node('tr'),cls=node('td',g.programme+' · '+g.level),name=node('td',r.name),course=node('th',r.code);course.scope='row';course.append(node('small',r.title,'tracking-source'));if(r.source!=='Assigned lecturer')name.append(node('small',r.source,'tracking-source'));
        const statusCell=node('td'),done=r.scoreStatus==='Submitted';statusCell.append(node('span',done?'Submitted':'Not submitted','tracking-status '+(done?'complete':'outstanding')));if(r.scoreStatus==='Reopened')statusCell.append(node('small','Reopened for correction','tracking-source'));tr.append(cls,name,course,statusCell);tbody.append(tr);});
      table.append(caption,thead,tbody);const wrap=node('div',undefined,'score-table-wrap');wrap.tabIndex=0;wrap.setAttribute('aria-label',g.programme+' '+g.level+' score-sheet tracker');wrap.append(table);section.append(heading,wrap);return section;
    }));
    if(!groups.length)$('tracking-tables').append(node('p',data.classes.length?'No score sheets match these filters.':'No courses are configured for this session and semester.','score-panel'));
  }
  async function load(){
    const id=++ticket,semester=$('tracking-semester').value,oldClass=$('tracking-class').value;data=null;$('tracking-tables').replaceChildren();$('tracking-summary').replaceChildren();$('tracking-session').textContent='';$('tracking-refresh').disabled=true;$('tracking-message').textContent='Loading score-sheet tracking. Please wait…';
    try{const result=await window.ScoreAPI.request({action:'score.tracking',semester});if(id!==ticket)return;data=result;
      $('tracking-class').replaceChildren(new Option('All classes',''),...data.classes.map((g,i)=>new Option(g.programme+' · '+g.level,JSON.stringify([g.programme,g.level]))));if(Array.from($('tracking-class').options).some(o=>o.value===oldClass))$('tracking-class').value=oldClass;
      $('tracking-session').textContent=`${data.session} · Semester ${data.semester} · Updated ${new Date(data.updatedAt).toLocaleString(undefined,{timeZone:'Africa/Lagos'})}`;$('tracking-message').textContent='Score-sheet status loaded. Use Refresh tracking to get the latest updates.';render();
    }catch(error){if(id===ticket){$('tracking-message').textContent='Tracking could not load. '+error.message;$('tracking-class').replaceChildren(new Option('All classes',''));}}
    finally{if(id===ticket)$('tracking-refresh').disabled=false;}
  }
  $('tracking-refresh').addEventListener('click',load);$('tracking-semester').addEventListener('change',()=>{$('tracking-class').value='';load();});
  for(const id of ['tracking-class','tracking-state'])$(id).addEventListener('change',render);$('tracking-search').addEventListener('input',render);load();
})();
