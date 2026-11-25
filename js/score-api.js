(() => {
  'use strict';
  window.ScoreAPI = Object.freeze({ request(payload,options={}) {
    const url = window.RCM_SCORE_CONFIG?.apiUrl || '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) return Promise.reject(new Error('The score service is not configured.'));
    let end=options.background?(()=>{}):window.RCMActivity?.begin(/submit|save|commit|archive|batch/.test(payload.action)?'Saving your changes…':'Loading data. Please wait…')||(()=>{});
    const attempt=(copy,timeoutMs=45000)=>new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID(), frame = document.createElement('iframe'), form = document.createElement('form'), input = document.createElement('input');
      frame.name = 'score_' + requestId; frame.hidden = true; frame.title = 'Score service response';
      form.method = 'POST'; form.action = url; form.target = frame.name; form.hidden = true;
      input.type = 'hidden'; input.name = 'payload'; input.value = JSON.stringify({ ...copy, requestId }); form.append(input);
      let done = false;
      const finish = (error, data) => { if (done) return; done = true; clearTimeout(timer); window.removeEventListener('message', receive); form.remove(); frame.remove(); error ? reject(error) : resolve(data); };
      const receive = event => {
        let origin; try { origin = new URL(event.origin); } catch { return; }
        if (origin.protocol !== 'https:' || !(origin.hostname === 'script.google.com' || origin.hostname === 'script.googleusercontent.com' || origin.hostname.endsWith('.googleusercontent.com'))) return;
        if (event.data?.requestId !== requestId) return;
        if (event.data.type === 'RCM_SECURE_RESPONSE' && event.data.data?.success === false) {
          finish(new Error('The staging score router is not installed yet. Update the Apps Script staging deployment before using scores.'));
          return;
        }
        if (event.data.type !== 'RCM_SCORE_RESPONSE') return;
        if(event.data.data?.success){finish(null,event.data.data);return;}const error=new Error(event.data.data?.error||'The score request failed.');if(event.data.data?.code==='SCORE_BUSY')error.code='SCORE_BUSY';finish(error);
      };
      const timer=setTimeout(()=>{const error=new Error('The score service did not respond. Your submission may have saved. Retry this same submission or check PIN downloads before entering scores again.');error.code='SCORE_TIMEOUT';finish(error);},timeoutMs);
      window.addEventListener('message', receive); document.body.append(frame, form); form.submit(); input.value = '';
    });
    const snapshot=JSON.parse(JSON.stringify(payload));
    const work=window.ScoreSubmitRetry?window.ScoreSubmitRetry.run(snapshot,attempt,{onRetry:({attempt,maxAttempts})=>{if(!options.background){end();end=window.RCMActivity?.begin('Server busy or slow. Safely retrying this submission ('+attempt+'/'+maxAttempts+')…')||(()=>{});}}}):attempt(snapshot);
    return work.finally(()=>end());
  }});
})();
