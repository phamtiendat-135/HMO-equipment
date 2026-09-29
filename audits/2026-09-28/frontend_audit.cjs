// Isolated DOM + fake fetch. The synthetic XSS proof makes no network request.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.argv[2]||'jsdom');
const html=fs.readFileSync('index.html','utf8');
const results=[];const tick=()=>new Promise(r=>setTimeout(r,30));
async function test(name,fn){try{results.push({name,verified:true,detail:await fn()});}catch(e){results.push({name,verified:false,error:e.message});}}
function make(query='',response={_borrowStatus:{available:true,borrowedCount:0}}){
  let requests=[];
  const dom=new JSDOM(html,{url:'https://audit.invalid/HMO-equipment/'+query,runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>response};};
    w.localStorage.setItem('hmo_log_access_code','87654321');
  }});return {dom,w:dom.window,requests};
}
(async()=>{
await test('QR print HTML has cards outside grids and orphan text',async()=>{
  const dom=new JSDOM(fs.readFileSync('QR_Labels_Print.html','utf8'));const d=dom.window.document;
  const cards=[...d.querySelectorAll('.qr-card')];
  const outside=cards.filter(c=>!c.closest('.qr-grid'));
  const indirect=cards.filter(c=>!c.parentElement.matches('.qr-grid'));
  const orphan=[...d.querySelectorAll('.qr-name')].filter(c=>!c.closest('.qr-card'));
  const rooms=[...d.querySelectorAll('.room-section')].map(r=>r.querySelectorAll('.qr-card').length);
  assert.equal(cards.length,54);assert.equal(outside.length,18);assert.equal(indirect.length,19);assert.equal(orphan.length,8);assert.deepEqual(rooms,[1,18,0,8,9]);
  dom.window.close();return {cards:54,outsideGrid:outside.length,notDirectGridChild:indirect.length,orphanNames:orphan.length,roomCardCounts:rooms};
});
await test('All 74 entries render with matching QR and form links',async()=>{
  const {dom,w}=make();const codes=w.eval('Object.keys(EQUIPMENT)');
  for(const code of codes){w.showEquipment(code);assert.equal(w.document.querySelector('.equip-code').textContent,code);const links=[...w.document.querySelectorAll('.actions a')];assert.ok(links.every(a=>a.href.endsWith(code)));}
  dom.window.close();return {count:codes.length};
});
await test('URL query injects executable HTML and reads synthetic saved access code',async()=>{
  const payload='<img src=x onerror="window.auditRead=localStorage.getItem(\'hmo_log_access_code\')">';
  const {dom,w}=make('?id='+encodeURIComponent(payload));const injected=w.document.querySelector('.not-found img');assert.ok(injected);
  injected.dispatchEvent(new w.Event('error'));assert.equal(w.auditRead,'87654321');dom.window.close();return 'URL-controlled handler executes in page origin and can read stored code';
});
await test('Inherited object key is treated as an equipment record',async()=>{
  const {dom,w}=make('?id=constructor');assert.ok(w.document.querySelector('.equip-card'));assert.equal(w.document.querySelector('.equip-name').textContent,'Object');dom.window.close();return 'constructor is rendered as phantom asset Object';
});
await test('History offline/error JSON is displayed as no usage',async()=>{
  const {dom,w}=make('?id=HMO-OBS-8693',{error:'offline',available:null,borrowedCount:0});w.toggleUsageHistory('HMO-OBS-8693');await tick();assert.ok(w.document.querySelector('.history-empty'));dom.window.close();return 'Offline response maps to empty history';
});
await test('Training placeholder reports saved without sending or storing input',async()=>{
  const {dom,w,requests}=make('?id=HMO-OBS-8693');const before=requests.length;w.document.getElementById('sec-train-input').value='AUDIT-ONLY';w.submitInput('sec-train','HMO-OBS-8693','training');assert.match(w.document.getElementById('sec-train-success').textContent,/Đã ghi nhận/);assert.equal(requests.length,before);dom.window.close();return 'Success text with no persistence call';
});
await test('Three poor-condition entries normalized and styled correctly (positive control)',async()=>{
  const {dom,w}=make();const n=w.eval('Object.values(EQUIPMENT).filter(e=>e.status===\'Kém\').length');assert.equal(n,3);assert.equal(w.getStatusClass('Kém'),'status-poor');dom.window.close();return {count:n};
});
await test('API updated master manager ignored by detail rendering',async()=>{
  const {dom,w}=make('?id=HMO-HPC-7748',{'CB quản lý hiện tại':'Audit Manager',_borrowStatus:{available:true,borrowedCount:0}});await tick();assert.ok(w.document.getElementById('content').textContent.includes('Chưa phân công'));assert.ok(!w.document.getElementById('content').textContent.includes('Audit Manager'));dom.window.close();return 'Only _borrowStatus from API is used';
});
await test('History/log output escapes untrusted display values (positive control)',async()=>{
  const {dom,w}=make('?id=HMO-OBS-8693',{history:[{borrower:'<img src=x onerror=alert(1)>',location:'<svg>',borrowDate:'date',returnDate:'date'}]});w.toggleUsageHistory('HMO-OBS-8693');await tick();assert.equal(w.document.querySelector('#history-list img'),null);assert.ok(w.document.querySelector('#history-list').textContent.includes('<img'));dom.window.close();return 'Escaping works in history renderer';
});
await test('Service worker activation deletes unrelated origin caches',async()=>{
  const listeners={},removed=[];let done;
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self:{addEventListener:(n,fn)=>listeners[n]=fn,clients:{claim:async()=>{}},location:{hostname:'audit.invalid'}},caches:{keys:async()=>['hmo-equipment-v8','another-project-cache','hmo-equipment-v9'],delete:async k=>removed.push(k)},URL,Response,fetch});
  listeners.activate({waitUntil:p=>done=p});await done;assert.ok(removed.includes('another-project-cache'));return removed;
});
console.log(JSON.stringify(results,null,2));console.log(`Verified: ${results.filter(r=>r.verified).length}/${results.length}`);if(results.some(r=>!r.verified))process.exitCode=1;
})();
