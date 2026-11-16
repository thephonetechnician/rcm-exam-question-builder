(() => {
  const $=id=>document.getElementById(id);let token='',revision='',logoData='',sequence=0,reading=false;
  const tell=text=>{$('branding-message').textContent=text;};
  const lock=value=>document.querySelectorAll('#branding-form input,#branding-form select,#branding-form button').forEach(control=>{control.disabled=value;});
  function preview(){$('branding-logo-preview').src=logoData||'assets/rcm-logo.jpg';}
  async function load(){const session=token,ticket=++sequence;lock(true);try{const data=await window.ScoreAPI.request({action:'score.admin.branding',token:session});if(session!==token||ticket!==sequence)return;revision=data.revision;logoData=data.logoData;$('branding-default-theme').value=data.defaultTheme;$('branding-logo-file').value='';preview();tell('Upload a logo or choose the school default theme, then save.');}finally{if(session===token&&ticket===sequence)lock(false);}}
  async function start(value){token=value;$('branding-settings').hidden=false;try{await load();}catch(e){tell(e.message);}}
  function stop(){token='';sequence++;revision='';logoData='';reading=false;lock(false);$('branding-settings').hidden=true;$('branding-logo-file').value='';preview();tell('');}
  $('branding-logo-file').addEventListener('change',async()=>{
    const file=$('branding-logo-file').files[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){tell('Choose a PNG, JPEG or WebP image smaller than 3 MB.');return;}
    const session=token,ticket=++sequence,url=URL.createObjectURL(file);reading=true;lock(true);tell('Preparing logo preview…');
    try{
      const image=new Image();image.src=url;await image.decode();if(!image.width||!image.height||image.width*image.height>25000000)throw Error('Choose an image with no more than 25 million pixels.');
      let candidate='';for(const size of [192,160,128,96]){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);const scale=(size-16)/Math.max(image.width,image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(size-w)/2,(size-h)/2,w,h);candidate=canvas.toDataURL('image/png');if(candidate.length<=40000)break;}
      if(candidate.length>40000)throw Error('This image is too detailed. Choose a simpler logo.');
      if(session!==token||ticket!==sequence)return;logoData=candidate;preview();tell('Logo preview ready. Save branding to publish it across the site and future downloads.');
    }catch(e){if(session===token&&ticket===sequence)tell(e.message||'The image could not be read.');}finally{URL.revokeObjectURL(url);if(session===token&&ticket===sequence){reading=false;lock(false);}}
  });
  $('branding-original').addEventListener('click',()=>{if(reading)return;logoData='';$('branding-logo-file').value='';preview();tell('Original college logo selected. Save branding to apply it.');});
  $('branding-reload').addEventListener('click',()=>load().catch(e=>tell(e.message)));
  $('branding-form').addEventListener('submit',async event=>{
    event.preventDefault();if(reading||!revision)return;const session=token,ticket=sequence;lock(true);
    try{const data=await window.ScoreAPI.request({action:'score.admin.branding.save',token:session,revision,logoData,defaultTheme:$('branding-default-theme').value});if(session!==token||ticket!==sequence)return;revision=data.revision;window.RCMBranding?.applySaved(data);tell('Branding saved. All pages and future downloads will use this logo. Personal theme choices can override the school default.');}
    catch(e){if(session===token)tell(e.message);}finally{if(session===token&&ticket===sequence)lock(false);}
  });
  window.BrandAdmin=Object.freeze({start,stop});
})();
