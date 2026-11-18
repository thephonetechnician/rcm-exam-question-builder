(() => {
  'use strict';
  const pages={branding:'Branding & Appearance',scoring:'Score settings',lecturers:'Lecturer directory & assignments',classes:'Classes and rosters',history:'Submission history'};
  const legacy={'branding-settings':'branding','school-settings':'scoring','lecturer-directory':'lecturers','lecturer-workspace':'lecturers','class-management':'classes','admin-history-panel':'history'};
  let active=false,onNavigate;
  function render(focus=false){
    const key=location.hash.slice(1),page=pages[key]?key:legacy[key]||'branding';
    document.querySelectorAll('[data-admin-page]').forEach(section=>{section.toggleAttribute('data-current-page',section.dataset.adminPage===page);});
    document.querySelectorAll('#admin-section-nav a').forEach(link=>{if(link.hash==='#'+page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    const title=document.getElementById('admin-page-title');title.textContent=pages[page];document.title=pages[page]+' | RCM Examinations & Records';
    if(active)onNavigate?.(page);
    if(active&&focus){title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  }
  function start(callback){document.getElementById('admin-section-nav').hidden=false;onNavigate=callback;active=true;document.body.classList.add('admin-authenticated');render();}
  function stop(){document.getElementById('admin-section-nav').hidden=true;active=false;document.body.classList.remove('admin-authenticated');}
  window.addEventListener('hashchange',()=>render(true));
  render();window.AdminNavigation=Object.freeze({start,stop});
})();
