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

  // Số ngày quá hạn trả trước khi gửi nhắc nhở
  OVERDUE_DAYS: 3,

  // Số ngày trước hạn trả để gửi email nhắc người mượn
  REMIND_DAYS_BEFORE: 2,

  // URL trang landing page — dùng trong link email nhắc trả
  LANDING_PAGE_URL: 'https://phamtiendat-135.github.io/HMO-equipment/'
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
        const dueDate = new Date(hanTra);
        if (isNaN(dueDate.getTime())) continue; // bỏ qua giá trị không hợp lệ
        dueDate.setHours(0, 0, 0, 0);
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

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
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
  const tag = needsApproval ? '🔴 CẦN PHÊ DUYỆT' : '🟢 Thông báo';
  const subject = `[KTTV&HDH] ${tag} — Mượn TB: ${equipName} (${qrCode})`;

  let body = '';
  if (needsApproval) {
    body += `⚠️ THIẾT BỊ GIÁ TRỊ CAO — CẦN PHÊ DUYỆT CỦA PHÓ TRƯỞNG KHOA\n`;
    body += `${'─'.repeat(50)}\n\n`;
  } else {
    body += `Thông báo: Có yêu cầu mượn thiết bị mới.\n\n`;
  }

  body += `THÔNG TIN THIẾT BỊ:\n`;
  body += `  Tên: ${equipName}\n`;
  body += `  Mã QR: ${qrCode}\n`;
  body += `  Giá trị: ${equipValue.toLocaleString()} triệu VNĐ\n`;
  if (equipRoom) body += `  Phòng: ${equipRoom}\n`;

  body += `\nNGƯỜI MƯỢN:\n`;
  body += `  Họ tên: ${borrower}\n`;
  if (email) body += `  Email: ${email}\n`;
  if (phone) body += `  SĐT: ${phone}\n`;
  body += `  Mục đích: ${purpose}\n`;
  body += `  Dự kiến trả: ${dueDate}\n\n`;

  if (needsApproval) {
    body += `→ Vui lòng phản hồi email này để PHÊ DUYỆT hoặc TỪ CHỐI.\n\n`;
  }

  body += `— Hệ thống quản lý TB Khoa KTTV&HDH`;

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
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
 * Kiểm tra thiết bị hiện có đang được mượn không.
 * Quét Log_Muon_Tra từ dưới lên, tìm dòng QR khớp mà cột I (Ngày trả thực tế) còn trống.
 */
function checkBorrowStatus_(qrCode) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_MUON);
    if (!logSheet || logSheet.getLastRow() < 2) return { available: true };

    const data = logSheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Quét từ dưới lên để lấy lần mượn MỚI NHẤT của QR này
    for (let i = data.length - 1; i >= 1; i--) {
      const rowQR      = (data[i][0] || '').toString().trim(); // cột A
      const returnDate = data[i][8];                           // cột I — Ngày trả thực tế

      if (rowQR === qrCode && !returnDate) {
        const borrower = (data[i][2] || '').toString().trim(); // cột C — Người mượn
        const dueDate  = data[i][7];                           // cột H — Ngày dự kiến trả

        let dueDateStr  = '';
        let daysOverdue = 0;
        if (dueDate) {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
          dueDateStr  = Utilities.formatDate(due, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
          daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
        }

        return {
          available   : false,
          borrower    : borrower,
          dueDate     : dueDateStr,
          daysOverdue : daysOverdue
        };
      }
    }

    return { available: true };

  } catch (err) {
    Logger.log('checkBorrowStatus_ error: ' + err.message);
    return { available: null }; // null = không đọc được sheet
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
