import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';

export function createScoreHarness() {
const props=new Map([['PORTAL_SCORE_SPREADSHEET_ID','score-test'],['PORTAL_FRONTEND_ORIGIN','http://127.0.0.1:8000']]),cache=new Map(),sheets=new Map();
let held=false,failTable='';
function sheet(name,data=[]){
  const obj={name,data,getLastRow:()=>obj.data.length,getMaxRows:()=>10000,insertRowsAfter:()=>{},setFrozenRows:()=>{},getDataRange:()=>({getValues:()=>structuredClone(obj.data)}),getRange:(row,col,height,width)=>{
    const range={setNumberFormat:()=>range,setFontWeight:()=>range,setBackground:()=>range,setFontColor:()=>range,setValues:values=>{
      if(failTable===name){failTable='';throw new Error('Synthetic write interruption');}
      for(let r=0;r<height;r++){obj.data[row+r-1]??=[];for(let c=0;c<width;c++){let v=values[r][c];if(typeof v==='string'&&v.startsWith("'"))v=v.slice(1);obj.data[row+r-1][col+c-1]=v;}}return range;
    }};return range;
  }};sheets.set(name,obj);return obj;
}
const book={getId:()=> 'score-test',getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>sheet(n)};
const books=new Map([['score-test',book]]);
sheet('Config',[['Key','Value','Note'],['CA_MAX',30,''],['EXAM_MAX',70,''],['CURRENT_SESSION','2026/2027',''],['SUBMISSIONS_OPEN','TRUE',''],['GRADE_MIN','GRADE','POINT'],[70,'A',5],[60,'B',4],[0,'F',0]]);
const context=vm.createContext({Date,JSON,Object,Number,String,Math,Array,Boolean,Error,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)??null,getProperties:()=>Object.fromEntries(props),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  SpreadsheetApp:{openById:id=>{const b=books.get(id);assert.ok(b,'Unknown test spreadsheet');return b;},flush:()=>{}},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA256'},Charset:{UTF_8:'utf8'},getUuid:randomUUID,computeDigest:(_a,v)=>[...createHash('sha256').update(v).digest()],formatDate:date=>date.toISOString().slice(0,10)},
  LockService:{getScriptLock:()=>({waitLock:()=>{if(held)throw new Error('Concurrent lock blocked');held=true;},releaseLock:()=>{held=false;}})},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)??null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'allow'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})}
});
for(const name of ['09_ScoreService.gs','10_ScoreSetup.gs','11_ClassManagement.gs']) vm.runInContext(fs.readFileSync(new URL('../../apps-script/portal/'+name,import.meta.url),'utf8'),context);

return {context,props,cache,sheets,book,books,controls:{get held(){return held;},set held(v){held=v;},get failTable(){return failTable;},set failTable(v){failTable=v;}}};
}
