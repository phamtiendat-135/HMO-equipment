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

  // Ngưỡng phê duyệt (triệu VNĐ) - TB >= ngưỡng này cần Phó TK duyệt
  APPROVAL_THRESHOLD: 100,

  // Số ngày nhắc trước khi đến hạn bảo trì
  MAINTENANCE_REMINDER_DAYS: 30,

  // Số ngày quá hạn trả trước khi gửi nhắc nhở (0 = gửi ngay ngày đến hạn)
  OVERDUE_DAYS: 0,

  // Số ngày trước hạn trả để gửi email nhắc người mượn
  REMIND_DAYS_BEFORE: 2,

  // URL trang landing page — dùng trong link email nhắc trả
  LANDING_PAGE_URL: 'https://phamtiendat-135.github.io/HMO-equipment/',

  // URL Apps Script Web App — dùng để tạo link phê duyệt 1-bấm trong email PTK
  // Lấy sau khi Deploy: Extensions → Apps Script → Deploy → Manage deployments → Copy URL
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q/exec' // ← dán URL vào đây sau khi deploy
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
  // Thử DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  // Thử parse mặc định (ISO, v.v.)
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
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
    if (returnDate || !dueDate) continue;

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
    let bodyB = `Kính gửi ${item.borrower},\n\n`;
    bodyB += `Hệ thống quản lý thiết bị Khoa KTTV&HDH thông báo:\n`;
    bodyB += `Thiết bị bạn đang mượn đã QUÁ HẠN TRẢ ${item.daysOverdue} ngày.\n\n`;
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
      MailApp.sendEmail(item.email, subjectB, bodyB);
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

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
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
    if (returnDate || !dueDate || !email) continue;

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

    let body = `Kính gửi ${borrower},\n\n`;
    body += `Hệ thống quản lý thiết bị Khoa KTTV&HDH nhắc bạn: thiết bị dưới đây `;
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
      MailApp.sendEmail(email, subject, body);
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

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
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

  // Đếm mượn trong tháng
  let borrowCount = 0;
  let returnCount = 0;
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // 23:59:59 ngày cuối tháng — để không bỏ sót giao dịch trong ngày cuối
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  if (logSheet && logSheet.getLastRow() > 1) {
    const logData = logSheet.getDataRange().getValues();
    const colBorrowDate = logData[0].indexOf('Ngày mượn');
    const colReturnDate = logData[0].indexOf('Ngày trả thực tế');

    for (let i = 1; i < logData.length; i++) {
      const bDate = parseDate_(logData[i][colBorrowDate]);
      if (bDate && bDate >= firstOfMonth && bDate <= lastOfMonth) {
        borrowCount++;
      }
      const rDate = parseDate_(logData[i][colReturnDate]);
      if (rDate && rDate >= firstOfMonth && rDate <= lastOfMonth) {
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
  body += `   Lượt mượn: ${borrowCount}\n`;
  body += `   Lượt trả: ${returnCount}\n`;
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
}


// ==================== 4. XỬ LÝ FORM RESPONSE ====================

/**
 * Gọi khi có form mượn thiết bị mới (trigger gắn trên Spreadsheet)
 * Event object (Sheet-side): e.values (mảng giá trị), e.range, e.namedValues
 */
function onFormSubmitBorrow(e) {
  if (!e || !e.namedValues) {
    Logger.log('⚠️ onFormSubmitBorrow: không nhận được event hợp lệ');
    return;
  }

  // Lấy thông tin từ namedValues (Sheet-side event object)
  // namedValues là object: { "Tên cột": ["giá trị"], ... }
  const nv = e.namedValues;

  // Tìm giá trị theo tên cột (hỗ trợ nhiều tên khác nhau)
  function findValue(keywords) {
    for (const key of Object.keys(nv)) {
      const keyLower = key.toLowerCase();
      if (keywords.some(kw => keyLower.includes(kw))) {
        return (nv[key] && nv[key][0]) ? nv[key][0].trim() : '';
      }
    }
    return '';
  }

  const qrCode = findValue(['mã qr', 'ma qr', 'qr code', 'mã thiết bị', 'ma thiet bi']);
  const borrower = findValue(['họ và tên', 'ho va ten', 'người mượn', 'nguoi muon', 'họ tên']);
  const purpose = findValue(['mục đích', 'muc dich', 'lý do', 'ly do']);
  const dueDate = findValue(['ngày dự kiến trả', 'ngay du kien tra', 'hạn trả', 'han tra']);
  const email = findValue(['email', 'thư điện tử']);
  const phone = findValue(['điện thoại', 'dien thoai', 'số điện thoại', 'phone']);

  if (!qrCode) {
    Logger.log('⚠️ onFormSubmitBorrow: không tìm thấy mã QR trong response');
    return;
  }

  // Tra cứu thông tin thiết bị từ Master_Data
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const colQR = headers.indexOf('Mã QR');
  const colValue = headers.indexOf('Nguyên giá (tr.đ)');
  const colName = headers.indexOf('Tên thiết bị');
  const colRoom = headers.indexOf('Phòng');

  let equipValue = 0;
  let equipName = qrCode;
  let equipRoom = '';
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][colQR] === qrCode) {
      equipValue = parseFloat(masterData[i][colValue]) || 0;
      equipName = masterData[i][colName] || qrCode;
      equipRoom = colRoom >= 0 ? masterData[i][colRoom] : '';
      break;
    }
  }

  // === GỬI EMAIL CHO MỌI YÊU CẦU MƯỢN ===
  const needsApproval = equipValue >= CONFIG.APPROVAL_THRESHOLD;
  const tag     = needsApproval ? '🔴 CẦN PHÊ DUYỆT' : '🟢 Thông báo';
  const subject = `[KTTV&HDH] ${tag} — Mượn TB: ${equipName} (${qrCode})`;

  // --- Plain text (fallback cho email client không hỗ trợ HTML) ---
  let body = needsApproval
    ? `⚠️ THIẾT BỊ GIÁ TRỊ CAO — CẦN PHÊ DUYỆT CỦA PHÓ TRƯỞNG KHOA\n${'─'.repeat(50)}\n\n`
    : `Thông báo: Có yêu cầu mượn thiết bị mới.\n\n`;

  body += `THÔNG TIN THIẾT BỊ:\n`;
  body += `  Tên: ${equipName}\n  Mã QR: ${qrCode}\n`;
  body += `  Giá trị: ${equipValue.toLocaleString()} triệu VNĐ\n`;
  if (equipRoom) body += `  Phòng: ${equipRoom}\n`;
  body += `\nNGƯỜI MƯỢN:\n  Họ tên: ${borrower}\n`;
  if (email) body += `  Email: ${email}\n`;
  if (phone) body += `  SĐT: ${phone}\n`;
  body += `  Mục đích: ${purpose}\n  Dự kiến trả: ${dueDate}\n\n`;
  body += needsApproval
    ? `→ Vui lòng PHÊ DUYỆT hoặc TỪ CHỐI yêu cầu này.\n\n`
    : '';
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;

  // --- HTML email với nút bấm (chỉ khi cần phê duyệt và đã có WEB_APP_URL) ---
  let htmlBody = null;
  if (needsApproval && CONFIG.WEB_APP_URL) {
    const approveLink = `${CONFIG.WEB_APP_URL}?action=approve&qr=${encodeURIComponent(qrCode)}`;
    const rejectLink  = `${CONFIG.WEB_APP_URL}?action=reject&qr=${encodeURIComponent(qrCode)}`;

    htmlBody = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

  <!-- Header đỏ -->
  <tr><td style="background:#c62828;padding:20px 28px">
    <p style="margin:0;color:white;font-size:13px;opacity:.85">Khoa Khí tượng Thủy văn &amp; Hải dương học</p>
    <h2 style="margin:4px 0 0;color:white;font-size:18px">⚠️ Yêu cầu mượn cần phê duyệt</h2>
  </td></tr>

  <!-- Thông tin thiết bị -->
  <tr><td style="padding:24px 28px 0">
    <p style="margin:0 0 16px;font-size:13px;color:#555">Có yêu cầu mượn thiết bị giá trị cao — cần phê duyệt của Phó Trưởng khoa.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;padding:16px;font-size:14px">
      <tr><td style="padding:4px 0;color:#888;width:120px">Tên thiết bị</td>
          <td style="padding:4px 0;font-weight:600;color:#1a1a1a">${equipName}</td></tr>
      <tr><td style="padding:4px 0;color:#888">Mã QR</td>
          <td style="padding:4px 0;font-family:monospace;color:#2F5496">${qrCode}</td></tr>
      <tr><td style="padding:4px 0;color:#888">Giá trị</td>
          <td style="padding:4px 0;color:#c62828;font-weight:600">${equipValue.toLocaleString()} triệu VNĐ</td></tr>
      ${equipRoom ? `<tr><td style="padding:4px 0;color:#888">Phòng</td><td style="padding:4px 0">${equipRoom}</td></tr>` : ''}
    </table>
  </td></tr>

  <!-- Thông tin người mượn -->
  <tr><td style="padding:16px 28px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;padding-top:16px;font-size:14px">
      <tr><td style="padding:4px 0;color:#888;width:120px">Người mượn</td>
          <td style="padding:4px 0;font-weight:600">${borrower}</td></tr>
      ${email ? `<tr><td style="padding:4px 0;color:#888">Email</td><td style="padding:4px 0">${email}</td></tr>` : ''}
      ${phone ? `<tr><td style="padding:4px 0;color:#888">SĐT</td><td style="padding:4px 0">${phone}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#888">Mục đích</td>
          <td style="padding:4px 0">${purpose}</td></tr>
      <tr><td style="padding:4px 0;color:#888">Dự kiến trả</td>
          <td style="padding:4px 0;font-weight:600">${dueDate}</td></tr>
    </table>
  </td></tr>

  <!-- Nút phê duyệt / từ chối -->
  <tr><td style="padding:24px 28px">
    <p style="margin:0 0 14px;font-size:13px;color:#555;text-align:center">Bấm một trong hai nút để xử lý yêu cầu:</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="48%" align="center">
        <a href="${approveLink}" style="display:block;background:#2e7d32;color:white;text-decoration:none;
           padding:14px 10px;border-radius:8px;font-size:15px;font-weight:700;text-align:center">
          ✅ PHÊ DUYỆT
        </a>
      </td>
      <td width="4%"></td>
      <td width="48%" align="center">
        <a href="${rejectLink}" style="display:block;background:#c62828;color:white;text-decoration:none;
           padding:14px 10px;border-radius:8px;font-size:15px;font-weight:700;text-align:center">
          ❌ TỪ CHỐI
        </a>
      </td>
    </tr></table>
    <p style="margin:12px 0 0;font-size:11px;color:#bbb;text-align:center">
      Hệ thống tự ghi nhận và thông báo cho người mượn sau khi bấm.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8f9fa;padding:14px 28px;border-top:1px solid #f0f0f0">
    <p style="margin:0;font-size:11px;color:#aaa">
      Hệ thống quản lý trang thiết bị — Khoa KTTV&amp;HDH &nbsp;|&nbsp; ĐH Khoa học Tự nhiên, ĐHQGHN
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
  }

  // Gửi email: HTML (có nút) nếu cần phê duyệt, plain text nếu chỉ thông báo
  if (htmlBody) {
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body, { htmlBody: htmlBody });
  } else {
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  }
  Logger.log(`✓ Đã gửi email thông báo mượn TB: ${qrCode} — ${equipName} (${needsApproval ? 'cần phê duyệt' : 'thông báo'})`);

  // === GHI VÀO LOG_MUON_TRA ===
  // Copy dữ liệu form sang sheet Log_Muon_Tra theo đúng cấu trúc cột
  try {
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (logSheet) {
      const donVi = findValue(['đơn vị', 'don vi', 'nhóm nghiên cứu', 'nhom nghien cuu']);
      const diaDiem = findValue(['địa điểm', 'dia diem']);
      const ngayMuon = findValue(['ngày mượn', 'ngay muon']);
      const tinhTrang = findValue(['tình trạng', 'tinh trang']);
      const phuKien = findValue(['phụ kiện', 'phu kien']);
      const ghiChu = findValue(['ghi chú', 'ghi chu', 'lưu ý', 'luu y']);

      // Cột Log_Muon_Tra: A-N + O (Quá hạn = formula tự động, không ghi)
      const newRow = [
        qrCode,
        equipName,
        borrower,
        donVi,
        purpose,
        diaDiem,
        (ngayMuon && parseDate_(ngayMuon)) || new Date(),
        (dueDate && parseDate_(dueDate)) || '',
        '',           // Ngày trả thực tế — chưa trả
        tinhTrang,
        '',           // Tình trạng khi trả — chưa trả
        phuKien,
        needsApproval ? '(Chờ phê duyệt PTK)' : '',
        ghiChu
      ];

      logSheet.appendRow(newRow);

      // Ghi formula cột O (Quá hạn) và email cột P cho dòng vừa thêm
      const newRowNum = logSheet.getLastRow();

      const formulaCell = logSheet.getRange(newRowNum, 15); // cột O
      formulaCell.setFormula(`=IF(AND(H${newRowNum}<>"",I${newRowNum}="",TODAY()>H${newRowNum}),"✓","")`);
      formulaCell.setHorizontalAlignment('center');
      formulaCell.setFontWeight('bold');
      formulaCell.setFontColor('#FF0000');
      formulaCell.setFontSize(14);

      // Cột P — Email người mượn (dùng để gửi nhắc trả tự động)
      if (email) {
        logSheet.getRange(newRowNum, 16).setValue(email); // cột P
      }

      Logger.log(`✓ Đã ghi vào Log_Muon_Tra: ${qrCode}${email ? ' (email: ' + email + ')' : ''}`);
    }
  } catch (err) {
    Logger.log(`⚠️ Lỗi ghi Log_Muon_Tra: ${err.message}`);
  }
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
  try {
    if (!e) {
      Logger.log('⚠️ onFormSubmitDispatch: không nhận được event');
      return;
    }

    // Lấy tên sheet mà form ghi dữ liệu vào (mỗi Google Form liên kết với 1 sheet riêng)
    const sheetName = (e.range && e.range.getSheet())
      ? e.range.getSheet().getName().toLowerCase()
      : '';

    // Tập hợp tên câu hỏi trong form (để phát hiện form trả qua nội dung)
    const keys = e.namedValues
      ? Object.keys(e.namedValues).map(k => k.toLowerCase())
      : [];

    // Nhận diện form TRẢ: ưu tiên NỘI DUNG form trước, tên sheet sau.
    // Form MƯỢN có trường "dự kiến trả"/"hạn trả" → luôn là mượn.
    const hasReturnDateField = keys.some(k =>
      k.includes('ngày trả thực tế') || k.includes('ngay tra thuc te') ||
      k.includes('ngày trả') || k.includes('ngay tra'));
    const hasDueDateField = keys.some(k =>
      k.includes('dự kiến trả') || k.includes('du kien tra') ||
      k.includes('hạn trả') || k.includes('han tra'));

    // Tên sheet: match theo từ nguyên vẹn để tránh "tra" khớp nhầm "trang", "training"...
    const isReturnBySheet = sheetName.includes('trả') ||
                            sheetName.includes('return') ||
                            /(^|[^a-zà-ỹ])tra([^a-zà-ỹ]|$)/.test(sheetName);

    // Quy tắc: có "dự kiến trả" ⇒ form MƯỢN (bất kể tên sheet);
    // ngược lại, là TRẢ nếu có "ngày trả" hoặc tên sheet chỉ rõ trả.
    const isReturn = !hasDueDateField && (hasReturnDateField || isReturnBySheet);

    Logger.log(`onFormSubmitDispatch → sheet: "${sheetName}", isReturn: ${isReturn}`);

    if (isReturn) {
      onFormSubmitReturn(e);
    } else {
      onFormSubmitBorrow(e);
    }
  } catch (err) {
    Logger.log('⚠️ onFormSubmitDispatch error: ' + err.message);
  }
}


// ==================== 4c. XỬ LÝ FORM TRẢ THIẾT BỊ ====================

/**
 * Xử lý khi người dùng submit form TRẢ thiết bị.
 * Tìm dòng mượn chưa trả tương ứng trong Log_Muon_Tra và cập nhật:
 *   - Cột I: Ngày trả thực tế
 *   - Cột K: Tình trạng khi trả
 *   - Cột N: Ghi chú (nếu có)
 * Sau đó gửi email xác nhận cho Admin.
 */
function onFormSubmitReturn(e) {
  if (!e || !e.namedValues) {
    Logger.log('⚠️ onFormSubmitReturn: không nhận được event hợp lệ');
    return;
  }

  const nv = e.namedValues;

  function findValue(keywords) {
    for (const key of Object.keys(nv)) {
      const keyLower = key.toLowerCase();
      if (keywords.some(kw => keyLower.includes(kw))) {
        return (nv[key] && nv[key][0]) ? nv[key][0].trim() : '';
      }
    }
    return '';
  }

  const qrCode      = findValue(['mã qr', 'ma qr', 'qr code', 'mã thiết bị', 'ma thiet bi']);
  const returner    = findValue(['họ và tên', 'ho va ten', 'người trả', 'nguoi tra', 'họ tên']);
  const condition   = findValue(['tình trạng khi trả', 'tinh trang khi tra', 'tình trạng', 'tinh trang']);
  const notes       = findValue(['ghi chú', 'ghi chu', 'lưu ý', 'luu y']);
  const returnStr   = findValue(['ngày trả thực tế', 'ngay tra thuc te', 'ngày trả', 'ngay tra']);
  const email       = findValue(['email', 'thư điện tử']);

  if (!qrCode) {
    Logger.log('⚠️ onFormSubmitReturn: không tìm thấy mã QR trong response');
    return;
  }

  // ✅ FIX: Luôn ghi timestamp đầy đủ (ngày + giờ:phút:giây) thay vì chỉ 00:00.
  // Nếu form có date picker (chỉ trả về ngày, VD "2026-07-14"), ghép với giờ hiện tại.
  // Nếu form không có trường ngày trả → dùng hoàn toàn thời điểm submit.
  const now = new Date();
  let actualReturnDate;
  if (returnStr) {
    const formDate = parseDate_(returnStr);
    if (formDate && !isNaN(formDate.getTime())) {
      // Giữ ngày từ form, ghép giờ:phút:giây hiện tại
      actualReturnDate = new Date(
        formDate.getFullYear(), formDate.getMonth(), formDate.getDate(),
        now.getHours(), now.getMinutes(), now.getSeconds()
      );
    } else {
      actualReturnDate = now;
    }
  } else {
    actualReturnDate = now;
  }

  // === CẬP NHẬT LOG_MUON_TRA ===
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);

  let updated = false;
  let updatedRow = -1;

  if (logSheet && logSheet.getLastRow() > 1) {
    const data = logSheet.getDataRange().getValues();

    // Tìm dòng mượn MỚI NHẤT của QR này mà cột I (index 8) còn trống
    for (let i = data.length - 1; i >= 1; i--) {
      const rowQR        = (data[i][0] || '').toString().trim();
      const rowReturnDate = data[i][8]; // cột I — Ngày trả thực tế

      if (rowQR === qrCode && !rowReturnDate) {
        const sheetRow = i + 1; // Google Sheets dùng 1-indexed

        // ✅ FIX: Ghi timestamp đầy đủ + format hiển thị ngày giờ (không chỉ ngày)
        const returnCell = logSheet.getRange(sheetRow, 9); // cột I
        returnCell.setValue(actualReturnDate);
        returnCell.setNumberFormat('dd/MM/yyyy HH:mm');
        if (condition) logSheet.getRange(sheetRow, 11).setValue(condition); // cột K

        // === TÍNH GIỜ SỬ DỤNG → ghi vào cột Q ===
        const borrowDateVal = data[i][6]; // cột G — Ngày mượn
        const hoursUsed = writeUsageHours_(logSheet, sheetRow, borrowDateVal, actualReturnDate);
        if (hoursUsed !== null) {
          Logger.log(`✓ Giờ sử dụng TB "${qrCode}": ${hoursUsed}h`);
        }

        if (notes) {
          const existingNote = (data[i][13] || '').toString(); // cột N
          logSheet.getRange(sheetRow, 14).setValue(
            existingNote ? existingNote + ' | ' + notes : notes
          );
        }

        updated   = true;
        updatedRow = sheetRow;
        Logger.log(`✓ onFormSubmitReturn: cập nhật trả TB "${qrCode}" tại dòng ${sheetRow}`);
        break;
      }
    }
  }

  if (!updated) {
    Logger.log(`⚠️ onFormSubmitReturn: không tìm thấy dòng mượn chưa trả cho "${qrCode}"`);
  }

  // === TRA CỨU TÊN THIẾT BỊ ===
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const masterData  = masterSheet.getDataRange().getValues();
  const mHeaders    = masterData[0];
  const mColQR      = mHeaders.indexOf('Mã QR');
  const mColName    = mHeaders.indexOf('Tên thiết bị');

  let equipName = qrCode;
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][mColQR] === qrCode) {
      equipName = masterData[i][mColName] || qrCode;
      break;
    }
  }

  // === GỬI EMAIL XÁC NHẬN ===
  const subject = `[KTTV&HDH] ✅ Đã trả thiết bị: ${equipName} (${qrCode})`;
  let body = `Thông báo: Thiết bị đã được trả.\n\n`;
  body += `THÔNG TIN TRẢ THIẾT BỊ:\n`;
  body += `  Tên thiết bị : ${equipName}\n`;
  body += `  Mã QR        : ${qrCode}\n`;
  body += `  Người trả    : ${returner || 'N/A'}\n`;
  if (email)     body += `  Email        : ${email}\n`;
  body += `  Ngày trả     : ${Utilities.formatDate(actualReturnDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')}\n`;
  if (condition) body += `  Tình trạng   : ${condition}\n`;
  if (notes)     body += `  Ghi chú      : ${notes}\n`;

  if (updated) {
    body += `\n✓ Log_Muon_Tra đã được cập nhật (dòng ${updatedRow}).\n`;
  } else {
    body += `\n⚠️ CẢNH BÁO: Không tìm thấy dòng mượn tương ứng trong Log_Muon_Tra.\n`;
    body += `   → Vui lòng kiểm tra và cập nhật thủ công.\n`;
  }

  body += `\n— Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  Logger.log(`✓ Đã gửi email xác nhận trả TB: ${qrCode}`);
}


// ==================== 5. ĐỒNG BỘ FORM RESPONSES → LOG_MUON_TRA ====================

/**
 * Chạy 1 lần để copy dữ liệu mượn từ Form Responses sang Log_Muon_Tra.
 * Bỏ qua các dòng đã có trong Log (so khớp theo Mã QR + Ngày mượn).
 * Sau khi chạy xong, menu "Quản lý TB" sẽ có nút này.
 */
function syncFormResponsesToLog() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
  if (!logSheet) {
    Logger.log('⚠️ Không tìm thấy sheet Log_Muon_Tra');
    return;
  }

  // Lấy dữ liệu đã có trong Log để tránh trùng
  const logData = logSheet.getLastRow() >= 2
    ? logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues()
    : [];
  const existingKeys = new Set();
  logData.forEach(row => {
    const key = (row[0] || '').toString() + '|' + (row[6] || '').toString();
    existingKeys.add(key);
  });

  // Tìm Master_Data để tra cứu tên thiết bị
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const mColQR = masterHeaders.indexOf('Mã QR');
  const mColName = masterHeaders.indexOf('Tên thiết bị');
  const mColValue = masterHeaders.indexOf('Nguyên giá (tr.đ)');

  function lookupMaster(qr) {
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][mColQR] === qr) {
        return {
          name: masterData[i][mColName] || qr,
          value: parseFloat(masterData[i][mColValue]) || 0
        };
      }
    }
    return { name: qr, value: 0 };
  }

  // Quét tất cả sheet Form Responses
  const borrowSheets = findBorrowSheets_(ss);
  let syncCount = 0;

  for (const sheet of borrowSheets) {
    if (sheet.getName() === CONFIG.SHEETS.LOG_MUON) continue; // bỏ qua chính Log

    const data = sheet.getDataRange().getValues();
    const h = data[0];

    const cQR = findColIndex_(h, ['mã qr', 'ma qr']);
    const cTen = findColIndex_(h, ['tên thiết bị', 'ten thiet bi']);
    const cNguoi = findColIndex_(h, ['họ và tên', 'ho va ten', 'người mượn', 'nguoi muon']);
    const cDonVi = findColIndex_(h, ['đơn vị', 'don vi', 'nhóm nghiên cứu']);
    const cMucDich = findColIndex_(h, ['mục đích', 'muc dich']);
    const cDiaDiem = findColIndex_(h, ['địa điểm', 'dia diem']);
    const cNgayMuon = findColIndex_(h, ['ngày mượn', 'ngay muon']);
    const cHanTra = findColIndex_(h, ['dự kiến trả', 'du kien tra', 'hạn trả']);
    const cTinhTrang = findColIndex_(h, ['tình trạng', 'tinh trang']);
    const cPhuKien = findColIndex_(h, ['phụ kiện', 'phu kien']);
    const cGhiChu = findColIndex_(h, ['ghi chú', 'ghi chu']);
    const cEmail = findColIndex_(h, ['email', 'thư điện tử']);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const qr = cQR >= 0 ? (row[cQR] || '').toString().trim() : '';
      if (!qr) continue;

      const ngayMuon = cNgayMuon >= 0 ? row[cNgayMuon] : '';
      const key = qr + '|' + ngayMuon.toString();
      if (existingKeys.has(key)) continue; // đã có trong Log

      const master = lookupMaster(qr);
      const needsApproval = master.value >= CONFIG.APPROVAL_THRESHOLD;
      const emailVal = cEmail >= 0 ? (row[cEmail] || '').toString().trim() : '';

      const newRow = [
        qr,
        cTen >= 0 ? (row[cTen] || master.name) : master.name,
        cNguoi >= 0 ? (row[cNguoi] || '') : '',
        cDonVi >= 0 ? (row[cDonVi] || '') : '',
        cMucDich >= 0 ? (row[cMucDich] || '') : '',
        cDiaDiem >= 0 ? (row[cDiaDiem] || '') : '',
        ngayMuon ? new Date(ngayMuon) : '',
        cHanTra >= 0 && row[cHanTra] ? new Date(row[cHanTra]) : '',
        '',  // Ngày trả thực tế
        cTinhTrang >= 0 ? (row[cTinhTrang] || '') : '',
        '',  // Tình trạng khi trả
        cPhuKien >= 0 ? (row[cPhuKien] || '') : '',
        needsApproval ? '(Chờ phê duyệt PTK)' : '',
        cGhiChu >= 0 ? (row[cGhiChu] || '') : '',
        '',          // cột O — Quá hạn (formula, sẽ set riêng)
        emailVal     // cột P — Email người mượn
      ];

      logSheet.appendRow(newRow);

      // Ghi formula Quá hạn vào cột O cho dòng vừa sync
      const syncedRow = logSheet.getLastRow();
      const fCell = logSheet.getRange(syncedRow, 15);
      fCell.setFormula(`=IF(AND(H${syncedRow}<>"",I${syncedRow}="",TODAY()>H${syncedRow}),"✓","")`);
      fCell.setHorizontalAlignment('center').setFontWeight('bold')
           .setFontColor('#FF0000').setFontSize(14);

      // Tính giờ sử dụng cho dòng đã có ngày trả (lịch sử)
      const srcReturnDate = cHanTra >= 0 ? row[cHanTra] : null;
      const srcBorrowDate = ngayMuon;
      // Lưu ý: dữ liệu sync thường là ngày trả từ form responses (nếu có)
      // Nếu có cột "Ngày trả thực tế" trong source, ưu tiên dùng
      const cTraTT = findColIndex_(h, ['ngày trả thực tế', 'ngay tra thuc te', 'ngày trả', 'ngay tra actual']);
      const srcActualReturn = cTraTT >= 0 ? row[cTraTT] : null;
      if (srcActualReturn && srcBorrowDate) {
        writeUsageHours_(logSheet, syncedRow, srcBorrowDate, srcActualReturn);
      }

      existingKeys.add(key);
      syncCount++;
    }
  }

  Logger.log(`✓ Đồng bộ xong: ${syncCount} dòng mới được thêm vào Log_Muon_Tra`);
  SpreadsheetApp.getUi().alert(`Đồng bộ xong: ${syncCount} dòng mới được thêm vào Log_Muon_Tra`);
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
  const WORK_HOURS_PER_YEAR = 2000; // 250 ngày làm việc × 8h

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
  const mColRoom    = mH.indexOf('Phòng');
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

      const borrowDate = logData[i][6]; // cột G
      if (!borrowDate) continue;

      const bDate = borrowDate instanceof Date ? borrowDate : new Date(borrowDate);
      if (isNaN(bDate.getTime())) continue;

      // Lọc theo năm (dựa trên ngày mượn)
      if (bDate.getFullYear() !== targetYear) continue;

      if (!stats[qr]) stats[qr] = { times: 0, totalHours: 0, completedTimes: 0 };
      stats[qr].times++;

      // Giờ sử dụng: ưu tiên cột Q, fallback tính lại từ G và I
      const returnDate = logData[i][8]; // cột I
      if (returnDate) {
        let hours = logData[i][16]; // cột Q
        if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
          hours = calculateUsageHours_(borrowDate, returnDate);
        } else {
          hours = Number(hours);
        }
        if (hours && hours > 0) {
          stats[qr].totalHours += hours;
          stats[qr].completedTimes++;
        }
      }
    }
  }

  // === Xây dựng mảng reportRows ===
  const reportRows = allQRs.map(qr => {
    const m = masterMap[qr];
    const s = stats[qr] || { times: 0, totalHours: 0, completedTimes: 0 };
    const totalHours      = Math.round(s.totalHours * 10) / 10;
    const avgHoursPerUse  = s.completedTimes > 0
      ? Math.round(totalHours / s.completedTimes * 10) / 10 : 0;
    const utilizationPct  = Math.round(totalHours / WORK_HOURS_PER_YEAR * 1000) / 10;
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
    'STT', 'Mã QR', 'Tên thiết bị', 'Nhóm TB', 'Phòng',
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
    .setValue(`Ngày xuất: ${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')}  |  Cơ sở tính: ${WORK_HOURS_PER_YEAR}h/năm (250 ngày × 8h)`)
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
  if (new Date().getMonth() === 11) { // tháng 12 (0-indexed)
    generateAnnualUsageReport();
  }
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

/**
 * Xử lý phê duyệt / từ chối khi PTK bấm link trong email.
 * Cập nhật cột M trong Log_Muon_Tra và gửi thông báo cho người mượn.
 * Trả về trang HTML xác nhận hiển thị trên điện thoại/máy tính của PTK.
 */
function handleApproval_(action, qrCode) {
  const ss        = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const logSheet  = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);

  const errPage = (msg) => HtmlService.createHtmlOutput(`
    <html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <div style="font-size:40px">⚠️</div><h3>${msg}</h3>
      <p style="color:#888">Vui lòng kiểm tra lại hoặc cập nhật thủ công trong Google Sheet.</p>
    </body></html>`);

  if (!logSheet) return errPage('Không tìm thấy Log_Muon_Tra');

  const data = logSheet.getDataRange().getValues();
  let targetRow = -1;
  let rowData   = null;

  // Tìm dòng MỚI NHẤT của QR này đang chờ phê duyệt và chưa trả
  for (let i = data.length - 1; i >= 1; i--) {
    const rowQR    = (data[i][0]  || '').toString().trim();
    const colM     = (data[i][12] || '').toString();
    const returned = data[i][8]; // cột I

    if (rowQR === qrCode && colM.includes('Chờ phê duyệt') && !returned) {
      targetRow = i + 1; // 1-indexed
      rowData   = data[i];
      break;
    }
  }

  if (targetRow < 0) {
    return errPage('Yêu cầu này đã được xử lý hoặc không tìm thấy.');
  }

  // Ghi nhận vào cột M
  const now     = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  const isApprove    = action === 'approve';
  const approvalText = isApprove
    ? `✅ Đã phê duyệt — PTK (${dateStr})`
    : `❌ Từ chối — PTK (${dateStr})`;

  logSheet.getRange(targetRow, 13).setValue(approvalText); // cột M
  Logger.log(`✓ handleApproval: ${approvalText} — TB ${qrCode} tại dòng ${targetRow}`);

  const equipName     = (rowData[1]  || qrCode).toString();
  const borrower      = (rowData[2]  || '').toString();
  const borrowerEmail = (rowData[15] || '').toString().trim(); // cột P

  // Gửi thông báo cho người mượn (nếu có email)
  if (borrowerEmail) {
    const subj = isApprove
      ? `[KTTV&HDH] ✅ Yêu cầu mượn ${equipName} đã được PHÊ DUYỆT`
      : `[KTTV&HDH] ❌ Yêu cầu mượn ${equipName} bị TỪ CHỐI`;

    let body = `Kính gửi ${borrower},\n\n`;
    if (isApprove) {
      body += `Yêu cầu mượn thiết bị của bạn đã được Phó Trưởng khoa PHÊ DUYỆT.\n\n`;
      body += `  Thiết bị    : ${equipName} (${qrCode})\n`;
      body += `  Phê duyệt   : ${dateStr}\n\n`;
      body += `Bạn có thể đến nhận thiết bị theo lịch đã đăng ký.\n`;
    } else {
      body += `Yêu cầu mượn thiết bị của bạn đã bị Phó Trưởng khoa TỪ CHỐI.\n\n`;
      body += `  Thiết bị  : ${equipName} (${qrCode})\n`;
      body += `  Thời gian : ${dateStr}\n\n`;
      body += `Vui lòng liên hệ cán bộ quản lý để biết thêm thông tin.\n`;
    }
    body += `\n— Hệ thống quản lý TB Khoa KTTV&HDH`;
    MailApp.sendEmail(borrowerEmail, subj, body);
  }

  // Trang xác nhận trả về cho PTK
  const color = isApprove ? '#2e7d32' : '#c62828';
  const emoji = isApprove ? '✅' : '❌';
  const label = isApprove ? 'ĐÃ PHÊ DUYỆT' : 'ĐÃ TỪ CHỐI';

  return HtmlService.createHtmlOutput(`
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                 background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0">
      <div style="background:white;border-radius:16px;padding:40px 32px;max-width:440px;width:90%;
                  box-shadow:0 4px 16px rgba(0,0,0,.1);text-align:center">
        <div style="font-size:56px;margin-bottom:12px">${emoji}</div>
        <h2 style="color:${color};margin:0 0 8px;font-size:22px">${label}</h2>
        <p style="font-size:16px;font-weight:600;margin:16px 0 4px">${equipName}</p>
        <p style="font-size:13px;color:#888;font-family:monospace;margin:0 0 16px">${qrCode}</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:12px;font-size:13px;color:#555;text-align:left">
          <div>👤 Người mượn: <strong>${borrower || 'N/A'}</strong></div>
          <div style="margin-top:6px">🕐 Ghi nhận lúc: <strong>${dateStr}</strong></div>
          ${borrowerEmail ? `<div style="margin-top:6px">✉️ Đã thông báo cho: <strong>${borrowerEmail}</strong></div>` : ''}
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="font-size:11px;color:#bbb">Hệ thống quản lý TB — Khoa KTTV&HDH<br>ĐH Khoa học Tự nhiên — ĐHQGHN</p>
      </div>
    </body>
    </html>`);
}


/**
 * Web App entry point - để QR Landing Page gọi lấy trạng thái mượn real-time.
 * Deploy as Web App: Extensions → Apps Script → Deploy → New deployment
 *   → Type: Web app → Execute as: Me → Who has access: Anyone → Deploy
 *
 * Response JSON gồm toàn bộ thông tin thiết bị + field _borrowStatus:
 *   { ..., _borrowStatus: { available: true } }                          ← rảnh
 *   { ..., _borrowStatus: { available: false, borrower, dueDate, daysOverdue } } ← đang mượn
 *   { ..., _borrowStatus: { available: null } }                          ← lỗi đọc sheet
 */
function doGet(e) {
  // Route: phê duyệt / từ chối mượn thiết bị (PTK bấm link trong email)
  const action = e.parameter.action;
  if (action === 'approve' || action === 'reject') {
    const qr = (e.parameter.qr || '').trim();
    if (!qr) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px">' +
        '<h3>⚠️ Thiếu mã QR trong link. Vui lòng kiểm tra lại email.</h3></body></html>'
      );
    }
    return handleApproval_(action, qr);
  }

  // Route: trạng thái mượn toàn bộ thiết bị (PWA browse view gọi 1 lần)
  if (action === 'allStatus') {
    const statuses = getAllBorrowStatuses_();
    return ContentService
      .createTextOutput(JSON.stringify(statuses))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Route: lịch sử sử dụng của một thiết bị (landing page gọi khi người dùng mở lịch sử)
  if (action === 'history') {
    const qrCode = (e.parameter.id || '').trim();
    const history = qrCode ? getUsageHistory_(qrCode) : [];
    return ContentService
      .createTextOutput(JSON.stringify({ qrCode: qrCode, history: history }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Route: nhật ký sử dụng toàn Khoa (mọi lượt mượn/trả của mọi thiết bị)
  if (action === 'alllog') {
    const limit = Math.min(Math.max(parseInt(e.parameter.limit, 10) || 200, 1), 1000);
    return ContentService
      .createTextOutput(JSON.stringify({ entries: getAllUsageLog_(limit) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Route: tra cứu thiết bị theo mã QR (landing page gọi)
  const qrCode = e.parameter.id;

  if (qrCode) {
    const equip = lookupEquipment(qrCode);
    if (equip) {
      const borrowStatus = checkBorrowStatus_(qrCode);
      const result = Object.assign({}, equip, { _borrowStatus: borrowStatus });
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Nếu không có ID hoặc không tìm thấy → redirect về landing page
  return HtmlService.createHtmlOutput(
    '<script>window.location.href = "https://phamtiendat-135.github.io/HMO-equipment/";</script>'
  );
}

/**
 * Trả về lịch sử mượn/trả của một thiết bị từ Log_Muon_Tra.
 * Chỉ trả các trường cần hiển thị trên landing page, không trả email hay ghi chú nội bộ.
 */
function getUsageHistory_(qrCode) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (!logSheet || logSheet.getLastRow() < 2) return [];

    const data = logSheet.getDataRange().getValues();
    const history = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if ((row[0] || '').toString().trim() !== qrCode) continue;

      const borrowDate = parseDate_(row[6]);
      const returnDate = parseDate_(row[8]);
      history.push({
        borrower: (row[2] || '').toString().trim() || 'Chưa ghi nhận',
        location: (row[5] || '').toString().trim() || 'Chưa ghi nhận',
        borrowDate: borrowDate ? Utilities.formatDate(borrowDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
        returnDate: returnDate ? Utilities.formatDate(returnDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
        usageHours: row[16] === '' || row[16] === null ? null : Number(row[16]),
        isActive: !returnDate
      });
    }
    return history;
  } catch (err) {
    Logger.log('getUsageHistory_ error: ' + err.message);
    return [];
  }
}

/**
 * Trả về nhật ký sử dụng của TOÀN BỘ thiết bị từ Log_Muon_Tra, mới nhất trước.
 * Giống getUsageHistory_ nhưng không lọc theo mã QR và có kèm tên thiết bị.
 * Cố ý KHÔNG trả email (cột P) và ghi chú nội bộ (cột N).
 */
function getAllUsageLog_(limit) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (!logSheet || logSheet.getLastRow() < 2) return [];

    const data = logSheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entries = [];

    for (let i = data.length - 1; i >= 1 && entries.length < limit; i--) {
      const row = data[i];
      const qrCode = (row[0] || '').toString().trim();
      if (!qrCode) continue;

      const borrowDate = parseDate_(row[6]);
      const dueDate = parseDate_(row[7]);
      const returnDate = parseDate_(row[8]);
      const isActive = !returnDate;
      const hours = row[16];

      entries.push({
        qrCode: qrCode,
        equipName: (row[1] || '').toString().trim(),
        borrower: (row[2] || '').toString().trim() || 'Chưa ghi nhận',
        unit: (row[3] || '').toString().trim(),
        location: (row[5] || '').toString().trim() || 'Chưa ghi nhận',
        borrowDate: borrowDate ? Utilities.formatDate(borrowDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
        dueDate: dueDate ? Utilities.formatDate(dueDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
        returnDate: returnDate ? Utilities.formatDate(returnDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : '',
        usageHours: (hours === '' || hours === null || hours === undefined) ? null : Number(hours),
        isActive: isActive,
        isOverdue: isActive && !!dueDate && dueDate < today
      });
    }
    return entries;
  } catch (err) {
    Logger.log('getAllUsageLog_ error: ' + err.message);
    return [];
  }
}

/**
 * Trả về trạng thái mượn của TẤT CẢ thiết bị trong một lần gọi.
 * Dùng cho PWA browse view — thay vì gọi N lần, gọi 1 lần lấy hết.
 * Return: { "HMO-OBS-8688": 1, "HMO-HPC-7303": 0, ... }
 *   Key = mã QR, Value = số lượng đang mượn chưa trả
 */
function getAllBorrowStatuses_() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    const result = {};
    if (!logSheet || logSheet.getLastRow() < 2) return result;

    const data = logSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const qr = (data[i][0] || '').toString().trim();
      const returnDate = data[i][8]; // cột I
      if (qr && !returnDate) {
        result[qr] = (result[qr] || 0) + 1;
      }
    }
    return result;
  } catch (err) {
    Logger.log('getAllBorrowStatuses_ error: ' + err.message);
    return {};
  }
}

/**
 * Kiểm tra trạng thái mượn của thiết bị, hỗ trợ thiết bị có số lượng > 1.
 * Đếm tổng số lượt mượn chưa trả (borrowedCount) cho QR này.
 * Landing page sẽ tính remaining = eq.qty - borrowedCount để hiển thị đúng.
 *
 * Trả về:
 *   { available: true,  borrowedCount: 0 }                            ← hoàn toàn rảnh
 *   { available: false, borrowedCount: N, borrower, dueDate, daysOverdue } ← đang có người mượn
 *   { available: null,  borrowedCount: 0 }                            ← lỗi đọc sheet
 */
function checkBorrowStatus_(qrCode) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (!logSheet || logSheet.getLastRow() < 2) return { available: true, borrowedCount: 0 };

    const data = logSheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Đếm tổng số lượt đang mượn chưa trả cho QR này
    let borrowedCount = 0;
    for (let i = 1; i < data.length; i++) {
      const rowQR      = (data[i][0] || '').toString().trim();
      const returnDate = data[i][8]; // cột I
      if (rowQR === qrCode && !returnDate) borrowedCount++;
    }

    if (borrowedCount === 0) return { available: true, borrowedCount: 0 };

    // Lấy thông tin lần mượn MỚI NHẤT (để hiển thị tên người mượn, hạn trả)
    let borrower    = '';
    let dueDateStr  = '';
    let daysOverdue = 0;

    for (let i = data.length - 1; i >= 1; i--) {
      const rowQR      = (data[i][0] || '').toString().trim();
      const returnDate = data[i][8];
      if (rowQR === qrCode && !returnDate) {
        borrower = (data[i][2] || '').toString().trim(); // cột C
        const dueDate = data[i][7];                      // cột H
        const due = parseDate_(dueDate);
        if (due) {
          dueDateStr  = Utilities.formatDate(due, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
          daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
        }
        break;
      }
    }

    return {
      available    : false,
      borrowedCount: borrowedCount,
      borrower     : borrower,
      dueDate      : dueDateStr,
      daysOverdue  : daysOverdue
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
    .addToUi();
}
