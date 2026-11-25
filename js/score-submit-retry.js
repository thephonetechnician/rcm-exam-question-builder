/* Retry one immutable submission; never generate another operation ID or PIN. */
(() => {
  async function run(payload,attempt,{now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random,onRetry=()=>{},maxAttempts=12,budgetMs=120000}={}){
    const saved=JSON.stringify(payload),submission=payload.action==='score.submit'&&/^[a-z0-9-]{20,80}$/i.test(payload.operationId||''),started=now();let lastError;
    for(let count=1;;count++){
      const remaining=budgetMs-(now()-started);
      if(remaining<=0&&lastError)throw lastError;
      try{return await attempt(JSON.parse(saved),Math.max(1,Math.min(45000,remaining)));}
      catch(error){
        lastError=error;
        const retryable=error.code==='SCORE_BUSY'||error.code==='SCORE_TIMEOUT'||/lock timeout: another process was holding the lock/i.test(error.message||'');
        const delay=Math.round(Math.min(5000,800*2**(count-1))*(0.75+random()*0.5));
        if(!submission||!retryable)throw error;
        if(count>=maxAttempts||now()-started+delay>=budgetMs){
          const stopped=new Error('The score service is still busy or slow. Automatic retries have stopped. Your submission may have saved; check PIN downloads or retry this same submission.');
          stopped.code='SCORE_RETRY_EXHAUSTED';throw stopped;
        }
        onRetry({attempt:count+1,maxAttempts,delayMs:delay});await sleep(delay);
      }
    }
  }
  window.ScoreSubmitRetry=Object.freeze({run});
})();
