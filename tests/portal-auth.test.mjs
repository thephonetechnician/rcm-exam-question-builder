import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
const properties = new Map([['PORTAL_SCORE_SPREADSHEET_ID','synthetic-test-sheet'],['PORTAL_FRONTEND_ORIGIN','http://localhost:4173']]);
const cache = new Map();
const tables = {
 Lecturers: [['Email','Name','Active','AccessCode'],['one@example.test','One','TRUE','TEST-CODE'],['two@example.test','Two','TRUE','OTHER-CODE'],['inactive@example.test','Inactive','FALSE','TEST-CODE']],
 Courses: [['CourseCode','Title','Programme','Level/Set','Semester','LecturerEmail'],['CRS101','Introduction','BA','100','1','one@example.test'],['CRS102','Other','BA','100','1','two@example.test'],['CRS103','Shared','BA','100','2','one@example.test; two@example.test']],
 Config: [['Key','Value','Note'],['CURRENT_SESSION','2026/2027','']]
};
let locked = false;
const context = vm.createContext({
 Date, JSON,
 PropertiesService: { getScriptProperties: () => ({getProperty:k=>properties.get(k) ?? null,getProperties:()=>Object.fromEntries(properties),setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k)}) },
 SpreadsheetApp: { openById: id => { assert.equal(id,'synthetic-test-sheet'); return {getSheetByName:name=>tables[name] ? {getDataRange:()=>({getValues:()=>structuredClone(tables[name])})}:null}; } },
 Utilities: {DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a,v)=>[...createHash('sha256').update(v).digest()],getUuid:randomUUID},
 CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)??null,remove:k=>cache.delete(k)})},
 LockService:{getScriptLock:()=>({waitLock:()=>{assert.equal(locked,false);locked=true;},releaseLock:()=>{locked=false;}})},
 HtmlService:{XFrameOptionsMode:{ALLOWALL:'allow'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})}
});
vm.runInContext(readFileSync(new URL('../apps-script/portal/08_PortalService.gs',import.meta.url),'utf8'),context);
const call=data=>context.portalRoute_(data);
const valid=()=>call({action:'portal.login',email:'ONE@EXAMPLE.TEST',code:'TEST-CODE',role:'Super Admin'});
let session=valid();
assert.match(session.token,/^[a-f0-9]{64}$/);
assert.equal(session.user.role,'Lecturer');
assert.deepEqual(Array.from(session.user.courses,c=>c.code),['CRS101','CRS103']);
assert.equal(JSON.stringify(session).includes('TEST-CODE'),false);
assert.equal(call({action:'portal.bootstrap',token:session.token,email:'two@example.test'}).user.email,'one@example.test');
assert.throws(()=>call({action:'portal.bootstrap',token:'forged'}),/Session expired/);
assert.throws(()=>call({action:'portal.login',email:'inactive@example.test',code:'TEST-CODE'}),/not recognised/);
for(let i=0;i<5;i++) assert.throws(()=>call({action:'portal.login',email:'two@example.test',code:'wrong'}),/not recognised/);
assert.throws(()=>call({action:'portal.login',email:'two@example.test',code:'OTHER-CODE'}),/Too many/);
assert.equal(locked,false);
tables.Lecturers[1][2]='FALSE';
assert.throws(()=>call({action:'portal.bootstrap',token:session.token}),/no longer active/);
tables.Lecturers[1][2]='TRUE';
call({action:'portal.logout',token:session.token});
assert.throws(()=>call({action:'portal.bootstrap',token:session.token}),/Session expired/);
session=valid();
for(const [key,value] of cache) {const item=JSON.parse(value);item.expires=0;cache.set(key,JSON.stringify(item));}
assert.throws(()=>call({action:'portal.bootstrap',token:session.token}),/Session expired/);
session=valid(); cache.clear();
assert.throws(()=>call({action:'portal.bootstrap',token:session.token}),/Session expired/);
const response=context.portalResponse_({action:'portal.login',email:'one@example.test',code:'TEST-CODE'},'test');
assert.ok(response.html.includes('"http://localhost:4173"'));
assert.ok(!response.html.includes(', "*"'));
properties.delete('PORTAL_SCORE_SPREADSHEET_ID');
assert.throws(valid,/not been configured/);
properties.delete('PORTAL_FRONTEND_ORIGIN');
assert.throws(()=>context.portalResponse_({},'test'),/Configure/);
console.log('PASS: lecturer authentication, isolation, role safety, lockout, inactive accounts, logout, expiry, cache loss and response origin.');
