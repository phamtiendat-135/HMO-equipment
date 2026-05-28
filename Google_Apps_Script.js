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

  // Trigger 4: Khi có form response mới → dispatcher phân loại mượn/trả → gọi đúng hàm xử lý
  // Trigger này gắn trên Spreadsheet, bắt sự kiện form submit liên kết với Sheet
  ScriptApp.newTrigger('onFormSubmitDispatch')
    .forSpreadsheet(CONFIG.MASTER_SHEET_ID)
    .onFormSubmit()
    .create();

  Logger.log('✓ Đã thiết lập tất cả trigger tự động');
  Logger.log('  - Nhắc trả TB (→ người mượn): hàng ngày 7h');
  Logger.log('  - Kiểm tra quá hạn (→ admin): hàng ngày 8h');
  Logger.log('  - Kiểm tra bảo trì: thứ 2 hàng tuần 9h');
  Logger.log('  - Báo cáo tháng: ngày 1 hàng tháng 8h');
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

function checkOverdueReturns() {
  const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const borrowSheets = findBorrowSheets_(ss);

  if (borrowSheets.length === 0) {
    Logger.log('⚠️ checkOverdueReturns: không tìm thấy sheet nào chứa dữ liệu mượn/trả');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueItems = [];

  for (const sheet of borrowSheets) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Tìm cột bằng fuzzy matching — hoạt động với cả tên cột Log và tên câu hỏi Form
    const colQR = findColIndex_(headers, ['mã qr', 'ma qr']);
    const colTen = findColIndex_(headers, ['tên thiết bị', 'ten thiet bi']);
    const colNguoi = findColIndex_(headers, ['người mượn', 'nguoi muon', 'họ và tên', 'ho va ten', 'họ tên']);
    const colHanTra = findColIndex_(headers, ['dự kiến trả', 'du kien tra', 'hạn trả', 'han tra']);
    const colTraTT = findColIndex_(headers, ['trả thực tế', 'tra thuc te', 'ngày trả thực tế']);

    if (colQR < 0 || colHanTra < 0) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const hanTra = row[colHanTra];
      const traTT = colTraTT >= 0 ? row[colTraTT] : '';

      // Chỉ xét các dòng chưa trả và đã quá hạn
      if (!traTT && hanTra) {
        const dueDate = parseDate_(hanTra);
        if (!dueDate) continue; // bỏ qua giá trị không parse được
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (daysOverdue >= CONFIG.OVERDUE_DAYS) {
          overdueItems.push({
            qr: row[colQR] || 'N/A',
            name: colTen >= 0 ? (row[colTen] || 'N/A') : 'N/A',
            borrower: colNguoi >= 0 ? (row[colNguoi] || 'N/A') : 'N/A',
            dueDate: Utilities.formatDate(dueDate, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
            daysOverdue: daysOverdue,
            sheet: sheet.getName()
          });
        }
      }
    }
  }

  if (overdueItems.length === 0) {
    Logger.log('✓ checkOverdueReturns: không có thiết bị quá hạn');
    return;
  }

  // Gửi email
  const subject = `[KTTV&HDH] ⚠️ ${overdueItems.length} thiết bị quá hạn trả`;
  let body = `Kính gửi Phó Trưởng khoa,\n\n`;
  body += `Hệ thống phát hiện ${overdueItems.length} thiết bị quá hạn trả:\n\n`;

  overdueItems.forEach((item, idx) => {
    body += `${idx + 1}. ${item.qr} — ${item.name}\n`;
    body += `   Người mượn: ${item.borrower}\n`;
    body += `   Hạn trả: ${item.dueDate} (quá ${item.daysOverdue} ngày)\n\n`;
  });

  body += `Vui lòng liên hệ người mượn để thu hồi thiết bị.\n\n`;
  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  Logger.log(`✓ Đã gửi email nhắc quá hạn: ${overdueItems.length} thiết bị`);
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

    // Chỉ gửi khi còn đúng REMIND_DAYS_BEFORE ngày (tránh gửi lặp)
    if (daysUntilDue !== CONFIG.REMIND_DAYS_BEFORE) continue;

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
      const nd = new Date(nextDate);
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
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  if (logSheet && logSheet.getLastRow() > 1) {
    const logData = logSheet.getDataRange().getValues();
    const colBorrowDate = logData[0].indexOf('Ngày mượn');
    const colReturnDate = logData[0].indexOf('Ngày trả thực tế');

    for (let i = 1; i < logData.length; i++) {
      const bDate = logData[i][colBorrowDate];
      if (bDate && new Date(bDate) >= firstOfMonth && new Date(bDate) <= lastOfMonth) {
        borrowCount++;
      }
      const rDate = logData[i][colReturnDate];
      if (rDate && new Date(rDate) >= firstOfMonth && new Date(rDate) <= lastOfMonth) {
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
        ngayMuon ? new Date(ngayMuon) : new Date(),
        dueDate ? new Date(dueDate) : '',
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

    // Nhận diện form TRẢ: tên sheet chứa "trả"/"tra"/"return",
    // HOẶC form có trường "ngày trả thực tế" mà KHÔNG có "dự kiến trả"
    const isReturnBySheet = sheetName.includes('trả') ||
                            sheetName.includes('tra') ||
                            sheetName.includes('return');
    const hasReturnDateField = keys.some(k =>
      k.includes('ngày trả thực tế') || k.includes('ngay tra thuc te') ||
      k.includes('ngày trả') || k.includes('ngay tra'));
    const hasDueDateField = keys.some(k =>
      k.includes('dự kiến trả') || k.includes('du kien tra') ||
      k.includes('hạn trả') || k.includes('han tra'));

    const isReturn = isReturnBySheet || (hasReturnDateField && !hasDueDateField);

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

  const actualReturnDate = returnStr ? new Date(returnStr) : new Date();

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

        logSheet.getRange(sheetRow, 9).setValue(actualReturnDate);        // cột I
        if (condition) logSheet.getRange(sheetRow, 11).setValue(condition); // cột K

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

      existingKeys.add(key);
      syncCount++;
    }
  }

  Logger.log(`✓ Đồng bộ xong: ${syncCount} dòng mới được thêm vào Log_Muon_Tra`);
  SpreadsheetApp.getUi().alert(`Đồng bộ xong: ${syncCount} dòng mới được thêm vào Log_Muon_Tra`);
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
        if (dueDate) {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
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
    .addItem('Đồng bộ Form → Log_Muon_Tra', 'syncFormResponsesToLog')
    .addItem('Thiết lập trigger tự động', 'setup')
    .addToUi();
}
