// Local end-to-end download QA. Never calls Google or writes real submissions.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const stub=`let state={tab:'new',form:makeForm(),savedList:null,savedLoading:false,statusMsg:'',statusType:''};
const fixture={...makeForm(),id:'synthetic-paper',questionCount:6,lecturerName:'QA Lecturer',courseCode:'QA201',courseTitle:'Synthetic Saved Paper',timestamp:'2026-11-15T12:00:00Z'};
fixture.questions.forEach((q,i)=>q.parts[0].text='Synthetic saved question '+(i+1));
function loadSaved(){state.savedList=[fixture];state.savedLoading=false;render();}
async function getSavedPaper(id,pin){if(pin!=='SYNTHETIC-PIN')throw Error('Use SYNTHETIC-PIN for this local test.');return {paper:fixture};}
async function persistSubmission(){return {success:true};}
async function deleteSubmission(){throw Error('Deletion is disabled in local download QA.');}
// Dialog input is synthetic too; no real PINs or browser prompt automation.
window.prompt=()=> 'SYNTHETIC-PIN';`;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/js/google-drive.js'){res.writeHead(200,{'Content-Type':types['.js'],'Cache-Control':'no-store'}).end(stub);return;}
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/exam-builder.html':url.pathname));
  if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch{res.writeHead(404).end();}}).listen(4175,'127.0.0.1',()=>console.log('Synthetic exam download QA: http://127.0.0.1:4175/exam-builder.html'));
