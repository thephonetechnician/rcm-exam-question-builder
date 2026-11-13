import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const name of ['portal-auth.test.mjs','score-service.test.mjs','class-management.test.mjs','score-imports.test.mjs','score-exports.test.mjs']){
  const result=spawnSync(process.execPath,[fileURLToPath(new URL(name,import.meta.url))],{stdio:'inherit'});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
}
console.log('All portal checks passed.');
