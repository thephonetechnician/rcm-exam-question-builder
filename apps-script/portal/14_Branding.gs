/* Shared public appearance settings; only authenticated admins may publish changes. */
function scoreBranding_(book){
  let value={logoData:'',defaultTheme:'aurora'};
  if(book.getSheetByName('ScorePortalSettings')){
    const rows=scoreRead_(book,'ScorePortalSettings').filter(function(r){return r.Setting==='branding';});
    if(rows.length)value=JSON.parse(rows[rows.length-1].Value);
  }
  return {success:true,name:'RCM Examinations & Records',logoData:value.logoData||'',defaultTheme:value.defaultTheme||'aurora',revision:scoreHash_(JSON.stringify(value))};
}
function scoreBrandingSave_(book,data){return scoreLock_(function(){
  const admin=scoreAdmin_(data.token),current=scoreBranding_(book),logo=data.logoData,theme=data.defaultTheme;
  if(data.revision!==current.revision)throw new Error('Branding changed. Reload the settings before saving.');
  if(!['aurora','classic','ocean','minimal'].includes(theme))throw new Error('Choose Aurora, Classic College, Ocean or Minimal.');
  if(typeof logo!=='string'||logo.length>40000||logo&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo))throw new Error('Upload a supported image through the logo picker.');
  if(logo){
    const bytes=Utilities.base64Decode(logo.slice(22)).map(function(b){return b&255;}),signature=[137,80,78,71,13,10,26,10];
    if(bytes.length<33||signature.some(function(v,i){return bytes[i]!==v;})||String.fromCharCode.apply(null,bytes.slice(12,16))!=='IHDR')throw new Error('Invalid PNG logo. Upload it again.');
    const dimension=function(at){return bytes[at]*16777216+bytes[at+1]*65536+bytes[at+2]*256+bytes[at+3];};
    if(dimension(16)<1||dimension(16)>512||dimension(20)<1||dimension(20)>512)throw new Error('Logo dimensions are outside the supported range.');
  }
  scoreAppend_(book,'ScorePortalSettings',[['branding',JSON.stringify({logoData:logo,defaultTheme:theme}),new Date().toISOString(),admin.actor]]);
  return scoreBranding_(book);
});}
