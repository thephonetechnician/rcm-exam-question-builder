import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/theme.js',import.meta.url),'utf8');
function harness({stored=null,dark=false,blocked=false}={}){
  const root={dataset:{},style:{}},events={},systemEvents={},buttonEvents={},meta={};
  const button={hidden:true,attributes:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){buttonEvents[k]=v;}};
  const storage=new Map(stored?[['rcm-appearance',stored]]:[]);
  const system={matches:dark,addEventListener(k,v){systemEvents[k]=v;}};
  const document={documentElement:root,querySelector:s=>s.startsWith('meta')?meta:null,querySelectorAll:s=>s==='[data-theme-toggle]'?[button]:[],addEventListener(k,v){events[k]=v;}};
  const window={matchMedia:()=>system,addEventListener(k,v){events[k]=v;}};
  vm.runInNewContext(source,{document,window,localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k);},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}}});
  events.DOMContentLoaded();return {window,root,button,meta,events,systemEvents,buttonEvents,storage,system};
}
let h=harness({dark:true});assert.equal(h.root.dataset.theme,'dark');assert.equal(h.button.attributes['aria-pressed'],'true');assert.equal(h.button.hidden,false);
h.buttonEvents.click();assert.equal(h.root.dataset.theme,'light');assert.equal(h.storage.get('rcm-appearance'),'light');assert.match(h.button.innerHTML,/Night mode/);
h=harness({stored:'dark',dark:false});assert.equal(h.root.dataset.theme,'dark');h.systemEvents.change();assert.equal(h.root.dataset.theme,'dark','Saved preference overrides system');
h.events.storage({key:'rcm-appearance',newValue:'light'});assert.equal(h.root.dataset.theme,'light','Other tabs stay in sync');
h.events.storage({key:'rcm-appearance',newValue:null});h.system.matches=true;h.systemEvents.change();assert.equal(h.root.dataset.theme,'dark','Cleared preference follows system');
h=harness({stored:'invalid'});assert.equal(h.root.dataset.theme,'light');
h=harness({blocked:true});h.buttonEvents.click();assert.equal(h.root.dataset.theme,'dark','Storage restrictions must not break switching');
console.log('PASS: day/night initial preference, system changes, persisted choice, cross-tab sync, accessible toggle labels and blocked storage fallback.');
h=harness();h.window.RCMTheme.setDefault('ocean');assert.equal(h.root.dataset.palette,'ocean');h.window.RCMTheme.choosePalette('classic');assert.equal(h.storage.get('rcm-theme-style'),'classic');h.window.RCMTheme.setDefault('aurora');assert.equal(h.root.dataset.palette,'classic','Personal choice overrides the shared default');h.events.storage({key:'rcm-theme-style',newValue:'ocean'});assert.equal(h.root.dataset.palette,'ocean');h.window.RCMTheme.choosePalette('invalid');assert.equal(h.root.dataset.palette,'ocean');
console.log('PASS: three palette choices, persistent personal choice, school defaults and palette cross-tab sync.');
const css=fs.readFileSync(new URL('../css/academic-theme.css',import.meta.url),'utf8');
const luminance=hex=>{const s=hex.slice(1),v=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const blocks=[css.match(/:root\s*\{([^}]+)\}/)[1],css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)[1]];
for(const block of blocks){
  const c=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{3,6})\s*;/gi)].map(m=>[m[1],m[2].length===4?'#'+[...m[2].slice(1)].map(x=>x+x).join(''):m[2]]));
  for(const [fg,bg] of [['ink','bg'],['muted','surface'],['muted','elevated'],['accent','on-accent'],['accent','accent-soft'],['good','good-bg'],['bad','bad-bg'],['warn','warn-bg'],['violet','violet-bg']])assert.ok(ratio(c[fg],c[bg])>=4.5,`${fg}/${bg} needs 4.5:1 contrast`);
  assert.ok(ratio(c['control-border'],c.elevated)>=3,'Form borders need 3:1 contrast');
}
console.log('PASS: day/night text, semantic status colours and form-boundary contrast.');
const paletteCss=fs.readFileSync(new URL('../css/theme-palettes.css',import.meta.url),'utf8');
const colours=block=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{3,6})\s*;/gi)].map(m=>[m[1],m[2].length===4?'#'+[...m[2].slice(1)].map(x=>x+x).join(''):m[2]]));
for(const palette of ['classic','ocean'])for(const dark of [false,true]){
 const light=paletteCss.match(new RegExp(':root\\[data-palette="'+palette+'"\\]\\s*\\{([^}]+)\\}'))[1];
 const night=paletteCss.match(new RegExp(':root\\[data-palette="'+palette+'"\\]\\[data-theme="dark"\\]\\s*\\{([^}]+)\\}'))[1];
 const c={...colours(blocks[0]),...(dark?colours(blocks[1]):{}),...colours(light),...(dark?colours(night):{})};
 for(const [fg,bg] of [['ink','bg'],['muted','surface'],['muted','elevated'],['accent','on-accent'],['accent','accent-soft']])assert.ok(ratio(c[fg],c[bg])>=4.5,`${palette}/${dark} ${fg}/${bg} needs 4.5:1`);
 assert.ok(ratio(c['control-border'],c.elevated)>=3,`${palette}/${dark} control contrast`);
}
console.log('PASS: Classic College and Ocean day/night palette contrast.');
