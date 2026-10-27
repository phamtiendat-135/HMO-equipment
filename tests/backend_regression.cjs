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
    range.setNumberFormat = fmt => {
      self.formats = self.formats || {};
      for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) self.formats[`${row + i},${col + j}`] = fmt;
      return range;
    };
    for (const m of ['setNote', 'setFontWeight', 'setBackground', 'setHorizontalAlignment',
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
    .replace('HH', pad2(d.getHours())).replace('mm', pad2(d.getMinutes())).replace('ss', pad2(d.getSeconds()));
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
    MailApp: { sendEmail: (...args) => { if (opts.mailFails && (opts.mailFails === true || opts.mailFails(args))) throw new Error('Synthetic mail quota failure'); mail.push(args); } },
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
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    ...(opts.globals || {})
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
test('P1-07 nâng cấu trúc: dòng cũ được gán Mã giao dịch, thêm header S–W, chỉ chạy 1 lần', () => {
  const h = harness([legacyLoan('A', ''), legacyLoan('B', '')]);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  assert.deepEqual(h.log.rows[0].slice(18, 23),
    ['Mã giao dịch', 'Nguồn phản hồi mượn', 'Nguồn phản hồi trả', 'Kiểm tra nhận lại', 'Phiếu mượn']);
  const ids = h.log.rows.slice(1).map(r => r[18]);
  assert.ok(ids.every(id => /^L\d{6}-[0-9A-F]{6}$/.test(id)), ids.join(','));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(h.props.LOG_SCHEMA_VERSION, '4');
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

// ====================== Ngày đọc từ ô, không phụ thuộc Ngôn ngữ của Sheet ======================
/**
 * Event như trigger thật: namedValues là CHỮ theo locale của Sheet (ở đây giả lập locale Mỹ M/D/YYYY),
 * còn ô trong tab Form Responses là Date thật.
 */
function formEventWithCells(fields, cells, sheetName = 'Form Responses 1') {
  const e = formEvent(fields, sheetName);
  const headers = ['Timestamp'].concat(Object.keys(fields));
  const values = [new Date(2026, 9, 14, 9, 30, 0)].concat(Object.keys(fields).map(k => (k in cells ? cells[k] : fields[k])));
  const sheet = {
    getName: () => sheetName,
    getRange: (r, c, nr, nc) => ({ getValues: () => [headers.slice(c - 1, c - 1 + nc)] }),
    getParent: () => ({ getSpreadsheetTimeZone: () => 'America/Los_Angeles' })
  };
  e.range = Object.assign(e.range, { getSheet: () => sheet, getColumn: () => 1,
    getNumColumns: () => headers.length, getValues: () => [values] });
  return e;
}
const sameDay = (d, y, m, day) => d instanceof Date && d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;

test('Ngày: Sheet locale Mỹ ("10/5/2026") — mượn vẫn lấy đúng 05/10 từ ô Date', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEventWithCells(
    borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002', 'Ngày mượn': '10/5/2026', 'Ngày dự kiến trả': '10/12/2026' }),
    { 'Ngày mượn': new Date(2026, 9, 5), 'Ngày dự kiến trả': new Date(2026, 9, 12) }));
  const r = lastRow(h);
  assert.ok(sameDay(r[6], 2026, 9, 5), 'ngày mượn phải là 05/10/2026, nhận ' + r[6]);
  assert.ok(sameDay(r[7], 2026, 9, 12), 'hạn trả phải là 12/10/2026, nhận ' + r[7]);
  assert.equal(r[12], '', 'TB dưới ngưỡng, ngày hợp lệ → không bị từ chối');
});
test('Ngày: chữ "9/30/2026" (locale Mỹ) không làm từ chối nhầm khi ô là Date', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEventWithCells(
    borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002', 'Ngày mượn': '9/30/2026', 'Ngày dự kiến trả': '10/2/2026' }),
    { 'Ngày mượn': new Date(2026, 8, 30), 'Ngày dự kiến trả': new Date(2026, 9, 2) }));
  assert.ok(!/từ chối/i.test(lastRow(h)[12]), lastRow(h)[12]);
  assert.ok(sameDay(lastRow(h)[7], 2026, 9, 2));
});
test('Ngày: trả thiết bị lấy ngày trả từ ô Date', () => {
  const h = harness([legacyLoan('Nguyễn Văn A', '✅ Đã phê duyệt', 'a@example.invalid')]);
  h.ctx.onFormSubmitReturn(formEventWithCells(returnFields({ 'Ngày trả': '9/26/2026' }),
    { 'Ngày trả': new Date(2026, 8, 26) }, 'Form Responses 2'));
  assert.ok(sameDay(h.log.rows[1][8], 2026, 8, 26), 'ngày trả phải là 26/09/2026, nhận ' + h.log.rows[1][8]);
});
test('Ngày: bảo trì ghi Date từ ô, email hiện dd/MM/yyyy', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEventWithCells({ 'Mã QR thiết bị': QR, 'Loại công việc': 'Hiệu chuẩn',
    'Ngày thực hiện': '10/3/2026', 'Ngày hiệu chuẩn tiếp theo': '4/3/2027', 'Kết quả': 'Đạt' },
    { 'Ngày thực hiện': new Date(2026, 9, 3), 'Ngày hiệu chuẩn tiếp theo': new Date(2027, 3, 3) }, 'Form Responses 3'));
  const r = h.sheets.Log_Bao_Tri.rows[1];
  assert.ok(sameDay(r[3], 2026, 9, 3) && sameDay(r[4], 2027, 3, 3), r[3] + ' / ' + r[4]);
  assert.ok(h.mail.some(m => /03\/10\/2026/.test(m[2]) && /03\/04\/2027/.test(m[2])));
});
test('Ngày: báo hỏng giữ cả giờ phát hiện khi ô là Date', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEventWithCells({ 'Mã QR thiết bị': QR, 'Người phát hiện': 'B',
    'Thời điểm phát hiện': '10/14/2026 8:15:00', 'Mức độ hỏng': 'Nhẹ', 'Mô tả sự cố': 'x' },
    { 'Thời điểm phát hiện': new Date(2026, 9, 14, 8, 15) }, 'Form Responses 4'));
  const when = h.sheets.Log_Bao_Hong.rows[1][3];
  assert.ok(sameDay(when, 2026, 9, 14) && when.getHours() === 8 && when.getMinutes() === 15, String(when));
});
test('Ngày: không đọc được ô → vẫn đọc chữ dd/MM/yyyy như cũ', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002',
    'Ngày mượn': '05/10/2026', 'Ngày dự kiến trả': '12/10/2026' })));
  assert.ok(sameDay(lastRow(h)[6], 2026, 9, 5) && sameDay(lastRow(h)[7], 2026, 9, 12));
});

// ====================== Sử dụng tại chỗ: không cần duyệt, tự đóng ======================
const onsiteFields = (over = {}) => Object.assign({
  'Mã QR thiết bị': QR, 'Tên thiết bị': 'Máy đo chất lượng nước', 'Họ và tên người sử dụng': 'Nguyễn Văn A',
  'Đơn vị / Nhóm nghiên cứu': 'BM Thủy văn', 'Mục đích sử dụng': 'Thí nghiệm', 'Số giờ sử dụng (dự kiến)': '3',
  'Email Address': 'a@example.invalid'
}, over);
const onsiteEvent = over => formEvent(onsiteFields(over), 'Form Responses 5');

test('Tại chỗ: form được nhận diện riêng, không lẫn với form mượn', () => {
  const h = harness();
  assert.equal(h.ctx.classifyFormEvent_(onsiteEvent().namedValues), 'onsite');
  assert.equal(h.ctx.classifyFormEvent_(formEvent(borrowFields()).namedValues), 'borrow');
});
test('Tại chỗ: TB ≥ 100 triệu KHÔNG cần duyệt, tự đóng sau số giờ khai báo, báo PTK', () => {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  const before = Date.now();
  h.ctx.onFormSubmitDispatch(onsiteEvent());
  const r = lastRow(h);
  assert.match(r[12], /Sử dụng tại chỗ — không cần duyệt/);
  assert.ok(!/Chờ phê duyệt/.test(r[12]));
  assert.ok(r[6] instanceof Date && r[6].getTime() >= before, 'bắt đầu = lúc khai báo');
  assert.equal(r[8].getTime() - r[6].getTime(), 3 * 3600000, 'kết thúc = bắt đầu + 3 giờ');
  assert.equal(r[16], 3);
  assert.equal(r[5], 'Tại chỗ — P204-T3');
  assert.equal(h.mail.length, 1);
  assert.equal(h.mail[0][0], 'datpt@hus.edu.vn');
  assert.match(h.mail[0][1], /Sử dụng tại chỗ/);
  assert.ok(!/loan=/.test(h.mail[0][2]) && !/loan=|PHÊ DUYỆT/.test(h.mail[0][3].htmlBody), 'không có link phê duyệt');
  assert.match(h.mail[0][3].htmlBody, /TẠI CHỖ · KHÔNG CẦN DUYỆT[\s\S]*Thời gian sử dụng[\s\S]*3 giờ/);
});
test('Tại chỗ: trong giờ khai báo vẫn giữ chỗ — mượn mang đi bị từ chối, badge "onsite"', () => {
  const h = harness();
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  const bs = h.ctx.checkBorrowStatus_(QR);
  assert.equal(bs.available, false);
  assert.equal(bs.status, 'onsite');
  assert.match(bs.dueDate, /^\d\d:\d\d \d\d\/\d\d$/);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.match(lastRow(h)[12], /hết \(1\/1\)/);
  const hist = JSON.parse(h.ctx.doGet({ parameter: { action: 'history', id: QR } }).text).history;
  assert.equal(hist[0].status, 'onsite');
  assert.equal(hist[0].isActive, true);
});
test('Tại chỗ: hết giờ → nhả chỗ, KHÔNG nhắc quá hạn / nhắc trả', () => {
  const h = harness();
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  const r = lastRow(h);
  r[6] = new Date(Date.now() - 10 * 86400000);
  r[7] = r[8] = new Date(r[6].getTime() + 3 * 3600000);
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  h.ctx.checkOverdueReturns();
  h.ctx.checkUpcomingReturns();
  assert.equal(h.mail.length, 1, 'chỉ có email thông báo lúc khai báo');
  const e = h.ctx.getAllUsageLog_(10)[0];
  assert.equal(e.status, 'onsite');
  assert.equal(e.isActive, false);
  assert.equal(e.isOverdue, false);
});
test('Tại chỗ: số giờ không hợp lệ / TB hỏng → tự động từ chối, không giữ chỗ', () => {
  const h = harness();
  for (const hours of ['0', '30', 'abc']) {
    h.ctx.onFormSubmitOnsite(onsiteEvent({ 'Số giờ sử dụng (dự kiến)': hours }));
    assert.match(lastRow(h)[12], /Tự động từ chối — Số giờ sử dụng/, hours);
    assert.equal(lastRow(h)[8], '', 'không tự đóng khoản bị từ chối');
  }
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  h.ctx.onFormSubmitOnsite(onsiteEvent({ 'Mã QR thiết bị': 'HMO-PC-0001' }));
  assert.match(lastRow(h)[12], /tình trạng "Hỏng"/);
  assert.ok(h.mail.some(m => /Khai báo sử dụng tại chỗ bị từ chối tự động/.test(m[1])));
});
test('Tại chỗ: TB đang được mượn mang đi → từ chối khai báo', () => {
  const h = harness([legacyLoan('B', '✅ Đã phê duyệt')]);
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  assert.match(lastRow(h)[12], /hết \(1\/1\)/);
});
test('Tại chỗ: quét "Xác nhận trả" khi đang dùng tại chỗ → không đóng gì, báo rõ lý do', () => {
  const h = harness();
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  const end = lastRow(h)[8];
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Ngày trả': fakeFormatDate(new Date(), '', 'dd/MM/yyyy') }), 'Form Responses 2'));
  assert.equal(lastRow(h)[8], end);
  assert.ok(h.mail.some(m => /tự đóng khi hết giờ/.test(m[2])));
});
test('Tại chỗ: chạy lại cùng phản hồi → chỉ 1 dòng, 1 email', () => {
  const h = harness();
  const e = onsiteEvent();
  h.ctx.onFormSubmitOnsite(e);
  h.ctx.onFormSubmitOnsite(e);
  assert.equal(h.log.rows.length, 2);
  assert.equal(h.mail.length, 1);
});
test('Báo cáo tháng: tách lượt mượn mang đi và lượt tại chỗ (có giờ)', () => {
  const now = new Date();
  const inLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10, 9);
  const borrow = legacyLoan('A', '✅ Đã phê duyệt');
  borrow[6] = inLastMonth; borrow[8] = new Date(now.getFullYear(), now.getMonth() - 1, 12);
  const onsite = legacyLoan('B', '🔬 Sử dụng tại chỗ — không cần duyệt');
  onsite[6] = inLastMonth; onsite[8] = new Date(inLastMonth.getTime() + 2.5 * 3600000); onsite[16] = 2.5;
  const h = harness([borrow, onsite]);
  h.ctx.generateAnnualUsageReport = () => {};
  h.ctx.monthlyReport();
  const body = h.mail[0][2];
  assert.match(body, /Lượt mượn mang đi: 1\n/);
  assert.match(body, /Lượt trả: 1\n/);
  assert.match(body, /Lượt sử dụng tại chỗ: 1 \(2\.5 giờ\)/);
});
test('Báo cáo năm: khai báo tại chỗ tính đúng số giờ (giữ giờ bắt đầu)', () => {
  const r = legacyLoan('A', '🔬 Sử dụng tại chỗ — không cần duyệt');
  r[6] = new Date(2025, 2, 3, 14, 0); r[8] = new Date(2025, 2, 3, 17, 0);
  const rep = annual([r], 2025);
  assert.equal(rep.times, 1);
  assert.equal(rep.totalHours, 3);
});

// ====================== Email kết quả phê duyệt gửi người mượn ======================
function decide(action, name) {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields(name ? { 'Họ và tên người mượn': name } : {})));
  const p = params(run(h, `buildApprovalLink_('${action}', '${lastRow(h)[18]}')`));
  h.ctx.confirmApprovalFromPage(p.action, p.loan, p.t, p.sig);
  return h.mail.find(m => m[0] === 'a@example.invalid');
}
test('Email duyệt: có hạn trả (tiêu đề + nội dung), tên in đậm, xưng "thầy/cô", nút thêm vào lịch', () => {
  const m = decide('approve');
  assert.match(m[1], /Đã duyệt mượn .* — hạn trả 25\/09\/2026/);
  const html = m[3].htmlBody;
  assert.ok(html.includes('Kính gửi thầy/cô <strong>Nguyễn Văn A</strong>'), 'tên in đậm');
  assert.match(html, /Hạn trả thiết bị[\s\S]*25\/09\/2026/);
  assert.match(html, /20\/09\/2026/, 'có ngày mượn');
  assert.match(html, /calendar\.google\.com[^"]*dates=20260925\/20260926/);
  assert.match(m[2], /HẠN TRẢ\s*: (Thứ|Chủ).*25\/09\/2026/, 'bản chữ thường cũng có hạn trả');
  for (const text of [m[2], html]) assert.ok(!/\bbạn\b/i.test(text), 'không còn xưng "bạn"');
});
test('Email từ chối: không có ô hạn trả / nút lịch, vẫn xưng "thầy/cô"', () => {
  const m = decide('reject');
  assert.match(m[1], /bị TỪ CHỐI/);
  const html = m[3].htmlBody;
  assert.ok(!/Hạn trả thiết bị|calendar\.google/.test(html));
  assert.match(html, /KHÔNG ĐƯỢC DUYỆT/);
  assert.match(html, /thầy\/cô <strong>/);
});
test('Email duyệt: tên người mượn chứa HTML bị escape', () => {
  const html = decide('approve', '<img src=x onerror=alert(1)>')[3].htmlBody;
  assert.ok(!html.includes('<img src=x') && html.includes('&lt;img'));
});
function approveWithGuide(guide, opts = {}) {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  if (opts.defaultUrl) run(h, `CONFIG.GUIDE_DEFAULT_URL = ${JSON.stringify(opts.defaultUrl)}`);
  if (guide !== undefined) {
    h.sheets.Master_Data.rows[0].push('Link hướng dẫn sử dụng');
    h.sheets.Master_Data.rows[1].push(guide);
  }
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  if (opts.masterBreaksLater) h.sheets.Master_Data.getDataRange = () => { throw new Error('Sheet lỗi'); };
  const p = params(run(h, `buildApprovalLink_('approve', '${lastRow(h)[18]}')`));
  h.ctx.confirmApprovalFromPage(p.action, p.loan, p.t, p.sig);
  return h.mail.find(m => m[0] === 'a@example.invalid');
}
test('Email duyệt: chưa có cột / ô trống → nút "Hướng dẫn sử dụng" mờ + "(đang cập nhật)"', () => {
  for (const guide of [undefined, '']) {
    const m = approveWithGuide(guide);
    assert.match(m[3].htmlBody, /📘 Hướng dẫn sử dụng<\/div>\s*<div[^>]*>\(đang cập nhật\)/);
    assert.match(m[2], /Hướng dẫn sử dụng: \(đang cập nhật\)/);
  }
});
test('Email duyệt: có link Google Site → nút bấm được, không còn "(đang cập nhật)"', () => {
  const url = 'https://sites.google.com/hus.edu.vn/hmo-thiet-bi/horiba-u52';
  const m = approveWithGuide(url);
  assert.ok(m[3].htmlBody.includes(`href="${url}"`));
  assert.ok(!/đang cập nhật/.test(m[3].htmlBody));
  assert.match(m[2], new RegExp('Hướng dẫn sử dụng: ' + url.replace(/[./]/g, '\\$&')));
});
test('Email duyệt: link không phải https (javascript:, chữ) bị bỏ qua; trang chung được dùng khi thiếu link riêng', () => {
  assert.match(approveWithGuide('javascript:alert(1)')[3].htmlBody, /\(đang cập nhật\)/);
  const m = approveWithGuide('', { defaultUrl: 'https://sites.google.com/hus.edu.vn/hmo-thiet-bi' });
  assert.ok(m[3].htmlBody.includes('href="https://sites.google.com/hus.edu.vn/hmo-thiet-bi"'));
});
test('Email duyệt: tra link hướng dẫn lỗi → vẫn gửi email (nút "đang cập nhật")', () => {
  const m = approveWithGuide('https://x.example/guide', { masterBreaksLater: true });
  assert.ok(m, 'email vẫn được gửi');
  assert.match(m[3].htmlBody, /\(đang cập nhật\)/);
});
test('Email từ chối: không có nút hướng dẫn', () => {
  assert.ok(!/Hướng dẫn sử dụng/.test(decide('reject')[3].htmlBody));
});
test('Menu: tạo cột Link hướng dẫn 1 lần, chạy lại không tạo trùng', () => {
  const h = harness();
  h.ctx.ensureGuideColumn();
  h.ctx.ensureGuideColumn();
  const header = h.sheets.Master_Data.rows[0];
  assert.equal(header.filter(x => x === 'Link hướng dẫn sử dụng').length, 1);
  assert.equal(header[header.length - 1], 'Link hướng dẫn sử dụng');
  assert.match(h.ctx.ensureGuideColumn(), /đã có cột "Link hướng dẫn sử dụng" \(cột I\)/, 'báo đúng tên cột dạng chữ');
});
test('Menu tạo cột: báo tên cột dạng chữ', () => {
  const h = harness();
  assert.deepEqual([1, 9, 26, 27, 52, 53].map(n => h.ctx.columnLetter_(n)), ['A', 'I', 'Z', 'AA', 'AZ', 'BA']);
  assert.match(h.ctx.ensureGuideColumn(), /Đã thêm cột .* vào tab Master_Data \(cột I\)/);
});
test('Menu tạo cột: chuyển màn hình sang tab Master_Data (qua getActiveSpreadsheet), chọn ô tiêu đề', () => {
  const h = harness();
  const seen = {};
  h.ctx.SpreadsheetApp.getActiveSpreadsheet = () => ({
    getSheetByName: n => ({ name: n, getRange: (r, c) => ({ r, c }) }),
    setActiveSheet: s => { seen.sheet = s.name; },
    setActiveRange: rg => { seen.cell = [rg.r, rg.c]; },
    toast: msg => { seen.toast = msg; }
  });
  h.ctx.ensureGuideColumn();
  assert.equal(seen.sheet, 'Master_Data');
  assert.deepEqual(seen.cell, [1, 9]);
  assert.match(seen.toast, /tab Master_Data \(cột I\)/);
});
test('Email nhắc trả / quá hạn xưng "thầy/cô", không còn "bạn"', () => {
  const overdue = harness([legacyLoan('A', '✅ Đã phê duyệt', 'a@example.invalid')]);
  overdue.ctx.checkOverdueReturns();
  const soon = legacyLoan('A', '✅ Đã phê duyệt', 'a@example.invalid');
  soon[7] = new Date(Date.now() + 86400000);
  const upcoming = harness([soon]);
  upcoming.ctx.checkUpcomingReturns();
  for (const h of [overdue, upcoming]) {
    const m = h.mail.find(x => x[0] === 'a@example.invalid');
    assert.ok(m && /Kính gửi thầy\/cô A/.test(m[2]) && !/\bbạn\b/i.test(m[2]), m && m[2]);
  }
});

// ====================== Email đồng bộ: cùng khung có logo, escape dữ liệu ======================
test('Email đồng bộ: xin duyệt, thông báo, tại chỗ, từ chối tự động, nhắc trả, quá hạn đều có HTML + logo, escape tên', () => {
  const bad = '<b onmouseover=x>Tên</b>';
  const logo = 'https://phamtiendat-135.github.io/HMO-equipment/HMO_logo.jpg';
  const check = (h, label, min) => {
    assert.ok(h.mail.length >= min, label + ': thiếu email');
    for (const m of h.mail) {
      const html = m[3] && m[3].htmlBody;
      assert.ok(html, `${label}: "${m[1]}" không có HTML`);
      assert.ok(html.includes(`src="${logo}"`), `${label}: thiếu logo`);
      assert.ok(!html.includes(bad) && html.includes('&lt;b onmouseover'), `${label}: tên không được escape`);
    }
  };
  let h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': bad })));
  check(h, 'xin duyệt', 1);
  h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': bad, 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  assert.match(h.mail[0][3].htmlBody, /THÔNG BÁO — KHÔNG CẦN DUYỆT/);
  check(h, 'thông báo dưới ngưỡng', 1);
  h = harness();
  h.ctx.onFormSubmitOnsite(onsiteEvent({ 'Họ và tên người sử dụng': bad }));
  check(h, 'tại chỗ', 1);
  h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Họ và tên người mượn': bad, 'Mã QR thiết bị': 'HMO-PC-0001' })));
  check(h, 'từ chối tự động', 2);
  assert.match(h.mail[1][3].htmlBody, /Kính gửi thầy\/cô <strong>/, 'bản gửi người mượn có lời chào');
  assert.match(h.mail[1][2], /^Kính gửi thầy\/cô /);
  h = harness([legacyLoan(bad, '✅ Đã phê duyệt', 'a@example.invalid')]);
  h.ctx.checkOverdueReturns();
  check(h, 'quá hạn (người mượn + tổng hợp PTK)', 2);
  assert.ok(h.mail.some(m => /THIẾT BỊ QUÁ HẠN/.test(m[3].htmlBody) && m[0] === 'datpt@hus.edu.vn'));
  const soon = legacyLoan(bad, '✅ Đã phê duyệt', 'a@example.invalid');
  soon[7] = new Date(Date.now() + 86400000);
  h = harness([soon]);
  h.ctx.checkUpcomingReturns();
  check(h, 'nhắc trả', 1);
  assert.match(h.mail[0][3].htmlBody, /SẮP ĐẾN HẠN TRẢ/);
});

// ====================== Ngày mượn / hạn trả hiển thị và mượn trong ngày ======================
test('Ngày: dòng mượn mới định dạng G:H là dd/MM/yyyy (không "0:00:00"); tại chỗ giữ giờ', () => {
  const h = harness();
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  const n = h.log.rows.length;
  assert.equal(h.log.formats[`${n},7`], 'dd/MM/yyyy');
  assert.equal(h.log.formats[`${n},8`], 'dd/MM/yyyy');
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  const m = h.log.rows.length;
  assert.equal(h.log.formats[`${m},7`], 'dd/MM/yyyy HH:mm');
  assert.equal(h.log.formats[`${m},9`], 'dd/MM/yyyy HH:mm');
});
test('Ngày: hạn trả trùng ngày mượn → vẫn nhận, email PTK đánh dấu "trả trong ngày"', () => {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Ngày mượn': '15/10/2026', 'Ngày dự kiến trả': '15/10/2026' })));
  assert.equal(lastRow(h)[12], '(Chờ phê duyệt PTK)', 'mượn trong ngày là hợp lệ');
  assert.match(h.mail[0][2], /Dự kiến trả: 15\/10\/2026 \(TRẢ TRONG NGÀY/);
  assert.match(h.mail[0][3].htmlBody, /trả trong ngày \(cùng ngày mượn\)/);
  const h2 = harness([], { props: { APPROVAL_SECRET: 's' } });
  h2.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.ok(!/trong ngày/i.test(h2.mail[0][2] + h2.mail[0][3].htmlBody), 'khác ngày → không cảnh báo');
});

// ====================== Kiểm tra thiết bị khi nhận lại ======================
const dayStr = daysAgo => fakeFormatDate(new Date(Date.now() - daysAgo * 86400000), '', 'dd/MM/yyyy');
/** Một khoản đã duyệt rồi được khai trả. managerEmail: undefined = Master_Data chưa có cột email. */
function returnedLoan(opts = {}) {
  const h = harness([legacyLoan(opts.borrower || 'Nguyễn Văn A', '✅ Đã phê duyệt', 'a@example.invalid')],
    { props: { APPROVAL_SECRET: 's' } });
  if (opts.managerEmail !== undefined) {
    h.sheets.Master_Data.rows[0].push('CB quản lý hiện tại', 'Email CB quản lý');
    h.sheets.Master_Data.rows[1].push('TS. Quản Lý', opts.managerEmail);
  }
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Ngày trả': dayStr(opts.daysAgo || 0),
    'Họ và tên người trả': opts.borrower || 'Nguyễn Văn A' }), 'Form Responses 2'));
  return { h, loanId: h.log.rows[1][18] };
}
const linkFor = (h, action, loanId) => params(run(h, `buildApprovalLink_('${action}', '${loanId}')`));
const inspect = (h, action, loanId, who, note, sev) => {
  const p = linkFor(h, action, loanId);
  return h.ctx.confirmInspectionFromPage(p.action, p.loan, p.t, p.sig, who, note, sev);
};

test('Kiểm tra: khai trả → "⏳ Chờ kiểm tra", CHƯA đóng: giữ chỗ, badge "inspecting", hết nhắc quá hạn', () => {
  const { h } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  const r = h.log.rows[1];
  assert.ok(r[8] instanceof Date, 'vẫn ghi ngày trả');
  assert.equal(r[21], '⏳ Chờ kiểm tra');
  const bs = h.ctx.checkBorrowStatus_(QR);
  assert.equal(bs.available, false);
  assert.equal(bs.status, 'inspecting');
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.match(lastRow(h)[12], /hết \(1\/1\)/, 'chưa kiểm tra thì chưa cho mượn tiếp');
  const before = h.mail.length;
  h.ctx.checkOverdueReturns();
  assert.ok(!h.mail.slice(before).some(m => /QUÁ HẠN/.test(m[1])), 'không nhắc quá hạn khoản đã khai trả');
});
test('Kiểm tra: email gửi "Email CB quản lý" của thiết bị (nhiều email), có 2 nút ký; PTK nhận báo khai trả', () => {
  const { h, loanId } = returnedLoan({ managerEmail: 'ql1@example.invalid; ql2@example.invalid, sai-dinh-dang' });
  const req = h.mail.find(m => /Kiểm tra thiết bị trả/.test(m[1]));
  assert.equal(req[0], 'ql1@example.invalid,ql2@example.invalid');
  assert.ok(req[3].htmlBody.includes('action=inspect_ok&amp;loan=' + loanId));
  assert.ok(req[3].htmlBody.includes('action=inspect_issue&amp;loan=' + loanId));
  assert.ok(!/chưa có &quot;Email CB quản lý&quot;/.test(req[3].htmlBody));
  const admin = h.mail.find(m => m[0] === 'datpt@hus.edu.vn');
  assert.match(admin[1], /Đã khai trả, chờ CB kiểm tra/);
  assert.match(admin[2], /ql1@example\.invalid, ql2@example\.invalid/);
});
test('Kiểm tra: thiết bị chưa có email CB → gửi PTK, ghi rõ lý do', () => {
  for (const managerEmail of [undefined, '']) {
    const { h } = returnedLoan({ managerEmail });
    const req = h.mail.find(m => /Kiểm tra thiết bị trả/.test(m[1]));
    assert.equal(req[0], 'datpt@hus.edu.vn');
    assert.match(req[3].htmlBody, /chưa có "Email CB quản lý"|chưa có &quot;Email CB quản lý&quot;/);
  }
});
test('Kiểm tra: mở link chỉ hiện trang (có ô người kiểm tra), KHÔNG ghi', () => {
  const { h, loanId } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  const page = h.ctx.doGet({ parameter: linkFor(h, 'inspect_ok', loanId) }).html;
  assert.match(page, /Người kiểm tra/);
  assert.match(page, /value="TS\. Quản Lý"/, 'điền sẵn tên CB quản lý');
  assert.equal(h.log.rows[1][21], '⏳ Chờ kiểm tra');
  const issuePage = h.ctx.doGet({ parameter: linkFor(h, 'inspect_issue', loanId) }).html;
  assert.match(issuePage, /<select id="sev"[\s\S]*Mô tả sự cố \(bắt buộc\)/);
});
test('Kiểm tra: ✅ hoạt động tốt → đóng khoản, thiết bị sẵn sàng, người mượn nhận email; dùng lại link bị chặn', () => {
  const { h, loanId } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  const html = inspect(h, 'inspect_ok', loanId, 'TS. Quản Lý', 'Đủ phụ kiện', '');
  assert.match(html, /ĐÃ NHẬN LẠI THIẾT BỊ/);
  assert.match(h.log.rows[1][21], /^✅ Hoạt động tốt — TS\. Quản Lý \(.*\): Đủ phụ kiện$/);
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  const toBorrower = h.mail.find(m => m[0] === 'a@example.invalid' && /Đã nhận lại thiết bị/.test(m[1]));
  assert.ok(toBorrower && /Kính gửi thầy\/cô <strong>Nguyễn Văn A<\/strong>/.test(toBorrower[3].htmlBody));
  assert.match(inspect(h, 'inspect_issue', loanId, 'X', 'muộn', ''), /đã được xử lý trước đó/);
  assert.match(h.log.rows[1][21], /^✅/);
});
test('Kiểm tra: ⚠️ có sự cố → Log_Bao_Hong + email PTK có nút khắc phục; khóa mượn tới khi 🔧 khắc phục', () => {
  const { h, loanId } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  const html = inspect(h, 'inspect_issue', loanId, 'TS. Quản Lý', 'Vỡ đầu dò', 'Nặng — không sử dụng được');
  assert.match(html, /ĐÃ GHI NHẬN SỰ CỐ/);
  assert.match(h.log.rows[1][21], /^⚠️ Có sự cố \[Nặng — không sử dụng được\] — TS\. Quản Lý .*: Vỡ đầu dò$/);
  const bs = h.ctx.checkBorrowStatus_(QR);
  assert.equal(bs.available, false);
  assert.equal(bs.status, 'issue');
  const dmg = h.sheets.Log_Bao_Hong.rows[1];
  assert.equal(dmg[0], QR);
  assert.equal(dmg[5], 'Vỡ đầu dò');
  assert.equal(dmg[9], 'Mới — chờ xử lý');
  assert.equal(dmg[10], 'kiem-tra:' + loanId);
  const ptk = h.mail.find(m => m[0] === 'datpt@hus.edu.vn' && /Sự cố khi nhận lại/.test(m[1]));
  assert.ok(ptk[3].htmlBody.includes('action=resolve&amp;loan=' + loanId));
  assert.match(inspect(h, 'resolve', loanId, 'Phạm Tiến Đạt', 'Thay đầu dò', ''), /ĐÃ KHẮC PHỤC/);
  assert.match(h.log.rows[1][21], /^🔧 Đã khắc phục — Phạm Tiến Đạt .*Thay đầu dò \| ⚠️ Có sự cố/);
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  assert.match(h.sheets.Log_Bao_Hong.rows[1][9], /^Đã khắc phục — Phạm Tiến Đạt/);
});
test('Kiểm tra: chặn link sai chữ ký / sai loại, thiếu tên, sự cố thiếu mô tả; mức độ lạ → mặc định', () => {
  const { h, loanId } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  const p = linkFor(h, 'inspect_ok', loanId);
  assert.match(h.ctx.confirmInspectionFromPage('inspect_issue', p.loan, p.t, p.sig, 'A', 'x', ''), /không hợp lệ/);
  const approveSig = linkFor(h, 'approve', loanId);
  assert.match(h.ctx.confirmInspectionFromPage('approve', approveSig.loan, approveSig.t, approveSig.sig, 'A', '', ''),
    /không hợp lệ/, 'link phê duyệt không dùng được cho kiểm tra');
  assert.match(inspect(h, 'inspect_ok', loanId, '  ', '', ''), /Thiếu tên người kiểm tra/);
  assert.match(inspect(h, 'inspect_issue', loanId, 'A', '   ', ''), /Thiếu mô tả sự cố/);
  assert.equal(h.log.rows[1][21], '⏳ Chờ kiểm tra');
  inspect(h, 'inspect_issue', loanId, 'A', 'x', '<script>');
  assert.match(h.log.rows[1][21], /\[Nhẹ — vẫn sử dụng được\]/);
  assert.match(inspect(h, 'resolve', loanId, '=HYPERLINK("x")', '', ''), /ĐÃ KHẮC PHỤC/);
  assert.ok(!/^=/.test(h.log.rows[1][21]), 'không ghi công thức vào Sheet');
});
test('Kiểm tra: khai trả lần 2 khi đang chờ kiểm tra → không đóng gì, báo rõ', () => {
  const { h } = returnedLoan({ managerEmail: 'ql@example.invalid' });
  h.ctx.onFormSubmitReturn(formEvent(returnFields({ 'Ngày trả': dayStr(0) }), 'Form Responses 2'));
  assert.ok(h.mail.some(m => /CẦN XỬ LÝ TAY/.test(m[1]) && /đang chờ cán bộ quản lý kiểm tra/.test(m[2])));
});
test('Kiểm tra: nhắc CB khi chờ 2 ngày, rồi cứ 2 ngày 1 lần; báo PTK danh sách', () => {
  for (const [daysAgo, expect] of [[0, false], [1, false], [2, true], [3, false], [4, true]]) {
    const { h } = returnedLoan({ managerEmail: 'ql@example.invalid', daysAgo });
    const before = h.mail.length;
    h.ctx.checkOverdueReturns();
    const sent = h.mail.slice(before);
    const remind = sent.find(m => m[0] === 'ql@example.invalid' && /NHẮC \(đã \d+ ngày\)/.test(m[1]));
    assert.equal(!!remind, expect, `ngày ${daysAgo}`);
    assert.equal(sent.some(m => m[0] === 'datpt@hus.edu.vn' && /chưa được kiểm tra/.test(m[1])), expect);
  }
});
test('Kiểm tra: menu gửi lại email kiểm tra (VD sau khi điền email CB)', () => {
  const { h } = returnedLoan();
  h.sheets.Master_Data.rows[0].push('Email CB quản lý');
  h.sheets.Master_Data.rows[1].push('moi@example.invalid');
  assert.equal(h.ctx.resendPendingInspections(), 1);
  assert.equal(h.mail[h.mail.length - 1][0], 'moi@example.invalid');
});
test('Kiểm tra: tên người mượn chứa HTML bị escape trong email và trang kiểm tra', () => {
  const bad = '<img src=x onerror=alert(1)>';
  const { h, loanId } = returnedLoan({ managerEmail: 'ql@example.invalid', borrower: bad });
  const req = h.mail.find(m => /Kiểm tra thiết bị trả/.test(m[1]));
  assert.ok(!req[3].htmlBody.includes(bad) && req[3].htmlBody.includes('&lt;img'));
  const page = h.ctx.doGet({ parameter: linkFor(h, 'inspect_ok', loanId) }).html;
  assert.ok(!page.includes(bad) && page.includes('&lt;img'));
});
test('Kiểm tra: dòng cũ đã trả (cột V trống) và khai báo tại chỗ vẫn là "đã trả", không cần kiểm tra', () => {
  const old = legacyLoan('A', '✅ Đã phê duyệt');
  old[8] = new Date(2026, 8, 24);
  const h = harness([old]);
  assert.equal(h.ctx.checkBorrowStatus_(QR).available, true);
  h.ctx.onFormSubmitOnsite(onsiteEvent());
  assert.equal(h.ctx.getAllUsageLog_(5)[0].status, 'onsite');
  assert.ok(!h.mail.some(m => /Kiểm tra thiết bị trả/.test(m[1])));
});

// ====================== D3: quá hạn tính từ ngày SAU hạn trả ======================
function overdueMailFor(daysAfterDue) {
  const loan = legacyLoan('A', '✅ Đã phê duyệt', 'a@example.invalid');
  const due = new Date(); due.setHours(0, 0, 0, 0); due.setDate(due.getDate() - daysAfterDue);
  loan[7] = due;
  const h = harness([loan]);
  h.ctx.checkOverdueReturns();
  return h.mail.find(m => m[0] === 'a@example.invalid' && /QUÁ HẠN/.test(m[1]));
}
test('D3: đúng ngày hạn trả KHÔNG gửi "quá hạn 0 ngày"; hôm sau mới nhắc "quá 1 ngày"', () => {
  assert.equal(overdueMailFor(0), undefined);
  assert.match(overdueMailFor(1)[1], /đã quá 1 ngày/);
  assert.match(overdueMailFor(5)[1], /đã quá 5 ngày/);
});

// ====================== D2: email xác nhận cho mượn dưới ngưỡng ======================
test('D2: mượn TB < 100 tr → người mượn nhận "Đã ghi nhận mượn" (hạn trả, lịch, hướng dẫn); PTK vẫn nhận thông báo', () => {
  const h = harness();
  h.sheets.Master_Data.rows[0].push('Link hướng dẫn sử dụng');
  h.sheets.Master_Data.rows[3].push('https://sites.google.com/view/hmo/lab-0002');
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002' })));
  assert.equal(lastRow(h)[12], '', 'tự ghi nhận, không chờ duyệt');
  const ptk = h.mail.find(m => m[0] === 'datpt@hus.edu.vn');
  assert.match(ptk[3].htmlBody, /THÔNG BÁO — KHÔNG CẦN DUYỆT/);
  const mine = h.mail.find(m => m[0] === 'a@example.invalid');
  assert.match(mine[1], /✅ Đã ghi nhận mượn .* — hạn trả 25\/09\/2026/);
  const html = mine[3].htmlBody;
  assert.match(html, /ĐÃ GHI NHẬN/);
  assert.match(html, /không cần phê duyệt/);
  assert.match(html, /Xác nhận mượn thiết bị/);
  assert.match(html, /calendar\.google\.com/);
  assert.ok(html.includes('href="https://sites.google.com/view/hmo/lab-0002"'));
  assert.match(html, /Ghi nhận lúc/);
  assert.ok(!/Phó Trưởng khoa/.test(html.replace(/Hệ thống[^<]*/g, '')) || /không cần phê duyệt/.test(html));
});
test('D2: TB ≥ 100 tr (chờ duyệt), tại chỗ, bị từ chối → KHÔNG gửi email "Đã ghi nhận"', () => {
  const cases = [
    h => h.ctx.onFormSubmitBorrow(formEvent(borrowFields())),
    h => h.ctx.onFormSubmitOnsite(onsiteEvent({ 'Mã QR thiết bị': 'HMO-LAB-0002' })),
    h => h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-PC-0001' })))
  ];
  for (const run of cases) {
    const h = harness([], { props: { APPROVAL_SECRET: 's' } });
    run(h);
    assert.ok(!h.mail.some(m => /Đã ghi nhận mượn/.test(m[1])), h.mail.map(m => m[1]).join(' | '));
  }
});

// ====================== D4: báo hỏng / nhắc bảo trì gửi cả CB quản lý ======================
test('D4: báo hỏng gửi PTK + Email CB quản lý của thiết bị (không trùng PTK)', () => {
  const h = harness();
  h.sheets.Master_Data.rows[0].push('Email CB quản lý');
  h.sheets.Master_Data.rows[1].push('ql@example.invalid, DATPT@hus.edu.vn');
  h.ctx.onFormSubmitDispatch(formEvent({ 'Mã QR thiết bị': QR, 'Người phát hiện': 'B', 'Mức độ hỏng': 'Nặng',
    'Mô tả sự cố': 'Không lên nguồn' }, 'Form Responses 4'));
  const m = h.mail.find(x => /Báo hỏng/.test(x[1]));
  assert.equal(m[0], 'datpt@hus.edu.vn,ql@example.invalid');
});
test('D4: báo hỏng thiết bị chưa có email CB → chỉ PTK như cũ', () => {
  const h = harness();
  h.ctx.onFormSubmitDispatch(formEvent({ 'Mã QR thiết bị': QR, 'Người phát hiện': 'B', 'Mức độ hỏng': 'Nhẹ',
    'Mô tả sự cố': 'x' }, 'Form Responses 4'));
  assert.equal(h.mail.find(x => /Báo hỏng/.test(x[1]))[0], 'datpt@hus.edu.vn');
});
test('D4: nhắc bảo trì — PTK nhận bản tổng, mỗi CB chỉ nhận thiết bị mình quản lý', () => {
  const h = harness();
  h.sheets.Master_Data.rows[0].push('Email CB quản lý');
  h.sheets.Master_Data.rows[1].push('ql1@example.invalid');
  h.sheets.Master_Data.rows[3].push('ql2@example.invalid');
  const soon = new Date(); soon.setDate(soon.getDate() + 10);
  const late = new Date(); late.setDate(late.getDate() - 3);
  h.sheets.Log_Bao_Tri.rows.push([QR, 'Máy đo', 'Hiệu chuẩn', new Date(2026, 0, 1), soon]);
  h.sheets.Log_Bao_Tri.rows.push(['HMO-LAB-0002', 'Mô hình', 'Bảo trì', new Date(2026, 0, 1), late]);
  h.ctx.checkMaintenanceSchedule();
  const to = addr => h.mail.filter(m => m[0] === addr);
  assert.equal(to('datpt@hus.edu.vn').length, 1);
  assert.match(to('datpt@hus.edu.vn')[0][2], new RegExp(QR) );
  const m1 = to('ql1@example.invalid');
  assert.equal(m1.length, 1);
  assert.ok(m1[0][2].includes(QR) && !m1[0][2].includes('HMO-LAB-0002'));
  assert.match(m1[0][2], /còn 10 ngày/);
  const m2 = to('ql2@example.invalid');
  assert.ok(m2[0][2].includes('HMO-LAB-0002') && /quá 3 ngày/.test(m2[0][2]));
});
test('Bảo trì: hạn đúng HÔM NAY → "hôm nay" (chưa quá hạn); hôm qua → "quá 1 ngày"', () => {
  const h = harness();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  h.sheets.Log_Bao_Tri.rows.push([QR, 'Máy đo', 'Hiệu chuẩn', new Date(2026, 0, 1), today]);
  h.sheets.Log_Bao_Tri.rows.push(['HMO-LAB-0002', 'Mô hình', 'Bảo trì', new Date(2026, 0, 1), yesterday]);
  h.ctx.checkMaintenanceSchedule();
  const body = h.mail[0][2];
  assert.match(body, new RegExp(QR + '[^\\n]*\\n\\s*Hạn: [0-9/]+ \\(hôm nay\\)'));
  assert.match(body, /HMO-LAB-0002[^\n]*\n\s*Hạn: [0-9/]+ \(quá 1 ngày\)/);
  assert.match(h.mail[0][1], /1 quá hạn, 1 sắp đến hạn/);
});

// ====================== Giá một chiếc = Nguyên giá (tổng dòng) ÷ Số lượng ======================
function withDevice(row) {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.sheets.Master_Data.rows.push(row);
  return h;
}
test('Giá: định dạng số triệu kiểu Việt Nam', () => {
  const h = harness();
  assert.deepEqual([1920, 960, 470.8, 941.6 / 2, 514.3468 / 4, 1215.9, 3.3, 0].map(h.ctx.formatMillion_),
    ['1.920', '960', '470,8', '470,8', '128,6', '1.215,9', '3,3', '0']);
});
test('Giá: S631 (2 máy, tổng 1.920 tr) → email xin duyệt ghi 960 tr/chiếc, kèm tổng; vẫn cần PTK duyệt', () => {
  const h = withDevice(['HMO-OBS-8689', 'Thiết bị định vị vệ tinh', 1920, 'P206-T3', 'Tốt', 2, 'Quan trắc', '']);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-OBS-8689' })));
  assert.equal(lastRow(h)[12], '(Chờ phê duyệt PTK)');
  const m = h.mail.find(x => /CẦN PHÊ DUYỆT/.test(x[1]));
  assert.match(m[2], /Giá trị: 960 triệu VNĐ\/chiếc \(tổng 2 chiếc: 1\.920 triệu\)/);
  assert.match(m[3].htmlBody, /960 triệu VNĐ\/chiếc \(tổng 2 chiếc: 1\.920 triệu\)/);
  assert.ok(!/1,920|1920 triệu/.test(m[2] + m[3].htmlBody), 'không còn hiện tổng như giá 1 máy');
});
test('Giá: ngưỡng duyệt theo giá MỘT CHIẾC — 4 chiếc tổng 300 tr (75 tr/chiếc) không cần duyệt', () => {
  const h = withDevice(['HMO-OBS-0004', 'GPS cầm tay', 300, 'P204-T3', 'Tốt', 4, 'Quan trắc', '']);
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-OBS-0004' })));
  assert.equal(lastRow(h)[12], '', 'tự ghi nhận (trước đây so tổng 300 ≥ 100 nên bắt duyệt)');
  assert.match(h.mail.find(x => x[0] === 'datpt@hus.edu.vn')[2], /Giá trị: 75 triệu VNĐ\/chiếc \(tổng 4 chiếc: 300 triệu\)/);
});
test('Giá: thiết bị 1 chiếc chỉ hiện một con số; báo cáo tháng vẫn cộng theo tổng dòng', () => {
  const h = harness([], { props: { APPROVAL_SECRET: 's' } });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.match(h.mail[0][2], /Giá trị: 200 triệu VNĐ\n/);
  const r = harness();
  r.sheets.Master_Data.rows.push(['HMO-OBS-8689', 'S631', 1920, 'P206-T3', 'Tốt', 2, 'Quan trắc', '']);
  r.ctx.generateAnnualUsageReport = () => {};
  r.ctx.monthlyReport();
  // 200 + 10 + 10 + 1920 = 2140 tr = 2.1 tỷ (cộng nguyên giá theo dòng, không chia số lượng)
  assert.match(r.mail[0][2], /Tổng giá trị: 2\.1 tỷ VNĐ/);
});

// ====================== Phiếu mượn thiết bị ======================
/** SlipData mẫu cho test phiếu mượn. */
function slipData(over = {}) {
  return Object.assign({
    loanId: 'L261027-A3F9C1', qrCode: QR, equipName: 'Máy đo chất lượng nước',
    accessories: 'Pin sạc, cáp USB', condition: 'Hoạt động tốt',
    borrower: 'Nguyễn Văn A', unit: 'BM Thủy văn', email: 'a@example.invalid',
    purpose: 'Đo đạc', location: 'Hội An',
    borrowDate: new Date(2026, 9, 28), dueDate: new Date(2026, 10, 2),
    managerName: 'Trần Thị B', managerEmails: ['b@example.invalid'],
    needsApproval: false, approvedAt: null
  }, over);
}
test('Phiếu: dòng phê duyệt có 3 dạng', () => {
  const f = harness().ctx.slipApprovalLine_;
  assert.equal(f(false, null), 'Thiết bị dưới 100 triệu đồng, không cần Phó Trưởng khoa phê duyệt.');
  assert.equal(f(true, new Date(2026, 9, 27, 8, 15)), 'Phó Trưởng khoa đã phê duyệt qua email lúc 08:15 27/10/2026.');
  assert.equal(f(true, null), 'Phó Trưởng khoa đã phê duyệt qua email.');
});
test('Phiếu: slipValues_ đủ 14 dấu, ô trống in "—", không in undefined, ngày dd/MM/yyyy', () => {
  const h = harness();
  const v = h.ctx.slipValues_(slipData({ accessories: '', condition: '', managerName: '' }));
  assert.deepEqual(Object.keys(v).sort(), [...run(h, 'SLIP_TAGS')].sort());
  assert.equal(v.PHU_KIEN, '—');
  assert.equal(v.TINH_TRANG, '—');
  assert.equal(v.CAN_BO_BAN_GIAO, '', 'ô ký để trống, không in "—"');
  assert.equal(v.NGAY_MUON, '28/10/2026');
  assert.equal(v.HAN_TRA, '02/11/2026');
  assert.equal(v.SO_PHIEU, 'L261027-A3F9C1');
  assert.ok(!Object.values(v).some(x => /undefined|null/.test(x)));
});
test('Phiếu: escapeSlipReplacement_ thoát \\ và $; slipAttachmentName_ đúng quy ước', () => {
  const h = harness();
  assert.equal(h.ctx.escapeSlipReplacement_('a$1\\b'), 'a\\$1\\\\b');
  assert.equal(h.ctx.slipAttachmentName_(slipData()), 'PhieuMuon_L261027-A3F9C1_' + QR);
});

/**
 * Drive / Docs / UrlFetch / Script giả cho test phiếu. Ghi vào `state`:
 * copies[] (id, name, folder), replacements[copyId][TAG] = chuỗi sau khi áp dụng NGỮ NGHĨA THAY THẾ CỦA JAVA
 * (`\x` → x; `$` không thoát → ném lỗi, như Body.replaceText thật), fetches[] (url, headers).
 * state.copyFails / fetchFails / folderMissing giả lỗi.
 */
function slipGlobals(state) {
  Object.assign(state, { copies: [], replacements: {}, fetches: [], foldersCreated: 0, templatesCreated: 0, templateBody: [] });
  const blob = name => ({ name, getName() { return this.name; }, setName(n) { this.name = n; return this; } });
  const folder = { getId: () => 'FOLDER1' };
  const javaReplacement = repl => {
    let out = '';
    for (let i = 0; i < repl.length; i++) {
      if (repl[i] === '\\') out += repl[++i];
      else if (repl[i] === '$') throw new Error('Illegal group reference: $ không được thoát');
      else out += repl[i];
    }
    return out;
  };
  const docUrl = id => `https://docs.google.com/document/d/${id}/edit`;
  const recorder = into => new Proxy(function () {}, {
    get: (_, key) => key === 'toJSON' ? undefined : recorder(into),
    apply: (_, __, args) => { into.push(JSON.stringify(args)); return recorder(into); }
  });
  return {
    DriveApp: {
      getFileById: () => ({
        makeCopy: (name, dest) => {
          if (state.copyFails) throw new Error('Drive down');
          const id = 'COPY' + (state.copies.length + 1);
          state.copies.push({ id, name, folder: dest && dest.getId() });
          state.replacements[id] = {};
          return { getId: () => id, getUrl: () => docUrl(id), getAs: () => blob(name) };
        }
      }),
      getFolderById: () => { if (state.folderMissing) throw new Error('Folder not found'); return folder; },
      createFolder: () => { state.foldersCreated++; return folder; }
    },
    DocumentApp: {
      openById: id => ({
        getBody: () => ({
          replaceText: (pattern, repl) => {
            const m = /^\\\{\\\{(\w+)\\\}\\\}$/.exec(pattern);
            if (!m) throw new Error('Mẫu tìm không đúng dạng \\{\\{TAG\\}\\}: ' + pattern);
            state.replacements[id][m[1]] = javaReplacement(repl);
            return {};
          }
        }),
        saveAndClose() {}
      }),
      HorizontalAlignment: { LEFT: 'LEFT', CENTER: 'CENTER', RIGHT: 'RIGHT' },
      create: () => {
        state.templatesCreated++;
        return { getId: () => 'TEMPLATE1', getUrl: () => docUrl('TEMPLATE1'), getBody: () => recorder(state.templateBody), saveAndClose() {} };
      }
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        state.fetches.push({ url, headers: options && options.headers });
        if (state.fetchFails) throw new Error('Export failed');
        return { getBlob: () => blob('export') };
      }
    },
    ScriptApp: { getOAuthToken: () => 'TOKEN' }
  };
}
const slipHarness = (state, opts = {}) => harness(opts.logRows || [], {
  props: Object.assign({ LOAN_SLIP_TEMPLATE_ID: 'TPL', APPROVAL_SECRET: 's' }, opts.props || {}),
  globals: slipGlobals(state)
});
test('Phiếu: sao chép mẫu, điền đủ 14 dấu, xuất PDF và Word', () => {
  const st = {}; const h = slipHarness(st);
  const out = h.ctx.createLoanSlip_(slipData());
  assert.equal(st.copies.length, 1);
  assert.equal(st.copies[0].name, 'PhieuMuon_L261027-A3F9C1_' + QR);
  assert.deepEqual(Object.keys(st.replacements[st.copies[0].id]).sort(), [...run(h, 'SLIP_TAGS')].sort());
  assert.equal(st.replacements[st.copies[0].id].MA_QR, QR);
  assert.match(out.pdf.getName(), /\.pdf$/);
  assert.match(out.docx.getName(), /\.docx$/);
  assert.match(out.docUrl, /^https:\/\/docs\.google\.com\/document\/d\//);
  assert.match(st.fetches[0].url, /\/export\?format=docx$/);
  assert.equal(st.fetches[0].headers.Authorization, 'Bearer TOKEN');
});
test('Phiếu: $1, \\ và {{MA_QR}} trong dữ liệu được in nguyên văn (không lỗi, không thay lồng)', () => {
  const st = {}; const h = slipHarness(st);
  const purpose = 'Giảm $1 và C:\\tmp {{MA_QR}}';
  h.ctx.createLoanSlip_(slipData({ purpose }));
  assert.equal(st.replacements[st.copies[0].id].MUC_DICH, purpose);
});
test('Phiếu: thư mục "Phiếu mượn thiết bị" tạo một lần rồi dùng lại; thư mục bị xóa → tạo lại', () => {
  const st = {}; const h = slipHarness(st);
  h.ctx.createLoanSlip_(slipData());
  h.ctx.createLoanSlip_(slipData({ loanId: 'L261027-B' }));
  assert.equal(st.foldersCreated, 1);
  assert.equal(h.props.LOAN_SLIP_FOLDER_ID, 'FOLDER1');
  assert.equal(st.copies[1].folder, 'FOLDER1');
  st.folderMissing = true;
  h.ctx.createLoanSlip_(slipData({ loanId: 'L261027-C' }));
  assert.equal(st.foldersCreated, 2, 'thư mục bị xóa → tự tạo lại, không lỗi');
});
test('Phiếu: loanSlipEnabled_ chỉ bật khi đã có mẫu', () => {
  assert.equal(harness().ctx.loanSlipEnabled_(), false);
  assert.equal(slipHarness({}).ctx.loanSlipEnabled_(), true);
});
test('Phiếu: tính năng ngủ khi chưa có mẫu → không Drive, không email', () => {
  const st = {}; const h = harness([], { globals: slipGlobals(st) });
  assert.equal(h.ctx.issueLoanSlip_(slipData()), null);
  assert.equal(st.copies.length, 0);
  assert.equal(h.mail.length, 0);
});
test('Phiếu: Drive lỗi → trả null, không ném, PTK nhận email báo lỗi có mã giao dịch', () => {
  const st = { copyFails: true }; const h = slipHarness(st);
  assert.equal(h.ctx.issueLoanSlip_(slipData()), null);
  assert.equal(h.mail.length, 1);
  assert.equal(h.mail[0][0], 'datpt@hus.edu.vn');
  assert.match(h.mail[0][1], /Không tạo được phiếu mượn L261027-A3F9C1/);
  assert.match(h.mail[0][2], /Drive down/);
});
test('Phiếu: Drive lỗi và email báo lỗi cũng lỗi → vẫn không ném', () => {
  const h = harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' }, mailFails: true, globals: slipGlobals({ copyFails: true }) });
  assert.equal(h.ctx.issueLoanSlip_(slipData()), null);
});
test('Phiếu: thành công → ghi link vào cột W đúng dòng theo Mã giao dịch', () => {
  const st = {}; const h = slipHarness(st);
  delete h.props.LOAN_SLIP_TEMPLATE_ID; // ghi dòng Log trước, khi tính năng còn ngủ
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002', 'Họ và tên người mượn': 'Người 1' })));
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-LAB-0002', 'Họ và tên người mượn': 'Người 2' })));
  h.props.LOAN_SLIP_TEMPLATE_ID = 'TPL';
  const secondId = lastRow(h)[18];
  const slip = h.ctx.issueLoanSlip_(slipData({ loanId: secondId, qrCode: 'HMO-LAB-0002' }));
  assert.equal(h.log.rows[2][col(h).SLIP], slip.docUrl, 'dòng của người 2');
  assert.ok(!h.log.rows[1][col(h).SLIP], 'dòng của người 1 không bị đụng');
});
test('Phiếu: email cán bộ quản lý đính kèm PDF + Word; không có email CB → gửi PTK; không có phiếu → không gửi', () => {
  const st = {}; const h = slipHarness(st);
  const slip = h.ctx.createLoanSlip_(slipData());
  h.ctx.sendSlipToManagers_(slipData(), slip);
  const m = h.mail[0];
  assert.equal(m[0], 'b@example.invalid');
  assert.match(m[1], /^\[KTTV&HDH\] 📄 Phiếu mượn thiết bị — Máy đo chất lượng nước \(HMO-OBS-8693\)$/);
  assert.deepEqual(Array.from(m[3].attachments, a => a.getName()),
    ['PhieuMuon_L261027-A3F9C1_' + QR + '.pdf', 'PhieuMuon_L261027-A3F9C1_' + QR + '.docx']);
  assert.match(m[3].htmlBody, /Nguyễn Văn A/);
  h.ctx.sendSlipToManagers_(slipData({ managerEmails: [] }), slip);
  assert.equal(h.mail[1][0], 'datpt@hus.edu.vn');
  h.ctx.sendSlipToManagers_(slipData(), null);
  assert.equal(h.mail.length, 2);
});
test('Phiếu: createLoanSlipTemplate chứa đủ 14 dấu, lưu ID, gọi lần 2 không tạo mẫu mới', () => {
  const st = {}; const h = harness([], { globals: slipGlobals(st) });
  const url = h.ctx.createLoanSlipTemplate();
  assert.equal(st.templatesCreated, 1);
  assert.equal(h.props.LOAN_SLIP_TEMPLATE_ID, 'TEMPLATE1');
  assert.match(url, /^https:\/\/docs\.google\.com\/document\/d\/TEMPLATE1/);
  const content = st.templateBody.join('');
  for (const tag of run(h, 'SLIP_TAGS')) assert.ok(content.includes('{{' + tag + '}}'), 'mẫu thiếu {{' + tag + '}}');
  assert.match(content, /PHIẾU MƯỢN THIẾT BỊ/);
  assert.match(content, /CÁN BỘ MƯỢN THIẾT BỊ/);
  assert.match(content, /CÁN BỘ BÀN GIAO/);
  h.ctx.createLoanSlipTemplate();
  assert.equal(st.templatesCreated, 1, 'đã có mẫu → không tạo thêm (không ghi đè mẫu anh đã sửa)');
});
test('Phiếu: thiếu mẫu hoặc xuất Word lỗi → createLoanSlip_ ném lỗi (người gọi bắt)', () => {
  assert.throws(() => harness([], { globals: slipGlobals({}) }).ctx.createLoanSlip_(slipData()), /mẫu/i);
  const st = { fetchFails: true };
  assert.throws(() => slipHarness(st).ctx.createLoanSlip_(slipData()), /Export failed/);
});

// ---- Nối phiếu vào luồng mượn dưới 100 triệu ----
/** Thêm cột CB quản lý (tên + email) cho thiết bị HMO-LAB-0002 (10 tr × 2 chiếc → dưới ngưỡng). */
function withLabManager(h, name, emails, rowIndex = 3) {
  const rows = h.sheets.Master_Data.rows;
  rows[0].push('CB quản lý hiện tại', 'Email CB quản lý');
  rows[rowIndex].push(name, emails);
  return h;
}
const labBorrow = (over = {}) => borrowFields(Object.assign({ 'Mã QR thiết bị': 'HMO-LAB-0002' }, over));
test('Phiếu: dưới 100 tr → người mượn nhận PDF trong email xác nhận, CB nhận PDF+Word, cột W có link, đúng thứ tự', () => {
  const st = {}; const h = withLabManager(slipHarness(st), 'Trần Thị B', 'b@example.invalid');
  h.ctx.onFormSubmitBorrow(formEvent(labBorrow({ 'Phụ kiện kèm theo': 'Pin sạc', 'Tình trạng thiết bị khi mượn': 'Tốt' })));
  assert.equal(st.copies.length, 1);
  const rep = st.replacements[st.copies[0].id];
  assert.equal(rep.PHU_KIEN, 'Pin sạc');
  assert.equal(rep.TINH_TRANG, 'Tốt');
  assert.equal(rep.CAN_BO_BAN_GIAO, 'Trần Thị B');
  assert.match(rep.DONG_PHE_DUYET, /không cần Phó Trưởng khoa phê duyệt/);
  const iMine = h.mail.findIndex(m => m[0] === 'a@example.invalid');
  const iMgr = h.mail.findIndex(m => m[0] === 'b@example.invalid');
  assert.ok(iMine >= 0 && iMgr > iMine, 'người mượn nhận trước, rồi tới cán bộ quản lý');
  assert.deepEqual(Array.from(h.mail[iMine][3].attachments, a => a.getName()), [st.copies[0].name + '.pdf']);
  assert.match(h.mail[iMine][3].htmlBody, /Phiếu mượn thiết bị đính kèm/);
  assert.match(h.mail[iMine][2], /Phiếu mượn thiết bị đính kèm/);
  assert.equal(h.mail[iMgr][3].attachments.length, 2);
  assert.equal(lastRow(h)[col(h).SLIP], `https://docs.google.com/document/d/${st.copies[0].id}/edit`);
});
test('Phiếu: yêu cầu cần duyệt (200 tr), tự động từ chối, tại chỗ → không tạo phiếu', () => {
  const cases = [
    h => h.ctx.onFormSubmitBorrow(formEvent(borrowFields())),
    h => h.ctx.onFormSubmitBorrow(formEvent(borrowFields({ 'Mã QR thiết bị': 'HMO-PC-0001' }))),
    h => h.ctx.onFormSubmitOnsite(onsiteEvent({ 'Mã QR thiết bị': 'HMO-LAB-0002' }))
  ];
  for (const run1 of cases) {
    const st = {}; const h = slipHarness(st);
    run1(h);
    assert.equal(st.copies.length, 0);
    assert.ok(!lastRow(h)[col(h).SLIP]);
    assert.ok(!h.mail.some(m => /Phiếu mượn thiết bị/.test(m[1])), 'không email phiếu');
  }
});
test('Phiếu: Drive lỗi → email xác nhận vẫn gửi (không đính kèm), PTK nhận email báo lỗi, giao dịch vẫn ghi', () => {
  const st = { copyFails: true }; const h = slipHarness(st);
  h.ctx.onFormSubmitBorrow(formEvent(labBorrow()));
  assert.equal(h.log.rows.length, 2);
  const mine = h.mail.find(m => m[0] === 'a@example.invalid');
  assert.match(mine[1], /✅ Đã ghi nhận mượn/);
  assert.equal(mine[3].attachments, undefined);
  assert.ok(!/Phiếu mượn thiết bị đính kèm/.test(mine[3].htmlBody));
  assert.ok(h.mail.some(m => m[0] === 'datpt@hus.edu.vn' && /Không tạo được phiếu mượn L\d{6}-/.test(m[1])));
});
test('Phiếu: người mượn không có email → không lỗi, CB vẫn nhận phiếu', () => {
  const st = {}; const h = withLabManager(slipHarness(st), 'Trần Thị B', 'b@example.invalid');
  h.ctx.onFormSubmitBorrow(formEvent(labBorrow({ 'Email Address': '' })));
  const mgr = h.mail.find(m => m[0] === 'b@example.invalid');
  assert.equal(mgr[3].attachments.length, 2);
  assert.ok(!h.mail.some(m => m[0] === ''), 'không gửi cho địa chỉ rỗng');
});
test('Phiếu: thiết bị không có CB quản lý → phiếu gửi PTK, ô ký CB để trống, không "undefined"', () => {
  const st = {}; const h = slipHarness(st);
  h.ctx.onFormSubmitBorrow(formEvent(labBorrow()));
  const rep = st.replacements[st.copies[0].id];
  assert.equal(rep.CAN_BO_BAN_GIAO, '');
  assert.ok(!Object.values(rep).some(x => /undefined|null/.test(x)));
  assert.ok(h.mail.some(m => m[0] === 'datpt@hus.edu.vn' && /📄 Phiếu mượn thiết bị/.test(m[1])));
});
test('Phiếu: tính năng ngủ → luồng mượn dưới 100 tr y như cũ (không đính kèm, không email phiếu)', () => {
  const h = harness([], { globals: slipGlobals({}) });
  h.ctx.onFormSubmitBorrow(formEvent(labBorrow()));
  const mine = h.mail.find(m => m[0] === 'a@example.invalid');
  assert.equal(mine[3].attachments, undefined);
  assert.ok(!h.mail.some(m => /Phiếu mượn thiết bị —/.test(m[1])));
});


// ---- Nối phiếu vào luồng phê duyệt từ 100 triệu ----
const approveSetup = (st, opts = {}) => {
  const h = withLabManager(slipHarness(st), 'Trần Thị B', 'b@example.invalid', 1); // QR (200 tr) cần duyệt
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields(opts.fields || {})));
  return { h, loanId: lastRow(h)[18] };
};
test('Phiếu: từ 100 tr — chưa có phiếu khi chờ duyệt, có ngay sau khi PTK duyệt, đúng một lần', () => {
  const st = {}; const { h, loanId } = approveSetup(st, { fields: { 'Phụ kiện kèm theo': 'Cáp nguồn' } });
  assert.equal(st.copies.length, 0, 'chờ duyệt → chưa có phiếu');
  assert.ok(!lastRow(h)[col(h).SLIP]);
  const r = h.ctx.applyApprovalDecision_('approve', loanId);
  assert.ok(r.ok);
  assert.equal(st.copies.length, 1);
  const rep = st.replacements[st.copies[0].id];
  assert.match(rep.DONG_PHE_DUYET, /^Phó Trưởng khoa đã phê duyệt qua email lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}\.$/);
  assert.equal(rep.PHU_KIEN, 'Cáp nguồn');
  assert.equal(rep.CAN_BO_BAN_GIAO, 'Trần Thị B');
  const mine = h.mail.filter(m => m[0] === 'a@example.invalid').pop();
  assert.match(mine[1], /✅ Đã duyệt mượn/);
  assert.deepEqual(Array.from(mine[3].attachments, a => a.getName()), [st.copies[0].name + '.pdf']);
  assert.match(mine[3].htmlBody, /Phiếu mượn thiết bị đính kèm/);
  const mgr = h.mail.find(m => m[0] === 'b@example.invalid');
  assert.equal(mgr[3].attachments.length, 2);
  assert.equal(lastRow(h)[col(h).SLIP], `https://docs.google.com/document/d/${st.copies[0].id}/edit`);
  const mailCount = h.mail.length;
  const again = h.ctx.applyApprovalDecision_('approve', loanId);
  assert.equal(again.ok, false);
  assert.equal(st.copies.length, 1, 'bấm duyệt lần 2 không tạo phiếu thứ hai');
  assert.equal(h.mail.length, mailCount, 'không gửi lại email');
});
test('Phiếu: PTK từ chối → không phiếu', () => {
  const st = {}; const { h, loanId } = approveSetup(st);
  assert.ok(h.ctx.applyApprovalDecision_('reject', loanId).ok);
  assert.equal(st.copies.length, 0);
  assert.ok(!lastRow(h)[col(h).SLIP]);
  assert.ok(!h.mail.some(m => /Phiếu mượn thiết bị —/.test(m[1])));
});
test('Phiếu: duyệt khi Drive lỗi → trạng thái duyệt vẫn ghi, email "Đã duyệt" vẫn gửi (không đính kèm), PTK nhận email báo lỗi', () => {
  const st = { copyFails: true }; const { h, loanId } = approveSetup(st);
  const r = h.ctx.applyApprovalDecision_('approve', loanId);
  assert.ok(r.ok);
  assert.match(String(lastRow(h)[12]), /^✅ Đã phê duyệt/);
  const mine = h.mail.filter(m => m[0] === 'a@example.invalid').pop();
  assert.match(mine[1], /✅ Đã duyệt mượn/);
  assert.equal(mine[3].attachments, undefined);
  assert.ok(h.mail.some(m => m[0] === 'datpt@hus.edu.vn' && new RegExp('Không tạo được phiếu mượn ' + loanId).test(m[1])));
});
test('Phiếu: duyệt khi người mượn không có email → CB vẫn nhận phiếu', () => {
  const st = {}; const { h, loanId } = approveSetup(st, { fields: { 'Email Address': '' } });
  assert.ok(h.ctx.applyApprovalDecision_('approve', loanId).ok);
  const mgr = h.mail.find(m => m[0] === 'b@example.invalid');
  assert.equal(mgr[3].attachments.length, 2);
  assert.ok(!h.mail.some(m => m[0] === ''));
});
test('Phiếu: tính năng ngủ → duyệt y như cũ (không đính kèm, không email phiếu)', () => {
  const h = harness([], { props: { APPROVAL_SECRET: 's' }, globals: slipGlobals({}) });
  h.ctx.onFormSubmitBorrow(formEvent(borrowFields()));
  assert.ok(h.ctx.applyApprovalDecision_('approve', lastRow(h)[18]).ok);
  const mine = h.mail.filter(m => m[0] === 'a@example.invalid').pop();
  assert.equal(mine[3].attachments, undefined);
  assert.ok(!h.mail.some(m => /Phiếu mượn thiết bị —/.test(m[1])));
});

// ---- Tạo lại phiếu (menu) ----
const logSs = h => run(h, 'SpreadsheetApp.openById()');
test('Tạo lại phiếu: dòng đã duyệt → ok, link cột W đổi, email chỉ gửi CB (không gửi lại người mượn)', () => {
  const st = {}; const { h, loanId } = approveSetup(st);
  h.ctx.applyApprovalDecision_('approve', loanId);
  const oldLink = lastRow(h)[col(h).SLIP];
  const toMine = () => h.mail.filter(m => m[0] === 'a@example.invalid').length;
  const mineBefore = toMine(); const mgrBefore = h.mail.filter(m => m[0] === 'b@example.invalid').length;
  const r = h.ctx.regenerateLoanSlipForRow_(logSs(h), 2);
  assert.ok(r.ok, r.message);
  assert.equal(st.copies.length, 2);
  assert.notEqual(lastRow(h)[col(h).SLIP], oldLink);
  assert.equal(lastRow(h)[col(h).SLIP], r.docUrl);
  assert.equal(toMine(), mineBefore, 'người mượn không nhận lại');
  assert.equal(h.mail.filter(m => m[0] === 'b@example.invalid').length, mgrBefore + 1);
});
test('Tạo lại phiếu: chờ duyệt / từ chối / tại chỗ / tính năng ngủ / dòng lạ → ok:false, không Drive', () => {
  const pending = approveSetup({});
  assert.equal(pending.h.ctx.regenerateLoanSlipForRow_(logSs(pending.h), 2).ok, false);
  const rejSt = {}; const rej = approveSetup(rejSt);
  rej.h.ctx.applyApprovalDecision_('reject', rej.loanId);
  const rr = rej.h.ctx.regenerateLoanSlipForRow_(logSs(rej.h), 2);
  assert.equal(rr.ok, false); assert.match(rr.message, /từ chối/);
  const onSt = {}; const on = slipHarness(onSt);
  on.ctx.onFormSubmitOnsite(onsiteEvent({ 'Mã QR thiết bị': 'HMO-LAB-0002' }));
  const ro = on.ctx.regenerateLoanSlipForRow_(logSs(on), 2);
  assert.equal(ro.ok, false); assert.match(ro.message, /tại chỗ/);
  const ds = harness([], { globals: slipGlobals({}) });
  ds.ctx.onFormSubmitBorrow(formEvent(labBorrow()));
  const rd = ds.ctx.regenerateLoanSlipForRow_(logSs(ds), 2);
  assert.equal(rd.ok, false); assert.match(rd.message, /mẫu phiếu/);
  assert.equal(slipHarness({}).ctx.regenerateLoanSlipForRow_(logSs(slipHarness({})), 5).ok, false, 'dòng không có giao dịch');
  assert.equal(rejSt.copies.length + onSt.copies.length, 0);
});
test('Tạo lại phiếu: từ 100 tr đọc giờ duyệt từ cột M; thiếu giờ → dòng "…đã phê duyệt qua email."; dưới 100 tr → không cần duyệt', () => {
  const st = {}; const { h, loanId } = approveSetup(st);
  h.ctx.applyApprovalDecision_('approve', loanId);
  h.log.rows[1][12] = '✅ Đã phê duyệt — PTK (27/10/2026 08:15)';
  assert.ok(h.ctx.regenerateLoanSlipForRow_(logSs(h), 2).ok);
  assert.match(st.replacements[st.copies[1].id].DONG_PHE_DUYET, /lúc 08:15 27\/10\/2026\.$/);
  h.log.rows[1][12] = '✅ Đã phê duyệt — PTK';
  assert.ok(h.ctx.regenerateLoanSlipForRow_(logSs(h), 2).ok);
  assert.equal(st.replacements[st.copies[2].id].DONG_PHE_DUYET, 'Phó Trưởng khoa đã phê duyệt qua email.');
  const st2 = {}; const h2 = slipHarness(st2);
  h2.ctx.onFormSubmitBorrow(formEvent(labBorrow()));
  assert.ok(h2.ctx.regenerateLoanSlipForRow_(logSs(h2), 2).ok);
  assert.match(st2.replacements[st2.copies[1].id].DONG_PHE_DUYET, /không cần Phó Trưởng khoa phê duyệt/);
});
test('Tạo lại phiếu: menu dùng dòng đang chọn của Log_Muon_Tra, báo kết quả bằng toast', () => {
  const st = {}; const { h, loanId } = approveSetup(st);
  h.ctx.applyApprovalDecision_('approve', loanId);
  const toasts = []; let selectedRow = 2; let activeSheet = h.log;
  const app = h.ctx.SpreadsheetApp;
  app.getActiveSheet = () => activeSheet;
  app.getActiveRange = () => ({ getRow: () => selectedRow });
  app.getActiveSpreadsheet = () => ({ toast: msg => toasts.push(msg) });
  h.ctx.regenerateLoanSlip();
  assert.equal(st.copies.length, 2);
  assert.match(toasts[0], /Đã tạo lại phiếu/);
  selectedRow = 1; h.ctx.regenerateLoanSlip();
  assert.match(toasts[1], /dòng giao dịch/);
  activeSheet = h.sheets.Master_Data; selectedRow = 2; h.ctx.regenerateLoanSlip();
  assert.match(toasts[2], /Log_Muon_Tra/);
  assert.equal(st.copies.length, 2, 'dòng tiêu đề / sheet khác không tạo phiếu');
});

// ---- Đợt sửa sau review cuối ----
test('Phiếu: email người mượn lỗi → CB quản lý VẪN nhận phiếu, lỗi vẫn báo ra ngoài', () => {
  const st = {};
  const h = harness([], {
    props: { LOAN_SLIP_TEMPLATE_ID: 'TPL', APPROVAL_SECRET: 's' },
    globals: slipGlobals(st),
    mailFails: args => args[0] === 'a@example.invalid'
  });
  withLabManager(h, 'Trần Thị B', 'b@example.invalid');
  assert.throws(() => h.ctx.onFormSubmitBorrow(formEvent(labBorrow())), /gửi email thất bại/);
  const mgr = h.mail.find(m => m[0] === 'b@example.invalid');
  assert.ok(mgr, 'CB quản lý phải nhận phiếu dù email người mượn lỗi');
  assert.equal(mgr[3].attachments.length, 2);
  assert.equal(h.log.rows.length, 2, 'giao dịch vẫn ghi');
});
test('Phiếu: sheet còn cấu trúc v3 (22 cột) khi duyệt yêu cầu cũ → tự nâng v4, ghi được link cột W', () => {
  const st = {}; const { h, loanId } = approveSetup(st);
  // Giả lập ngay sau deploy: sheet chưa nâng v4 (chưa có cột W), dòng chờ duyệt đã có từ trước
  h.props.LOG_SCHEMA_VERSION = '3';
  h.log.maxCols = 22;
  h.log.rows[0].length = 22;
  h.log.rows[1].length = 22;
  assert.ok(h.ctx.applyApprovalDecision_('approve', loanId).ok);
  assert.equal(h.log.rows[0][col(h).SLIP], 'Phiếu mượn', 'header cột W được thêm');
  assert.equal(h.log.rows[1][col(h).SLIP], `https://docs.google.com/document/d/${st.copies[0].id}/edit`);
  assert.equal(h.props.LOG_SCHEMA_VERSION, '4');
});

// ---------- Kết quả ----------
let failed = 0;
for (const [ok, name, err] of results) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n     → ' + err));
  if (!ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} pass`);
process.exit(failed ? 1 : 0);
