/* Public logo/default-theme read. No lecturer, student or credential data is cached. */
(() => {
  let generation=0;
  const brand={logoData:'',defaultTheme:'aurora',name:'RCM Examinations & Records'};
  function apply(data){
    brand.logoData=data.logoData||'';brand.defaultTheme=data.defaultTheme||'aurora';
    document.querySelectorAll('.brand img,.rea-logo').forEach(img=>{img.src=brand.logoData||'assets/rcm-logo.jpg';});
    window.RCMTheme?.setDefault(brand.defaultTheme);window.ExamPreview?.refresh();
    window.dispatchEvent(new Event('rcm-branding-updated'));
  }
  brand.applySaved=data=>{generation++;apply(data);};
  brand.ready=(async()=>{const ticket=++generation;try{const data=await window.ScoreAPI.request({action:'score.branding'});if(ticket===generation)apply(data);}catch(_){/* Existing logo remains available until branding service is installed. */}return brand;})();
  window.RCMBranding=brand;
})();
