(() => {
  const text=v=>String(v??'').trim();
  function compare(a,b){
    const av=text(a.matNo||a.MatNo),bv=text(b.matNo||b.MatNo);if(!av||!bv)return av?-1:bv?1:text(a.ref||a.StudentRef).localeCompare(text(b.ref||b.StudentRef));
    const aa=av.toLowerCase().match(/\d+|\D+/g)||[],bb=bv.toLowerCase().match(/\d+|\D+/g)||[];
    for(let i=0;i<Math.min(aa.length,bb.length);i++){let x=aa[i],y=bb[i];if(/^\d+$/.test(x)&&/^\d+$/.test(y)){x=x.replace(/^0+/,'')||'0';y=y.replace(/^0+/,'')||'0';if(x.length!==y.length)return x.length-y.length;}if(x!==y)return x<y?-1:1;}
    return aa.length-bb.length||av.localeCompare(bv)||text(a.ref||a.StudentRef).localeCompare(text(b.ref||b.StudentRef));
  }
  window.ScoreOrder=Object.freeze({compare});
})();
