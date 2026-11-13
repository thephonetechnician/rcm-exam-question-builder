// Local synthetic preview only. This server never connects to Google.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScoreHarness } from './helpers/score-harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {context,props}=createScoreHarness();
context.setupScoreMvp_();context.seedScoreDemo_();
props.set('SCORE_ADMIN_KEY','SYNTHETIC-ADMIN-KEY-ONLY-12345');context.configureScoreAdmin_();
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.ttf':'font/ttf'};
const client="window.ScoreAPI=Object.freeze({request:async payload=>{const response=await fetch('/__test-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!data.success)throw new Error(data.error);return data;}});";
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/__test-api'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>400000){res.writeHead(413).end();return;}}
      let data;try{data=context.scoreRoute_(JSON.parse(body));}catch(error){data={success:false,error:error.message};}
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));return;
    }
    if(url.pathname==='/js/score-api.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end(client);return;}
    const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/score-submission.html':url.pathname));
    if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return;}
    let data=await fs.readFile(target);if(path.extname(target)==='.html')data=Buffer.from(data.toString().replace('<body>','<body><div style="background:#fff0c5;padding:8px 20px;font:12px Arial;text-align:center">LOCAL TEST DATA — no live spreadsheet is connected</div>'));
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{res.writeHead(404).end();}
}).listen(4174,'127.0.0.1',()=>console.log('Synthetic score preview: http://127.0.0.1:4174/score-submission.html'));
