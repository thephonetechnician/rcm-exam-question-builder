/* Short-lived roster responses only. Never persist scores, PINs or downloads. */
(() => {
  function create(loader,{ttl=300000,limit=8,now=()=>Date.now()}={}){
    const cache=new Map(),pending=new Map();let epoch=0;
    const copy=v=>JSON.parse(JSON.stringify(v));
    function peek(ref){const hit=cache.get(ref);if(!hit)return null;if(now()-hit.at>=ttl){cache.delete(ref);return null;}cache.delete(ref);cache.set(ref,hit);return copy(hit.data);}
    function fetch(ref){if(pending.has(ref))return pending.get(ref);const version=epoch;
      const task=Promise.resolve().then(()=>loader(ref)).then(data=>{if(version===epoch){cache.delete(ref);cache.set(ref,{at:now(),data:copy(data)});while(cache.size>limit)cache.delete(cache.keys().next().value);}return copy(data);}).catch(error=>{if(version===epoch)cache.delete(ref);throw error;}).finally(()=>{if(pending.get(ref)===task)pending.delete(ref);});pending.set(ref,task);return task;
    }
    function clear(){epoch++;cache.clear();pending.clear();}
    return Object.freeze({peek,fetch,clear});
  }
  window.ScoreCourseCache=Object.freeze({create});
})();
