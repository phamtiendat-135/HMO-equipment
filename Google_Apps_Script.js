/**
 * ============================================================
 * HỆ THỐNG QUẢN LÝ TRANG THIẾT BỊ - KHOA KTTV&HDH
 * Google Apps Script - Tự động hóa
 * ============================================================
 *
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet master → Extensions → Apps Script
 * 2. Xóa code mặc định, paste toàn bộ file này vào
 * 3. Thay các giá trị CONFIG bên dưới bằng URL/ID thực tế
 * 4. Chạy hàm setup() một lần để tạo trigger tự động
 * 5. Cấp quyền khi được hỏi
 */

// ==================== CẤU HÌNH ====================
const CONFIG = {
  // ID của Google Sheet chính (lấy từ URL: docs.google.com/spreadsheets/d/[SHEET_ID]/...)
  MASTER_SHEET_ID: '1k3KYyN64NzRwAh0g8BsXieHkFqudhbu6Iy7UwOoAjK4',

  // Tên các sheet
  SHEETS: {
    MASTER: 'Master_Data',
    LOG_MUON: 'Log_Muon_Tra',
    LOG_BAOTRI: 'Log_Bao_Tri',
    LOG_HONG: 'Log_Bao_Hong',
    CANBO: 'Can_Bo_QL'
  },

  // Email Phó Trưởng khoa (nhận tất cả thông báo)
  ADMIN_EMAIL: 'datpt@hus.edu.vn',

  // Ngưỡng phê duyệt (triệu VNĐ) - TB >= ngưỡng này cần Phó TK duyệt (chỉ áp dụng mượn mang đi)
  APPROVAL_THRESHOLD: 100,

  // Số giờ tối đa của MỘT lần khai báo sử dụng tại chỗ (khớp kiểm tra trên form tại chỗ)
  ONSITE_MAX_HOURS: 24,

  // Số ngày nhắc trước khi đến hạn bảo trì
  MAINTENANCE_REMINDER_DAYS: 30,

  // Số ngày quá hạn trả trước khi gửi nhắc nhở (0 = gửi ngay ngày đến hạn)
  OVERDUE_DAYS: 0,

  // Số ngày trước hạn trả để gửi email nhắc người mượn
  REMIND_DAYS_BEFORE: 2,

  // URL trang landing page — dùng trong link email nhắc trả
  LANDING_PAGE_URL: 'https://phamtiendat-135.github.io/HMO-equipment/',

  // Logo Khoa trên thanh tiêu đề email (ảnh phải ở link công khai — Gmail không hiện ảnh nhúng)
  LOGO_URL: 'https://phamtiendat-135.github.io/HMO-equipment/HMO_logo.jpg',

  // URL Apps Script Web App — dùng để tạo link phê duyệt 1-bấm trong email PTK
  // Lấy sau khi Deploy: Extensions → Apps Script → Deploy → Manage deployments → Copy URL
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q/exec', // ← dán URL vào đây sau khi deploy

  // Hạn dùng của link phê duyệt/từ chối trong email PTK (ngày)
  APPROVAL_LINK_TTL_DAYS: 14,

  // Trang Google Site hướng dẫn chung — dùng cho thiết bị CHƯA có link riêng ở cột
  // "Link hướng dẫn sử dụng" (Master_Data). Để trống → nút hiện "(đang cập nhật)".
  GUIDE_DEFAULT_URL: '',

  // Chống dò mã truy cập Nhật ký: sai quá số lần này thì khóa tạm route alllog
  LOG_MAX_FAILED_ATTEMPTS: 30,
  LOG_LOCKOUT_SECONDS: 900
};

// ==================== SETUP (CHẠY 1 LẦN) ====================

/**
 * Chạy hàm này một lần để thiết lập tất cả trigger tự động
 */
function setup() {
  // Xóa trigger cũ nếu có
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger 1a: Nhắc trả thiết bị cho người mượn - chạy hàng ngày 7h sáng
  ScriptApp.newTrigger('checkUpcomingReturns')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  // Trigger 1b: Kiểm tra quá hạn trả (gửi cho admin) - chạy hàng ngày 8h sáng
  ScriptApp.newTrigger('checkOverdueReturns')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // Trigger 2: Kiểm tra lịch bảo trì - chạy thứ 2 hàng tuần
  ScriptApp.newTrigger('checkMaintenanceSchedule')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  // Trigger 3: Báo cáo tổng hợp hàng tháng - ngày 1 hàng tháng
  ScriptApp.newTrigger('monthlyReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();

  // Trigger 3b: Báo cáo hiệu quả sử dụng thiết bị cuối năm — ngày 31 tháng 12
  // (trigger onMonthDay(31) chỉ kích hoạt vào tháng có 31 ngày; hàm yearlyReport
  //  tự kiểm tra month === 11 trước khi chạy, tránh chạy ngoài tháng 12)
  ScriptApp.newTrigger('yearlyReport')
    .timeBased()
    .onMonthDay(31)
    .atHour(9)
    .create();

  // Trigger 4: Khi có form response mới → dispatcher phân loại mượn/trả → gọi đúng hàm xử lý
  // Trigger này gắn trên Spreadsheet, bắt sự kiện form submit liên kết với Sheet
  ScriptApp.newTrigger('onFormSubmitDispatch')
    .forSpreadsheet(CONFIG.MASTER_SHEET_ID)
    .onFormSubmit()
    .create();

  // Đảm bảo cột Q và R tồn tại trong Log_Muon_Tra
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (logSheet) {
      ensureUsageHoursColumn_(logSheet); // cột Q
      ensureRemindedColumn_(logSheet);   // cột R
    }
  } catch (e) { Logger.log('⚠️ setup: không thể thêm cột Q/R — ' + e.message); }

  Logger.log('✓ Đã thiết lập tất cả trigger tự động');
  Logger.log('  - Nhắc trả TB (→ người mượn): hàng ngày 7h');
  Logger.log('  - Kiểm tra quá hạn (→ admin): hàng ngày 8h');
  Logger.log('  - Kiểm tra bảo trì: thứ 2 hàng tuần 9h');
  Logger.log('  - Báo cáo tháng: ngày 1 hàng tháng 8h');
  Logger.log('  - Báo cáo hiệu quả sử dụng năm: ngày 31/12 9h');
  Logger.log('  - Xử lý form mượn/trả: khi có form submit');
}


// ==================== TIỆN ÍCH TÌM CỘT ====================

/**
 * Tìm index cột theo từ khóa (hỗ trợ tên cột từ Form response và Log_Muon_Tra)
 * Trả về index đầu tiên khớp, hoặc -1 nếu không tìm thấy
 */
function findColIndex_(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toString().toLowerCase();
    if (keywords.some(kw => h.includes(kw))) return i;
  }
  return -1;
}

/**
 * Tìm tất cả sheet chứa dữ liệu mượn/trả (Log_Muon_Tra hoặc Form Responses)
 * Nhận diện qua header: phải có cột chứa "mã qr" VÀ cột chứa "dự kiến trả"
 */
function findBorrowSheets_(ss) {
  const result = [];
  const allSheets = ss.getSheets();

  for (const sheet of allSheets) {
    if (sheet.getLastRow() < 2) continue; // bỏ sheet trống hoặc chỉ có header

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const hasQR = findColIndex_(headers, ['mã qr', 'ma qr', 'qr code']) >= 0;
    const hasDueDate = findColIndex_(headers, ['dự kiến trả', 'du kien tra', 'hạn trả', 'han tra']) >= 0;

    if (hasQR && hasDueDate) {
      result.push(sheet);
    }
  }
  return result;
}


// ==================== 1. KIỂM TRA QUÁ HẠN TRẢ ====================

/**
 * Kiểm tra thiết bị quá hạn trả và gửi email nhắc nhở
 * Tự động quét cả sheet Log_Muon_Tra và các sheet Form Responses
 */
/**
 * Parse ngày linh hoạt: nhận Date object HOẶC chuỗi DD/MM/YYYY hoặc YYYY-MM-DD.
 * Trả về Date (không giờ) hoặc null nếu không parse được.
 */
function parseDate_(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const d = new Date(val);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const s = val.toString().trim();
  // DD/MM/YYYY (có thể kèm giờ phía sau) hoặc YYYY-MM-DD — kiểm tra ngày có thật (31/02 → null)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/);
  if (dmy || ymd) {
    const year = Number(dmy ? dmy[3] : ymd[1]);
    const month = Number(dmy ? dmy[2] : ymd[2]);
    const day = Number(dmy ? dmy[1] : ymd[3]);
    const d = new Date(year, month - 1, day);
    const isRealDate = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    return isRealDate ? d : null;
  }
  // Định dạng khác (VD chuỗi Date của Sheets) — để JS tự parse
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

// ==================== LÕI GIAO DỊCH MƯỢN/TRẢ ====================
// Mọi chỗ đọc/ghi Log_Muon_Tra dùng chung các hằng số và hàm dưới đây, để "đang mượn",
// "giữ chỗ", "đã trả" chỉ có MỘT định nghĩa (review 28/09: P1-05, P1-07, P1-08).

/** Chỉ số cột Log_Muon_Tra (0-based). S, T, U thêm từ 29/09/2026. */
const LOG_COL = {
  QR: 0, NAME: 1, BORROWER: 2, UNIT: 3, PURPOSE: 4, LOCATION: 5,
  BORROW_DATE: 6, DUE_DATE: 7, RETURN_DATE: 8, COND_OUT: 9, COND_IN: 10,
  ACCESSORIES: 11, APPROVAL: 12, NOTE: 13, OVERDUE: 14, EMAIL: 15,
  HOURS: 16, REMINDED: 17, LOAN_ID: 18, BORROW_SOURCE: 19, RETURN_SOURCE: 20
};
const LOG_WIDTH = LOG_COL.RETURN_SOURCE + 1;
const LOG_NEW_HEADERS = [
  [LOG_COL.LOAN_ID, 'Mã giao dịch'],
  [LOG_COL.BORROW_SOURCE, 'Nguồn phản hồi mượn'],
  [LOG_COL.RETURN_SOURCE, 'Nguồn phản hồi trả']
];
const LOG_SCHEMA_VERSION = '2';
const PROP_LOG_SCHEMA = 'LOG_SCHEMA_VERSION';

// ONSITE chỉ dùng khi hiển thị (displayStatus_); loanStatus_ coi khai báo tại chỗ là đã trả (có cột I)
const LOAN_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', RETURNED: 'returned', ONSITE: 'onsite' };
const APPROVAL_PENDING_TEXT = '(Chờ phê duyệt PTK)';
const ONSITE_TEXT = '🔬 Sử dụng tại chỗ — không cần duyệt';
const AUTO_REJECT_PREFIX = '⛔ Tự động từ chối — ';
// Khớp INACTIVE_STATUSES ở landing page ('Không hoạt động', 'Hỏng'), so sánh sau khi bỏ dấu
const UNBORROWABLE_STATUSES = ['khong hoat dong', 'hong'];
const MAX_TEXT_LENGTH = 1000;
const LOCK_WAIT_MS = 30000;

/** Chữ thường, bỏ dấu tiếng Việt — so khớp tên câu hỏi/tình trạng không phụ thuộc cách gõ. */
function normalizeText_(value) {
  return String(value == null ? '' : value)
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();
}

/**
 * Chuẩn hóa chuỗi người dùng nhập trước khi ghi vào Sheet: cắt độ dài, buộc lưu dạng văn bản.
 * Chuỗi mở đầu bằng = + - @ sẽ bị Sheets hiểu là công thức → thêm dấu ' phía trước.
 */
function asText_(value) {
  const s = String(value == null ? '' : value).trim().slice(0, MAX_TEXT_LENGTH);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** "Phan Hoàng Nam" → "Phan H. N." — dùng cho dữ liệu công khai theo từng thiết bị. */
function maskName_(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return [parts[0]].concat(parts.slice(1).map(p => p.charAt(0).toUpperCase() + '.')).join(' ');
}

function startOfToday_() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateVN_(date, pattern) {
  return date ? Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', pattern || 'dd/MM/yyyy') : '';
}

/** Trạng thái một dòng Log_Muon_Tra, suy ra từ cột I (ngày trả) và cột M (phê duyệt). */
function loanStatus_(row) {
  if (row[LOG_COL.RETURN_DATE]) return LOAN_STATUS.RETURNED;
  const approval = normalizeText_(row[LOG_COL.APPROVAL]);
  if (approval.includes('cho phe duyet')) return LOAN_STATUS.PENDING;
  if (approval.includes('tu choi')) return LOAN_STATUS.REJECTED;
  return LOAN_STATUS.APPROVED;
}

/** Dòng khai báo sử dụng tại chỗ (cột M mang ONSITE_TEXT). Bị từ chối tự động thì không tính. */
function isOnsite_(row) {
  return normalizeText_(row[LOG_COL.APPROVAL]).includes('su dung tai cho');
}

/** Khai báo tại chỗ chưa tới giờ kết thúc (cột I) — thiết bị đang được dùng tại phòng. */
function isOnsiteInUse_(row, now) {
  const end = row[LOG_COL.RETURN_DATE];
  return isOnsite_(row) && end instanceof Date && end > (now || new Date());
}

/** Trạng thái cho API/landing page: như loanStatus_, riêng khai báo tại chỗ là ONSITE. */
function displayStatus_(row) {
  const status = loanStatus_(row);
  return status === LOAN_STATUS.RETURNED && isOnsite_(row) ? LOAN_STATUS.ONSITE : status;
}

/**
 * Giữ chỗ thiết bị: đang chờ duyệt, đã duyệt mà chưa trả, HOẶC đang dùng tại chỗ.
 * Bị từ chối thì nhả ngay.
 */
function holdsStock_(row, now) {
  const status = loanStatus_(row);
  return status === LOAN_STATUS.PENDING || status === LOAN_STATUS.APPROVED || isOnsiteInUse_(row, now);
}

/** Thiết bị thực sự đang ở ngoài (đã duyệt, chưa trả). Dùng cho nhắc hạn / quá hạn / trả. */
function isOnLoan_(row) {
  return loanStatus_(row) === LOAN_STATUS.APPROVED;
}

/** Đọc Log_Muon_Tra. Thiếu sheet là LỖI, không được coi là "không ai mượn". */
function readLogData_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
  if (!sheet) throw new Error('Không tìm thấy sheet ' + CONFIG.SHEETS.LOG_MUON);
  return { sheet: sheet, data: sheet.getDataRange().getValues() };
}

function overdueFormula_(rowNum) {
  const n = rowNum;
  return `=IF(AND(H${n}<>"",I${n}="",TODAY()>H${n},ISERROR(SEARCH("chối",M${n})),ISERROR(SEARCH("Chờ phê duyệt",M${n}))),"✓","")`;
}

function newLoanId_() {
  return 'L' + formatDateVN_(new Date(), 'yyMMdd') + '-' +
    Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
}

/**
 * Nâng cấu trúc Log_Muon_Tra lên phiên bản 2 (chạy 1 lần, tự động, gọi TRONG vùng khóa):
 * thêm header S–U, gán Mã giao dịch cho dòng cũ, cập nhật công thức Quá hạn bỏ qua dòng bị từ chối.
 */
function ensureLogSchema_(sheet) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROP_LOG_SCHEMA) === LOG_SCHEMA_VERSION) return;

  if (sheet.getMaxColumns() < LOG_WIDTH) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), LOG_WIDTH - sheet.getMaxColumns());
  }
  LOG_NEW_HEADERS.forEach(([col, title]) => {
    const cell = sheet.getRange(1, col + 1);
    if (!cell.getValue()) cell.setValue(title).setFontWeight('bold').setBackground('#E8EAF6');
  });

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const qrs = sheet.getRange(2, LOG_COL.QR + 1, lastRow - 1, 1).getValues();
    const idRange = sheet.getRange(2, LOG_COL.LOAN_ID + 1, lastRow - 1, 1);
    const ids = idRange.getValues().map((r, i) => [r[0] || (qrs[i][0] ? newLoanId_() : '')]);
    idRange.setValues(ids);
    const formulas = qrs.map((r, i) => [r[0] ? overdueFormula_(i + 2) : '']);
    sheet.getRange(2, LOG_COL.OVERDUE + 1, lastRow - 1, 1).setFormulas(formulas);
  }
  props.setProperty(PROP_LOG_SCHEMA, LOG_SCHEMA_VERSION);
  Logger.log('✓ Log_Muon_Tra đã nâng lên cấu trúc v' + LOG_SCHEMA_VERSION);
}

/**
 * Tra câu trả lời form theo từ khóa (không phân biệt dấu). Từ khóa đứng trước được ưu tiên.
 * exact=true: tên câu hỏi phải TRÙNG từ khóa (tránh "Đơn vị thực hiện" khớp nhầm
 * "Tên đơn vị thực hiện (nếu thuê ngoài)").
 */
function namedValueFinder_(namedValues) {
  const findRaw = rawValueFinder_(namedValues);
  return function find(keywords, exact) {
    const value = findRaw(keywords, exact);
    return value != null ? String(value).trim() : '';
  };
}

/** Như namedValueFinder_ nhưng trả giá trị gốc (Date giữ nguyên), null nếu không có. */
function rawValueFinder_(namedValues) {
  const entries = Object.keys(namedValues || {}).map(key => [normalizeText_(key), namedValues[key]]);
  return function findRaw(keywords, exact) {
    for (const kw of keywords.map(normalizeText_)) {
      for (const [key, value] of entries) {
        if (exact ? key === kw : key.includes(kw)) return value ? value[0] : null;
      }
    }
    return null;
  };
}

/**
 * Giá trị THẬT trong các ô của dòng phản hồi, dạng { "tên câu hỏi": [giá trị] } như namedValues.
 * Câu hỏi ngày là Date thật → không phụ thuộc Ngôn ngữ của Sheet (e.namedValues chỉ là chữ,
 * Sheet để locale Mỹ thì "05/10/2026" là 10/5). Không đọc được → {} (dùng chữ như cũ).
 */
function formCellValues_(e) {
  try {
    const sheet = e.range.getSheet();
    const firstCol = e.range.getColumn();
    const width = e.range.getNumColumns();
    const headers = sheet.getRange(1, firstCol, 1, width).getValues()[0];
    const values = e.range.getValues()[0];
    const timeZone = sheet.getParent().getSpreadsheetTimeZone();
    const out = {};
    headers.forEach((header, i) => {
      if (!header) return;
      const v = values[i];
      out[header] = [v instanceof Date ? wallClockDate_(v, timeZone) : v];
    });
    return out;
  } catch (err) {
    Logger.log('formCellValues_: không đọc được ô phản hồi, dùng namedValues — ' + err.message);
    return {};
  }
}

/** Date của ô (hiểu theo múi giờ của Sheet) → Date có cùng ngày giờ trên lịch theo múi giờ script. */
function wallClockDate_(date, timeZone) {
  const p = Utilities.formatDate(date, timeZone, 'yyyy-MM-dd-HH-mm-ss').split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2], p[3], p[4], p[5]);
}

/**
 * Đọc câu hỏi ngày: ưu tiên Date trong ô, ô không phải Date mới đọc chữ (dd/MM/yyyy).
 * Trả ngày (00:00) hoặc null nếu trống / không hợp lệ.
 */
function formDateFinder_(namedValues, cellValues) {
  const findCell = rawValueFinder_(cellValues);
  const findText = namedValueFinder_(namedValues);
  return function findDate(keywords) {
    const cell = findCell(keywords);
    return cell instanceof Date ? parseDate_(cell) : parseDate_(findText(keywords));
  };
}

/** Câu hỏi đặc trưng của từng form (theo Create_Google_Forms.js), đã bỏ dấu. */
const FORM_SIGNATURES = {
  borrow: ['ngay du kien tra', 'ngay muon'],
  onsite: ['so gio su dung', 'nguoi su dung'],
  return: ['tinh trang thiet bi khi tra', 'nguoi tra', 'ngay tra thuc te', 'phu kien tra kem'],
  maintenance: ['loai cong viec', 'ngay thuc hien'],
  damage: ['muc do hong', 'mo ta su co', 'nguoi phat hien']
};

/** Nhận diện loại form từ bộ câu hỏi. Khớp đúng MỘT loại mới trả về, còn lại trả null. */
function classifyFormEvent_(namedValues) {
  const keys = Object.keys(namedValues || {}).map(normalizeText_);
  const matches = Object.keys(FORM_SIGNATURES).filter(type =>
    FORM_SIGNATURES[type].some(sig => keys.some(key => key.includes(sig))));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Định danh duy nhất của một phản hồi: "<tab>!<dòng>@<dấu thời gian>".
 * Chạy lại cùng event → cùng ID → bỏ qua; xóa dòng làm dịch số dòng vẫn không trùng vì khác thời gian.
 */
function sourceIdOf_(e) {
  if (!e || !e.range) return '';
  try {
    const stamp = (e.values && e.values[0]) ? String(e.values[0]) : '';
    return e.range.getSheet().getName() + '!' + e.range.getRow() + '@' + stamp;
  } catch (err) {
    return '';
  }
}

const GUIDE_COLUMN_TITLE = 'Link hướng dẫn sử dụng';

/** Chỉ nhận link https:// (ô Sheet do người nhập) — còn lại coi như chưa có. */
function safeGuideUrl_(value) {
  const s = String(value == null ? '' : value).trim();
  return /^https:\/\/\S+$/i.test(s) ? s : '';
}

/** Tra Master_Data theo mã QR. Trả null nếu mã không có trong danh mục. */
function getMasterRecord_(ss, qrCode) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  if (!sheet) throw new Error('Không tìm thấy sheet ' + CONFIG.SHEETS.MASTER);
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const col = {
    qr: h.indexOf('Mã QR'),
    name: h.indexOf('Tên thiết bị'),
    value: h.indexOf('Nguyên giá (tr.đ)'),
    qty: findColIndex_(h, ['số lượng']),
    status: findColIndex_(h, ['tình trạng']),
    location: findColIndex_(h, ['địa điểm']),
    guide: findColIndex_(h, ['link hướng dẫn', 'hướng dẫn sử dụng'])
  };
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[col.qr]).trim() !== qrCode) continue;
    return {
      qrCode: qrCode,
      name: String(r[col.name] || qrCode),
      value: parseFloat(r[col.value]) || 0,
      qty: Math.max(1, parseInt(r[col.qty], 10) || 1),
      status: col.status >= 0 ? String(r[col.status] || '') : '',
      location: col.location >= 0 ? String(r[col.location] || '') : '',
      guideUrl: col.guide >= 0 ? safeGuideUrl_(r[col.guide]) : ''
    };
  }
  return null;
}

/**
 * Menu: thêm cột "Link hướng dẫn sử dụng" vào cuối Master_Data (chạy nhiều lần không sao).
 * Sau đó dán link Google Site vào ô của từng thiết bị — không cần sửa code / deploy lại.
 */
function ensureGuideColumn() {
  const sheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID).getSheetByName(CONFIG.SHEETS.MASTER);
  if (!sheet) throw new Error('Không tìm thấy sheet ' + CONFIG.SHEETS.MASTER);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existing = findColIndex_(headers, ['link hướng dẫn', 'hướng dẫn sử dụng']);
  let col, msg;
  if (existing >= 0) {
    col = existing + 1;
    msg = `Tab Master_Data đã có cột "${headers[existing]}" (cột ${columnLetter_(col)}) — dùng cột này.`;
  } else {
    col = headers.length + 1;
    if (sheet.getMaxColumns() < col) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, col).setValue(GUIDE_COLUMN_TITLE).setFontWeight('bold').setBackground('#E3F2FD')
      .setNote('Dán link Google Site (https://...) hướng dẫn sử dụng / khuyến cáo cho từng thiết bị.\n' +
        'Để trống → email phê duyệt hiện nút "Hướng dẫn sử dụng (đang cập nhật)".');
    sheet.setColumnWidth(col, 260);
    msg = `Đã thêm cột "${GUIDE_COLUMN_TITLE}" vào tab Master_Data (cột ${columnLetter_(col)}).`;
  }
  Logger.log(msg);
  // Chuyển màn hình sang Master_Data, chọn ô tiêu đề (cột có thể nằm xa bên phải).
  // Phải dùng getActiveSpreadsheet(): sheet lấy qua openById() không điều khiển được màn hình người dùng.
  // Toast thay cho alert: alert chặn script tới khi bấm OK → menu trông như "chạy mãi" nếu hộp bị che.
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    const view = active.getSheetByName(CONFIG.SHEETS.MASTER);
    active.setActiveSheet(view);
    active.setActiveRange(view.getRange(1, col));
    active.toast(msg, 'Quản lý TB', 10);
  } catch (err) { /* chạy ngoài UI */ }
  return msg;
}

/** 1 → "A", 27 → "AA". */
function columnLetter_(col) {
  let s = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

/** Lý do tự động từ chối yêu cầu mượn, hoặc '' nếu hợp lệ. */
function validateLoanRequest_(master, openCount, borrowDate, dueDate, dueDateRaw) {
  if (!master) return 'Mã QR không có trong danh mục thiết bị';
  if (UNBORROWABLE_STATUSES.includes(normalizeText_(master.status))) {
    return 'Thiết bị đang ở tình trạng "' + master.status + '", không cho mượn';
  }
  if (openCount >= master.qty) {
    return 'Thiết bị đã được mượn hoặc giữ chỗ hết (' + openCount + '/' + master.qty + ')';
  }
  if (dueDateRaw && !dueDate) return 'Ngày dự kiến trả không hợp lệ';
  if (dueDate && borrowDate && dueDate < borrowDate) return 'Ngày dự kiến trả trước ngày mượn';
  return '';
}

/** Email báo lỗi xử lý cho admin. Không bao giờ ném lỗi (để không che lỗi gốc). */
function notifyAdminError_(title, detail) {
  try {
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, '[KTTV&HDH] ⚠️ Lỗi hệ thống: ' + title,
      title + '\n\n' + detail + '\n\n— Hệ thống quản lý TB Khoa KTTV&HDH');
  } catch (err) {
    Logger.log('notifyAdminError_ không gửi được: ' + err.message);
  }
}


// ==================== TÍNH GIỜ SỬ DỤNG ====================

/**
 * Tính số giờ sử dụng từ ngày mượn đến ngày trả.
 * @returns {number|null} Số giờ (làm tròn 1 chữ số thập phân), hoặc null nếu không tính được.
 */
function calculateUsageHours_(borrowDate, returnDate) {
  if (!borrowDate || !returnDate) return null;
  const bDate = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
  const rDate = returnDate instanceof Date ? returnDate : new Date(returnDate);
  if (isNaN(bDate.getTime()) || isNaN(rDate.getTime())) return null;
  const hours = (rDate - bDate) / (1000 * 3600);
  return hours > 0 ? Math.round(hours * 10) / 10 : null;
}

/**
 * Ghi giờ sử dụng vào cột Q của Log_Muon_Tra cho một dòng cụ thể.
 * Cột Q (index 16, 1-indexed = 17): Giờ sử dụng (tự động tính)
 */
function writeUsageHours_(logSheet, rowNum, borrowDate, returnDate) {
  const hours = calculateUsageHours_(borrowDate, returnDate);
  if (hours !== null) {
    const cell = logSheet.getRange(rowNum, 17); // cột Q
    cell.setValue(hours);
    cell.setNumberFormat('0.0');
    cell.setNote('Giờ sử dụng = Ngày trả - Ngày mượn (tự động tính)');
  }
  return hours;
}

/**
 * Đảm bảo cột Q trong Log_Muon_Tra có header "Giờ sử dụng (h)".
 * Chạy tự động khi cần, an toàn để gọi nhiều lần.
 */
function ensureUsageHoursColumn_(logSheet) {
  if (!logSheet || logSheet.getLastRow() < 1) return;
  const headerCell = logSheet.getRange(1, 17); // Q1
  if (!headerCell.getValue()) {
    headerCell.setValue('Giờ sử dụng (h)');
    headerCell.setFontWeight('bold')
      .setBackground('#E8F5E9')
      .setHorizontalAlignment('center')
      .setNote('Tự động tính = Ngày trả thực tế - Ngày mượn\nDùng cho báo cáo hiệu quả sử dụng cuối năm');
    logSheet.setColumnWidth(17, 110);
    Logger.log('✓ Đã thêm header cột Q (Giờ sử dụng) vào Log_Muon_Tra');
  }
}

/**
 * Đảm bảo cột R trong Log_Muon_Tra có header "Đã nhắc trả".
 * Dùng để tránh gửi lặp email nhắc trả.
 */
function ensureRemindedColumn_(logSheet) {
  if (!logSheet || logSheet.getLastRow() < 1) return;
  const headerCell = logSheet.getRange(1, 18); // R1
  if (!headerCell.getValue()) {
    headerCell.setValue('Đã nhắc trả');
    headerCell.setFontWeight('bold')
      .setBackground('#FFF9C4')
      .setHorizontalAlignment('center')
      .setNote('Tự động điền khi hệ thống gửi email nhắc trả thiết bị');
    logSheet.setColumnWidth(18, 140);
    Logger.log('✓ Đã thêm header cột R (Đã nhắc trả) vào Log_Muon_Tra');
  }
}


function checkOverdueReturns() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  // ✅ FIX: Chỉ quét Log_Muon_Tra (nguồn chính thống), KHÔNG quét Form Responses.
  // Lý do: Form Responses của form mượn KHÔNG có cột "Ngày trả thực tế",
  // nên hệ thống coi mọi bản ghi trong đó là "chưa trả" → gửi email quá hạn sai.
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);

  if (!logSheet || logSheet.getLastRow() < 2) {
    Logger.log('⚠️ checkOverdueReturns: Log_Muon_Tra trống hoặc không tồn tại');
    return;
  }

  const data = logSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueItems = [];

  // Cấu trúc cột Log_Muon_Tra:
  //   A(0) Mã QR   B(1) Tên TB   C(2) Người mượn
  //   G(6) Ngày mượn   H(7) Hạn trả   I(8) Ngày trả thực tế
  //   P(15) Email người mượn

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const returnDate = row[8];  // cột I — Ngày trả thực tế
    const dueDate    = row[7];  // cột H — Hạn trả

    // ✅ Chỉ xét dòng CHƯA TRẢ (cột I trống) VÀ có hạn trả
    if (!isOnLoan_(row) || !dueDate) continue;

    const due = parseDate_(dueDate);
    if (!due) continue;
    const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));

    if (daysOverdue >= CONFIG.OVERDUE_DAYS) {
      const email = (row[15] || '').toString().trim(); // cột P
      overdueItems.push({
        qr: (row[0] || 'N/A').toString().trim(),
        name: (row[1] || 'N/A').toString(),
        borrower: (row[2] || 'N/A').toString(),
        borrowDate: row[6] || null,
        dueDate: Utilities.formatDate(due, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
        due: due,
        daysOverdue: daysOverdue,
        email: email,
        sheet: CONFIG.SHEETS.LOG_MUON
      });
    }
  }

  if (overdueItems.length === 0) {
    Logger.log('✓ checkOverdueReturns: không có thiết bị quá hạn');
    return;
  }

  // 1. Gửi email cho từng NGƯỜI MƯỢN có email
  let borrowerSent = 0;
  overdueItems.forEach(item => {
    if (!item.email) return;
    const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(item.qr);
    const borrowDateStr = item.borrowDate
      ? Utilities.formatDate(new Date(item.borrowDate), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy')
      : 'N/A';
    const subjectB = `[KTTV&HDH] 🔴 QUÁ HẠN trả thiết bị: ${item.name} — đã quá ${item.daysOverdue} ngày`;
    let bodyB = `Kính gửi thầy/cô ${item.borrower},\n\n`;
    bodyB += `Hệ thống quản lý thiết bị Khoa KTTV&HDH thông báo:\n`;
    bodyB += `Thiết bị thầy/cô đang mượn đã QUÁ HẠN TRẢ ${item.daysOverdue} ngày.\n\n`;
    bodyB += `${'─'.repeat(48)}\n`;
    bodyB += `THÔNG TIN THIẾT BỊ QUÁ HẠN\n`;
    bodyB += `${'─'.repeat(48)}\n`;
    bodyB += `  Tên thiết bị  : ${item.name}\n`;
    bodyB += `  Mã QR         : ${item.qr}\n`;
    bodyB += `  Ngày mượn     : ${borrowDateStr}\n`;
    bodyB += `  Hạn trả       : ${item.dueDate}\n`;
    bodyB += `  Số ngày quá   : ${item.daysOverdue} ngày\n`;
    bodyB += `${'─'.repeat(48)}\n\n`;
    bodyB += `→ Vui lòng trả thiết bị NGAY hoặc liên hệ cán bộ phụ trách để gia hạn.\n\n`;
    bodyB += `→ Làm thủ tục TRẢ trực tiếp tại:\n   ${equipLink}\n\n`;
    bodyB += `${'─'.repeat(48)}\n`;
    bodyB += `Hệ thống quản lý trang thiết bị\n`;
    bodyB += `Khoa Khí tượng Thủy văn & Hải dương học\n`;
    bodyB += `Trường ĐH Khoa học Tự nhiên — ĐHQGHN\n`;
    bodyB += `Liên hệ: ${CONFIG.ADMIN_EMAIL}`;
    try {
      MailApp.sendEmail(item.email, subjectB, bodyB, { htmlBody: buildReturnReminderHtml_(true, {
        borrower: item.borrower, equipName: item.name, qrCode: item.qr, borrowDate: parseDate_(item.borrowDate),
        due: item.due, daysOverdue: item.daysOverdue
      }) });
      Logger.log(`✓ Gửi nhắc quá hạn → ${item.email} (${item.qr}, quá ${item.daysOverdue} ngày)`);
      borrowerSent++;
    } catch (err) {
      Logger.log(`⚠️ Không gửi được cho ${item.email}: ${err.message}`);
    }
  });

  // 2. Gửi email tóm tắt cho ADMIN
  const subject = `[KTTV&HDH] ⚠️ ${overdueItems.length} thiết bị quá hạn trả`;
  let body = `Kính gửi Phó Trưởng khoa,\n\n`;
  body += `Hệ thống phát hiện ${overdueItems.length} thiết bị quá hạn trả:\n\n`;
  overdueItems.forEach((item, idx) => {
    body += `${idx + 1}. ${item.qr} — ${item.name}\n`;
    body += `   Người mượn: ${item.borrower}${item.email ? ' (' + item.email + ')' : ' (không có email)'}\n`;
    body += `   Hạn trả: ${item.dueDate} (quá ${item.daysOverdue} ngày)\n\n`;
  });
  body += `Đã gửi email nhắc trực tiếp cho ${borrowerSent}/${overdueItems.length} người mượn.\n\n`;
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body,
    { htmlBody: buildOverdueSummaryHtml_(overdueItems, borrowerSent) });
  Logger.log(`✓ Đã gửi tóm tắt quá hạn cho admin; nhắc trực tiếp: ${borrowerSent} người`);
}


// ==================== 1b. NHẮC TRẢ THIẾT BỊ (GỬI CHO NGƯỜI MƯỢN) ====================

/**
 * Gửi email nhắc trả cho NGƯỜI MƯỢN trước hạn CONFIG.REMIND_DAYS_BEFORE ngày.
 * Email chứa: thông tin mượn, tình trạng khi mượn, link trực tiếp vào trang thiết bị.
 * Chạy hàng ngày 7h sáng (trước checkOverdueReturns).
 *
 * Cột Log_Muon_Tra dùng trong hàm này:
 *   A(0)  Mã QR         B(1)  Tên thiết bị    C(2) Người mượn
 *   G(6)  Ngày mượn     H(7)  Ngày dự kiến trả I(8) Ngày trả thực tế
 *   J(9)  Tình trạng khi mượn                  P(15) Email người mượn
 */
function checkUpcomingReturns() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);

  if (!logSheet || logSheet.getLastRow() < 2) {
    Logger.log('checkUpcomingReturns: Log_Muon_Tra trống, bỏ qua.');
    return;
  }

  const data = logSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sentCount = 0;

  for (let i = 1; i < data.length; i++) {
    const qrCode          = (data[i][0]  || '').toString().trim();
    const equipName       = (data[i][1]  || '').toString();
    const borrower        = (data[i][2]  || '').toString();
    const borrowDate      = data[i][6];   // cột G
    const dueDate         = data[i][7];   // cột H
    const returnDate      = data[i][8];   // cột I — còn trống nếu chưa trả
    const conditionBorrow = (data[i][9]  || '').toString(); // cột J
    const email           = (data[i][15] || '').toString().trim(); // cột P

    // Bỏ qua: đã trả, không có hạn, không có email người mượn
    if (!isOnLoan_(data[i]) || !dueDate || !email) continue;

    const due = parseDate_(dueDate);
    if (!due) continue;
    const daysUntilDue = Math.floor((due - today) / (1000 * 60 * 60 * 24));

    // Gửi khi còn <= REMIND_DAYS_BEFORE ngày (và chưa gửi lần nào)
    if (daysUntilDue > CONFIG.REMIND_DAYS_BEFORE || daysUntilDue < 0) continue;
    // Kiểm tra cột R (index 17) — "Đã nhắc" — tránh gửi lặp
    const alreadyReminded = (data[i][17] || '').toString().trim();
    if (alreadyReminded) continue;

    // === Tạo link trực tiếp đến trang thiết bị ===
    const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(qrCode);

    // === Nội dung email ===
    const dueDateStr   = Utilities.formatDate(due, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
    const borrowDateStr = borrowDate
      ? Utilities.formatDate(new Date(borrowDate), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy')
      : 'N/A';

    const subject = `[KTTV&HDH] ⏰ Nhắc trả thiết bị: ${equipName} — hạn ${dueDateStr}`;

    let body = `Kính gửi thầy/cô ${borrower},\n\n`;
    body += `Hệ thống quản lý thiết bị Khoa KTTV&HDH nhắc thầy/cô: thiết bị dưới đây `;
    body += `sẽ đến hạn trả sau ${CONFIG.REMIND_DAYS_BEFORE} ngày (vào ${dueDateStr}).\n\n`;

    body += `${'─'.repeat(48)}\n`;
    body += `THÔNG TIN THIẾT BỊ ĐÃ MƯỢN\n`;
    body += `${'─'.repeat(48)}\n`;
    body += `  Tên thiết bị         : ${equipName}\n`;
    body += `  Mã QR                : ${qrCode}\n`;
    body += `  Ngày mượn            : ${borrowDateStr}\n`;
    body += `  Hạn trả              : ${dueDateStr}\n`;
    if (conditionBorrow) {
      body += `  Tình trạng khi mượn  : ${conditionBorrow}\n`;
    }
    body += `${'─'.repeat(48)}\n\n`;

    body += `→ Bấm link sau để xem thiết bị và làm thủ tục TRẢ ngay trên điện thoại:\n\n`;
    body += `   ${equipLink}\n\n`;
    body += `(Trang sẽ hiển thị đúng thiết bị — bấm nút "✅ Xác nhận trả" để hoàn tất)\n\n`;

    body += `Vui lòng trả thiết bị đúng hạn để tránh bị nhắc nhở bởi hệ thống.\n`;
    body += `Nếu cần gia hạn, liên hệ trực tiếp với cán bộ phụ trách mảng.\n\n`;

    body += `${'─'.repeat(48)}\n`;
    body += `Hệ thống quản lý trang thiết bị\n`;
    body += `Khoa Khí tượng Thủy văn & Hải dương học\n`;
    body += `Trường ĐH Khoa học Tự nhiên — ĐHQGHN\n`;
    body += `Liên hệ: ${CONFIG.ADMIN_EMAIL}`;

    try {
      MailApp.sendEmail(email, subject, body, { htmlBody: buildReturnReminderHtml_(false, {
        borrower: borrower, equipName: equipName, qrCode: qrCode, borrowDate: parseDate_(borrowDate),
        due: due, condition: conditionBorrow
      }) });
      // Đánh dấu cột R (index 17) để tránh gửi lặp
      logSheet.getRange(i + 1, 18).setValue('✓ ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'));
      Logger.log(`✓ Nhắc trả: gửi cho ${email} — TB ${qrCode}, hạn ${dueDateStr}`);
      sentCount++;
    } catch (err) {
      Logger.log(`⚠️ Không gửi được email nhắc trả cho ${email}: ${err.message}`);
    }
  }

  Logger.log(`checkUpcomingReturns: đã gửi ${sentCount} email nhắc trả.`);
}

/**
 * Email gửi người mượn: nhắc sắp đến hạn (overdue=false) hoặc báo quá hạn (overdue=true).
 * o: { borrower, equipName, qrCode, borrowDate, due, daysOverdue, condition }
 */
function buildReturnReminderHtml_(overdue, o) {
  const tone = overdue ? EMAIL_TONE.red : EMAIL_TONE.amber;
  const dueStr = formatDateVN_(o.due);
  const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(o.qrCode);
  const blocks = [
    emailBlock_(emailPill_(overdue ? '🔴 QUÁ HẠN TRẢ' : '⏰ SẮP ĐẾN HẠN TRẢ', tone) +
      emailP_(emailGreeting_(o.borrower), true) +
      emailP_(overdue
        ? `Thiết bị thầy/cô đang mượn đã ${emailStrong_(`quá hạn trả ${o.daysOverdue} ngày`, tone)}.`
        : `Thiết bị thầy/cô đang mượn sắp đến hạn trả (${emailStrong_(daysLeftText_(o.due), tone)}).`), 24),
    emailBlock_(overdue
      ? emailHighlight_('⚠️ Đã quá hạn', `${o.daysOverdue} ngày`, `Hạn trả: ${WEEKDAYS_VN[o.due.getDay()]}, ${dueStr}`, tone)
      : emailHighlight_('📅 Hạn trả thiết bị', dueStr, weekdayLeft_(o.due), tone)),
    emailBlock_(emailDetails_([
      ['Thiết bị', emailEquip_(o.equipName, o.qrCode)],
      ['Ngày mượn', escapeHtml_(formatDateVN_(o.borrowDate))],
      ['Hạn trả', emailStrong_(dueStr, tone)],
      ['Tình trạng khi mượn', escapeHtml_(o.condition)]
    ])),
    emailBlock_(emailNote_((overdue
      ? 'Vui lòng trả thiết bị ngay hoặc liên hệ cán bộ phụ trách để gia hạn. '
      : 'Vui lòng trả thiết bị đúng hạn; cần gia hạn thì liên hệ cán bộ phụ trách mảng. ') +
      'Khi trả, mở trang thiết bị và bấm <strong>“✅ Xác nhận trả”</strong>.')),
    emailBlock_(emailButtonRow_([emailButton_(equipLink, '✅ Mở trang trả thiết bị', 'primary')]), 16)
  ];
  return emailLayout_({
    heading: overdue ? 'Thiết bị quá hạn trả' : 'Nhắc hạn trả thiết bị',
    tone: tone, blocks: blocks, support: 'Cần gia hạn hoặc hỗ trợ'
  });
}

/** Email tổng hợp quá hạn gửi PTK: mỗi thiết bị một dòng (quá N ngày | thiết bị, người mượn, hạn). */
function buildOverdueSummaryHtml_(items, borrowerSent) {
  const tone = EMAIL_TONE.red;
  const esc = escapeHtml_;
  const rows = items.map(item => [`Quá ${item.daysOverdue} ngày`,
    emailEquip_(item.name, item.qr) +
    `<div style="margin-top:6px">Người mượn: ${emailStrong_(item.borrower)}` +
    (item.email ? ` · ${esc(item.email)}` : ' · <em style="color:#c62828">không có email</em>') + `</div>` +
    `<div style="color:#6b7280;font-size:13px">Hạn trả: ${esc(item.dueDate)}</div>`]);
  const blocks = [
    emailBlock_(emailPill_(`🔴 ${items.length} THIẾT BỊ QUÁ HẠN`, tone) +
      emailP_(`Kính gửi Phó Trưởng khoa, hệ thống phát hiện ${emailStrong_(items.length + ' thiết bị', tone)} quá hạn trả:`, true), 24),
    emailBlock_(emailDetails_(rows)),
    emailBlock_(emailNote_(`Đã gửi email nhắc trực tiếp cho <strong>${borrowerSent}/${items.length}</strong> người mượn.`))
  ];
  return emailLayout_({ heading: 'Tổng hợp thiết bị quá hạn', tone: tone, blocks: blocks });
}


// ==================== 2. KIỂM TRA LỊCH BẢO TRÌ ====================

/**
 * Kiểm tra thiết bị sắp đến hạn bảo trì/hiệu chuẩn
 */
function checkMaintenanceSchedule() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const maintSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_BAOTRI);

  if (!maintSheet || maintSheet.getLastRow() < 2) return;

  const data = maintSheet.getDataRange().getValues();
  const headers = data[0];
  const today = new Date();

  const colQR = headers.indexOf('Mã QR');
  const colTen = headers.indexOf('Tên thiết bị');
  const colNextDate = headers.indexOf('Ngày hiệu chuẩn tiếp theo');

  const upcomingMaint = [];

  // Chỉ xét lịch HIỆU LỰC: bản ghi mới nhất (theo ngày thực hiện) của mỗi thiết bị
  const colDone = headers.indexOf('Ngày thực hiện');
  const latestByQR = {};
  for (let i = 1; i < data.length; i++) {
    const qr = String(data[i][colQR] || '').trim();
    if (!qr) continue;
    const done = parseDate_(data[i][colDone]) || new Date(0);
    if (!latestByQR[qr] || done >= latestByQR[qr].done) latestByQR[qr] = { row: data[i], done: done };
  }

  for (const { row } of Object.values(latestByQR)) {
    const nextDate = row[colNextDate];

    if (nextDate) {
      const nd = parseDate_(nextDate);
      if (!nd) continue; // bỏ qua nếu ngày không hợp lệ
      const daysUntil = Math.floor((nd - today) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0 && daysUntil <= CONFIG.MAINTENANCE_REMINDER_DAYS) {
        upcomingMaint.push({
          qr: row[colQR],
          name: row[colTen],
          nextDate: Utilities.formatDate(nd, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
          daysUntil: daysUntil
        });
      } else if (daysUntil <= 0) {
        upcomingMaint.push({
          qr: row[colQR],
          name: row[colTen],
          nextDate: Utilities.formatDate(nd, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
          daysUntil: daysUntil,
          overdue: true
        });
      }
    }
  }

  if (upcomingMaint.length === 0) return;

  const overdue = upcomingMaint.filter(m => m.overdue);
  const upcoming = upcomingMaint.filter(m => !m.overdue);

  const subject = `[KTTV&HDH] 🔧 Lịch bảo trì: ${overdue.length} quá hạn, ${upcoming.length} sắp đến hạn`;
  let body = `Kính gửi Phó Trưởng khoa,\n\n`;

  if (overdue.length > 0) {
    body += `❗ THIẾT BỊ QUÁ HẠN BẢO TRÌ/HIỆU CHUẨN:\n\n`;
    overdue.forEach(m => {
      body += `  • ${m.qr} — ${m.name}\n`;
      body += `    Hạn: ${m.nextDate} (quá ${Math.abs(m.daysUntil)} ngày)\n\n`;
    });
  }

  if (upcoming.length > 0) {
    body += `📅 SẮP ĐẾN HẠN (trong ${CONFIG.MAINTENANCE_REMINDER_DAYS} ngày tới):\n\n`;
    upcoming.forEach(m => {
      body += `  • ${m.qr} — ${m.name}\n`;
      body += `    Hạn: ${m.nextDate} (còn ${m.daysUntil} ngày)\n\n`;
    });
  }

  body += `Vui lòng lên kế hoạch bảo trì.\n\n`;
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}


// ==================== 3. BÁO CÁO HÀNG THÁNG ====================

/**
 * Tổng hợp và gửi báo cáo hàng tháng
 */
function monthlyReport() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
  const maintSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_BAOTRI);

  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];

  // Thống kê tổng quan
  const total = masterData.length - 1;
  const colStatus = headers.indexOf('Tình trạng thực tế (01/2025)');
  const colValue = headers.indexOf('Nguyên giá (tr.đ)');
  const colCat = headers.indexOf('Nhóm (tên)');

  let totalValue = 0;
  const statusCount = {};
  const catCount = {};

  for (let i = 1; i < masterData.length; i++) {
    const status = masterData[i][colStatus] || 'N/A';
    const value = parseFloat(masterData[i][colValue]) || 0;
    const cat = masterData[i][colCat] || 'Khác';

    totalValue += value;
    statusCount[status] = (statusCount[status] || 0) + 1;
    catCount[cat] = (catCount[cat] || 0) + 1;
  }

  // Đếm mượn trong tháng (mượn mang đi và sử dụng tại chỗ tính riêng)
  let borrowCount = 0;
  let returnCount = 0;
  let onsiteCount = 0;
  let onsiteHours = 0;
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // 23:59:59 ngày cuối tháng — để không bỏ sót giao dịch trong ngày cuối
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  if (logSheet && logSheet.getLastRow() > 1) {
    const logData = logSheet.getDataRange().getValues();
    const colBorrowDate = logData[0].indexOf('Ngày mượn');
    const colReturnDate = logData[0].indexOf('Ngày trả thực tế');

    for (let i = 1; i < logData.length; i++) {
      if (loanStatus_(logData[i]) === LOAN_STATUS.REJECTED) continue;
      const onsite = isOnsite_(logData[i]);
      const bDate = parseDate_(logData[i][colBorrowDate]);
      if (bDate && bDate >= firstOfMonth && bDate <= lastOfMonth) {
        if (onsite) {
          onsiteCount++;
          onsiteHours += Number(logData[i][LOG_COL.HOURS]) || 0;
        } else {
          borrowCount++;
        }
      }
      // Khai báo tại chỗ tự đóng — không tính là lượt trả
      const rDate = parseDate_(logData[i][colReturnDate]);
      if (!onsite && rDate && rDate >= firstOfMonth && rDate <= lastOfMonth) {
        returnCount++;
      }
    }
  }

  // Đếm bảo trì trong tháng
  let maintCount = 0;
  if (maintSheet && maintSheet.getLastRow() > 1) {
    const maintData = maintSheet.getDataRange().getValues();
    const colMaintDate = maintData[0].indexOf('Ngày thực hiện');

    for (let i = 1; i < maintData.length; i++) {
      const mDate = maintData[i][colMaintDate];
      if (mDate && new Date(mDate) >= firstOfMonth && new Date(mDate) <= lastOfMonth) {
        maintCount++;
      }
    }
  }

  // Tạo email
  const monthName = Utilities.formatDate(lastOfMonth, 'Asia/Ho_Chi_Minh', 'MM/yyyy');
  const subject = `[KTTV&HDH] 📊 Báo cáo trang thiết bị tháng ${monthName}`;

  let body = `BÁO CÁO TRANG THIẾT BỊ THÁNG ${monthName}\n`;
  body += `Khoa Khí tượng Thủy văn & Hải dương học\n`;
  body += `${'='.repeat(50)}\n\n`;

  body += `1. TỔNG QUAN\n`;
  body += `   Tổng thiết bị: ${total}\n`;
  body += `   Tổng giá trị: ${(totalValue / 1000).toFixed(1)} tỷ VNĐ\n\n`;

  body += `2. TÌNH TRẠNG\n`;
  Object.entries(statusCount).sort().forEach(([status, count]) => {
    body += `   ${status}: ${count}\n`;
  });

  body += `\n3. HOẠT ĐỘNG TRONG THÁNG\n`;
  body += `   Lượt mượn mang đi: ${borrowCount}\n`;
  body += `   Lượt trả: ${returnCount}\n`;
  body += `   Lượt sử dụng tại chỗ: ${onsiteCount} (${Math.round(onsiteHours * 10) / 10} giờ)\n`;
  body += `   Lượt bảo trì: ${maintCount}\n\n`;

  body += `4. PHÂN BỔ THEO NHÓM\n`;
  Object.entries(catCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    body += `   ${cat}: ${count}\n`;
  });

  body += `\n${'='.repeat(50)}\n`;
  body += `Báo cáo tự động từ Hệ thống quản lý TB Khoa KTTV&HDH\n`;
  body += `Liên hệ: ${CONFIG.ADMIN_EMAIL}`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  Logger.log(`Đã gửi báo cáo tháng ${monthName}`);

  // Báo cáo năm chạy vào ngày 1/1 cho năm TRƯỚC (đủ dữ liệu tới hết 31/12)
  if (now.getMonth() === 0) generateAnnualUsageReport(now.getFullYear() - 1);
}


// ==================== 4. XỬ LÝ FORM RESPONSE ====================

/**
 * Gọi khi có form mượn thiết bị mới (trigger gắn trên Spreadsheet)
 * Event object (Sheet-side): e.values (mảng giá trị), e.range, e.namedValues
 */
function onFormSubmitBorrow(e) {
  if (!e || !e.namedValues) throw new Error('onFormSubmitBorrow: event không hợp lệ');
  const req = readBorrowRequest_(e.namedValues, formCellValues_(e));
  if (!req.qrCode) throw new Error('Phản hồi mượn thiếu mã QR');

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const loan = recordLoanRequest_(ss, req, sourceIdOf_(e));
  if (!loan) return; // phản hồi này đã được ghi trước đó
  notifyLoanRequest_(loan);
}

function readBorrowRequest_(namedValues, cellValues) {
  const find = namedValueFinder_(namedValues);
  const findDate = formDateFinder_(namedValues, cellValues);
  return {
    qrCode: find(['mã qr', 'qr code', 'mã thiết bị']).toUpperCase(),
    borrower: find(['họ và tên', 'người mượn', 'họ tên']),
    unit: find(['đơn vị', 'nhóm nghiên cứu']),
    purpose: find(['mục đích', 'lý do']),
    location: find(['địa điểm']),
    borrowDateRaw: find(['ngày mượn']),
    borrowDate: findDate(['ngày mượn']),
    dueDateRaw: find(['ngày dự kiến trả', 'dự kiến trả', 'hạn trả']),
    dueDate: findDate(['ngày dự kiến trả', 'dự kiến trả', 'hạn trả']),
    condition: find(['tình trạng']),
    accessories: find(['phụ kiện']),
    note: find(['ghi chú', 'lưu ý']),
    email: find(['email', 'thư điện tử']),
    phone: find(['điện thoại', 'phone'])
  };
}

/**
 * Form KHAI BÁO SỬ DỤNG TẠI CHỖ: không cần phê duyệt, không cần quét trả.
 * Bắt đầu = lúc xử lý phản hồi; khoản tự đóng sau số giờ khai báo (vẫn giữ chỗ tới lúc đó).
 */
function onFormSubmitOnsite(e) {
  if (!e || !e.namedValues) throw new Error('onFormSubmitOnsite: event không hợp lệ');
  const req = readOnsiteRequest_(e.namedValues);
  if (!req.qrCode) throw new Error('Phản hồi sử dụng tại chỗ thiếu mã QR');

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const loan = recordLoanRequest_(ss, req, sourceIdOf_(e));
  if (!loan) return; // phản hồi này đã được ghi trước đó
  notifyLoanRequest_(loan);
}

function readOnsiteRequest_(namedValues) {
  const find = namedValueFinder_(namedValues);
  const hoursRaw = find(['số giờ sử dụng', 'số giờ']);
  const hours = Number(hoursRaw.replace(',', '.'));
  const validHours = hoursRaw !== '' && hours > 0 && hours <= CONFIG.ONSITE_MAX_HOURS;
  return {
    mode: 'onsite',
    qrCode: find(['mã qr', 'qr code', 'mã thiết bị']).toUpperCase(),
    borrower: find(['người sử dụng', 'họ và tên', 'họ tên']),
    unit: find(['đơn vị', 'nhóm nghiên cứu']),
    purpose: find(['mục đích', 'lý do']),
    hoursRaw: hoursRaw,
    hours: validHours ? Math.round(hours * 10) / 10 : null,
    note: find(['ghi chú', 'lưu ý']),
    email: find(['email', 'thư điện tử']),
    phone: find(['điện thoại', 'phone'])
  };
}

/**
 * Kiểm tra + ghi yêu cầu mượn (hoặc khai báo tại chỗ khi req.mode === 'onsite')
 * vào Log_Muon_Tra trong MỘT vùng khóa, TRƯỚC khi gửi email.
 * Ghi vào số dòng xác định (không appendRow + getLastRow) để 2 submit đồng thời không lẫn dòng.
 * Trả thông tin giao dịch, hoặc null nếu phản hồi này đã được ghi.
 */
function recordLoanRequest_(ss, req, sourceId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    const { sheet } = readLogData_(ss);
    ensureLogSchema_(sheet);
    const data = sheet.getDataRange().getValues();
    if (sourceId && data.some((r, i) => i > 0 && r[LOG_COL.BORROW_SOURCE] === sourceId)) {
      Logger.log('Bỏ qua phản hồi mượn đã xử lý: ' + sourceId);
      return null;
    }

    const master = getMasterRecord_(ss, req.qrCode);
    const now = new Date();
    const openCount = data.filter((r, i) =>
      i > 0 && String(r[LOG_COL.QR]).trim() === req.qrCode && holdsStock_(r, now)).length;
    const onsite = req.mode === 'onsite';
    const borrowDate = onsite ? now : (req.borrowDate || startOfToday_());
    // Tại chỗ: "hạn trả" = giờ kết thúc theo số giờ khai báo
    const dueDate = onsite ? (req.hours ? new Date(now.getTime() + req.hours * 3600000) : null) : req.dueDate;
    const rejectReason = validateLoanRequest_(master, openCount, borrowDate, dueDate, req.dueDateRaw) ||
      (onsite && !req.hours
        ? `Số giờ sử dụng "${req.hoursRaw}" không hợp lệ (tối đa ${CONFIG.ONSITE_MAX_HOURS} giờ)` : '');
    const needsApproval = !onsite && !rejectReason && master.value >= CONFIG.APPROVAL_THRESHOLD;
    const equipLocation = master ? master.location : '';

    const loan = {
      loanId: newLoanId_(),
      rowNum: data.length + 1,
      qrCode: req.qrCode,
      equipName: master ? master.name : req.qrCode,
      equipValue: master ? master.value : 0,
      equipLocation: equipLocation,
      borrower: req.borrower, email: req.email, phone: req.phone,
      unit: req.unit, purpose: req.purpose,
      location: onsite ? 'Tại chỗ' + (equipLocation ? ' — ' + equipLocation : '') : req.location,
      borrowDate: borrowDate, dueDate: dueDate,
      onsite: onsite, hours: req.hours,
      needsApproval: needsApproval, rejectReason: rejectReason
    };
    const closeOnsite = onsite && !rejectReason;

    const row = new Array(LOG_WIDTH).fill('');
    row[LOG_COL.QR] = asText_(loan.qrCode);
    row[LOG_COL.NAME] = asText_(loan.equipName);
    row[LOG_COL.BORROWER] = asText_(req.borrower);
    row[LOG_COL.UNIT] = asText_(req.unit);
    row[LOG_COL.PURPOSE] = asText_(req.purpose);
    row[LOG_COL.LOCATION] = asText_(loan.location);
    row[LOG_COL.BORROW_DATE] = borrowDate;
    row[LOG_COL.DUE_DATE] = dueDate || '';
    // Tại chỗ tự đóng: ngày trả = giờ kết thúc, giờ sử dụng = số giờ khai báo
    row[LOG_COL.RETURN_DATE] = closeOnsite ? dueDate : '';
    row[LOG_COL.HOURS] = closeOnsite ? req.hours : '';
    row[LOG_COL.COND_OUT] = asText_(req.condition);
    row[LOG_COL.ACCESSORIES] = asText_(req.accessories);
    row[LOG_COL.APPROVAL] = rejectReason ? AUTO_REJECT_PREFIX + rejectReason
      : (onsite ? ONSITE_TEXT : (needsApproval ? APPROVAL_PENDING_TEXT : ''));
    row[LOG_COL.NOTE] = asText_(req.note);
    row[LOG_COL.OVERDUE] = overdueFormula_(loan.rowNum); // cột hệ thống — công thức có chủ đích
    row[LOG_COL.EMAIL] = asText_(req.email);
    row[LOG_COL.LOAN_ID] = loan.loanId;
    row[LOG_COL.BORROW_SOURCE] = sourceId;

    sheet.getRange(loan.rowNum, 1, 1, LOG_WIDTH).setValues([row]);
    sheet.getRange(loan.rowNum, LOG_COL.OVERDUE + 1)
      .setHorizontalAlignment('center').setFontWeight('bold').setFontColor('#FF0000').setFontSize(14);
    if (onsite) {
      sheet.getRange(loan.rowNum, LOG_COL.BORROW_DATE + 1, 1, 3).setNumberFormat('dd/MM/yyyy HH:mm');
      sheet.getRange(loan.rowNum, LOG_COL.HOURS + 1).setNumberFormat('0.0');
    } else {
      // Form mượn chỉ hỏi NGÀY → hiện dd/MM/yyyy, không kèm "0:00:00" (dễ hiểu nhầm là giờ mượn/trả)
      sheet.getRange(loan.rowNum, LOG_COL.BORROW_DATE + 1, 1, 2).setNumberFormat('dd/MM/yyyy');
    }
    SpreadsheetApp.flush();
    Logger.log(`✓ Ghi ${onsite ? 'khai báo tại chỗ' : 'yêu cầu mượn'} ${loan.loanId} (${loan.qrCode}) ` +
      `tại dòng ${loan.rowNum}` + (rejectReason ? ' — tự động từ chối: ' + rejectReason : ''));
    return loan;
  } finally {
    lock.releaseLock();
  }
}

/** Gửi email SAU khi đã ghi Log. Lỗi gửi mail không làm mất giao dịch; có menu gửi lại. */
function notifyLoanRequest_(loan) {
  try {
    if (loan.rejectReason) sendAutoRejectEmails_(loan);
    else if (loan.onsite) sendOnsiteNoticeEmail_(loan);
    else sendLoanRequestEmail_(loan);
  } catch (err) {
    throw new Error(`Đã ghi giao dịch ${loan.loanId} nhưng gửi email thất bại: ${err.message}. ` +
      (loan.needsApproval ? 'Dùng menu "Gửi lại email phê duyệt đang chờ".' : 'Giao dịch vẫn hợp lệ trong Log.'));
  }
}

/** Email thông báo cho PTK khi có khai báo sử dụng tại chỗ — chỉ để biết, không có link duyệt. */
function sendOnsiteNoticeEmail_(loan) {
  const subject = `[KTTV&HDH] 🔬 Sử dụng tại chỗ — ${loan.equipName} (${loan.qrCode})`;
  let body = `Thông báo: Có khai báo sử dụng thiết bị TẠI CHỖ (không cần phê duyệt).\n\n`;
  body += `THÔNG TIN THIẾT BỊ:\n  Tên: ${loan.equipName}\n  Mã QR: ${loan.qrCode}\n`;
  body += `  Giá trị: ${loan.equipValue.toLocaleString()} triệu VNĐ\n`;
  if (loan.equipLocation) body += `  Địa điểm: ${loan.equipLocation}\n`;
  body += `\nNGƯỜI SỬ DỤNG:\n  Họ tên: ${loan.borrower}\n`;
  if (loan.email) body += `  Email: ${loan.email}\n`;
  if (loan.phone) body += `  SĐT: ${loan.phone}\n`;
  if (loan.unit) body += `  Đơn vị: ${loan.unit}\n`;
  body += `  Mục đích: ${loan.purpose}\n`;
  body += `  Thời gian: ${formatDateVN_(loan.borrowDate, 'HH:mm dd/MM/yyyy')} → ` +
    `${formatDateVN_(loan.dueDate, 'HH:mm dd/MM/yyyy')} (${loan.hours} giờ)\n`;
  body += `  Mã giao dịch: ${loan.loanId}\n\n`;
  body += `Khoản này tự đóng khi hết giờ khai báo, người dùng không cần xác nhận trả.\n\n`;
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body, { htmlBody: buildOnsiteEmailHtml_(loan) });
}

function buildOnsiteEmailHtml_(loan) {
  const esc = escapeHtml_;
  const tone = EMAIL_TONE.teal;
  const start = loan.borrowDate;
  const end = loan.dueDate;
  const sameDay = formatDateVN_(start) === formatDateVN_(end);
  const big = sameDay
    ? `${formatDateVN_(start, 'HH:mm')} → ${formatDateVN_(end, 'HH:mm')}`
    : `${formatDateVN_(start, 'HH:mm dd/MM')} → ${formatDateVN_(end, 'HH:mm dd/MM')}`;
  const sub = `${WEEKDAYS_VN[start.getDay()]}, ${formatDateVN_(start)} · ${loan.hours} giờ`;
  const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(loan.qrCode);
  const blocks = [
    emailBlock_(emailPill_('🔬 TẠI CHỖ · KHÔNG CẦN DUYỆT', tone) +
      emailP_(`${emailStrong_(loan.borrower || 'Một cán bộ')} vừa khai báo sử dụng thiết bị ngay tại phòng. ` +
        'Khoản này tự đóng khi hết giờ — không cần phê duyệt, không cần xác nhận trả.', true), 24),
    emailBlock_(emailHighlight_('🕘 Thời gian sử dụng', big, sub, tone)),
    emailBlock_(emailDetails_([
      ['Thiết bị', emailEquip_(loan.equipName, loan.qrCode)],
      ['Giá trị', esc(loan.equipValue.toLocaleString() + ' triệu VNĐ')],
      ['Vị trí TB', esc(loan.equipLocation)],
      ['Người dùng', emailStrong_(loan.borrower)],
      ['Email', esc(loan.email)],
      ['SĐT', esc(loan.phone)],
      ['Đơn vị', esc(loan.unit)],
      ['Mục đích', esc(loan.purpose)],
      ['Mã giao dịch', emailMono_(loan.loanId)]
    ])),
    emailBlock_(emailButtonRow_([emailButton_(equipLink, '🔎 Xem thiết bị', 'primary')]), 24)
  ];
  return emailLayout_({ heading: 'Khai báo sử dụng tại chỗ', tone: tone, blocks: blocks });
}

/** Email cho PTK: thông báo (dưới ngưỡng) hoặc xin phê duyệt kèm link đã ký theo Mã giao dịch. */
function sendLoanRequestEmail_(loan) {
  const tag = loan.needsApproval ? '🔴 CẦN PHÊ DUYỆT' : '🟢 Thông báo';
  const subject = `[KTTV&HDH] ${tag} — Mượn TB: ${loan.equipName} (${loan.qrCode})`;

  let body = loan.needsApproval
    ? `⚠️ THIẾT BỊ GIÁ TRỊ CAO — CẦN PHÊ DUYỆT CỦA PHÓ TRƯỞNG KHOA\n${'─'.repeat(50)}\n\n`
    : `Thông báo: Có yêu cầu mượn thiết bị mới.\n\n`;
  body += `THÔNG TIN THIẾT BỊ:\n  Tên: ${loan.equipName}\n  Mã QR: ${loan.qrCode}\n`;
  body += `  Giá trị: ${loan.equipValue.toLocaleString()} triệu VNĐ\n`;
  if (loan.equipLocation) body += `  Địa điểm: ${loan.equipLocation}\n`;
  body += `\nNGƯỜI MƯỢN:\n  Họ tên: ${loan.borrower}\n`;
  if (loan.email) body += `  Email: ${loan.email}\n`;
  if (loan.phone) body += `  SĐT: ${loan.phone}\n`;
  body += `  Mục đích: ${loan.purpose}\n  Dự kiến trả: ${formatDateVN_(loan.dueDate) || 'N/A'}` +
    (returnsSameDay_(loan) ? ' (TRẢ TRONG NGÀY — kiểm tra lại nếu nghi nhập nhầm)' : '') + '\n';
  body += `  Mã giao dịch: ${loan.loanId}\n\n`;

  if (!loan.needsApproval || !CONFIG.WEB_APP_URL) {
    body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body, { htmlBody: buildApprovalEmailHtml_(loan, '', '') });
    return;
  }

  const approveLink = buildApprovalLink_('approve', loan.loanId);
  const rejectLink = buildApprovalLink_('reject', loan.loanId);
  body += `→ Phê duyệt: ${approveLink}\n→ Từ chối: ${rejectLink}\n\n`;
  body += `Link có hạn ${CONFIG.APPROVAL_LINK_TTL_DAYS} ngày, mở ra sẽ hỏi xác nhận trước khi ghi nhận.\n\n`;
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body,
    { htmlBody: buildApprovalEmailHtml_(loan, approveLink, rejectLink) });
}

/**
 * Hạn trả trùng ngày mượn. Hợp lệ (mượn trong ngày) nhưng hay do nhập nhầm: trên điện thoại,
 * ô chọn ngày của Google Form mặc định là hôm nay → email PTK đánh dấu để kiểm tra.
 */
function returnsSameDay_(loan) {
  return !!(loan.borrowDate && loan.dueDate) && formatDateVN_(loan.borrowDate) === formatDateVN_(loan.dueDate);
}

/**
 * Email gửi PTK cho yêu cầu mượn mang đi: xin duyệt (≥ ngưỡng, có nút Phê duyệt / Từ chối)
 * hoặc thông báo (dưới ngưỡng, approveLink rỗng → chỉ có nút Xem thiết bị).
 */
function buildApprovalEmailHtml_(loan, approveLink, rejectLink) {
  const esc = escapeHtml_;
  const needs = loan.needsApproval && approveLink;
  const tone = loan.needsApproval ? EMAIL_TONE.red : EMAIL_TONE.blue;
  const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(loan.qrCode);
  const due = loan.dueDate;

  const blocks = [emailBlock_(
    emailPill_(loan.needsApproval ? '⚠️ CẦN PHÊ DUYỆT' : 'ℹ️ THÔNG BÁO — KHÔNG CẦN DUYỆT', tone) +
    emailP_(loan.needsApproval
      ? `Thiết bị giá trị cao (≥ ${esc(CONFIG.APPROVAL_THRESHOLD)} triệu VNĐ) — cần ` +
        `${emailStrong_('Phó Trưởng khoa phê duyệt', tone)} trước khi bàn giao.`
      : `Có yêu cầu mượn mang đi thiết bị dưới ${esc(CONFIG.APPROVAL_THRESHOLD)} triệu VNĐ — ` +
        'đã ghi nhận, không cần duyệt.', true), 24)];
  if (due) {
    const sub = WEEKDAYS_VN[due.getDay()] + (returnsSameDay_(loan)
      ? ' · ⚠️ trả trong ngày (cùng ngày mượn)'
      : (loan.borrowDate ? ' · mượn từ ' + formatDateVN_(loan.borrowDate) : ''));
    blocks.push(emailBlock_(emailHighlight_('📅 Dự kiến trả', formatDateVN_(due), sub, EMAIL_TONE.amber)));
  }
  blocks.push(emailBlock_(emailDetails_([
    ['Thiết bị', emailEquip_(loan.equipName, loan.qrCode)],
    ['Giá trị', emailStrong_(loan.equipValue.toLocaleString() + ' triệu VNĐ', loan.needsApproval ? tone : null)],
    ['Vị trí TB', esc(loan.equipLocation)],
    ['Người mượn', emailStrong_(loan.borrower)],
    ['Email', esc(loan.email)],
    ['SĐT', esc(loan.phone)],
    ['Đơn vị', esc(loan.unit)],
    ['Mục đích', esc(loan.purpose)],
    ['Nơi sử dụng', esc(loan.location)],
    ['Mã giao dịch', emailMono_(loan.loanId)]
  ])));
  if (needs) {
    blocks.push(emailBlock_(emailButtonRow_([
      emailButton_(approveLink, '✅ PHÊ DUYỆT', EMAIL_TONE.green),
      emailButton_(rejectLink, '❌ TỪ CHỐI', EMAIL_TONE.red)
    ]), 24));
    blocks.push(emailBlock_(emailCaption_('Link mở trang xác nhận — chỉ ghi nhận sau khi bấm nút xác nhận. ' +
      `Hạn dùng ${CONFIG.APPROVAL_LINK_TTL_DAYS} ngày.`), 10));
  } else {
    blocks.push(emailBlock_(emailButtonRow_([emailButton_(equipLink, '🔎 Xem thiết bị', 'primary')]), 24));
  }
  return emailLayout_({
    heading: loan.needsApproval ? 'Yêu cầu mượn cần phê duyệt' : 'Thông báo mượn thiết bị',
    tone: tone, blocks: blocks
  });
}

/** Yêu cầu bị hệ thống từ chối tự động: báo PTK và người mượn (nếu có email). */
function sendAutoRejectEmails_(loan) {
  const kind = loan.onsite ? 'Khai báo sử dụng tại chỗ' : 'Yêu cầu mượn';
  const subject = `[KTTV&HDH] ⛔ ${kind} bị từ chối tự động: ${loan.equipName} (${loan.qrCode})`;
  let body = `${kind} thiết bị đã bị hệ thống TỪ CHỐI TỰ ĐỘNG.\n\n`;
  body += `  Lý do        : ${loan.rejectReason}\n`;
  body += `  Thiết bị     : ${loan.equipName} (${loan.qrCode})\n`;
  body += `  Người mượn   : ${loan.borrower || 'N/A'}${loan.email ? ' — ' + loan.email : ''}\n`;
  body += `  Mã giao dịch : ${loan.loanId}\n\n`;
  const footer = `Nếu có sai sót, vui lòng liên hệ ${CONFIG.ADMIN_EMAIL}.\n\n— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body + footer,
    { htmlBody: buildAutoRejectEmailHtml_(loan, kind, false) });
  if (loan.email) {
    const greeting = `Kính gửi thầy/cô${loan.borrower ? ' ' + loan.borrower : ''},\n\n`;
    MailApp.sendEmail(loan.email, subject, greeting + body + footer,
      { htmlBody: buildAutoRejectEmailHtml_(loan, kind, true) });
  }
}

/** toBorrower=true → có lời chào "Kính gửi thầy/cô …" và dòng liên hệ ở chân trang. */
function buildAutoRejectEmailHtml_(loan, kind, toBorrower) {
  const tone = EMAIL_TONE.red;
  const intro = `${escapeHtml_(kind)} thiết bị ${toBorrower ? 'của thầy/cô ' : ''}đã bị hệ thống ` +
    `${emailStrong_('từ chối tự động', tone)}.`;
  const blocks = [
    emailBlock_(emailPill_('⛔ TỪ CHỐI TỰ ĐỘNG', tone) +
      (toBorrower ? emailP_(emailGreeting_(loan.borrower), true) + emailP_(intro) : emailP_(intro, true)), 24),
    emailBlock_(emailNotice_('Lý do', loan.rejectReason, tone)),
    emailBlock_(emailDetails_([
      ['Thiết bị', emailEquip_(loan.equipName, loan.qrCode)],
      [loan.onsite ? 'Người dùng' : 'Người mượn', emailStrong_(loan.borrower)],
      ['Email', toBorrower ? '' : escapeHtml_(loan.email)],
      ['Mã giao dịch', emailMono_(loan.loanId)]
    ]))
  ];
  return emailLayout_({ heading: 'Yêu cầu bị từ chối tự động', tone: tone, blocks: blocks,
    support: toBorrower ? 'Nếu có sai sót, vui lòng liên hệ' : '' });
}

/**
 * Menu: gửi lại email phê duyệt cho mọi yêu cầu còn CHỜ DUYỆT (link mới, hạn mới).
 * Dùng khi gửi mail lỗi, link hết hạn, hoặc cho các email phát hành trước bản v11.
 */
function resendPendingApprovals() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  let pending;
  try {
    const { sheet } = readLogData_(ss);
    ensureLogSchema_(sheet);
    pending = sheet.getDataRange().getValues()
      .filter((r, i) => i > 0 && r[LOG_COL.LOAN_ID] && loanStatus_(r) === LOAN_STATUS.PENDING);
  } finally {
    lock.releaseLock();
  }

  let sent = 0;
  pending.forEach(r => {
    const master = getMasterRecord_(ss, String(r[LOG_COL.QR]).trim());
    sendLoanRequestEmail_({
      loanId: String(r[LOG_COL.LOAN_ID]), qrCode: String(r[LOG_COL.QR]),
      equipName: String(r[LOG_COL.NAME]), equipValue: master ? master.value : 0,
      equipLocation: master ? master.location : '',
      borrower: String(r[LOG_COL.BORROWER]), email: String(r[LOG_COL.EMAIL] || ''), phone: '',
      unit: String(r[LOG_COL.UNIT]), purpose: String(r[LOG_COL.PURPOSE]),
      dueDate: parseDate_(r[LOG_COL.DUE_DATE]), needsApproval: true
    });
    sent++;
  });
  const msg = `Đã gửi lại ${sent} email phê duyệt đang chờ.`;
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (err) { /* chạy ngoài UI */ }
}


// ==================== 4b. DISPATCHER: PHÂN LOẠI FORM MƯỢN / TRẢ ====================

/**
 * Dispatcher — trigger duy nhất bắt TẤT CẢ form submit của Spreadsheet.
 * Phân loại form mượn hay trả dựa vào tên sheet hoặc nội dung namedValues,
 * rồi route sang hàm xử lý phù hợp.
 *
 * ⚠️ QUAN TRỌNG: Sau khi deploy script mới, phải chạy lại setup() 1 lần
 *    để trigger cũ (onFormSubmitBorrow) được xóa và trigger mới (onFormSubmitDispatch) được tạo.
 */
function onFormSubmitDispatch(e) {
  if (!e || !e.namedValues) {
    Logger.log('⚠️ onFormSubmitDispatch: không nhận được event');
    return;
  }
  const type = classifyFormEvent_(e.namedValues);
  const source = sourceIdOf_(e) || '(không rõ nguồn)';
  Logger.log(`onFormSubmitDispatch → ${type || 'KHÔNG NHẬN DIỆN ĐƯỢC'} — ${source}`);

  const handlers = {
    borrow: onFormSubmitBorrow,
    onsite: onFormSubmitOnsite,
    return: onFormSubmitReturn,
    maintenance: onFormSubmitMaintenance,
    damage: onFormSubmitDamage
  };
  if (!type) {
    notifyAdminError_('Không nhận diện được phản hồi form',
      `Nguồn: ${source}\nCâu hỏi: ${Object.keys(e.namedValues).join(' | ')}\n\n` +
      'Phản hồi KHÔNG được xử lý. Kiểm tra lại tên câu hỏi của form so với FORM_SIGNATURES.');
    return;
  }
  try {
    handlers[type](e);
  } catch (err) {
    notifyAdminError_(`Lỗi xử lý phản hồi form ${type}`, `Nguồn: ${source}\nLỗi: ${err.message}`);
    throw err; // để execution hiện "Failed" trong Apps Script, không nuốt lỗi
  }
}


// ==================== 4c. XỬ LÝ FORM TRẢ THIẾT BỊ ====================

/**
 * Xử lý form TRẢ. Chỉ đóng khoản mượn khi xác định được CHẮC CHẮN khoản nào:
 *   - 1 khoản đang mượn → đóng khoản đó (cảnh báo nếu người trả khác người mượn)
 *   - nhiều khoản → khớp theo email, rồi theo họ tên người mượn; không khớp duy nhất → KHÔNG đóng
 * Ngày trả trước ngày mượn hoặc ở tương lai → KHÔNG đóng. Mọi trường hợp đều báo PTK.
 */
function onFormSubmitReturn(e) {
  if (!e || !e.namedValues) throw new Error('onFormSubmitReturn: event không hợp lệ');
  const req = readReturnRequest_(e.namedValues, formCellValues_(e));
  if (!req.qrCode) throw new Error('Phản hồi trả thiếu mã QR');

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const result = recordReturn_(ss, req, sourceIdOf_(e));
  if (!result) return; // phản hồi này đã được xử lý
  sendReturnEmail_(ss, result);
}

function readReturnRequest_(namedValues, cellValues) {
  const find = namedValueFinder_(namedValues);
  const findDate = formDateFinder_(namedValues, cellValues);
  return {
    qrCode: find(['mã qr', 'qr code', 'mã thiết bị']).toUpperCase(),
    returner: find(['họ và tên', 'người trả', 'họ tên']),
    condition: find(['tình trạng thiết bị khi trả', 'tình trạng khi trả', 'tình trạng']),
    notes: find(['ghi chú', 'mô tả tình trạng', 'lưu ý']),
    returnDateRaw: find(['ngày trả thực tế', 'ngày trả']),
    returnDate: findDate(['ngày trả thực tế', 'ngày trả']),
    email: find(['email', 'thư điện tử'])
  };
}

/** Chọn dòng cần đóng; trả { index } hoặc { problem }. */
function pickLoanToClose_(data, req) {
  const onLoan = [];
  let pendingCount = 0;
  let onsiteCount = 0;
  data.forEach((r, i) => {
    if (i === 0 || String(r[LOG_COL.QR]).trim() !== req.qrCode) return;
    if (isOnLoan_(r)) onLoan.push(i);
    else if (loanStatus_(r) === LOAN_STATUS.PENDING) pendingCount++;
    else if (isOnsiteInUse_(r)) onsiteCount++;
  });

  if (onLoan.length === 1) return { index: onLoan[0] };
  if (onLoan.length === 0) {
    if (pendingCount) {
      return { problem: 'Yêu cầu mượn thiết bị này còn đang CHỜ DUYỆT — chưa có khoản đã bàn giao để đóng' };
    }
    return { problem: onsiteCount
      ? 'Thiết bị đang được khai báo SỬ DỤNG TẠI CHỖ — khoản này tự đóng khi hết giờ, không cần xác nhận trả'
      : 'Không có khoản mượn nào đang mở cho thiết bị này' };
  }
  const same = (a, b) => a && b && normalizeText_(a) === normalizeText_(b);
  const byEmail = onLoan.filter(i => same(data[i][LOG_COL.EMAIL], req.email));
  if (byEmail.length === 1) return { index: byEmail[0] };
  const byName = onLoan.filter(i => same(data[i][LOG_COL.BORROWER], req.returner));
  if (byName.length === 1) return { index: byName[0] };
  return { problem: `Có ${onLoan.length} khoản đang mượn thiết bị này; không xác định được khoản ` +
    'nào khớp với người trả (email/họ tên). Vui lòng đóng thủ công đúng dòng.' };
}

function recordReturn_(ss, req, sourceId) {
  const now = new Date();
  const formDate = req.returnDate;
  const returnDate = formDate
    ? new Date(formDate.getFullYear(), formDate.getMonth(), formDate.getDate(),
               now.getHours(), now.getMinutes(), now.getSeconds())
    : now;
  const result = Object.assign({}, req, { returnDate: returnDate, rowNum: -1, problem: '', warnings: [] });
  if (req.returnDateRaw && !formDate) {
    result.problem = `Ngày trả "${req.returnDateRaw}" không hợp lệ`;
    return result;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    const { sheet } = readLogData_(ss);
    ensureLogSchema_(sheet);
    const data = sheet.getDataRange().getValues();
    if (sourceId && data.some((r, i) => i > 0 && r[LOG_COL.RETURN_SOURCE] === sourceId)) {
      Logger.log('Bỏ qua phản hồi trả đã xử lý: ' + sourceId);
      return null;
    }

    const pick = pickLoanToClose_(data, req);
    if (pick.problem) {
      result.problem = pick.problem;
      return result;
    }
    const row = data[pick.index];
    const borrowDate = parseDate_(row[LOG_COL.BORROW_DATE]);
    const returnDay = new Date(returnDate);
    returnDay.setHours(0, 0, 0, 0);
    if (borrowDate && returnDay < borrowDate) {
      result.problem = `Ngày trả ${formatDateVN_(returnDay)} trước ngày mượn ${formatDateVN_(borrowDate)}`;
      return result;
    }
    if (returnDay > startOfToday_()) {
      result.problem = `Ngày trả ${formatDateVN_(returnDay)} ở tương lai`;
      return result;
    }

    const rowNum = pick.index + 1;
    sheet.getRange(rowNum, LOG_COL.RETURN_DATE + 1).setValue(returnDate).setNumberFormat('dd/MM/yyyy HH:mm');
    if (req.condition) sheet.getRange(rowNum, LOG_COL.COND_IN + 1).setValue(asText_(req.condition));
    if (req.notes) {
      const existing = String(row[LOG_COL.NOTE] || '');
      sheet.getRange(rowNum, LOG_COL.NOTE + 1)
        .setValue(asText_(existing ? existing + ' | ' + req.notes : req.notes));
    }
    sheet.getRange(rowNum, LOG_COL.RETURN_SOURCE + 1).setValue(sourceId);
    writeUsageHours_(sheet, rowNum, row[LOG_COL.BORROW_DATE], returnDate);
    SpreadsheetApp.flush();

    result.rowNum = rowNum;
    result.loanId = String(row[LOG_COL.LOAN_ID] || '');
    result.borrower = String(row[LOG_COL.BORROWER] || '');
    const differentPerson = req.returner && result.borrower &&
      normalizeText_(req.returner) !== normalizeText_(result.borrower);
    if (differentPerson) {
      result.warnings.push(`Người trả (${req.returner}) khác người mượn (${result.borrower}) — cần xác nhận`);
    }
    if (/\b(hong|hu|kem|loi|vo|mat)\b/.test(normalizeText_(req.condition))) {
      result.warnings.push(`Tình trạng khi trả: "${req.condition}" — cần kiểm tra và cập nhật Master_Data ` +
        'nếu thiết bị không còn cho mượn được');
    }
    Logger.log(`✓ Đóng khoản mượn ${result.loanId} (${req.qrCode}) tại dòng ${rowNum}`);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function sendReturnEmail_(ss, result) {
  const master = getMasterRecord_(ss, result.qrCode);
  const equipName = master ? master.name : result.qrCode;
  const needsAction = result.problem || result.warnings.length;
  const subject = result.problem
    ? `[KTTV&HDH] ⚠️ CẦN XỬ LÝ TAY — phản hồi trả: ${equipName} (${result.qrCode})`
    : `[KTTV&HDH] ✅ Đã trả thiết bị: ${equipName} (${result.qrCode})${needsAction ? ' — có cảnh báo' : ''}`;

  let body = result.problem ? `Phản hồi trả thiết bị CHƯA được ghi nhận.\n\n` : `Thiết bị đã được trả.\n\n`;
  body += `  Tên thiết bị : ${equipName}\n  Mã QR        : ${result.qrCode}\n`;
  body += `  Người trả    : ${result.returner || 'N/A'}${result.email ? ' — ' + result.email : ''}\n`;
  body += `  Ngày trả     : ${formatDateVN_(result.returnDate, 'dd/MM/yyyy HH:mm')}\n`;
  if (result.condition) body += `  Tình trạng   : ${result.condition}\n`;
  if (result.notes) body += `  Ghi chú      : ${result.notes}\n`;
  if (result.problem) {
    body += `\n⚠️ LÝ DO: ${result.problem}\n→ Vui lòng cập nhật thủ công trong Log_Muon_Tra.\n`;
  } else {
    body += `  Mã giao dịch : ${result.loanId} (dòng ${result.rowNum})\n`;
    if (result.borrower) body += `  Người mượn   : ${result.borrower}\n`;
  }
  result.warnings.forEach(w => { body += `\n⚠️ ${w}`; });
  body += `\n\n— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}


// ==================== 4d. XỬ LÝ FORM BẢO TRÌ / BÁO HỎNG ====================

const MAINT_SOURCE_COL = 13; // cột N của Log_Bao_Tri (0-based) — nguồn phản hồi, chống ghi trùng
const DAMAGE_HEADERS = ['Mã QR', 'Tên thiết bị', 'Người phát hiện', 'Thời điểm phát hiện', 'Mức độ hỏng',
  'Mô tả sự cố', 'Hoàn cảnh xảy ra', 'Link ảnh', 'Email người báo', 'Trạng thái xử lý', 'Nguồn phản hồi'];
const DAMAGE_SOURCE_COL = DAMAGE_HEADERS.length - 1;

/**
 * Ghi một dòng vào sheet log phụ trong vùng khóa, chống ghi trùng theo cột nguồn phản hồi.
 * Trả số dòng đã ghi, hoặc -1 nếu phản hồi đã được ghi trước đó.
 */
function appendUniqueRow_(sheet, sourceCol, sourceId, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    const data = sheet.getDataRange().getValues();
    if (sourceId && data.some((r, i) => i > 0 && r[sourceCol] === sourceId)) return -1;
    const rowNum = Math.max(data.length, 1) + 1;
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return rowNum;
  } finally {
    lock.releaseLock();
  }
}

function onFormSubmitMaintenance(e) {
  const find = namedValueFinder_(e.namedValues);
  const findDate = formDateFinder_(e.namedValues, formCellValues_(e));
  const qrCode = find(['mã qr', 'mã thiết bị']).toUpperCase();
  if (!qrCode) throw new Error('Phản hồi bảo trì thiếu mã QR');

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOG_BAOTRI);
  if (!sheet) throw new Error('Không tìm thấy sheet ' + CONFIG.SHEETS.LOG_BAOTRI);
  if (!sheet.getRange(1, MAINT_SOURCE_COL + 1).getValue()) {
    sheet.getRange(1, MAINT_SOURCE_COL + 1).setValue('Nguồn phản hồi').setFontWeight('bold');
  }

  const master = getMasterRecord_(ss, qrCode);
  const unitType = find(['đơn vị thực hiện'], true);
  const unitName = find(['tên đơn vị thực hiện']);
  const costRaw = find(['chi phí']);
  const cost = parseFloat(costRaw.replace(',', '.'));
  const doneKeys = ['ngày thực hiện'];
  const nextKeys = ['ngày hiệu chuẩn', 'bảo trì tiếp theo'];
  const doneDate = findDate(doneKeys);
  const nextDate = findDate(nextKeys);
  const record = {
    type: find(['loại công việc']),
    doneDate: doneDate ? formatDateVN_(doneDate) : find(doneKeys),
    nextDate: nextDate ? formatDateVN_(nextDate) : find(nextKeys), content: find(['nội dung']),
    result: find(['kết quả']), performer: find(['người thực hiện']),
    attachment: find(['tài liệu', 'link']), note: find(['ghi chú'])
  };
  const row = [
    asText_(qrCode), asText_(master ? master.name : find(['tên thiết bị'])), asText_(record.type),
    doneDate || asText_(record.doneDate), nextDate || asText_(record.nextDate),
    asText_(unitName ? unitType + ' — ' + unitName : unitType),
    isNaN(cost) ? asText_(costRaw) : cost, asText_(record.content), asText_(record.result),
    asText_(record.performer), '', asText_(record.attachment), asText_(record.note), sourceIdOf_(e)
  ];
  const rowNum = appendUniqueRow_(sheet, MAINT_SOURCE_COL, sourceIdOf_(e), row);
  if (rowNum < 0) return;

  let body = `Có bản ghi bảo trì/hiệu chuẩn mới (dòng ${rowNum} của ${CONFIG.SHEETS.LOG_BAOTRI}).\n\n`;
  body += `  Thiết bị      : ${row[1]} (${qrCode})\n  Loại          : ${record.type}\n`;
  body += `  Ngày thực hiện: ${record.doneDate}\n  Lần tiếp theo : ${record.nextDate || 'N/A'}\n`;
  body += `  Kết quả       : ${record.result}\n  Người thực hiện: ${record.performer}\n`;
  if (!master) body += `\n⚠️ Mã QR không có trong Master_Data — cần kiểm tra.\n`;
  body += `\n— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, `[KTTV&HDH] 🔧 Bảo trì: ${row[1]} (${qrCode})`, body);
}

function onFormSubmitDamage(e) {
  const find = namedValueFinder_(e.namedValues);
  const whenCell = rawValueFinder_(formCellValues_(e))(['thời điểm phát hiện']);
  const qrCode = find(['mã qr', 'mã thiết bị']).toUpperCase();
  if (!qrCode) throw new Error('Phản hồi báo hỏng thiếu mã QR');

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOG_HONG) || ss.insertSheet(CONFIG.SHEETS.LOG_HONG);
  if (!sheet.getRange(1, 1).getValue()) {
    sheet.getRange(1, 1, 1, DAMAGE_HEADERS.length).setValues([DAMAGE_HEADERS])
      .setFontWeight('bold').setBackground('#FFEBEE');
    sheet.setFrozenRows(1);
  }

  const master = getMasterRecord_(ss, qrCode);
  const report = {
    reporter: find(['người phát hiện']),
    when: whenCell instanceof Date ? formatDateVN_(whenCell, 'dd/MM/yyyy HH:mm') : find(['thời điểm phát hiện']),
    severity: find(['mức độ hỏng']), description: find(['mô tả sự cố']),
    context: find(['hoàn cảnh']), photo: find(['link ảnh']), email: find(['email'])
  };
  const row = [
    asText_(qrCode), asText_(master ? master.name : find(['tên thiết bị'])), asText_(report.reporter),
    whenCell instanceof Date ? whenCell : asText_(report.when), asText_(report.severity), asText_(report.description),
    asText_(report.context), asText_(report.photo), asText_(report.email), 'Mới — chờ kiểm tra', sourceIdOf_(e)
  ];
  const rowNum = appendUniqueRow_(sheet, DAMAGE_SOURCE_COL, sourceIdOf_(e), row);
  if (rowNum < 0) return;

  let body = `Có báo hỏng thiết bị mới (dòng ${rowNum} của ${CONFIG.SHEETS.LOG_HONG}).\n\n`;
  body += `  Thiết bị     : ${row[1]} (${qrCode})\n  Mức độ       : ${report.severity}\n`;
  body += `  Người báo    : ${report.reporter}${report.email ? ' — ' + report.email : ''}\n`;
  body += `  Thời điểm    : ${report.when}\n  Mô tả        : ${report.description}\n`;
  if (report.context) body += `  Hoàn cảnh    : ${report.context}\n`;
  if (report.photo) body += `  Ảnh          : ${report.photo}\n`;
  if (!master) body += `\n⚠️ Mã QR không có trong Master_Data — cần kiểm tra.\n`;
  body += `\n→ Hệ thống KHÔNG tự đổi tình trạng trong Master_Data. Sau khi kiểm tra, nếu thiết bị ` +
    `không còn dùng được, cập nhật cột tình trạng thành "Hỏng" để chặn mượn.\n`;
  body += `\n— Hệ thống quản lý TB Khoa KTTV&HDH`;
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, `[KTTV&HDH] 🚨 Báo hỏng: ${row[1]} (${qrCode})`, body);
}


// ==================== 5. ĐỒNG BỘ FORM RESPONSES → LOG_MUON_TRA ====================

/**
 * Chạy 1 lần để copy dữ liệu mượn từ Form Responses sang Log_Muon_Tra.
 * Bỏ qua các dòng đã có trong Log (so khớp theo Mã QR + Ngày mượn).
 * Sau khi chạy xong, menu "Quản lý TB" sẽ có nút này.
 */
function syncFormResponsesToLog() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  let syncCount = 0;
  try {
    const { sheet: logSheet } = readLogData_(ss);
    ensureLogSchema_(logSheet);
    const logData = logSheet.getDataRange().getValues();

    // Chống trùng 2 lớp: nguồn phản hồi (cột T) VÀ khóa QR + ngày mượn + người mượn.
    // Khóa thứ 2 áp cho MỌI dòng vì trigger ghi dấu thời gian dạng chuỗi hiển thị, còn ở đây
    // đọc từ sheet ra Date — hai định dạng khác nhau nên chỉ so nguồn sẽ tạo dòng trùng.
    const knownSources = new Set();
    const legacyKeys = new Set();
    const legacyKey = (qr, date, borrower) =>
      [String(qr).trim().toUpperCase(), formatDateVN_(parseDate_(date)), normalizeText_(borrower)].join('|');
    logData.forEach((r, i) => {
      if (i === 0) return;
      if (r[LOG_COL.BORROW_SOURCE]) knownSources.add(String(r[LOG_COL.BORROW_SOURCE]));
      legacyKeys.add(legacyKey(r[LOG_COL.QR], r[LOG_COL.BORROW_DATE], r[LOG_COL.BORROWER]));
    });

    let nextRow = logData.length + 1;
    for (const sheet of findBorrowSheets_(ss)) {
      if (sheet.getName() === CONFIG.SHEETS.LOG_MUON) continue;
      const data = sheet.getDataRange().getValues();
      const h = data[0];
      const col = {
        qr: findColIndex_(h, ['mã qr', 'ma qr']),
        borrower: findColIndex_(h, ['họ và tên', 'ho va ten', 'người mượn', 'nguoi muon']),
        unit: findColIndex_(h, ['đơn vị', 'don vi', 'nhóm nghiên cứu']),
        purpose: findColIndex_(h, ['mục đích', 'muc dich']),
        location: findColIndex_(h, ['địa điểm', 'dia diem']),
        borrowDate: findColIndex_(h, ['ngày mượn', 'ngay muon']),
        dueDate: findColIndex_(h, ['dự kiến trả', 'du kien tra', 'hạn trả']),
        condition: findColIndex_(h, ['tình trạng', 'tinh trang']),
        accessories: findColIndex_(h, ['phụ kiện', 'phu kien']),
        note: findColIndex_(h, ['ghi chú', 'ghi chu']),
        email: findColIndex_(h, ['email', 'thư điện tử'])
      };
      const cell = (row, c) => (c >= 0 && row[c] != null) ? row[c] : '';

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const qr = String(cell(row, col.qr)).trim().toUpperCase();
        if (!qr) continue;
        const sourceId = sheet.getName() + '!' + (i + 1) + '@' + String(row[0]);
        const key = legacyKey(qr, cell(row, col.borrowDate), cell(row, col.borrower));
        if (knownSources.has(sourceId) || legacyKeys.has(key)) continue;

        const master = getMasterRecord_(ss, qr);
        const needsApproval = !!master && master.value >= CONFIG.APPROVAL_THRESHOLD;
        const out = new Array(LOG_WIDTH).fill('');
        out[LOG_COL.QR] = asText_(qr);
        out[LOG_COL.NAME] = asText_(master ? master.name : qr);
        out[LOG_COL.BORROWER] = asText_(cell(row, col.borrower));
        out[LOG_COL.UNIT] = asText_(cell(row, col.unit));
        out[LOG_COL.PURPOSE] = asText_(cell(row, col.purpose));
        out[LOG_COL.LOCATION] = asText_(cell(row, col.location));
        out[LOG_COL.BORROW_DATE] = parseDate_(cell(row, col.borrowDate)) || '';
        out[LOG_COL.DUE_DATE] = parseDate_(cell(row, col.dueDate)) || '';
        out[LOG_COL.COND_OUT] = asText_(cell(row, col.condition));
        out[LOG_COL.ACCESSORIES] = asText_(cell(row, col.accessories));
        out[LOG_COL.APPROVAL] = master ? (needsApproval ? APPROVAL_PENDING_TEXT : '')
          : AUTO_REJECT_PREFIX + 'Mã QR không có trong danh mục thiết bị';
        out[LOG_COL.NOTE] = asText_(cell(row, col.note));
        out[LOG_COL.OVERDUE] = overdueFormula_(nextRow);
        out[LOG_COL.EMAIL] = asText_(cell(row, col.email));
        out[LOG_COL.LOAN_ID] = newLoanId_();
        out[LOG_COL.BORROW_SOURCE] = sourceId;
        logSheet.getRange(nextRow, 1, 1, LOG_WIDTH).setValues([out]);
        knownSources.add(sourceId);
        legacyKeys.add(key);
        nextRow++;
        syncCount++;
      }
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const msg = `Đồng bộ xong: ${syncCount} dòng mới được thêm vào Log_Muon_Tra`;
  Logger.log('✓ ' + msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (err) { /* chạy ngoài UI */ }
}


// ==================== 7. BÁO CÁO HIỆU QUẢ SỬ DỤNG THIẾT BỊ NĂM ====================

/**
 * Phân loại hiệu quả sử dụng dựa trên số lần mượn và tỷ lệ sử dụng (%).
 * Tiêu chí:
 *   🟢 Tích cực   : tỷ lệ ≥ 25% hoặc ≥ 10 lần mượn
 *   🟡 Trung bình : 5% ≤ tỷ lệ < 25% hoặc 4-9 lần
 *   🔴 Kém        : 0 < tỷ lệ < 5% hoặc 1-3 lần
 *   ⚫ Không SD   : 0 lần mượn
 */
function classifyUsage_(times, utilizationPct) {
  if (times === 0)                                    return '⚫ Không sử dụng';
  if (utilizationPct >= 25 || times >= 10)            return '🟢 Tích cực';
  if (utilizationPct >= 5  || times >= 4)             return '🟡 Trung bình';
  return '🔴 Kém';
}

/**
 * Backfill giờ sử dụng (cột Q) cho TẤT CẢ dòng đã trả trong Log_Muon_Tra.
 * Chạy 1 lần sau khi deploy để điền lại dữ liệu lịch sử.
 * An toàn để chạy nhiều lần (bỏ qua dòng đã có giờ).
 */
function backfillUsageHours() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
  if (!logSheet || logSheet.getLastRow() < 2) {
    Logger.log('backfillUsageHours: Log_Muon_Tra trống, bỏ qua.');
    return;
  }

  ensureUsageHoursColumn_(logSheet);

  const data = logSheet.getDataRange().getValues();
  let filled = 0;
  let skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const borrowDate  = data[i][6];  // cột G
    const returnDate  = data[i][8];  // cột I
    const existingHrs = data[i][16]; // cột Q

    // Bỏ qua: chưa trả hoặc đã có giờ
    if (!returnDate) { skipped++; continue; }
    if (existingHrs && !isNaN(existingHrs) && existingHrs > 0) { skipped++; continue; }

    const hours = writeUsageHours_(logSheet, i + 1, borrowDate, returnDate);
    if (hours !== null) filled++;
    else skipped++;
  }

  const msg = `Backfill hoàn tất: ${filled} dòng đã tính giờ SD, ${skipped} dòng bỏ qua.`;
  Logger.log('✓ ' + msg);
  try {
    SpreadsheetApp.getUi().alert('✅ ' + msg);
  } catch (e) { /* chạy qua trigger */ }
}


/**
 * Tạo/cập nhật sheet "Bao_Cao_Nam_YYYY" và gửi email HTML tổng kết.
 *
 * Chỉ số báo cáo (theo yêu cầu):
 *   - Số lần mượn trong năm
 *   - Tổng giờ sử dụng (từ cột Q Log_Muon_Tra)
 *   - Tỷ lệ sử dụng (%) = tổng giờ / 2000h × 100%
 *   - Phân loại hiệu quả (Tích cực / Trung bình / Kém / Không dùng)
 *
 * @param {number} [year] Năm cần báo cáo — mặc định: năm hiện tại
 */
function generateAnnualUsageReport(year) {
  const targetYear        = year || new Date().getFullYear();
  // Tỷ lệ SD = thời gian thiết bị ĐƯỢC MƯỢN (giờ lịch, cắt phần nằm trong kỳ) / (giờ lịch của kỳ × số lượng).
  // Kỳ = 01/01 → hết năm, hoặc → hiện tại nếu là năm đang chạy. Khoản chưa trả tính tới hiện tại.
  const periodStart = new Date(targetYear, 0, 1);
  const periodEnd   = new Date(Math.min(new Date(targetYear + 1, 0, 1).getTime(), Date.now()));
  const periodHours = Math.max(0, (periodEnd - periodStart) / 3600000);

  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);

  // === Đảm bảo cột Q tồn tại ===
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
  if (logSheet) ensureUsageHoursColumn_(logSheet);

  // === Đọc Master_Data → map thông tin thiết bị ===
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const masterData  = masterSheet.getDataRange().getValues();
  const mH          = masterData[0];
  const mColQR      = mH.indexOf('Mã QR');
  const mColName    = mH.indexOf('Tên thiết bị');
  const mColCat     = mH.indexOf('Nhóm (tên)');
  const mColRoom    = findColIndex_(mH, ['địa điểm']);
  const mColQty     = findColIndex_(mH, ['số lượng']);
  const mColValue   = mH.indexOf('Nguyên giá (tr.đ)');
  const mColStatus  = mH.indexOf('Tình trạng thực tế (01/2025)');

  const masterMap = {};
  const allQRs    = [];   // giữ thứ tự để tạo STT nhất quán
  for (let i = 1; i < masterData.length; i++) {
    const qr = (masterData[i][mColQR] || '').toString().trim();
    if (!qr) continue;
    masterMap[qr] = {
      name  : (masterData[i][mColName]   || '').toString(),
      cat   : (masterData[i][mColCat]    || 'Khác').toString(),
      room  : (masterData[i][mColRoom]   || '').toString(),
      value : parseFloat(masterData[i][mColValue]) || 0,
      qty   : Math.max(1, parseInt(masterData[i][mColQty], 10) || 1),
      status: mColStatus >= 0 ? (masterData[i][mColStatus] || '').toString() : ''
    };
    allQRs.push(qr);
  }

  // === Tổng hợp thống kê từ Log_Muon_Tra ===
  // stats[QR] = { times, totalHours, completedTimes }
  const stats = {};

  if (logSheet && logSheet.getLastRow() > 1) {
    const logData = logSheet.getDataRange().getValues();

    for (let i = 1; i < logData.length; i++) {
      const qr = (logData[i][0] || '').toString().trim();
      if (!qr) continue;

      // Chỉ khoản thực sự bàn giao (đã duyệt hoặc đã trả); bỏ chờ duyệt / bị từ chối
      const status = loanStatus_(logData[i]);
      if (status !== LOAN_STATUS.APPROVED && status !== LOAN_STATUS.RETURNED) continue;

      // Giữ giờ bắt đầu thật nếu ô là Date (khai báo tại chỗ tính theo giờ, không theo ngày)
      const rawStart = logData[i][LOG_COL.BORROW_DATE];
      const start = (rawStart instanceof Date && !isNaN(rawStart.getTime())) ? rawStart : parseDate_(rawStart);
      if (!start) continue;
      const returned = logData[i][LOG_COL.RETURN_DATE];
      const end = returned instanceof Date ? returned : (parseDate_(returned) || new Date());
      const overlapMs = Math.min(end.getTime(), periodEnd.getTime()) - Math.max(start.getTime(), periodStart.getTime());
      if (overlapMs <= 0) continue; // khoản mượn không giao với kỳ báo cáo

      if (!stats[qr]) stats[qr] = { times: 0, totalHours: 0, completedTimes: 0 };
      stats[qr].times++;
      stats[qr].totalHours += overlapMs / 3600000;
      stats[qr].completedTimes++;
    }
  }

  // === Xây dựng mảng reportRows ===
  const reportRows = allQRs.map(qr => {
    const m = masterMap[qr];
    const s = stats[qr] || { times: 0, totalHours: 0, completedTimes: 0 };
    const totalHours      = Math.round(s.totalHours * 10) / 10;
    const avgHoursPerUse  = s.completedTimes > 0
      ? Math.round(totalHours / s.completedTimes * 10) / 10 : 0;
    const basisHours      = periodHours * (m.qty || 1);
    const utilizationPct  = basisHours > 0 ? Math.round(totalHours / basisHours * 1000) / 10 : 0;
    const classification  = classifyUsage_(s.times, utilizationPct);
    return { qr, ...m, times: s.times, totalHours, avgHoursPerUse, utilizationPct, classification };
  });

  // Sắp xếp: phân loại tốt trước, trong cùng phân loại → giờ SD giảm dần
  const sortOrder = { '🟢 Tích cực': 0, '🟡 Trung bình': 1, '🔴 Kém': 2, '⚫ Không sử dụng': 3 };
  reportRows.sort((a, b) => {
    const oa = (a.classification in sortOrder) ? sortOrder[a.classification] : 3;
    const ob = (b.classification in sortOrder) ? sortOrder[b.classification] : 3;
    const d = oa - ob;
    return d !== 0 ? d : b.totalHours - a.totalHours;
  });

  // === Tạo/cập nhật sheet Bao_Cao_Nam_YYYY ===
  const sheetName  = `Bao_Cao_Nam_${targetYear}`;
  let reportSheet  = ss.getSheetByName(sheetName);
  if (reportSheet) { reportSheet.clearContents(); reportSheet.clearFormats(); }
  else             { reportSheet = ss.insertSheet(sheetName); }

  const COL_HEADERS = [
    'STT', 'Mã QR', 'Tên thiết bị', 'Nhóm TB', 'Địa điểm',
    'Nguyên giá (tr.đ)', 'Số lần mượn', 'Tổng giờ SD (h)',
    'Giờ TB/lần (h)', `Tỷ lệ SD (%)`, 'Phân loại hiệu quả'
  ];
  const N_COLS = COL_HEADERS.length;

  // Tiêu đề
  reportSheet.getRange(1, 1, 1, N_COLS).merge()
    .setValue(`BÁO CÁO HIỆU QUẢ SỬ DỤNG TRANG THIẾT BỊ NĂM ${targetYear} — KHOA KTTV&HDH`)
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center')
    .setBackground('#1565C0').setFontColor('white').setWrap(false);
  reportSheet.getRange(2, 1, 1, N_COLS).merge()
    .setValue('Khoa Khí tượng Thủy văn & Hải dương học — ĐH Khoa học Tự nhiên, ĐHQGHN')
    .setFontSize(10).setHorizontalAlignment('center').setFontColor('#555555');
  reportSheet.getRange(3, 1, 1, N_COLS).merge()
    .setValue(`Ngày xuất: ${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')}  |  Tỷ lệ SD = giờ được mượn / giờ lịch của kỳ ${Utilities.formatDate(periodStart, 'Asia/Ho_Chi_Minh', 'dd/MM')}–${Utilities.formatDate(new Date(periodEnd.getTime() - 1), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy')} × số lượng`)
    .setFontSize(9).setHorizontalAlignment('right')
    .setFontColor('#888888').setFontStyle('italic');

  // Header cột
  const headerRange = reportSheet.getRange(4, 1, 1, N_COLS);
  headerRange.setValues([COL_HEADERS])
    .setFontWeight('bold').setBackground('#1E88E5').setFontColor('white')
    .setHorizontalAlignment('center').setWrap(true);
  reportSheet.setFrozenRows(4);

  // Dữ liệu
  if (reportRows.length > 0) {
    const dataValues = reportRows.map((r, idx) => [
      idx + 1, r.qr, r.name, r.cat, r.room,
      r.value, r.times, r.totalHours, r.avgHoursPerUse, r.utilizationPct, r.classification
    ]);
    const dataRange = reportSheet.getRange(5, 1, dataValues.length, N_COLS);
    dataRange.setValues(dataValues);

    // Màu nền theo phân loại, format số
    const BG_COLOR = {
      '🟢 Tích cực': '#E8F5E9', '🟡 Trung bình': '#FFF9C4',
      '🔴 Kém': '#FFEBEE', '⚫ Không sử dụng': '#F5F5F5'
    };
    for (let i = 0; i < dataValues.length; i++) {
      const cls = dataValues[i][10];
      reportSheet.getRange(5 + i, 1, 1, N_COLS)
        .setBackground(BG_COLOR[cls] || '#FFFFFF');
    }
    reportSheet.getRange(5, 11, dataValues.length, 1)
      .setFontWeight('bold').setHorizontalAlignment('center');
    reportSheet.getRange(5, 6, dataValues.length, 1).setNumberFormat('#,##0.0');  // giá
    reportSheet.getRange(5, 8, dataValues.length, 3).setNumberFormat('0.0');      // giờ, TB, tỷ lệ
  }

  // Tóm tắt cuối sheet
  const countActive = reportRows.filter(r => r.classification === '🟢 Tích cực').length;
  const countAvg    = reportRows.filter(r => r.classification === '🟡 Trung bình').length;
  const countPoor   = reportRows.filter(r => r.classification === '🔴 Kém').length;
  const countUnused = reportRows.filter(r => r.classification === '⚫ Không sử dụng').length;
  const totalBorrows  = reportRows.reduce((s, r) => s + r.times, 0);
  const totalHoursAll = Math.round(reportRows.reduce((s, r) => s + r.totalHours, 0) * 10) / 10;

  const sumRow = 5 + reportRows.length + 2;
  reportSheet.getRange(sumRow, 1, 1, N_COLS).merge()
    .setValue('TỔNG KẾT').setFontWeight('bold').setBackground('#E3F2FD')
    .setHorizontalAlignment('center');
  const summaryData = [
    ['🟢 Tích cực',     countActive,   'thiết bị', '', '', '', '', '', '', '', ''],
    ['🟡 Trung bình',   countAvg,      'thiết bị', '', '', '', '', '', '', '', ''],
    ['🔴 Kém',          countPoor,     'thiết bị', '', '', '', '', '', '', '', ''],
    ['⚫ Không sử dụng', countUnused,  'thiết bị', '', '', '', '', '', '', '', ''],
    ['Tổng lượt mượn',  totalBorrows,  'lượt',     '', '', '', '', '', '', '', ''],
    ['Tổng giờ SD',     totalHoursAll, 'giờ',      '', '', '', '', '', '', '', '']
  ];
  reportSheet.getRange(sumRow + 1, 1, summaryData.length, N_COLS).setValues(summaryData);

  // Độ rộng cột
  const colWidths = [40, 130, 220, 100, 80, 120, 90, 110, 100, 90, 160];
  colWidths.forEach((w, i) => reportSheet.setColumnWidth(i + 1, w));

  Logger.log(`✓ Đã tạo sheet ${sheetName}: ${reportRows.length} thiết bị`);

  // === GỬI EMAIL HTML ===
  sendAnnualReportEmail_(targetYear, reportRows, totalBorrows, totalHoursAll,
    { countActive, countAvg, countPoor, countUnused });

  try {
    SpreadsheetApp.getUi().alert(
      `✅ Báo cáo năm ${targetYear} hoàn tất!\n` +
      `• Sheet: "${sheetName}" đã được tạo/cập nhật\n` +
      `• Email tóm tắt đã gửi đến: ${CONFIG.ADMIN_EMAIL}`
    );
  } catch (e) { /* trigger — không có UI */ }
}


/**
 * Gửi email HTML tổng kết hiệu quả sử dụng thiết bị
 */
function sendAnnualReportEmail_(year, rows, totalBorrows, totalHours, counts) {
  const subject = `[KTTV&HDH] 📊 Báo cáo hiệu quả sử dụng thiết bị năm ${year}`;

  // Top 10 thiết bị sử dụng nhiều giờ nhất (trong số đã mượn ít nhất 1 lần)
  const top10 = rows.filter(r => r.times > 0)
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10);

  const top10Rows = top10.map((r, i) => {
    const bg = i % 2 === 0 ? '#F8F9FA' : 'white';
    const clsColor = r.classification.includes('Tích cực') ? '#2E7D32'
      : r.classification.includes('Trung bình') ? '#F9A825' : '#C62828';
    return `<tr style="background:${bg}">
      <td style="padding:7px 10px;text-align:center;color:#888">${i + 1}</td>
      <td style="padding:7px 10px;font-family:monospace;font-size:12px;color:#1565C0">${r.qr}</td>
      <td style="padding:7px 10px">${r.name}</td>
      <td style="padding:7px 10px;text-align:center">${r.times}</td>
      <td style="padding:7px 10px;text-align:center;font-weight:700;color:#1565C0">${r.totalHours}h</td>
      <td style="padding:7px 10px;text-align:center">${r.utilizationPct}%</td>
      <td style="padding:7px 10px;text-align:center;font-weight:700;color:${clsColor}">${r.classification}</td>
    </tr>`;
  }).join('');

  // Danh sách thiết bị không sử dụng
  const unused = rows.filter(r => r.times === 0);
  const unusedListHtml = unused.slice(0, 24).map(r =>
    `<li style="margin:3px 0"><span style="font-family:monospace;color:#888;font-size:11px">${r.qr}</span> — ${r.name}</li>`
  ).join('') + (unused.length > 24
    ? `<li style="color:#aaa;font-style:italic">... và ${unused.length - 24} thiết bị khác</li>` : '');

  const htmlBody = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0"
  style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1565C0 0%,#1E88E5 100%);padding:28px 36px">
    <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.5px;text-transform:uppercase">
      Khoa Khí tượng Thủy văn &amp; Hải dương học — ĐHKHTN, ĐHQGHN</p>
    <h1 style="margin:10px 0 6px;color:white;font-size:24px;font-weight:800">
      📊 Báo cáo hiệu quả sử dụng thiết bị</h1>
    <p style="margin:0;color:rgba(255,255,255,.9);font-size:17px;font-weight:600">Năm ${year}</p>
  </td></tr>

  <!-- 4 chỉ số tổng quan -->
  <tr><td style="padding:28px 36px 0">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#E8F5E9;border-radius:10px;padding:16px 10px;text-align:center">
        <div style="font-size:34px;font-weight:900;color:#2E7D32;line-height:1">${counts.countActive}</div>
        <div style="font-size:12px;color:#555;margin-top:5px">🟢 Tích cực</div>
      </td>
      <td width="12"></td>
      <td style="background:#FFF9C4;border-radius:10px;padding:16px 10px;text-align:center">
        <div style="font-size:34px;font-weight:900;color:#F9A825;line-height:1">${counts.countAvg}</div>
        <div style="font-size:12px;color:#555;margin-top:5px">🟡 Trung bình</div>
      </td>
      <td width="12"></td>
      <td style="background:#FFEBEE;border-radius:10px;padding:16px 10px;text-align:center">
        <div style="font-size:34px;font-weight:900;color:#C62828;line-height:1">${counts.countPoor}</div>
        <div style="font-size:12px;color:#555;margin-top:5px">🔴 Kém</div>
      </td>
      <td width="12"></td>
      <td style="background:#F5F5F5;border-radius:10px;padding:16px 10px;text-align:center">
        <div style="font-size:34px;font-weight:900;color:#757575;line-height:1">${counts.countUnused}</div>
        <div style="font-size:12px;color:#555;margin-top:5px">⚫ Không dùng</div>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Tổng lượt & tổng giờ -->
  <tr><td style="padding:14px 36px 0">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#E3F2FD;border-radius:8px;padding:14px 18px">
        <span style="font-size:13px;color:#555">Tổng lượt mượn trong năm: </span>
        <strong style="font-size:20px;color:#1565C0">${totalBorrows} lượt</strong>
      </td>
      <td width="12"></td>
      <td style="background:#E3F2FD;border-radius:8px;padding:14px 18px">
        <span style="font-size:13px;color:#555">Tổng giờ sử dụng: </span>
        <strong style="font-size:20px;color:#1565C0">${totalHours}h</strong>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Top 10 -->
  ${top10.length > 0 ? `
  <tr><td style="padding:24px 36px 0">
    <h3 style="margin:0 0 12px;font-size:15px;color:#1565C0;font-weight:700">
      🏆 Top ${top10.length} thiết bị sử dụng nhiều nhất</h3>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden">
      <tr style="background:#1E88E5;color:white">
        <th style="padding:9px 10px;width:28px">#</th>
        <th style="padding:9px 10px;text-align:left">Mã QR</th>
        <th style="padding:9px 10px;text-align:left">Tên thiết bị</th>
        <th style="padding:9px 10px">Lần mượn</th>
        <th style="padding:9px 10px">Tổng giờ</th>
        <th style="padding:9px 10px">Tỷ lệ SD</th>
        <th style="padding:9px 10px">Phân loại</th>
      </tr>
      ${top10Rows}
    </table>
  </td></tr>` : ''}

  <!-- Thiết bị không sử dụng -->
  ${unused.length > 0 ? `
  <tr><td style="padding:20px 36px 0">
    <h3 style="margin:0 0 6px;font-size:15px;color:#C62828;font-weight:700">
      ⚫ Thiết bị không sử dụng trong năm (${unused.length})</h3>
    <p style="margin:0 0 10px;font-size:12px;color:#888">
      Đề nghị xem xét: kiểm tra nguyên nhân, lên kế hoạch khai thác, hoặc đề xuất thanh lý nếu cần.</p>
    <ul style="margin:0;padding-left:20px;font-size:13px;color:#333;
               column-count:2;column-gap:24px">${unusedListHtml}</ul>
  </td></tr>` : ''}

  <!-- Tiêu chí phân loại -->
  <tr><td style="padding:20px 36px 0">
    <div style="background:#F8F9FA;border-radius:8px;padding:14px 18px;font-size:12px;color:#666;line-height:1.8">
      <strong style="color:#333">Tiêu chí phân loại hiệu quả sử dụng:</strong><br>
      🟢 <strong>Tích cực</strong>: Tỷ lệ SD ≥ 25% hoặc ≥ 10 lần mượn &nbsp;&nbsp;
      🟡 <strong>Trung bình</strong>: 5% – 25% hoặc 4–9 lần &nbsp;&nbsp;
      🔴 <strong>Kém</strong>: &lt;5% hoặc 1–3 lần &nbsp;&nbsp;
      ⚫ <strong>Không SD</strong>: 0 lần mượn<br>
      <span style="color:#aaa">Tỷ lệ sử dụng = Tổng giờ SD ÷ 2000h (250 ngày × 8h) × 100%</span>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#F8F9FA;padding:16px 36px;margin-top:24px;border-top:1px solid #EEE">
    <p style="margin:0;font-size:11px;color:#BBB;text-align:center;line-height:1.6">
      Báo cáo tự động từ Hệ thống quản lý trang thiết bị — Khoa KTTV&amp;HDH<br>
      ĐH Khoa học Tự nhiên — ĐHQGHN &nbsp;|&nbsp; Liên hệ: ${CONFIG.ADMIN_EMAIL}
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  // Plain text fallback
  let plain = `BÁO CÁO HIỆU QUẢ SỬ DỤNG TRANG THIẾT BỊ NĂM ${year}\n`;
  plain += `Khoa Khí tượng Thủy văn & Hải dương học — ĐHKHTN, ĐHQGHN\n`;
  plain += `${'='.repeat(56)}\n\n`;
  plain += `TỔNG QUAN:\n`;
  plain += `  🟢 Tích cực      : ${counts.countActive} thiết bị\n`;
  plain += `  🟡 Trung bình    : ${counts.countAvg} thiết bị\n`;
  plain += `  🔴 Kém           : ${counts.countPoor} thiết bị\n`;
  plain += `  ⚫ Không sử dụng : ${counts.countUnused} thiết bị\n\n`;
  plain += `  Tổng lượt mượn  : ${totalBorrows} lượt\n`;
  plain += `  Tổng giờ SD     : ${totalHours}h\n\n`;
  if (top10.length > 0) {
    plain += `TOP ${top10.length} SỬ DỤNG NHIỀU NHẤT:\n`;
    top10.forEach((r, i) => {
      plain += `  ${i + 1}. ${r.qr} — ${r.name}: ${r.times} lần, ${r.totalHours}h (${r.utilizationPct}%)\n`;
    });
    plain += '\n';
  }
  if (unused.length > 0) {
    plain += `THIẾT BỊ KHÔNG SỬ DỤNG (${unused.length}):\n`;
    unused.forEach(r => { plain += `  • ${r.qr} — ${r.name}\n`; });
    plain += '\n';
  }
  plain += `${'='.repeat(56)}\n`;
  plain += `Chi tiết xem trong Google Sheet: "Bao_Cao_Nam_${year}"\n`;
  plain += `Báo cáo tự động — Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, plain, { htmlBody });
  Logger.log(`✓ Đã gửi email báo cáo năm ${year} đến ${CONFIG.ADMIN_EMAIL}`);
}


/**
 * Hàm wrapper cho trigger ngày 31/12 — chỉ thực sự chạy khi là tháng 12.
 * (trigger onMonthDay(31) chỉ kích hoạt vào các tháng có đủ 31 ngày)
 */
function yearlyReport() {
  // Từ 29/09/2026 báo cáo năm chạy ngày 1/1 qua monthlyReport (đủ dữ liệu hết 31/12).
  // Giữ hàm rỗng để trigger onMonthDay(31) cũ không báo lỗi; không cần chạy lại setup().
  Logger.log('yearlyReport: bỏ qua — báo cáo năm chạy ngày 1/1 trong monthlyReport');
}


// ==================== 6. TIỆN ÍCH ====================

/**
 * Tra cứu thiết bị theo mã QR (dùng cho Web App nếu cần)
 */
function lookupEquipment(qrCode) {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('Mã QR')] === qrCode) {
      const result = {};
      headers.forEach((h, idx) => { result[h] = data[i][idx]; });
      return result;
    }
  }
  return null;
}

// ==================== BẢO MẬT: MÃ TRUY CẬP NHẬT KÝ + CHỮ KÝ LINK PHÊ DUYỆT ====================
// Web App phải để ANYONE_ANONYMOUS (landing page gọi không đăng nhập), nên kiểm soát
// truy cập nằm trong code. Bí mật lưu ở Script Properties, KHÔNG nằm trong repo hay HTML.

const PROP_LOG_ACCESS_CODE = 'LOG_ACCESS_CODE';
const PROP_APPROVAL_SECRET = 'APPROVAL_SECRET';
const CACHE_LOG_FAILS = 'alllog_failed_attempts';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** So sánh chuỗi thời gian hằng (không dừng sớm ở ký tự sai đầu tiên). */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Secret ký link phê duyệt — tự tạo lần đầu, có lock để 2 lần submit đồng thời không tạo 2 secret. */
function getApprovalSecret_() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty(PROP_APPROVAL_SECRET);
  if (existing) return existing;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const again = props.getProperty(PROP_APPROVAL_SECRET);
    if (again) return again;
    const secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(PROP_APPROVAL_SECRET, secret);
    return secret;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Kiểm tra mã truy cập Nhật ký. Trả về null nếu hợp lệ, hoặc mã lỗi:
 * 'not_configured' | 'locked' | 'unauthorized'.
 */
function checkLogAccess_(code) {
  const expected = PropertiesService.getScriptProperties().getProperty(PROP_LOG_ACCESS_CODE);
  if (!expected) return 'not_configured';

  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get(CACHE_LOG_FAILS) || 0);
  if (fails >= CONFIG.LOG_MAX_FAILED_ATTEMPTS) return 'locked';

  if (safeEqual_(expected, String(code || '').trim())) return null;

  cache.put(CACHE_LOG_FAILS, String(fails + 1), CONFIG.LOG_LOCKOUT_SECONDS);
  return 'unauthorized';
}

/** Menu: tạo mã truy cập Nhật ký mới (8 chữ số). Mã cũ hết hiệu lực ngay. */
function generateLogAccessCode() {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  const code = digest.slice(0, 8).map(b => ((b + 256) % 256) % 10).join('');

  PropertiesService.getScriptProperties().setProperty(PROP_LOG_ACCESS_CODE, code);
  CacheService.getScriptCache().remove(CACHE_LOG_FAILS);

  const ui = SpreadsheetApp.getUi();
  ui.alert('Mã truy cập Nhật ký sử dụng',
    'Mã mới: ' + code + '\n\nMã cũ đã hết hiệu lực. Gửi mã này cho cán bộ Khoa cần xem nhật ký.',
    ui.ButtonSet.OK);
}

function signApproval_(action, loanId, issuedAt) {
  const raw = Utilities.computeHmacSha256Signature(
    action + '|' + loanId + '|' + issuedAt, getApprovalSecret_());
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '');
}

/** Link phê duyệt/từ chối có chữ ký gắn với đúng action + Mã giao dịch + thời điểm phát hành. */
function buildApprovalLink_(action, loanId) {
  const issuedAt = String(Date.now());
  return CONFIG.WEB_APP_URL +
    '?action=' + action +
    '&loan=' + encodeURIComponent(loanId) +
    '&t=' + issuedAt +
    '&sig=' + signApproval_(action, loanId, issuedAt);
}

function verifyApprovalLink_(action, loanId, issuedAt, sig) {
  if (!loanId || !sig || !/^\d+$/.test(issuedAt || '')) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (ageMs < 0 || ageMs > CONFIG.APPROVAL_LINK_TTL_DAYS * MS_PER_DAY) return false;
  return safeEqual_(signApproval_(action, loanId, issuedAt), String(sig));
}


// ==================== PHÊ DUYỆT QUA EMAIL (2 BƯỚC) ====================
// Bước 1 — GET link trong email: chỉ HIỂN THỊ thông tin + nút xác nhận, không ghi gì
//          (bộ quét link email tự mở link sẽ không vô tình duyệt/từ chối).
// Bước 2 — bấm nút: google.script.run gọi confirmApprovalFromPage(), kiểm lại chữ ký,
//          chỉ ghi khi giao dịch còn CHỜ DUYỆT (link dùng được đúng 1 lần).

function approvalPage_(innerHtml) {
  return HtmlService.createHtmlOutput(`
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f0f2f5;
                 margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center">
      <div id="box" style="background:white;border-radius:16px;padding:32px 28px;max-width:440px;width:90%;
                  box-shadow:0 4px 16px rgba(0,0,0,.1);text-align:center">${innerHtml}</div>
    </body></html>`).setTitle('Phê duyệt mượn thiết bị — KTTV&HDH');
}

function approvalMessageHtml_(icon, color, title, detail) {
  return `<div style="font-size:48px;margin-bottom:8px">${icon}</div>
    <h2 style="color:${color};margin:0 0 12px;font-size:20px">${escapeHtml_(title)}</h2>
    ${detail ? `<p style="font-size:14px;color:#555;margin:0">${escapeHtml_(detail)}</p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:11px;color:#bbb;margin:0">Hệ thống quản lý TB — Khoa KTTV&amp;HDH</p>`;
}

function findLoanIndex_(data, loanId) {
  return data.findIndex((r, i) => i > 0 && String(r[LOG_COL.LOAN_ID]) === loanId);
}

function renderApprovalConfirmPage_(action, loanId, issuedAt, sig) {
  const { data } = readLogData_(SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID));
  const index = findLoanIndex_(data, loanId);
  if (index < 0) {
    return approvalPage_(approvalMessageHtml_('⚠️', '#c62828', 'Không tìm thấy giao dịch ' + loanId, ''));
  }
  const row = data[index];
  if (loanStatus_(row) !== LOAN_STATUS.PENDING) {
    return approvalPage_(approvalMessageHtml_('ℹ️', '#2F5496', 'Yêu cầu này đã được xử lý trước đó',
      String(row[LOG_COL.APPROVAL] || 'Trạng thái: ' + loanStatus_(row))));
  }

  const isApprove = action === 'approve';
  const color = isApprove ? '#2e7d32' : '#c62828';
  const label = isApprove ? '✅ Xác nhận PHÊ DUYỆT' : '❌ Xác nhận TỪ CHỐI';
  const line = (k, v) => v ? `<div style="margin-top:6px">${k}: <strong>${escapeHtml_(v)}</strong></div>` : '';
  const args = [action, loanId, issuedAt, sig].map(v => JSON.stringify(String(v)).replace(/</g, '\\u003c'));
  return approvalPage_(`
    <h2 style="margin:0 0 4px;font-size:20px">${escapeHtml_(row[LOG_COL.NAME])}</h2>
    <p style="font-size:13px;color:#888;font-family:monospace;margin:0 0 16px">${escapeHtml_(row[LOG_COL.QR])}</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:12px;font-size:13px;color:#555;text-align:left">
      ${line('👤 Người mượn', row[LOG_COL.BORROWER])}
      ${line('🏢 Đơn vị', row[LOG_COL.UNIT])}
      ${line('🎯 Mục đích', row[LOG_COL.PURPOSE])}
      ${line('📅 Dự kiến trả', formatDateVN_(parseDate_(row[LOG_COL.DUE_DATE])))}
      ${line('🔖 Mã giao dịch', loanId)}
    </div>
    <button id="go" style="margin-top:20px;width:100%;padding:14px;border:none;border-radius:8px;
            background:${color};color:white;font-size:16px;font-weight:700;cursor:pointer">${label}</button>
    <script>
      document.getElementById('go').addEventListener('click', function () {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Đang xử lý...';
        google.script.run
          .withSuccessHandler(function (html) { document.getElementById('box').innerHTML = html; })
          .withFailureHandler(function () {
            btn.disabled = false;
            btn.textContent = 'Lỗi kết nối — bấm để thử lại';
          })
          .confirmApprovalFromPage(${args.join(', ')});
      });
    </script>`);
}

/**
 * Gọi từ trang xác nhận qua google.script.run (hàm public — không có dấu _ cuối tên).
 * KHÔNG tin tham số từ trình duyệt: kiểm lại chữ ký trước khi ghi.
 * @return {string} HTML kết quả để hiển thị thay trang xác nhận.
 */
function confirmApprovalFromPage(action, loanId, issuedAt, sig) {
  const validAction = action === 'approve' || action === 'reject';
  if (!validAction || !verifyApprovalLink_(action, String(loanId), String(issuedAt), String(sig))) {
    return approvalMessageHtml_('⚠️', '#c62828', 'Link không hợp lệ hoặc đã hết hạn',
      'Vui lòng xử lý trực tiếp trong Google Sheet (cột M của Log_Muon_Tra).');
  }
  const outcome = applyApprovalDecision_(action, String(loanId));
  if (!outcome.ok) return approvalMessageHtml_('ℹ️', '#2F5496', outcome.message, outcome.detail || '');

  const isApprove = action === 'approve';
  let detail = `${outcome.equipName} (${outcome.qrCode}) — ${outcome.borrower || 'N/A'}, lúc ${outcome.dateStr}.`;
  if (outcome.email) detail += outcome.mailError
    ? ` Chưa gửi được email cho người mượn: ${outcome.mailError}`
    : ` Đã thông báo cho ${outcome.email}.`;
  return approvalMessageHtml_(isApprove ? '✅' : '❌', isApprove ? '#2e7d32' : '#c62828',
    isApprove ? 'ĐÃ PHÊ DUYỆT' : 'ĐÃ TỪ CHỐI', detail);
}

/** Link hướng dẫn của thiết bị, rồi tới trang chung; '' = đang cập nhật. Lỗi tra cứu không chặn email. */
function guideUrlFor_(ss, qrCode) {
  try {
    const master = getMasterRecord_(ss, String(qrCode).trim());
    if (master && master.guideUrl) return master.guideUrl;
  } catch (err) {
    Logger.log('guideUrlFor_: không tra được link hướng dẫn — ' + err.message);
  }
  return safeGuideUrl_(CONFIG.GUIDE_DEFAULT_URL);
}

const WEEKDAYS_VN = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "còn 5 ngày" / "hôm nay" / "đã quá 2 ngày" — tính theo ngày lịch. */
function daysLeftText_(due) {
  const days = Math.round((due - startOfToday_()) / MS_PER_DAY);
  if (days > 0) return `còn ${days} ngày`;
  return days === 0 ? 'hôm nay' : `đã quá ${-days} ngày`;
}

/** Link Google Calendar tạo sự kiện cả ngày "Trả thiết bị" vào ngày hạn trả. */
function calendarLink_(o, equipLink) {
  const day = d => formatDateVN_(d, 'yyyyMMdd');
  const next = new Date(o.dueDate.getFullYear(), o.dueDate.getMonth(), o.dueDate.getDate() + 1);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent('Trả thiết bị: ' + o.equipName) +
    '&dates=' + day(o.dueDate) + '/' + day(next) +
    '&details=' + encodeURIComponent(`Mã QR: ${o.qrCode}\nMã giao dịch: ${o.loanId}\nXác nhận trả: ${equipLink}`);
}

// ==================== KHUNG EMAIL HTML DÙNG CHUNG ====================
// Mọi email HTML: thanh tiêu đề xanh có logo, vạch màu trạng thái, các khối nội dung, chân trang.
// Tham số chữ được escape bên trong; tham số tên ...Html phải là HTML đã an toàn (đã escape).

const EMAIL_TONE = {
  green: { color: '#2e7d32', soft: '#e8f5e9', border: '#c8e6c9' },
  red:   { color: '#c62828', soft: '#fdecea', border: '#f5c6c2' },
  amber: { color: '#b45309', soft: '#fff8e1', border: '#fde68a' },
  blue:  { color: '#2F5496', soft: '#e8eefb', border: '#c7d2e5' },
  teal:  { color: '#00838f', soft: '#e0f7fa', border: '#b2ebf2' }
};
const EMAIL_MONO = 'Consolas,Menlo,monospace';

/** Một hàng nội dung của thẻ email (lề trái/phải 28px). */
function emailBlock_(innerHtml, padTop) {
  return `<tr><td style="padding:${padTop == null ? 20 : padTop}px 28px 0">${innerHtml}</td></tr>`;
}

/** Nhãn trạng thái dạng viên, VD "✅ ĐÃ PHÊ DUYỆT". */
function emailPill_(text, tone) {
  return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${tone.soft};` +
    `color:${tone.color};font-size:13px;font-weight:700">${escapeHtml_(text)}</span>`;
}

/** Đoạn văn. first=true → cách nhãn trạng thái phía trên nhiều hơn. */
function emailP_(html, first) {
  return `<p style="margin:${first ? 18 : 8}px 0 0;font-size:15px;line-height:1.6;color:#374151">${html}</p>`;
}

/** Ô nổi bật: nhãn nhỏ, giá trị lớn, dòng phụ (hạn trả, số ngày quá hạn, giờ sử dụng). */
function emailHighlight_(label, big, sub, tone) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="background:${tone.soft};border:1px solid ${tone.border};border-radius:12px"><tr><td style="padding:16px 20px">` +
    `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${tone.color}">${escapeHtml_(label)}</div>` +
    `<div style="margin-top:4px;font-size:26px;font-weight:800;color:#1f2937">${escapeHtml_(big)}</div>` +
    (sub ? `<div style="margin-top:2px;font-size:14px;color:#6b7280">${escapeHtml_(sub)}</div>` : '') +
    `</td></tr></table>`;
}

/** Hộp thông báo chữ thường (lý do từ chối…), nền màu trạng thái. */
function emailNotice_(label, text, tone) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="background:${tone.soft};border:1px solid ${tone.border};border-radius:12px"><tr><td style="padding:14px 20px">` +
    `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${tone.color}">${escapeHtml_(label)}</div>` +
    `<div style="margin-top:4px;font-size:15px;font-weight:600;line-height:1.5;color:#1f2937">${escapeHtml_(text)}</div>` +
    `</td></tr></table>`;
}

/** Bảng thông tin 2 cột. rows: [nhãn chữ, giá trị HTML]; dòng có giá trị rỗng bị bỏ. */
function emailDetails_(rows) {
  const shown = rows.filter(([, html]) => html);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="border:1px solid #e5e7eb;border-radius:12px;font-size:14px">` +
    shown.map(([label, html], i) => {
      const border = i < shown.length - 1 ? 'border-bottom:1px solid #eef0f3;' : '';
      return `<tr><td style="${border}padding:11px 16px;color:#6b7280;width:104px;vertical-align:top">${escapeHtml_(label)}</td>` +
        `<td style="${border}padding:11px 16px;color:#1f2937">${html}</td></tr>`;
    }).join('') + `</table>`;
}

/** Ô "Thiết bị": tên in đậm, mã QR bên dưới. */
function emailEquip_(name, qrCode) {
  return `<strong>${escapeHtml_(name)}</strong><br>` +
    `<span style="font-family:${EMAIL_MONO};font-size:12px;color:#2F5496">${escapeHtml_(qrCode)}</span>`;
}

function emailMono_(text) {
  return text ? `<span style="font-family:${EMAIL_MONO};white-space:nowrap">${escapeHtml_(text)}</span>` : '';
}

function emailStrong_(text, tone) {
  return text ? `<strong${tone ? ` style="color:${tone.color}"` : ''}>${escapeHtml_(text)}</strong>` : '';
}

/** Nút liên kết. look: 'primary' (xanh đậm) | tone (nền màu trạng thái) | bỏ trống (viền). */
function emailButton_(href, label, look) {
  const style = look === 'primary' ? 'background:#1a3a6b;color:#ffffff;border:1px solid #1a3a6b'
    : (look && look.color) ? `background:${look.color};color:#ffffff;border:1px solid ${look.color}`
    : 'background:#ffffff;color:#1a3a6b;border:1px solid #c7d2e5';
  return `<a href="${escapeHtml_(href)}" style="display:block;padding:13px 10px;border-radius:10px;text-align:center;` +
    `font-size:14px;font-weight:700;text-decoration:none;${style}">${escapeHtml_(label)}</a>`;
}

/** Hàng 1 hoặc 2 nút chia đều. */
function emailButtonRow_(buttonsHtml) {
  const cells = buttonsHtml.length === 2
    ? `<td width="49%">${buttonsHtml[0]}</td><td width="2%"></td><td width="49%">${buttonsHtml[1]}</td>`
    : `<td>${buttonsHtml[0]}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

/** Nút mờ chưa bấm được + chú thích nhỏ, VD "(đang cập nhật)". */
function emailDisabledButton_(label, caption) {
  return `<div style="padding:13px 10px;border-radius:10px;text-align:center;font-size:14px;font-weight:700;` +
    `background:#f3f4f6;color:#9ca3af;border:1px dashed #d1d5db">${escapeHtml_(label)}</div>` +
    `<div style="margin-top:6px;font-size:12px;color:#9ca3af;text-align:center;font-style:italic">${escapeHtml_(caption)}</div>`;
}

/** Chú thích nhỏ căn giữa dưới nút. */
function emailCaption_(text) {
  return `<div style="font-size:12px;color:#9ca3af;text-align:center">${escapeHtml_(text)}</div>`;
}

/** Đoạn chữ nhỏ hướng dẫn bước tiếp theo (html đã an toàn). */
function emailNote_(html) {
  return `<div style="font-size:14px;line-height:1.6;color:#374151">${html}</div>`;
}

/**
 * Khung email hoàn chỉnh. opts: { heading, tone, blocks: [hàng từ emailBlock_], support }.
 * support: chữ trước email liên hệ ở chân trang; bỏ trống (email gửi chính PTK) → không hiện dòng liên hệ.
 */
function emailLayout_(opts) {
  const esc = escapeHtml_;
  const contact = opts.support
    ? `${esc(opts.support)}: <a href="mailto:${esc(CONFIG.ADMIN_EMAIL)}" style="color:#2F5496">${esc(CONFIG.ADMIN_EMAIL)}</a><br>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#1a3a6b;padding:18px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:16px">
        <div style="background:#ffffff;border-radius:12px;padding:6px 8px;line-height:0">
          <img src="${esc(CONFIG.LOGO_URL)}" width="104" height="66" alt="HMO" style="display:block;width:104px;height:66px;border:0">
        </div>
      </td>
      <td style="vertical-align:middle">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#aac4f0">Khoa KTTV&amp;HDH · Quản lý thiết bị</div>
        <div style="margin-top:4px;font-size:20px;font-weight:700;color:#ffffff">${esc(opts.heading)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="height:4px;line-height:4px;font-size:0;background:${opts.tone.color}">&nbsp;</td></tr>
  ${opts.blocks.join('\n  ')}
  <tr><td style="height:26px;line-height:26px;font-size:0">&nbsp;</td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 28px;font-size:12px;line-height:1.6;color:#6b7280">
    ${contact}Email tự động từ Hệ thống quản lý thiết bị — Khoa Khí tượng Thủy văn &amp; Hải dương học, Trường ĐHKHTN, ĐHQGHN.
  </td></tr>
</table></td></tr></table></body></html>`;
}

/** Lời chào "Kính gửi thầy/cô <b>Tên</b>," dùng chung cho email gửi người mượn. */
function emailGreeting_(name) {
  return `Kính gửi thầy/cô${name ? ' <strong>' + escapeHtml_(name) + '</strong>' : ''},`;
}

/** "Thứ Ba · còn 5 ngày" */
function weekdayLeft_(date) {
  return `${WEEKDAYS_VN[date.getDay()]} · ${daysLeftText_(date)}`;
}

/**
 * Email kết quả phê duyệt cho người mượn: { subject, body (chữ thường), htmlBody }.
 * Đã duyệt → nêu rõ hạn trả (tiêu đề + ô nổi bật + nút thêm vào lịch). Mọi giá trị người dùng đều escape.
 */
function buildDecisionEmail_(isApprove, o) {
  const tone = isApprove ? EMAIL_TONE.green : EMAIL_TONE.red;
  const equipLink = CONFIG.LANDING_PAGE_URL + '?id=' + encodeURIComponent(o.qrCode);
  const due = isApprove ? o.dueDate : null;
  const dueStr = due ? formatDateVN_(due) : '';
  const dueLong = due ? `${WEEKDAYS_VN[due.getDay()]}, ${dueStr} (${daysLeftText_(due)})` : '';

  const subject = isApprove
    ? `[KTTV&HDH] ✅ Đã duyệt mượn ${o.equipName}` + (due ? ` — hạn trả ${dueStr}` : '')
    : `[KTTV&HDH] ❌ Yêu cầu mượn ${o.equipName} bị TỪ CHỐI`;
  const greeting = 'Kính gửi thầy/cô' + (o.borrower ? ' ' + o.borrower : '') + ',';
  const lead = isApprove
    ? 'Yêu cầu mượn thiết bị của thầy/cô đã được Phó Trưởng khoa PHÊ DUYỆT.'
    : 'Yêu cầu mượn thiết bị của thầy/cô đã bị Phó Trưởng khoa TỪ CHỐI.';
  const next = isApprove
    ? 'Thầy/cô có thể đến nhận thiết bị theo lịch đã đăng ký. Khi trả, quét mã QR trên thiết bị ' +
      '(hoặc mở link bên dưới) và bấm "✅ Xác nhận trả".'
    : 'Vui lòng liên hệ cán bộ quản lý thiết bị để biết thêm thông tin.';
  const support = isApprove ? 'Cần gia hạn hoặc hỗ trợ' : 'Cần hỗ trợ';

  const details = [
    ['Thiết bị', o.equipName + ' (' + o.qrCode + ')'],
    ['Ngày mượn', formatDateVN_(o.borrowDate)],
    ['Hạn trả', dueLong],
    ['Mục đích', o.purpose],
    ['Mã giao dịch', o.loanId],
    [isApprove ? 'Duyệt lúc' : 'Xử lý lúc', o.dateStr]
  ].filter(([, value]) => value);

  let body = `${greeting}\n\n${lead}\n\n`;
  details.forEach(([label, value]) => {
    body += `  ${(label === 'Hạn trả' ? 'HẠN TRẢ' : label).padEnd(13)}: ${value}\n`;
  });
  body += `\n${next}\n  ${equipLink}\n\n`;
  if (isApprove) body += `Hướng dẫn sử dụng: ${o.guideUrl || '(đang cập nhật)'}\n\n`;
  body += `${support}: ${CONFIG.ADMIN_EMAIL}\n\n— Hệ thống quản lý TB Khoa KTTV&HDH`;

  const esc = escapeHtml_;
  const blocks = [
    emailBlock_(emailPill_(isApprove ? '✅ ĐÃ PHÊ DUYỆT' : '❌ KHÔNG ĐƯỢC DUYỆT', tone) +
      emailP_(emailGreeting_(o.borrower), true) +
      emailP_(`Yêu cầu mượn thiết bị của thầy/cô ${isApprove ? 'đã được' : 'đã bị'} Phó Trưởng khoa ` +
        emailStrong_(isApprove ? 'phê duyệt' : 'từ chối', tone) + '.'), 24)
  ];
  if (due) blocks.push(emailBlock_(emailHighlight_('📅 Hạn trả thiết bị', dueStr, weekdayLeft_(due), EMAIL_TONE.amber)));
  blocks.push(emailBlock_(emailDetails_([
    ['Thiết bị', emailEquip_(o.equipName, o.qrCode)],
    ['Ngày mượn', esc(formatDateVN_(o.borrowDate))],
    ['Hạn trả', emailStrong_(dueStr, EMAIL_TONE.amber)],
    ['Mục đích', esc(o.purpose)],
    ['Mã giao dịch', emailMono_(o.loanId)],
    [isApprove ? 'Duyệt lúc' : 'Xử lý lúc', esc(o.dateStr)]
  ])));
  blocks.push(emailBlock_(emailNote_(
    esc(next).replace('&quot;✅ Xác nhận trả&quot;', '<strong>“✅ Xác nhận trả”</strong>'))));
  const buttons = [emailButton_(equipLink, '🔎 Xem thiết bị', 'primary')];
  if (due) buttons.push(emailButton_(calendarLink_(o, equipLink), '📅 Thêm vào lịch'));
  blocks.push(emailBlock_(emailButtonRow_(buttons), 16));
  // Hướng dẫn sử dụng / khuyến cáo: link Google Site, hoặc nút mờ "(đang cập nhật)" khi chưa có
  if (isApprove) {
    blocks.push(emailBlock_(o.guideUrl
      ? emailButton_(o.guideUrl, '📘 Hướng dẫn sử dụng')
      : emailDisabledButton_('📘 Hướng dẫn sử dụng', '(đang cập nhật)'), 10));
  }

  const htmlBody = emailLayout_({ heading: 'Kết quả yêu cầu mượn thiết bị', tone: tone, blocks: blocks, support: support });
  return { subject: subject, body: body, htmlBody: htmlBody };
}

/** Ghi quyết định vào cột M trong vùng khóa; chỉ khi giao dịch còn CHỜ DUYỆT. Email gửi sau khi mở khóa. */
function applyApprovalDecision_(action, loanId) {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const isApprove = action === 'approve';
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  let outcome;
  try {
    const { sheet, data } = readLogData_(ss);
    const index = findLoanIndex_(data, loanId);
    if (index < 0) return { ok: false, message: 'Không tìm thấy giao dịch ' + loanId };
    const row = data[index];
    if (loanStatus_(row) !== LOAN_STATUS.PENDING) {
      return { ok: false, message: 'Yêu cầu này đã được xử lý trước đó', detail: String(row[LOG_COL.APPROVAL]) };
    }
    const dateStr = formatDateVN_(new Date(), 'dd/MM/yyyy HH:mm');
    const text = isApprove ? `✅ Đã phê duyệt — PTK (${dateStr})` : `❌ Từ chối — PTK (${dateStr})`;
    sheet.getRange(index + 1, LOG_COL.APPROVAL + 1).setValue(text);
    SpreadsheetApp.flush();
    outcome = {
      ok: true, dateStr: dateStr, loanId: loanId, qrCode: String(row[LOG_COL.QR]),
      equipName: String(row[LOG_COL.NAME] || row[LOG_COL.QR]),
      borrower: String(row[LOG_COL.BORROWER] || ''), email: String(row[LOG_COL.EMAIL] || '').trim(),
      purpose: String(row[LOG_COL.PURPOSE] || ''),
      borrowDate: parseDate_(row[LOG_COL.BORROW_DATE]), dueDate: parseDate_(row[LOG_COL.DUE_DATE])
    };
    Logger.log(`✓ ${text} — giao dịch ${loanId} (${outcome.qrCode}) dòng ${index + 1}`);
  } finally {
    lock.releaseLock();
  }

  if (outcome.email) {
    try {
      if (isApprove) outcome.guideUrl = guideUrlFor_(ss, outcome.qrCode);
      const mail = buildDecisionEmail_(isApprove, outcome);
      MailApp.sendEmail(outcome.email, mail.subject, mail.body, { htmlBody: mail.htmlBody });
    } catch (err) {
      outcome.mailError = err.message;
      Logger.log('⚠️ Không gửi được email kết quả phê duyệt: ' + err.message);
    }
  }
  return outcome;
}


// ==================== API ĐỌC CHO LANDING PAGE ====================

/** Chỉ các trường master được phép trả ra công khai (không trả ghi chú gốc / giải trình nội bộ). */
const PUBLIC_EQUIPMENT_FIELDS = ['Mã QR', 'Tên thiết bị', 'Nhóm (mã)', 'Nhóm (tên)', 'Địa điểm (chuẩn)',
  'CB quản lý hiện tại', 'Tình trạng thực tế (01/2025)', 'Số lượng'];

function toPublicEquipment_(equip) {
  const out = {};
  PUBLIC_EQUIPMENT_FIELDS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(equip, key)) out[key] = equip[key];
  });
  return out;
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;

  // Phê duyệt / từ chối (PTK bấm link trong email) → trang xác nhận, chưa ghi gì
  if (action === 'approve' || action === 'reject') {
    const loanId = String(params.loan || '').trim();
    if (!verifyApprovalLink_(action, loanId, params.t, params.sig)) {
      return approvalPage_(approvalMessageHtml_('⚠️', '#c62828', 'Link phê duyệt không hợp lệ hoặc đã hết hạn',
        'Link cũ (trước 29/09/2026) không còn dùng được. Xử lý trong Google Sheet (cột M của Log_Muon_Tra) ' +
        'hoặc dùng menu "Gửi lại email phê duyệt đang chờ".'));
    }
    return renderApprovalConfirmPage_(action, loanId, params.t, params.sig);
  }

  if (action === 'allStatus') return jsonOutput_(getAllBorrowStatuses_());

  if (action === 'history') {
    const qrCode = String(params.id || '').trim();
    const history = qrCode ? getUsageHistory_(qrCode) : [];
    return jsonOutput_(history === null
      ? { ok: false, error: 'unavailable', qrCode: qrCode }
      : { ok: true, qrCode: qrCode, history: history });
  }

  if (action === 'alllog') {
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 200, 1), 1000);
    return jsonOutput_(buildUsageLogResponse_(params.key, limit));
  }

  // Tra cứu thiết bị theo mã QR — chỉ trả trường công khai + trạng thái mượn
  const qrCode = String(params.id || '').trim();
  if (qrCode) {
    const equip = lookupEquipment(qrCode);
    if (equip) {
      return jsonOutput_(Object.assign(toPublicEquipment_(equip), { _borrowStatus: checkBorrowStatus_(qrCode) }));
    }
  }
  return HtmlService.createHtmlOutput(
    '<script>window.location.href = ' + JSON.stringify(CONFIG.LANDING_PAGE_URL) + ';</script>');
}

/**
 * Lịch sử của MỘT thiết bị — dữ liệu công khai: tên người mượn đã che bớt, KHÔNG trả địa điểm,
 * email hay ghi chú. Bỏ qua yêu cầu bị từ chối. Trả null nếu không đọc được dữ liệu.
 */
function getUsageHistory_(qrCode) {
  try {
    const { data } = readLogData_(SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID));
    const now = new Date();
    const history = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (String(row[LOG_COL.QR] || '').trim() !== qrCode) continue;
      const status = displayStatus_(row);
      if (status === LOAN_STATUS.REJECTED) continue;
      const hours = row[LOG_COL.HOURS];
      history.push({
        borrower: maskName_(row[LOG_COL.BORROWER]) || 'Chưa ghi nhận',
        borrowDate: formatDateVN_(parseDate_(row[LOG_COL.BORROW_DATE])),
        returnDate: formatDateVN_(parseDate_(row[LOG_COL.RETURN_DATE])),
        usageHours: (hours === '' || hours == null) ? null : Number(hours),
        status: status,
        isActive: status === LOAN_STATUS.PENDING || status === LOAN_STATUS.APPROVED || isOnsiteInUse_(row, now)
      });
    }
    return history;
  } catch (err) {
    Logger.log('getUsageHistory_ error: ' + err.message);
    return null;
  }
}

function buildUsageLogResponse_(code, limit) {
  const denied = checkLogAccess_(code);
  if (denied) return { ok: false, error: denied, entries: [] };
  try {
    return { ok: true, entries: getAllUsageLog_(limit) };
  } catch (err) {
    Logger.log('getAllUsageLog_ error: ' + err.message);
    return { ok: false, error: 'unavailable', entries: [] };
  }
}

/**
 * Nhật ký toàn Khoa (sau mã truy cập): đầy đủ tên + địa điểm, mới nhất trước, có trạng thái.
 * Cố ý KHÔNG trả email (cột P) và ghi chú nội bộ (cột N). Ném lỗi nếu không đọc được dữ liệu.
 */
function getAllUsageLog_(limit) {
  const { data } = readLogData_(SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID));
  const today = startOfToday_();
  const now = new Date();
  const entries = [];
  for (let i = data.length - 1; i >= 1 && entries.length < limit; i--) {
    const row = data[i];
    const qrCode = String(row[LOG_COL.QR] || '').trim();
    if (!qrCode) continue;
    const status = displayStatus_(row);
    const dueDate = parseDate_(row[LOG_COL.DUE_DATE]);
    const hours = row[LOG_COL.HOURS];
    entries.push({
      qrCode: qrCode,
      equipName: String(row[LOG_COL.NAME] || '').trim(),
      borrower: String(row[LOG_COL.BORROWER] || '').trim() || 'Chưa ghi nhận',
      unit: String(row[LOG_COL.UNIT] || '').trim(),
      location: String(row[LOG_COL.LOCATION] || '').trim() || 'Chưa ghi nhận',
      borrowDate: formatDateVN_(parseDate_(row[LOG_COL.BORROW_DATE])),
      dueDate: formatDateVN_(dueDate),
      returnDate: formatDateVN_(parseDate_(row[LOG_COL.RETURN_DATE])),
      usageHours: (hours === '' || hours == null) ? null : Number(hours),
      status: status,
      isActive: status === LOAN_STATUS.PENDING || status === LOAN_STATUS.APPROVED || isOnsiteInUse_(row, now),
      isOverdue: status === LOAN_STATUS.APPROVED && !!dueDate && dueDate < today
    });
  }
  return entries;
}

/** { "HMO-OBS-8688": 1, ... } — số lượt đang giữ chỗ (chờ duyệt, đang mượn, đang dùng tại chỗ) theo QR. */
function getAllBorrowStatuses_() {
  try {
    const { data } = readLogData_(SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID));
    const now = new Date();
    const result = {};
    for (let i = 1; i < data.length; i++) {
      const qr = String(data[i][LOG_COL.QR] || '').trim();
      if (qr && holdsStock_(data[i], now)) result[qr] = (result[qr] || 0) + 1;
    }
    return result;
  } catch (err) {
    Logger.log('getAllBorrowStatuses_ error: ' + err.message);
    return { _error: 'unavailable' };
  }
}

/**
 * Trạng thái mượn của một thiết bị cho landing page.
 *   { available: true,  borrowedCount: 0 }
 *   { available: false, borrowedCount: N, borrower (đã che), dueDate, daysOverdue, status }
 *     (status 'onsite' → dueDate là giờ kết thúc "HH:mm dd/MM")
 *   { available: null,  borrowedCount: 0 }   ← lỗi đọc dữ liệu (landing page ẩn badge)
 */
function checkBorrowStatus_(qrCode) {
  try {
    const { data } = readLogData_(SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID));
    const now = new Date();
    const open = data.filter((r, i) => i > 0 && String(r[LOG_COL.QR] || '').trim() === qrCode && holdsStock_(r, now));
    if (!open.length) return { available: true, borrowedCount: 0 };

    const latest = open[open.length - 1];
    const status = displayStatus_(latest);
    const due = parseDate_(latest[LOG_COL.DUE_DATE]);
    const overdueDays = (status === LOAN_STATUS.APPROVED && due)
      ? Math.max(0, Math.floor((startOfToday_() - due) / MS_PER_DAY)) : 0;
    return {
      available: false,
      borrowedCount: open.length,
      borrower: maskName_(latest[LOG_COL.BORROWER]),
      dueDate: status === LOAN_STATUS.ONSITE
        ? formatDateVN_(latest[LOG_COL.RETURN_DATE], 'HH:mm dd/MM') : formatDateVN_(due),
      daysOverdue: overdueDays,
      status: status
    };
  } catch (err) {
    Logger.log('checkBorrowStatus_ error: ' + err.message);
    return { available: null, borrowedCount: 0 };
  }
}

// ==================== 6. MENU TÙY CHỈNH ====================

/**
 * Thêm menu vào Google Sheet
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔧 Quản lý TB')
    .addItem('Kiểm tra quá hạn trả', 'checkOverdueReturns')
    .addItem('Kiểm tra lịch bảo trì', 'checkMaintenanceSchedule')
    .addItem('Gửi báo cáo tháng', 'monthlyReport')
    .addSeparator()
    .addItem('📊 Tạo báo cáo hiệu quả sử dụng năm nay', 'generateAnnualUsageReport')
    .addItem('🔢 Backfill giờ sử dụng (chạy 1 lần)', 'backfillUsageHours')
    .addSeparator()
    .addItem('Đồng bộ Form → Log_Muon_Tra', 'syncFormResponsesToLog')
    .addItem('Thiết lập trigger tự động', 'setup')
    .addSeparator()
    .addItem('📧 Gửi lại email phê duyệt đang chờ', 'resendPendingApprovals')
    .addItem('🔑 Tạo mã truy cập Nhật ký mới', 'generateLogAccessCode')
    .addItem('📘 Tạo cột Link hướng dẫn sử dụng (Master_Data)', 'ensureGuideColumn')
    .addToUi();
}
