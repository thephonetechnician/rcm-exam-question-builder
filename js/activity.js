/* Visible, accessible feedback for concurrent data requests. */
(() => {
  const active=new Map();let banner,label,sequence=0;
  function draw(){
    if(!document.body)return;
    if(!banner){banner=document.createElement('div');banner.className='activity-banner';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.innerHTML='<span class="activity-spinner" aria-hidden="true"></span><span></span>';label=banner.lastElementChild;document.body.append(banner);}
    banner.hidden=!active.size;label.textContent=active.size?Array.from(active.values()).at(-1):'';
    document.querySelector('main')?.setAttribute('aria-busy',String(Boolean(active.size)));
  }
  function begin(text='Loading data…'){const id=++sequence;active.set(id,text);draw();return()=>{active.delete(id);draw();};}
  window.RCMActivity=Object.freeze({begin,async run(text,fn){const end=begin(text);try{return await fn();}finally{end();}}});
  document.addEventListener('DOMContentLoaded',draw);
})();
