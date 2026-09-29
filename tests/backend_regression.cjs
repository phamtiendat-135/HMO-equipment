// Regression cho Google_Apps_Script.js — chạy code thật trong VM với Sheets/Mail/Properties giả.
// Không gọi mạng, không ghi Sheet thật, không gửi mail thật.
// Chạy từ thư mục gốc repo:  node tests/backend_regression.cjs
// Mỗi test khẳng định HÀNH VI ĐÚNG (ngược với audits/2026-09-28 vốn tái hiện lỗi).
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const SOURCE = fs.readFileSync('Google_Apps_Script.js', 'utf8');
const results = [];
function test(name, fn) {
  try { fn(); results.push([true, name]); }
  catch (e) { results.push([false, name, e.message]); }
}

// ---------- Google Sheets giả ----------
class Sheet {
  constructor(name, rows, maxCols = 26) { this.name = name; this.rows = rows; this.maxCols = maxCols; }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(_, n) { this.maxCols += n; }
  getDataRange() {
    const width = this.getLastColumn();
    return { getValues: () => this.rows.map(r => Array.from({ length: width }, (_, j) => r[j] ?? '')) };
  }
  getRange(row, col, nr = 1, nc = 1) {
    const self = this;
    if (col + nc - 1 > this.maxCols) throw new Error(`Range vượt số cột (${col + nc - 1} > ${this.maxCols})`);
    const set = (r, c, v) => { while (self.rows.length < r) self.rows.push([]); self.rows[r - 1][c - 1] = v; };
    const range = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => self.rows[row + i - 1]?.[col + j - 1] ?? '')),
      getValue: () => self.rows[row - 1]?.[col - 1] ?? '',
      setValue(v) { set(row, col, v); return range; },
      setFormula(v) { set(row, col, v); return range; },
      setValues(values) { values.forEach((r, i) => r.forEach((v, j) => set(row + i, col + j, v))); return range; },
      setFormulas(values) { return range.setValues(values); }
    };
    for (const m of ['setNumberFormat', 'setNote', 'setFontWeight', 'setBackground', 'setHorizontalAlignment',
      'setFontColor', 'setFontSize', 'merge', 'setWrap', 'setFontStyle']) range[m] = () => range;
    return range;
  }
  setColumnWidth() {} setFrozenRows() {} clearContents() { this.rows = []; } clearFormats() {}
}

const LOG_HEADERS = ['Mã QR', 'Tên thiết bị', 'Người mượn', 'Đơn vị/Nhóm NC', 'Mục đích sử dụng', 'Địa điểm triển khai',
  'Ngày mượn', 'Ngày dự kiến trả', 'Ngày trả thực tế', 'Tình trạng khi mượn', 'Tình trạng khi trả', 'Phụ kiện kèm theo',
  'Người phê duyệt', 'Ghi chú', 'Quá hạn', 'Email', 'Giờ sử dụng (h)', 'Đã nhắc trả'];
const QR = 'HMO-OBS-8693';
const MASTER_ROWS = [
  ['Mã QR', 'Tên thiết bị', 'Nguyên giá (tr.đ)', 'Địa điểm (chuẩn)', 'Tình trạng thực tế (01/2025)', 'Số lượng', 'Nhóm (tên)', 'Ghi chú gốc'],
  [QR, 'Máy đo chất lượng nước', 200, 'P204-T3', 'Bình thường', 1, 'Quan trắc', 'GHI CHÚ NỘI BỘ'],
  ['HMO-PC-0001', 'Máy hỏng', 10, 'P207-T3', 'Hỏng', 1, 'Máy tính', ''],
  ['HMO-LAB-0002', 'Mô hình rẻ', 10, 'P401-T3', 'Tốt', 2, 'Thí nghiệm', '']
];

/** Dòng Log_Muon_Tra kiểu cũ (18 cột, chưa có Mã giao dịch). */
function legacyLoan(name, approval, email) {
  return [QR, 'Máy đo chất lượng nước', name, 'BM Thủy văn', 'Đo đạc', 'Hội An', new Date(2026, 8, 20),
    new Date(2026, 8, 25), '', 'Tốt', '', '', approval, '', '', email || '', '', ''];
}

function pad2(n) { return String(n).padStart(2, '0'); }
function fakeFormatDate(d, _tz, pattern) {
  return pattern.replace('yyyy', d.getFullYear()).replace('yy', String(d.getFullYear()).slice(2))
    .replace('MM', pad2(d.getMonth() + 1)).replace('dd', pad2(d.getDate()))
    .replace('HH', pad2(d.getHours())).replace('mm', pad2(d.getMinutes()));
}

function harness(logRows = [], opts = {}) {
  const sheets = {
    Master_Data: new Sheet('Master_Data', MASTER_ROWS.map(r => r.slice())),
    Log_Muon_Tra: new Sheet('Log_Muon_Tra', [LOG_HEADERS.slice(), ...logRows], opts.logMaxCols || 18),
    Log_Bao_Tri: new Sheet('Log_Bao_Tri', [['Mã QR', 'Tên thiết bị', 'Loại (Bảo trì/Hiệu chuẩn/Sửa chữa)', 'Ngày thực hiện',
      'Ngày hiệu chuẩn tiếp theo', 'Đơn vị thực hiện', 'Chi phí (tr.đ)', 'Nội dung công việc', 'Kết quả',
      'Người thực hiện', 'Người phê duyệt', 'Tài liệu đính kèm', 'Ghi chú']])
  };
  if (opts.noLog) delete sheets.Log_Muon_Tra;
  const ss = {
    getSheetByName: n => sheets[n] || null,
    getSheets: () => Object.values(sheets),
    insertSheet: n => (sheets[n] = new Sheet(n, []))
  };
  const props = Object.assign({ LOG_ACCESS_CODE: '12345678' }, opts.props || {});
  const cache = {}, mail = [], logs = [];
  const ctx = vm.createContext({
    Date, Math, JSON, Set, Map, String, Number, Array, Object, parseInt, parseFloat, isNaN, Error, URL,
    Logger: { log: (...v) => logs.push(v.join(' ')) },
    SpreadsheetApp: { openById: () => ss, flush() {}, getUi: () => ({ alert() {}, ButtonSet: { OK: 1 } }) },
    MailApp: { sendEmail: (...args) => { if (opts.mailFails) throw new Error('Synthetic mail quota failure'); mail.push(args); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (s, key) => [...crypto.createHmac('sha256', key).update(s).digest()],
      computeDigest: (_, v) => [...crypto.createHash('sha256').update(v).digest()],
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      base64EncodeWebSafe: b => Buffer.from(b.map(x => (x + 256) % 256)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      formatDate: fakeFormatDate
    },
    HtmlService: { createHtmlOutput: html => ({ html, setTitle() { return this; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) }
  });
  vm.runInContext(SOURCE, ctx);
  return { ctx, sheets, log: sheets.Log_Muon_Tra, mail, logs, props, cache };
}

let rowCounter = 2;
function formEvent(fields, sheetName = 'Form Responses 1', stamp) {
  const row = rowCounter++;
  const namedValues = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]]));
  return {
    namedValues,
    values: [stamp || `29/09/2026 10:00:${pad2(row % 60)}`].concat(Object.values(fields)),
    range: { getSheet: () => ({ getName: () => sheetName }), getRow: () => row }
  };
}
const borrowFields = (over = {}) => Object.assign({
  'Mã QR thiết bị': QR, 'Họ và tên người mượn': 'Nguyễn Văn A', 'Đơn vị / Nhóm nghiên cứu': 'BM Thủy văn',
  'Mục đích sử dụng': 'Đo đạc', 'Địa điểm triển khai': 'Hội An', 'Ngày mượn': '20/09/2026',
  'Ngày dự kiến trả': '25/09/2026', 'Email Address': 'a@example.invalid'
}, over);
const returnFields = (over = {}) => Object.assign({
  'Mã QR thiết bị': QR, 'Họ và tên người trả': 'Nguyễn Văn A', 'Ngày trả': '26/09/2026',
  'Tình trạng thiết bị khi trả': 'Bình thường', 'Email Address': 'a@example.invalid'
}, over);
const col = h => h.ctx.LOG_COL !== undefined ? h.ctx.LOG_COL : vm.runInContext('LOG_COL', h.ctx);
const run = (h, code) => vm.runInContext(code, h.ctx);
const params = url => Object.fromEntries(new URL(url).searchParams);
const lastRow = h => h.log.rows[h.log.rows.length - 1];

// ====================== P1-02: dispatcher 4 form ======================
test('P1-02 form bảo trì ghi Log_Bao_Tri, KHÔNG tạo khoản mượn', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEvent({ 'Mã QR thiết bị': QR, 'Loại công việc': 'Hiệu chuẩn',
    'Ngày thực hiện': '28/09/2026', 'Đơn vị thực hiện': 'Thuê ngoài',
    'Tên đơn vị thực hiện (nếu thuê ngoài)': 'Cty X', 'Chi phí (triệu VNĐ)': '1,5', 'Kết quả': 'Đạt' }, 'Form Responses 3'));
  assert.equal(h.log.rows.length, 1, 'không được có dòng mượn');
  const r = h.sheets.Log_Bao_Tri.rows[1];
  assert.equal(r[0], QR);
  assert.equal(r[5], 'Thuê ngoài — Cty X', 'khớp đúng "Đơn vị thực hiện", không lấy nhầm tên đơn vị');
  assert.equal(r[6], 1.5);
  assert.ok(h.mail.some(m => /Bảo trì/.test(m[1])));
});
test('P1-02 form báo hỏng ghi Log_Bao_Hong (tạo header), KHÔNG tạo khoản mượn', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEvent({ 'Mã QR thiết bị': QR, 'Người phát hiện': 'B', 'Mức độ hỏng': 'Nặng',
    'Mô tả sự cố': 'Không lên nguồn', 'Hoàn cảnh xảy ra': 'Khi đo', 'Link ảnh chụp hiện trạng (nếu có)': 'http://x' }, 'Form Responses 4'));
  assert.equal(h.log.rows.length, 1);
  const s = h.sheets.Log_Bao_Hong;
  assert.equal(s.rows[0][0], 'Mã QR');
  assert.equal(s.rows[1][4], 'Nặng');
  assert.equal(s.rows[1][7], 'http://x', 'link ảnh không bị lấy nhầm "Hoàn cảnh"');
  assert.ok(h.mail.some(m => /Báo hỏng/.test(m[1])));
});
test('P1-02 form lạ bị từ chối + báo admin, không gọi handler nào', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEvent({ 'Mã QR thiết bị': QR, 'Câu hỏi lạ': 'x' }));
  assert.equal(h.log.rows.length, 1);
  assert.ok(h.mail.some(m => /Không nhận diện/.test(m[1])));
});
test('P1-02 form mượn / trả vẫn nhận đúng loại', () => {
  const nv = f => formEvent(f).namedValues;
  const h = harness();
  assert.equal(h.ctx.classifyFormEvent_(nv(borrowFields())), 'borrow');
  assert.equal(h.ctx.classifyFormEvent_(nv(returnFields())), 'return');
});

// ====================== P1-05: trạng thái điều khiển tồn ======================
test('P1-05 khoản bị từ chối KHÔNG giữ chỗ, không đang mượn, không quá hạn', () => {
  const h = harness([legacyLoan('A', '❌ Từ chối — PTK (21/09/2026 10:00)')]);
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  const e = h.ctx.getAllUsageLog_(200)[0];
  assert.equal(e.isActive, false);
  assert.equal(e.isOverdue, false);
  assert.equal(e.status, 'rejected');
});
test('P1-05 chờ duyệt GIỮ CHỖ nhưng không bị nhắc quá hạn', () => {
  const h = harness([legacyLoan('A', '(Chờ phê duyệt PTK)', 'a@example.invalid')]);
  const bs = h.ctx.checkBorrowStatus_(QR);
  assert.equal(bs.available, false);
  assert.equal(bs.status, 'pending');
  assert.equal(bs.daysOverdue, 0);
  h.ctx.checkOverdueReturns();
  assert.equal(h.mail.length, 0, 'không gửi email quá hạn cho yêu cầu chưa bàn giao');
});
test('P1-05 đã duyệt quá hạn thì vẫn nhắc', () => {
  const h = harness([legacyLoan('A', '✅ Đã phê duyệt — PTK', 'a@example.invalid')]);
  h.ctx.checkOverdueReturns();
  assert.ok(h.mail.some(m => m[0] === 'a@example.invalid'));
});

// ====================== P1-06: validation server ======================
test('P1-06 QR lạ → tự động từ chối, báo admin', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-OBS-99999' })));
  assert.match(lastRow(h)[12], /Tự động từ chối — Mã QR không có/);
  assert.equal(h.ctx.checkBorrowStatus_('HMO-OBS-99999').available, true);
  assert.ok(h.mail.some(m => /từ chối tự động/.test(m[1])));
});
test('P1-06 thiết bị Hỏng → tự động từ chối', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-PC-0001' })));
  assert.match(lastRow(h)[12], /Tự động từ chối — Thiết bị đang ở tình trạng "Hỏng"/);
});
test('P1-06 số lượng 1 đã có người mượn → tự động từ chối', () => {
  const h = harness([legacyLoan('B', '✅ Đã phê duyệt')]);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.match(lastRow(h)[12], /hết \(1\/1\)/);
  assert.equal(h.ctx.checkBorrowStatus_(QR).borrowedCount, 1);
});
test('P1-06 số lượng 2 cho mượn 2 lần, lần 3 bị từ chối', () => {
  const h = harness();
  const f = () => formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' }));
  h.ctx.onFormSubmitBorrow(f());
  h.ctx.onFormSubmitBorrow(f());
  h.ctx.onFormSubmitBorrow(f());
  const approvals = h.log.rows.slice(1).map(r => r[12]);
  assert.deepEqual(approvals.slice(0, 2), ['', '']);
  assert.match(approvals[2], /hết \(2\/2\)/);
});
test('P1-06 khoản bị từ chối trước đó KHÔNG chặn yêu cầu mới', () => {
  const h = harness([legacyLoan('B', '❌ Từ chối — PTK')]);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.equal(lastRow(h)[12], '(Chờ phê duyệt PTK)');
});
test('P1-06 hạn trả trước ngày mượn / ngày không tồn tại → từ chối', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Ngày dự kiến trả': '10/09/2026' })));
  assert.match(lastRow(h)[12], /trước ngày mượn/);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002', 'Ngày dự kiến trả': '31/02/2027' })));
  assert.match(lastRow(h)[12], /không hợp lệ/);
});

// ====================== P1-07: toàn vẹn ghi ======================
test('P1-07 mail lỗi → dòng VẪN được ghi, lỗi được ném ra (không nuốt)', () => {
  const h = harness([], { mailFails: true });
  assert.throws(() => h.ctx.onFormSubmitDispatch(formEvent(borrowFields())), /gửi email thất bại/);
  assert.equal(h.log.rows.length, 2);
  assert.ok(lastRow(h)[18], 'có Mã giao dịch để gửi lại');
});
test('P1-07 chạy lại CÙNG event → chỉ 1 dòng, 1 lượt email', () => {
  const h = harness();
  const e = formEvent(borrowFields());
  h.ctx.onFormSubmitBorrow(e);
  const mails = h.mail.length;
  h.ctx.onFormSubmitBorrow(e);
  assert.equal(h.log.rows.length, 2);
  assert.equal(h.mail.length, mails);
});
test('P1-07 email/metadata nằm cùng dòng với khoản mượn (ghi 1 lần, số dòng xác định)', () => {
  const h = harness([legacyLoan('B', '✅ Đã phê duyệt', 'b@example.invalid')]);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  const r = lastRow(h);
  assert.equal(r[2], 'Nguyễn Văn A');
  assert.equal(r[15], 'a@example.invalid');
  assert.match(r[14], /^=IF\(AND\(H3<>""/, 'công thức Quá hạn trỏ đúng dòng 3');
  assert.equal(h.log.rows[1][15], 'b@example.invalid', 'dòng cũ không bị ghi đè');
});
test('P1-07 đồng bộ: 2 người mượn cùng QR cùng ngày → 2 dòng; chạy lại → không trùng', () => {
  const h = harness();
  const day = new Date(2026, 8, 20);
  h.sheets['Form Responses 1'] = new Sheet('Form Responses 1', [
    ['Dấu thời gian', 'Mã QR thiết bị', 'Họ và tên người mượn', 'Ngày mượn', 'Ngày dự kiến trả'],
    [new Date(2026, 8, 20, 9), QR, 'Người A', day, new Date(2026, 8, 25)],
    [new Date(2026, 8, 20, 10), QR, 'Người B', day, new Date(2026, 8, 26)]
  ]);
  h.ctx.syncFormResponsesToLog();
  assert.equal(h.log.rows.length, 3);
  h.ctx.syncFormResponsesToLog();
  assert.equal(h.log.rows.length, 3);
});
test('P1-07 đồng bộ sau khi trigger đã ghi → không tạo dòng trùng', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': 'Người A' })));
  h.sheets['Form Responses 1'] = new Sheet('Form Responses 1', [
    ['Dấu thời gian', 'Mã QR thiết bị', 'Họ và tên người mượn', 'Ngày mượn', 'Ngày dự kiến trả'],
    [new Date(2026, 8, 20, 9), QR, 'Người A', new Date(2026, 8, 20), new Date(2026, 8, 25)]
  ]);
  h.ctx.syncFormResponsesToLog();
  assert.equal(h.log.rows.length, 2);
});
test('P1-07 nâng cấu trúc: dòng cũ được gán Mã giao dịch, thêm header S–U, chỉ chạy 1 lần', () => {
  const h = harness([legacyLoan('A', ''), legacyLoan('B', '')]);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  assert.deepEqual(h.log.rows[0].slice(18, 21), ['Mã giao dịch', 'Nguồn phản hồi mượn', 'Nguồn phản hồi trả']);
  const ids = h.log.rows.slice(1).map(r => r[18]);
  assert.ok(ids.every(id => /^L\d{6}-[0-9A-F]{6}$/.test(id)), ids.join(','));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(h.props.LOG_SCHEMA_VERSION, '2');
  assert.match(h.log.rows[1][14], /SEARCH\("chối"/, 'công thức quá hạn cũ được cập nhật');
});

// ====================== P1-08: chèn công thức / HTML ======================
test('P1-08 giá trị bắt đầu = + - @ được ghi dạng văn bản', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': '=IMPORTXML("http://x")',
    'Mục đích sử dụng': '+1', 'Ghi chú': '@me', 'Email Address': '-x' })));
  const r = lastRow(h);
  assert.equal(r[2], '\'=IMPORTXML("http://x")');
  assert.equal(r[4], "'+1");
  assert.equal(r[13], "'@me");
  assert.equal(r[15], "'-x");
});
test('P1-08 HTML người dùng nhập bị escape ở trang phê duyệt và email', () => {
  const bad = '<img src=x onerror="alert(1)">';
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': bad })));
  const html = h.mail.find(m => m[3] && m[3].htmlBody)[3].htmlBody;
  assert.ok(!html.includes(bad) && html.includes('&lt;img'), 'email HTML');
  const link = params(run(h, `buildApprovalLink_('approve', ${JSON.stringify(lastRow(h)[18])})`));
  const page = h.ctx.doGet({ parameter: link }).html;
  assert.ok(!page.includes(bad) && page.includes('&lt;img'), 'trang xác nhận');
});

// ====================== P1-03: phê duyệt gắn Mã giao dịch, dùng 1 lần, 2 bước ======================
function twoPending() {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': 'Người A' })));
  const idA = lastRow(h)[18];
  // B là yêu cầu chờ duyệt thứ 2 cho cùng QR (chèn tay vì số lượng 1 sẽ bị chặn)
  const b = legacyLoan('Người B', '(Chờ phê duyệt PTK)');
  b[18] = 'L260929-BBBBBB';
  h.log.rows.push(b);
  return { h, idA };
}
test('P1-03 GET link chỉ hiển thị xác nhận, KHÔNG ghi', () => {
  const { h, idA } = twoPending();
  const p = params(run(h, `buildApprovalLink_('approve', '${idA}')`));
  const page = h.ctx.doGet({ parameter: p }).html;
  assert.match(page, /Xác nhận PHÊ DUYỆT/);
  assert.equal(h.log.rows[1][12], '(Chờ phê duyệt PTK)');
});
test('P1-03 xác nhận link của A chỉ duyệt A; B vẫn chờ; dùng lại link bị từ chối', () => {
  const { h, idA } = twoPending();
  const p = params(run(h, `buildApprovalLink_('approve', '${idA}')`));
  const ok = h.ctx.confirmApprovalFromPage(p.action, p.loan, p.t, p.sig);
  assert.match(ok, /ĐÃ PHÊ DUYỆT/);
  assert.match(h.log.rows[1][12], /Đã phê duyệt/);
  assert.equal(h.log.rows[2][12], '(Chờ phê duyệt PTK)');
  const again = h.ctx.confirmApprovalFromPage(p.action, p.loan, p.t, p.sig);
  assert.match(again, /đã được xử lý trước đó/);
  assert.equal(h.log.rows[2][12], '(Chờ phê duyệt PTK)');
});
test('P1-03 chữ ký: sửa action / Mã giao dịch / t, quá hạn, link kiểu cũ đều bị chặn', () => {
  const { h, idA } = twoPending();
  const p = params(run(h, `buildApprovalLink_('approve', '${idA}')`));
  const deny = (a, l, t, s) => /không hợp lệ/.test(h.ctx.confirmApprovalFromPage(a, l, t, s));
  assert.ok(deny('reject', p.loan, p.t, p.sig));
  assert.ok(deny('approve', 'L260929-BBBBBB', p.t, p.sig));
  assert.ok(deny('approve', p.loan, String(Number(p.t) + 1), p.sig));
  const old = String(Date.now() - 15 * 86400000);
  const oldSig = run(h, `signApproval_('approve', '${idA}', '${old}')`);
  assert.ok(deny('approve', idA, old, oldSig));
  const legacy = h.ctx.doGet({ parameter: { action: 'approve', qr: QR, t: p.t, sig: p.sig } }).html;
  assert.match(legacy, /không hợp lệ hoặc đã hết hạn/);
  assert.equal(h.log.rows[1][12], '(Chờ phê duyệt PTK)');
});
test('P1-03 gửi lại email phê duyệt cho mọi yêu cầu còn chờ', () => {
  const h = harness([legacyLoan('A', '(Chờ phê duyệt PTK)'), legacyLoan('B', '✅ Đã phê duyệt')], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.resendPendingApprovals();
  assert.equal(h.mail.length, 1);
  assert.match(h.mail[0][2], new RegExp('loan=' + h.log.rows[1][18]));
});

// ====================== P1-04: trả đúng khoản ======================
function twoOnLoan() {
  const a = legacyLoan('Nguyễn Văn A', '✅ Đã phê duyệt', 'a@example.invalid');
  const b = legacyLoan('Trần Thị B', '✅ Đã phê duyệt', 'b@example.invalid');
  return harness([a, b]);
}
test('P1-04 A trả → đóng khoản của A (khớp email), B vẫn mở', () => {
  const h = twoOnLoan();
  h.ctx.onFormSubmitReturn(formEvent(returnFields(), 'Form Responses 2'));
  assert.ok(h.log.rows[1][8] instanceof Date);
  assert.equal(h.log.rows[2][8], '');
});
test('P1-04 không xác định được khoản → KHÔNG đóng, báo xử lý tay', () => {
  const h = twoOnLoan();
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Họ và tên người trả': 'Người lạ', 'Email Address': 'x@example.invalid' }), 'Form Responses 2'));
  assert.equal(h.log.rows[1][8], '');
  assert.equal(h.log.rows[2][8], '');
  assert.ok(h.mail.some(m => /CẦN XỬ LÝ TAY/.test(m[1])));
});
test('P1-04 ngày trả trước ngày mượn / ngày ở tương lai → KHÔNG đóng', () => {
  const h = harness([legacyLoan('Nguyễn Văn A', '✅ Đã phê duyệt', 'a@example.invalid')]);
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Ngày trả': '15/09/2026' }), 'Form Responses 2'));
  assert.equal(h.log.rows[1][8], '');
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Ngày trả': '01/01/2099' }), 'Form Responses 2'));
  assert.equal(h.log.rows[1][8], '');
  assert.equal(h.mail.filter(m => /CẦN XỬ LÝ TAY/.test(m[1])).length, 2);
});
test('P1-04 trả khi yêu cầu còn chờ duyệt → không đóng', () => {
  const h = harness([legacyLoan('Nguyễn Văn A', '(Chờ phê duyệt PTK)', 'a@example.invalid')]);
  h.ctx.onFormSubmitReturn(formEvent(returnFields(), 'Form Responses 2'));
  assert.equal(h.log.rows[1][8], '');
  assert.ok(h.mail.some(m => /CHỜ DUYỆT/.test(m[2])));
});
test('P1-04 trả với tình trạng hỏng → cảnh báo cập nhật Master_Data', () => {
  const h = harness([legacyLoan('Nguyễn Văn A', '✅ Đã phê duyệt', 'a@example.invalid')]);
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Tình trạng thiết bị khi trả': 'Hư hỏng nhẹ' }), 'Form Responses 2'));
  assert.ok(h.log.rows[1][8] instanceof Date);
  assert.ok(h.mail.some(m => /Master_Data/.test(m[2])));
});
test('P1-04 chạy lại cùng phản hồi trả → không xử lý lần 2', () => {
  const h = twoOnLoan();
  const e = formEvent(returnFields(), 'Form Responses 2');
  h.ctx.onFormSubmitReturn(e);
  h.ctx.onFormSubmitReturn(e);
  assert.equal(h.log.rows[2][8], '', 'B không bị đóng bởi lần chạy lại');
});

// ====================== API công khai / quyền riêng tư ======================
test('API ?id= chỉ trả trường công khai, không có ghi chú nội bộ', () => {
  const h = harness();
  const out = JSON.parse(h.ctx.doGet({ parameter: { id: QR } }).text);
  assert.equal(out['Mã QR'], QR);
  assert.ok(!('Ghi chú gốc' in out));
  assert.ok(!('Nguyên giá (tr.đ)' in out));
  assert.equal(out._borrowStatus.available, true);
});
test('Lịch sử từng thiết bị: tên đã che, không có địa điểm, bỏ khoản bị từ chối', () => {
  const h = harness([legacyLoan('Phan Hoàng Nam', '✅ Đã phê duyệt'), legacyLoan('Lê Văn C', '❌ Từ chối — PTK')]);
  const out = JSON.parse(h.ctx.doGet({ parameter: { action: 'history', id: QR } }).text);
  assert.equal(out.ok, true);
  assert.equal(out.history.length, 1);
  assert.equal(out.history[0].borrower, 'Phan H. N.');
  assert.ok(!('location' in out.history[0]));
  assert.equal(h.ctx.checkBorrowStatus_(QR).borrower, 'Phan H. N.');
});
test('Thiếu sheet log → báo LỖI, không báo "rảnh"/"không có lịch sử"', () => {
  const h = harness([], { noLog: true });
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, null);
  const out = JSON.parse(h.ctx.doGet({ parameter: { action: 'history', id: QR } }).text);
  assert.equal(out.ok, false);
  const log = JSON.parse(h.ctx.doGet({ parameter: { action: 'alllog', key: '12345678' } }).text);
  assert.equal(log.ok, false);
  assert.equal(log.error, 'unavailable');
});
test('Nhật ký toàn Khoa (có mã) vẫn đủ tên + địa điểm', () => {
  const h = harness([legacyLoan('Phan Hoàng Nam', '✅ Đã phê duyệt')]);
  const out = JSON.parse(h.ctx.doGet({ parameter: { action: 'alllog', key: '12345678' } }).text);
  assert.equal(out.entries[0].borrower, 'Phan Hoàng Nam');
  assert.equal(out.entries[0].location, 'Hội An');
});

// ====================== Ngày tháng / báo cáo ======================
test('parseDate_ từ chối ngày không tồn tại, nhận ngày hợp lệ', () => {
  const h = harness();
  assert.equal(h.ctx.parseDate_('31/02/2026'), null);
  assert.equal(h.ctx.parseDate_('2026-02-31'), null);
  assert.equal(h.ctx.parseDate_('29/02/2028').getDate(), 29);
  assert.equal(h.ctx.parseDate_('29/09/2026 10:15:00').getMonth(), 8);
  assert.equal(h.ctx.parseDate_('2026-09-29').getDate(), 29);
});
function annual(rows, year) {
  const h = harness(rows);
  let captured;
  h.ctx.sendAnnualReportEmail_ = (...args) => { captured = args; };
  h.ctx.generateAnnualUsageReport(year);
  return captured[1].find(x => x.qr === QR);
}
test('Báo cáo năm: tỷ lệ = giờ được mượn / giờ lịch của năm', () => {
  const r = legacyLoan('A', '✅ Đã phê duyệt');
  r[6] = new Date(2025, 0, 1); r[8] = new Date(2025, 0, 11);
  const rep = annual([r], 2025);
  assert.equal(rep.totalHours, 240);
  assert.equal(rep.utilizationPct, 2.7); // 240 / 8760
});
test('Báo cáo năm: cắt phần vắt qua năm, tính cả khoản chưa trả, bỏ khoản từ chối', () => {
  const cross = legacyLoan('A', '✅ Đã phê duyệt');
  cross[6] = new Date(2024, 11, 30); cross[8] = new Date(2025, 0, 3);
  const open = legacyLoan('B', '✅ Đã phê duyệt');
  open[6] = new Date(2025, 11, 30); open[8] = '';
  const rejected = legacyLoan('C', '❌ Từ chối — PTK');
  rejected[6] = new Date(2025, 5, 1);
  const rep = annual([cross, open, rejected], 2025);
  assert.equal(rep.times, 2);
  assert.equal(rep.totalHours, 96); // 48h đầu năm + 48h cuối năm
});
test('Lịch bảo trì: chỉ xét bản ghi mới nhất của mỗi thiết bị', () => {
  const h = harness();
  const past = new Date(); past.setDate(past.getDate() - 10);
  const future = new Date(); future.setDate(future.getDate() + 200);
  h.sheets.Log_Bao_Tri.rows.push([QR, 'X', 'Hiệu chuẩn', new Date(2025, 0, 1), past]);
  h.sheets.Log_Bao_Tri.rows.push([QR, 'X', 'Hiệu chuẩn', new Date(2026, 0, 1), future]);
  h.ctx.checkMaintenanceSchedule();
  assert.equal(h.mail.length, 0, 'lịch cũ đã được thay bằng lần hiệu chuẩn mới');
});

// ====================== Mã truy cập (giữ nguyên hành vi v10) ======================
test('Nhật ký: không mã / sai mã → không lộ dữ liệu', () => {
  const h = harness([legacyLoan('A', '✅ Đã phê duyệt')]);
  const out = JSON.parse(h.ctx.doGet({ parameter: { action: 'alllog', key: '0' } }).text);
  assert.equal(out.ok, false);
  assert.equal(out.entries.length, 0);
});

// ---------- Kết quả ----------
let failed = 0;
for (const [ok, name, err] of results) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n     → ' + err));
  if (!ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} pass`);
process.exit(failed ? 1 : 0);
