import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root={attributes:{},setAttribute(k,v){this.attributes[k]=v;}},events={},nodes=[];
const document={body:{append:x=>nodes.push(x)},createElement:()=>({lastElementChild:{textContent:''},setAttribute(){}}),querySelector:()=>root,addEventListener:(k,v)=>events[k]=v};
const window={};vm.runInNewContext(fs.readFileSync(new URL('../js/activity.js',import.meta.url),'utf8'),{window,document});
const a=window.RCMActivity.begin('Loading courses…'),b=window.RCMActivity.begin('Saving assignments…');assert.equal(root.attributes['aria-busy'],'true');assert.equal(nodes[0].hidden,false);assert.equal(nodes[0].lastElementChild.textContent,'Saving assignments…');a();assert.equal(nodes[0].hidden,false);b();assert.equal(nodes[0].hidden,true);assert.equal(root.attributes['aria-busy'],'false');
await assert.rejects(()=>window.RCMActivity.run('Working…',async()=>{throw Error('Synthetic failure');}),/Synthetic failure/);assert.equal(nodes[0].hidden,true);
console.log('PASS: visible loading feedback, concurrent request accounting, aria-busy state and cleanup after failures.');
