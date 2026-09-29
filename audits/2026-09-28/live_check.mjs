// Read-only public GET checks; never submits forms or calls approval actions.
import fs from 'node:fs';
import crypto from 'node:crypto';
const html=fs.readFileSync('index.html','utf8');
const api=html.match(/const WEB_APP_URL = '([^']+)'/)[1];
const base='https://phamtiendat-135.github.io/HMO-equipment/';
const forms=Object.fromEntries([...html.matchAll(/^  (borrow|return|maintain|report): '([^']+)'/gm)].map(m=>[m[1],m[2]]));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function get(url) {const start=Date.now();const r=await fetch(url,{signal:AbortSignal.timeout(40000)});const text=await r.text();return {r,text,ms:Date.now()-start};}
for(const file of ['index.html','QR_Landing_Page.html','sw.js','manifest.json']) {
  const {r,text,ms}=await get(base+file);console.log(JSON.stringify({kind:'static',file,status:r.status,identicalToLocal:hash(text)===hash(fs.readFileSync(file,'utf8')),ms}));
}
for(const q of (process.argv.includes('--api') ? ['?id=HMO-OBS-8693','?action=history&id=HMO-OBS-8693','?action=allStatus','?action=alllog'] : [])) {
  const {r,text,ms}=await get(api+q);let j;try{j=JSON.parse(text);}catch{}
  console.log(JSON.stringify({kind:'api',query:q,status:r.status,ms,json:!!j,keys:j?Object.keys(j):[],count:j?.history?.length??j?.entries?.length,error:j?.error,ok:j?.ok,borrowStatus:j?._borrowStatus,masterNotesPublic:!!(j && ('Ghi chú gốc' in j || 'Giải trình rà soát' in j))}));
}
for(const [name,url] of Object.entries(forms)) {
  const {r,text,ms}=await get(url+'HMO-OBS-8693');const entry=new URL(url).searchParams.keys().find?.(k=>k.startsWith('entry.'));
  const title=text.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  console.log(JSON.stringify({kind:'form',name,status:r.status,ms,title,containsPrefilledQr:text.includes('HMO-OBS-8693'),loginPage:r.url.includes('accounts.google.com'),entry:entry??url.match(/entry\.(\d+)/)[0]}));
}
