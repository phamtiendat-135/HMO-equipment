// Read-only audit: production code runs in a VM against synthetic services.
// No network, no real spreadsheet writes, no real mail.
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const source = fs.readFileSync('Google_Apps_Script.js', 'utf8');
const findings = [];
function check(name, fn) {
  try { const detail = fn(); findings.push({name, reproduced: true, detail}); }
  catch (e) { findings.push({name, reproduced: false, error: e.message}); }
}
class Sheet {
  constructor(name, rows) { this.name = name; this.rows = rows; }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(...this.rows.map(r => r.length)); }
  getDataRange() { return {getValues: () => this.rows.map(r => r.slice())}; }
  appendRow(row) { this.rows.push(row.slice()); }
  getRange(row, col, nr=1, nc=1) {
    const self=this;
    const cell = {
      getValues: () => Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>self.rows[row+i-1]?.[col+j-1] ?? '')),
      getValue: () => self.rows[row-1]?.[col-1] ?? '',
      setValue(v) { while(self.rows.length<row)self.rows.push([]); self.rows[row-1][col-1]=v; return cell; },
      setFormula(v) { return cell.setValue(v); },
      setValues(values) { values.forEach((r,i)=>r.forEach((v,j)=>self.getRange(row+i,col+j).setValue(v))); return cell; }
    };
    for(const m of ['setNumberFormat','setNote','setFontWeight','setBackground','setHorizontalAlignment','setFontColor','setFontSize','merge','setWrap','setFontStyle']) cell[m]=()=>cell;
    return cell;
  }
  setColumnWidth() {} setFrozenRows() {} clearContents(){this.rows=[];} clearFormats(){}
}
const headers=['Mã QR','Tên thiết bị','Người mượn','Đơn vị','Mục đích','Địa điểm','Ngày mượn','Ngày dự kiến trả','Ngày trả thực tế','Tình trạng mượn','Tình trạng trả','Phụ kiện','Phê duyệt','Ghi chú','Quá hạn','Email','Giờ sử dụng (h)','Đã nhắc trả'];
function loan(name='Borrower A', approval='(Chờ phê duyệt PTK)') {
  return ['HMO-OBS-8693','Test equipment',name,'Unit','Purpose','Test location',new Date(2026,8,20),new Date(2026,8,25),'','','','',approval,'','',name==='Borrower A'?'a@example.invalid':'b@example.invalid','',''];
}
function harness(rows=[]) {
  const master=new Sheet('Master_Data',[
    ['Mã QR','Tên thiết bị','Nguyên giá (tr.đ)','Phòng','Tình trạng thực tế (01/2025)','Số lượng','Nhóm (tên)'],
    ['HMO-OBS-8693','Test equipment',200,'P204-T3','Bình thường',1,'Quan trắc'],
    ['HMO-PC-0001','Broken equipment',10,'P207-T3','Hỏng',1,'Máy tính']
  ]);
  const log = new Sheet('Log_Muon_Tra',[headers,...rows]);
  const sheets={Master_Data:master,Log_Muon_Tra:log,Log_Bao_Tri:new Sheet('Log_Bao_Tri',[['Mã QR','Ngày hiệu chuẩn tiếp theo']]),Log_Bao_Hong:new Sheet('Log_Bao_Hong',[['Mã QR']])};
  const ss={getSheetByName:n=>sheets[n],getSheets:()=>Object.values(sheets),insertSheet:n=>(sheets[n]=new Sheet(n,[]))};
  const props={APPROVAL_SECRET:'audit-secret-only',LOG_ACCESS_CODE:'12345678'},cache={},mail=[],logs=[];
  const ctx=vm.createContext({Date,Math,JSON,Set,Map,String,Number,Array,Object,parseInt,parseFloat,isNaN,
    Logger:{log:(...v)=>logs.push(v.join(' '))},SpreadsheetApp:{openById:()=>ss,getUi:()=>({alert(){},ButtonSet:{OK:1}})},
    MailApp:{sendEmail:(...args)=>mail.push(args)},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v})},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(s,key)=>[...crypto.createHmac('sha256',key).update(s).digest()],base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),formatDate:d=>d instanceof Date ? d.toISOString() : String(d)},
    HtmlService:{createHtmlOutput:html=>({html})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})}
  });
  vm.runInContext(source,ctx);
  return {ctx,sheets,log,mail,logs,cache,props,run:s=>vm.runInContext(s,ctx)};
}
function event(fields,sheet='Form Responses 1') {return {namedValues:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,[v]])),range:{getSheet:()=>({getName:()=>sheet})}};}
const borrowFields={'Mã QR thiết bị':'HMO-OBS-8693','Họ và tên người mượn':'Borrower A','Ngày mượn':'20/09/2026','Ngày dự kiến trả':'25/09/2026','Email Address':'a@example.invalid'};
check('Maintenance and damage dispatch as loans',()=>{
  const h=harness();let calls=[];h.ctx.onFormSubmitBorrow=()=>calls.push('borrow');h.ctx.onFormSubmitReturn=()=>calls.push('return');
  h.ctx.onFormSubmitDispatch(event({'Mã QR thiết bị':'HMO-OBS-8693','Loại công việc':'Hiệu chuẩn','Ngày thực hiện':'28/09/2026'},'Form Responses 3'));
  h.ctx.onFormSubmitDispatch(event({'Mã QR thiết bị':'HMO-OBS-8693','Mức độ hỏng':'Nặng','Người phát hiện':'Reporter'},'Form Responses 4'));
  assert.deepEqual(calls,['borrow','borrow']);return calls;
});
check('Rejected loan blocks stock and remains active/overdue',()=>{
  const h=harness([loan('Borrower A','❌ Từ chối — PTK')]);
  const bs=h.ctx.checkBorrowStatus_('HMO-OBS-8693'); const all=h.ctx.getAllUsageLog_(200);
  assert.equal(bs.borrowedCount,1);assert.equal(all[0].isActive,true);assert.equal(all[0].isOverdue,true);
  return {borrowedCount:bs.borrowedCount,isActive:all[0].isActive,isOverdue:all[0].isOverdue};
});
check('Approval email for A approves newest pending B; same link then approves A',()=>{
  const h=harness([loan(),loan('Borrower B')]);const u=new URL(h.ctx.buildApprovalLink_('approve','HMO-OBS-8693'));
  const e={parameter:Object.fromEntries(u.searchParams)};h.ctx.doGet(e);
  assert.match(h.log.rows[2][12],/Đã phê duyệt/);assert.match(h.log.rows[1][12],/Chờ phê duyệt/);
  h.ctx.doGet(e);assert.match(h.log.rows[1][12],/Đã phê duyệt/);
  return 'One valid GET link mutates two distinct pending loans on consecutive uses';
});
check('Returner A closes most recent B loan for same QR',()=>{
  const h=harness([loan(),loan('Borrower B')]);h.ctx.onFormSubmitReturn(event({'Mã QR thiết bị':'HMO-OBS-8693','Họ và tên người trả':'Borrower A','Email Address':'a@example.invalid','Ngày trả':'28/09/2026'},'Form Responses 2'));
  assert.equal(h.log.rows[1][8],'');assert.ok(h.log.rows[2][8] instanceof Date);return 'B marked returned; A still active';
});
check('Mail failure prevents loan log and is swallowed by dispatcher',()=>{
  const h=harness();h.ctx.MailApp.sendEmail=()=>{throw new Error('Synthetic mail quota failure');};
  h.ctx.onFormSubmitDispatch(event(borrowFields));assert.equal(h.log.rows.length,1);assert.ok(h.logs.some(s=>s.includes('quota failure')));
  return 'No Log_Muon_Tra row, dispatcher returns normally';
});
check('Repeat same form event creates duplicate loans',()=>{
  const h=harness();const e=event(borrowFields);h.ctx.onFormSubmitBorrow(e);h.ctx.onFormSubmitBorrow(e);assert.equal(h.log.rows.length,3);return '2 rows, 2 emails';
});
check('Unknown QR is accepted as zero-value loan',()=>{
  const h=harness();h.ctx.onFormSubmitBorrow(event({...borrowFields,'Mã QR thiết bị':'HMO-OBS-99999'}));assert.equal(h.log.rows[1][0],'HMO-OBS-99999');assert.equal(h.log.rows[1][12],'');return 'Unknown asset appended without approval';
});
check('Broken equipment can be borrowed directly through form',()=>{
  const h=harness();h.ctx.onFormSubmitBorrow(event({...borrowFields,'Mã QR thiết bị':'HMO-PC-0001'}));assert.equal(h.log.rows[1][0],'HMO-PC-0001');return 'Backend ignores Master_Data broken status';
});
check('Quantity 1 can receive two active approved requests',()=>{
  const h=harness([loan('Borrower B','✅ Đã phê duyệt')]);h.ctx.onFormSubmitBorrow(event(borrowFields));assert.equal(h.ctx.checkBorrowStatus_('HMO-OBS-8693').borrowedCount,2);return '2 loans for qty 1 without stock check';
});
check('User-controlled formula reaches appendRow unchanged',()=>{
  const h=harness();h.ctx.onFormSubmitBorrow(event({...borrowFields,'Họ và tên người mượn':'=1+1'}));assert.equal(h.log.rows[1][2],'=1+1');return 'appendRow receives =1+1 in borrower column';
});
check('Stored HTML reaches approval response unescaped',()=>{
  const r=loan('<img src=x onerror="document.body.dataset.audit=1">');const h=harness([r]);const html=h.ctx.handleApproval_('approve','HMO-OBS-8693').html;assert.ok(html.includes(r[2]));return 'Attacker HTML is interpolated into HtmlOutput';
});
check('Invalid calendar date silently rolls into next month',()=>{
  const h=harness();const d=h.ctx.parseDate_('31/02/2026');assert.equal(d.getMonth(),2);return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
});
check('Annual utilization uses calendar hours divided by working hours',()=>{
  const r=loan('Borrower A','✅ Đã phê duyệt');r[6]=new Date(2026,0,1);r[8]=new Date(2026,0,11);r[16]=240;
  const h=harness([r]);let result;h.ctx.sendAnnualReportEmail_=(...args)=>result=args;h.ctx.generateAnnualUsageReport(2026);
  const report=result[1].find(x=>x.qr===r[0]);assert.equal(report.utilizationPct,12);return {tenCalendarDaysHours:report.totalHours,annualWorkingHours:2000,utilizationPct:report.utilizationPct};
});
check('Annual report omits cross-year and active loan hours',()=>{
  const r=loan();r[6]=new Date(2025,11,30);r[8]=new Date(2026,0,3);r[16]=96;
  const active=loan('Borrower B');active[6]=new Date(2026,0,1);
  const h=harness([r,active]);let result;h.ctx.sendAnnualReportEmail_=(...args)=>result=args;h.ctx.generateAnnualUsageReport(2026);
  const report=result[1].find(x=>x.qr===r[0]);assert.equal(report.totalHours,0);assert.equal(report.times,1);return {totalHours:report.totalHours,times:report.times};
});
check('Missing log sheet reports equipment available and empty history',()=>{
  const h=harness();delete h.sheets.Log_Muon_Tra;assert.equal(h.ctx.checkBorrowStatus_('HMO-OBS-8693').available,true);assert.equal(h.ctx.getUsageHistory_('HMO-OBS-8693').length,0);return 'Missing table becomes successful empty/free response';
});
check('Anonymous failed guesses lock out correct log code globally',()=>{
  const h=harness();for(let i=0;i<30;i++)h.ctx.checkLogAccess_('bad');assert.equal(h.ctx.checkLogAccess_('12345678'),'locked');return '30 synthetic failures block legitimate code';
});
check('Interleaved append sends first borrower email to second row metadata',()=>{
  const h=harness();const append=h.log.appendRow.bind(h.log);
  h.log.appendRow=row=>{append(row);append(loan('Borrower B'));};
  h.ctx.onFormSubmitBorrow(event(borrowFields));assert.equal(h.log.rows[2][15],'a@example.invalid');assert.equal(h.log.rows[1][15],undefined);
  return 'Simulated second submit between appendRow and getLastRow: email A written on row B';
});
check('Sync deduplicates two different borrowers on same QR and same date',()=>{
  const h=harness();const day=new Date(2026,8,20);
  h.sheets['Form Responses 1']=new Sheet('Form Responses 1',[
    ['Mã QR thiết bị','Họ và tên người mượn','Ngày mượn','Ngày dự kiến trả'],
    ['HMO-OBS-8693','Borrower A',day,new Date(2026,8,25)],
    ['HMO-OBS-8693','Borrower B',day,new Date(2026,8,26)]
  ]);h.ctx.syncFormResponsesToLog();assert.equal(h.log.rows.length,2);return '2 distinct source loans become only 1 log row';
});
check('Returning broken equipment still leaves stock available',()=>{
  const h=harness([loan()]);h.ctx.onFormSubmitReturn(event({'Mã QR thiết bị':'HMO-OBS-8693','Họ và tên người trả':'Borrower A','Ngày trả':'28/09/2026','Tình trạng thiết bị khi trả':'Hỏng — cần sửa chữa'},'Form Responses 2'));
  assert.equal(h.log.rows[1][10],'Hỏng — cần sửa chữa');assert.equal(h.sheets.Master_Data.rows[1][4],'Bình thường');assert.equal(h.ctx.checkBorrowStatus_('HMO-OBS-8693').available,true);return 'Condition saved in log only; asset remains available';
});
check('Return permits date earlier than borrowing',()=>{
  const h=harness([loan()]);h.ctx.onFormSubmitReturn(event({'Mã QR thiết bị':'HMO-OBS-8693','Ngày trả':'01/01/2020'},'Form Responses 2'));
  assert.ok(h.log.rows[1][8]<h.log.rows[1][6]);assert.equal(h.ctx.checkBorrowStatus_('HMO-OBS-8693').available,true);return 'Invalid chronological return closes the loan';
});
check('HMAC valid succeeds; altered/expired fails (positive control)',()=>{
  const h=harness();const u=new URL(h.ctx.buildApprovalLink_('approve','HMO-OBS-8693'));const t=u.searchParams.get('t'),sig=u.searchParams.get('sig');
  assert.equal(h.ctx.verifyApprovalLink_('approve','HMO-OBS-8693',t,sig),true);
  assert.equal(h.ctx.verifyApprovalLink_('reject','HMO-OBS-8693',t,sig),false);
  assert.equal(h.ctx.verifyApprovalLink_('approve','HMO-OBS-8693',String(Date.now()-15*864e5),sig),false);return 'Signing implementation passes these controls';
});
console.log(JSON.stringify(findings,null,2));
console.log(`Reproduced/controls passed: ${findings.filter(x=>x.reproduced).length}/${findings.length}`);
if(findings.some(x=>!x.reproduced)) process.exitCode=1;
