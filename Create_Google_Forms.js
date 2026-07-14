/**
 * ============================================================
 * TẠO TỰ ĐỘNG 4 GOOGLE FORMS — KHOA KTTV&HDH
 * ============================================================
 *
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Mở Google Sheet master → Extensions → Apps Script
 * 2. Tạo file script mới (hoặc xóa code mặc định)
 * 3. Paste TOÀN BỘ code này vào
 * 4. Nhấn Run → chọn hàm "createAllForms" → Run
 * 5. Cấp quyền khi được hỏi (Google Forms, Google Sheets, Gmail)
 * 6. Chờ ~30 giây — script sẽ tạo 4 forms và in kết quả trong Logger
 * 7. Nhấn View → Logs để xem URL các form và pre-filled links
 *
 * SAU KHI CHẠY XONG:
 * - 4 forms đã tạo trong Google Drive
 * - Responses đã link vào đúng Sheet master
 * - Pre-filled URLs đã in trong Logs → copy vào QR_Landing_Page.html
 *
 * LƯU Ý: Chỉ cần chạy script này MỘT LẦN. Nếu chạy lại sẽ tạo thêm forms mới.
 */

// ==================== CẤU HÌNH ====================
const SHEET_ID = '1k3KYyN64NzRwAh0g8BsXieHkFqudhbu6Iy7UwOoAjK4';
const ADMIN_EMAIL = 'datpt@hus.edu.vn';

// ==================== HÀM CHÍNH ====================

function createAllForms() {
  Logger.log('============================================================');
  Logger.log('BẮT ĐẦU TẠO 4 GOOGLE FORMS — ' + new Date().toLocaleString());
  Logger.log('============================================================\n');

  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Tạo 4 forms
  const form1 = createBorrowForm(ss);
  const form2 = createReturnForm(ss);
  const form3 = createMaintenanceForm(ss);
  const form4 = createDamageReportForm(ss);

  // Tổng kết
  Logger.log('\n============================================================');
  Logger.log('HOÀN THÀNH! ĐÃ TẠO 4 GOOGLE FORMS');
  Logger.log('============================================================\n');

  Logger.log('--- COPY CÁC URL BÊN DƯỚI VÀO FILE QR_Landing_Page.html ---\n');

  Logger.log('const FORMS = {');
  Logger.log('  borrow: \'' + form1.prefilled + '\',');
  Logger.log('  return: \'' + form2.prefilled + '\',');
  Logger.log('  maintain: \'' + form3.prefilled + '\',');
  Logger.log('  report: \'' + form4.prefilled + '\'');
  Logger.log('};');

  Logger.log('\n--- LINK TRỰC TIẾP ĐỂ KIỂM TRA ---\n');
  Logger.log('Form Mượn TB:    ' + form1.editUrl);
  Logger.log('Form Trả TB:     ' + form2.editUrl);
  Logger.log('Form Bảo trì:    ' + form3.editUrl);
  Logger.log('Form Báo hỏng:   ' + form4.editUrl);

  // Gửi email tổng kết cho admin
  sendSummaryEmail_(form1, form2, form3, form4);
}


// ==================== FORM 1: MƯỢN THIẾT BỊ ====================

function createBorrowForm(ss) {
  Logger.log('▶ Tạo Form 1: Đăng ký mượn thiết bị...');

  const form = FormApp.create('Đăng ký mượn thiết bị — Khoa KTTV&HDH');
  form.setDescription(
    'Vui lòng điền đầy đủ thông tin bên dưới.\n' +
    'Thiết bị có giá trị ≥ 100 triệu VNĐ cần được Phó Trưởng khoa phê duyệt.\n\n' +
    'Liên hệ: datpt@hus.edu.vn | Khoa KTTV&HDH — ĐHKHTN, ĐHQGHN'
  );
  form.setConfirmationMessage('Đã ghi nhận yêu cầu mượn thiết bị. CB phụ trách sẽ liên hệ xác nhận.');
  form.setAllowResponseEdits(false);
  form.setCollectEmail(true);

  // 1. Mã QR thiết bị
  const qrItem = form.addTextItem();
  qrItem.setTitle('Mã QR thiết bị');
  qrItem.setHelpText('Ví dụ: HMO-OBS-8372');
  qrItem.setRequired(true);
  qrItem.setValidation(FormApp.createTextValidation()
    .requireTextMatchesPattern('^HMO-[A-Z]{2,3}-\\d{4,5}$')
    .setHelpText('Mã QR phải có dạng HMO-XXX-XXXX (ví dụ: HMO-OBS-8372)')
    .build());

  // 2. Tên thiết bị
  form.addTextItem()
    .setTitle('Tên thiết bị')
    .setHelpText('Tên thiết bị hiển thị trên nhãn QR')
    .setRequired(true);

  // 3. Họ và tên người mượn
  form.addTextItem()
    .setTitle('Họ và tên người mượn')
    .setRequired(true);

  // 4. Email (đã bật collectEmail ở trên, thêm trường bổ sung nếu cần email khác)

  // 5. Đơn vị / Nhóm nghiên cứu
  form.addListItem()
    .setTitle('Đơn vị / Nhóm nghiên cứu')
    .setRequired(true)
    .setChoiceValues([
      'Bộ môn Khí tượng và Khí hậu học',
      'Bộ môn Thủy văn và Tài nguyên nước',
      'Bộ môn Khoa học và Công nghệ Biển',
      'Nghiên cứu sinh',
      'Học viên cao học',
      'Khác'
    ]);

  // 6. Vai trò
  form.addListItem()
    .setTitle('Vai trò')
    .setRequired(true)
    .setChoiceValues([
      'Giảng viên',
      'Nghiên cứu sinh',
      'Học viên cao học',
      'Sinh viên',
      'Cán bộ kỹ thuật'
    ]);

  // 7. Mục đích sử dụng
  form.addParagraphTextItem()
    .setTitle('Mục đích sử dụng')
    .setHelpText('Mô tả ngắn gọn mục đích mượn thiết bị')
    .setRequired(true);

  // 8. Thuộc đề tài / dự án
  form.addTextItem()
    .setTitle('Thuộc đề tài / dự án (nếu có)')
    .setHelpText('Tên hoặc mã số đề tài')
    .setRequired(false);

  // 9. Địa điểm triển khai
  form.addTextItem()
    .setTitle('Địa điểm triển khai')
    .setHelpText('Ví dụ: "Cửa Đại, Hội An" hoặc "P204-T3"')
    .setRequired(true);

  // 10. Ngày mượn
  form.addDateItem()
    .setTitle('Ngày mượn')
    .setRequired(true);

  // 11. Ngày dự kiến trả
  form.addDateItem()
    .setTitle('Ngày dự kiến trả')
    .setRequired(true);

  // 12. Tình trạng thiết bị khi mượn
  form.addListItem()
    .setTitle('Tình trạng thiết bị khi mượn')
    .setRequired(true)
    .setChoiceValues([
      'Tốt',
      'Bình thường',
      'Có lưu ý (ghi ở ghi chú)'
    ]);

  // 13. Phụ kiện kèm theo
  form.addCheckboxItem()
    .setTitle('Phụ kiện kèm theo')
    .setRequired(false)
    .setChoiceValues([
      'Cáp nguồn / sạc',
      'Pin dự phòng',
      'Tài liệu hướng dẫn',
      'Hộp / vali chuyên dụng',
      'Bộ rung điện (ADCP)',
      'Giá lắp xuồng (ADCP)',
      'Khác'
    ]);

  // 14. Ghi chú
  form.addParagraphTextItem()
    .setTitle('Ghi chú')
    .setRequired(false);

  // Link response vào Sheet
  linkFormToSheet_(form, ss, 'Log_Muon_Tra');

  // Lấy pre-filled URL
  const prefilled = getPrefilledUrl_(form, qrItem);

  Logger.log('  ✓ Form 1 đã tạo: ' + form.getPublishedUrl());

  return {
    name: 'Đăng ký mượn thiết bị',
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    prefilled: prefilled
  };
}


// ==================== FORM 2: TRẢ THIẾT BỊ ====================

function createReturnForm(ss) {
  Logger.log('▶ Tạo Form 2: Xác nhận trả thiết bị...');

  const form = FormApp.create('Xác nhận trả thiết bị — Khoa KTTV&HDH');
  form.setDescription(
    'Quét mã QR trên thiết bị và điền form khi trả.\n\n' +
    'Liên hệ: datpt@hus.edu.vn | Khoa KTTV&HDH — ĐHKHTN, ĐHQGHN'
  );
  form.setConfirmationMessage('Đã ghi nhận trả thiết bị. Cảm ơn bạn!');
  form.setCollectEmail(true);

  // 1. Mã QR thiết bị
  const qrItem = form.addTextItem();
  qrItem.setTitle('Mã QR thiết bị');
  qrItem.setHelpText('Ví dụ: HMO-OBS-8372');
  qrItem.setRequired(true);
  qrItem.setValidation(FormApp.createTextValidation()
    .requireTextMatchesPattern('^HMO-[A-Z]{2,3}-\\d{4,5}$')
    .setHelpText('Mã QR phải có dạng HMO-XXX-XXXX')
    .build());

  // 2. Tên thiết bị
  form.addTextItem()
    .setTitle('Tên thiết bị')
    .setRequired(true);

  // 3. Họ và tên người trả
  form.addTextItem()
    .setTitle('Họ và tên người trả')
    .setRequired(true);

  // 4. Ngày trả
  form.addDateItem()
    .setTitle('Ngày trả')
    .setRequired(true);

  // 5. Tình trạng thiết bị khi trả
  form.addListItem()
    .setTitle('Tình trạng thiết bị khi trả')
    .setRequired(true)
    .setChoiceValues([
      'Tốt — như khi mượn',
      'Bình thường — có dấu hiệu hao mòn',
      'Hư hỏng nhẹ — cần kiểm tra',
      'Hỏng — cần sửa chữa'
    ]);

  // 6. Phụ kiện trả kèm
  form.addCheckboxItem()
    .setTitle('Phụ kiện trả kèm')
    .setRequired(false)
    .setChoiceValues([
      'Cáp nguồn / sạc',
      'Pin dự phòng',
      'Tài liệu hướng dẫn',
      'Hộp / vali chuyên dụng',
      'Bộ rung điện (ADCP)',
      'Giá lắp xuồng (ADCP)',
      'Khác'
    ]);

  // 7. Mô tả tình trạng
  form.addParagraphTextItem()
    .setTitle('Mô tả tình trạng (nếu có thay đổi)')
    .setHelpText('Bắt buộc nếu thiết bị bị hư hỏng hoặc hỏng')
    .setRequired(false);

  // 8. Ảnh thiết bị khi trả
  // Lưu ý: FormApp không hỗ trợ File Upload qua script
  // → Thêm trường text để user paste link ảnh (Google Drive / Google Photos)
  form.addTextItem()
    .setTitle('Link ảnh thiết bị khi trả (nếu có)')
    .setHelpText('Upload ảnh lên Google Drive, paste link chia sẻ vào đây')
    .setRequired(false);

  // Link response vào Sheet
  linkFormToSheet_(form, ss, 'Log_Muon_Tra');

  const prefilled = getPrefilledUrl_(form, qrItem);

  Logger.log('  ✓ Form 2 đã tạo: ' + form.getPublishedUrl());

  return {
    name: 'Xác nhận trả thiết bị',
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    prefilled: prefilled
  };
}


// ==================== FORM 3: BẢO TRÌ / HIỆU CHUẨN ====================

function createMaintenanceForm(ss) {
  Logger.log('▶ Tạo Form 3: Ghi nhận bảo trì & hiệu chuẩn...');

  const form = FormApp.create('Ghi nhận bảo trì & hiệu chuẩn — Khoa KTTV&HDH');
  form.setDescription(
    'Dành cho CB phụ trách ghi nhận sau khi bảo trì, hiệu chuẩn, hoặc sửa chữa thiết bị.\n\n' +
    'Liên hệ: datpt@hus.edu.vn | Khoa KTTV&HDH — ĐHKHTN, ĐHQGHN'
  );
  form.setConfirmationMessage('Đã ghi nhận bảo trì thiết bị.');
  form.setCollectEmail(true);

  // 1. Mã QR thiết bị
  const qrItem = form.addTextItem();
  qrItem.setTitle('Mã QR thiết bị');
  qrItem.setHelpText('Ví dụ: HMO-OBS-8372');
  qrItem.setRequired(true);
  qrItem.setValidation(FormApp.createTextValidation()
    .requireTextMatchesPattern('^HMO-[A-Z]{2,3}-\\d{4,5}$')
    .setHelpText('Mã QR phải có dạng HMO-XXX-XXXX')
    .build());

  // 2. Tên thiết bị
  form.addTextItem()
    .setTitle('Tên thiết bị')
    .setRequired(true);

  // 3. Loại công việc
  form.addListItem()
    .setTitle('Loại công việc')
    .setRequired(true)
    .setChoiceValues([
      'Bảo trì định kỳ',
      'Hiệu chuẩn',
      'Sửa chữa',
      'Nâng cấp',
      'Vệ sinh & kiểm tra'
    ]);

  // 4. Ngày thực hiện
  form.addDateItem()
    .setTitle('Ngày thực hiện')
    .setRequired(true);

  // 5. Ngày hiệu chuẩn / bảo trì tiếp theo
  form.addDateItem()
    .setTitle('Ngày hiệu chuẩn / bảo trì tiếp theo')
    .setHelpText('Hệ thống sẽ tự động nhắc trước 30 ngày')
    .setRequired(true);

  // 6. Đơn vị thực hiện
  form.addListItem()
    .setTitle('Đơn vị thực hiện')
    .setRequired(true)
    .setChoiceValues([
      'Tự thực hiện (CB Khoa)',
      'Hãng sản xuất / đại lý',
      'Đơn vị bên thứ 3',
      'Khác'
    ]);

  // 7. Tên đơn vị (nếu thuê ngoài)
  form.addTextItem()
    .setTitle('Tên đơn vị thực hiện (nếu thuê ngoài)')
    .setRequired(false);

  // 8. Chi phí
  form.addTextItem()
    .setTitle('Chi phí (triệu VNĐ)')
    .setHelpText('Nhập 0 nếu tự thực hiện')
    .setRequired(false);

  // 9. Nội dung công việc chi tiết
  form.addParagraphTextItem()
    .setTitle('Nội dung công việc chi tiết')
    .setHelpText('Mô tả cụ thể đã thực hiện những gì')
    .setRequired(true);

  // 10. Kết quả
  form.addListItem()
    .setTitle('Kết quả')
    .setRequired(true)
    .setChoiceValues([
      'Hoàn thành — TB hoạt động bình thường',
      'Hoàn thành — cần theo dõi thêm',
      'Chưa hoàn thành — cần thêm linh kiện',
      'Không sửa được — đề xuất thanh lý'
    ]);

  // 11. Người thực hiện
  form.addTextItem()
    .setTitle('Người thực hiện')
    .setRequired(true);

  // 12. Tài liệu đính kèm (link)
  form.addTextItem()
    .setTitle('Link tài liệu đính kèm (nếu có)')
    .setHelpText('Biên bản, chứng chỉ hiệu chuẩn, hóa đơn — upload lên Drive rồi paste link')
    .setRequired(false);

  // 13. Ghi chú
  form.addParagraphTextItem()
    .setTitle('Ghi chú')
    .setRequired(false);

  // Link response vào Sheet
  linkFormToSheet_(form, ss, 'Log_Bao_Tri');

  const prefilled = getPrefilledUrl_(form, qrItem);

  Logger.log('  ✓ Form 3 đã tạo: ' + form.getPublishedUrl());

  return {
    name: 'Ghi nhận bảo trì & hiệu chuẩn',
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    prefilled: prefilled
  };
}


// ==================== FORM 4: BÁO HỎNG ====================

function createDamageReportForm(ss) {
  Logger.log('▶ Tạo Form 4: Báo hỏng thiết bị...');

  const form = FormApp.create('Báo hỏng thiết bị — Khoa KTTV&HDH');
  form.setDescription(
    'Bất kỳ ai phát hiện thiết bị hỏng đều có thể báo qua form này.\n' +
    'Thông báo sẽ được gửi ngay cho CB phụ trách.\n\n' +
    'Liên hệ: datpt@hus.edu.vn | Khoa KTTV&HDH — ĐHKHTN, ĐHQGHN'
  );
  form.setConfirmationMessage('Đã tiếp nhận báo hỏng. CB phụ trách sẽ kiểm tra và phản hồi.');
  form.setCollectEmail(true);

  // 1. Mã QR thiết bị
  const qrItem = form.addTextItem();
  qrItem.setTitle('Mã QR thiết bị');
  qrItem.setHelpText('Ví dụ: HMO-OBS-8372');
  qrItem.setRequired(true);
  qrItem.setValidation(FormApp.createTextValidation()
    .requireTextMatchesPattern('^HMO-[A-Z]{2,3}-\\d{4,5}$')
    .setHelpText('Mã QR phải có dạng HMO-XXX-XXXX')
    .build());

  // 2. Tên thiết bị
  form.addTextItem()
    .setTitle('Tên thiết bị')
    .setRequired(true);

  // 3. Người phát hiện
  form.addTextItem()
    .setTitle('Người phát hiện')
    .setRequired(true);

  // 4. Email liên hệ (đã bật collectEmail)

  // 5. Thời điểm phát hiện
  form.addDateTimeItem()
    .setTitle('Thời điểm phát hiện')
    .setRequired(true);

  // 6. Mức độ
  form.addListItem()
    .setTitle('Mức độ hỏng')
    .setRequired(true)
    .setChoiceValues([
      'Nhẹ — vẫn sử dụng được',
      'Trung bình — hoạt động không ổn định',
      'Nặng — không sử dụng được',
      'Nguy hiểm — có nguy cơ an toàn'
    ]);

  // 7. Mô tả sự cố
  form.addParagraphTextItem()
    .setTitle('Mô tả sự cố')
    .setHelpText('Chi tiết triệu chứng hỏng hóc')
    .setRequired(true);

  // 8. Hoàn cảnh xảy ra
  form.addParagraphTextItem()
    .setTitle('Hoàn cảnh xảy ra')
    .setHelpText('Ví dụ: đang sử dụng bình thường / va đập / ngập nước...')
    .setRequired(false);

  // 9. Ảnh chụp hiện trạng (link)
  form.addTextItem()
    .setTitle('Link ảnh chụp hiện trạng (nếu có)')
    .setHelpText('Khuyến khích chụp ảnh, upload lên Drive rồi paste link')
    .setRequired(false);

  // Link response vào Sheet — tạo sheet mới "Log_Bao_Hong" nếu chưa có
  ensureSheet_(ss, 'Log_Bao_Hong');
  linkFormToSheet_(form, ss, 'Log_Bao_Hong');

  const prefilled = getPrefilledUrl_(form, qrItem);

  Logger.log('  ✓ Form 4 đã tạo: ' + form.getPublishedUrl());

  return {
    name: 'Báo hỏng thiết bị',
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    prefilled: prefilled
  };
}


// ==================== HÀM PHỤ TRỢ ====================

/**
 * Link form response vào sheet cụ thể trong Spreadsheet
 */
function linkFormToSheet_(form, ss, sheetName) {
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Logger.log('  → Linked responses → Sheet "' + sheetName + '"');

  // Lưu ý: FormApp.setDestination tạo sheet mới cho mỗi form.
  // Sau khi chạy script, anh có thể rename các response sheet
  // cho khớp tên (Log_Muon_Tra, Log_Bao_Tri, Log_Bao_Hong) trong Google Sheets UI.
}

/**
 * Đảm bảo sheet tồn tại, tạo mới nếu chưa có
 */
function ensureSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('  → Tạo sheet mới: "' + sheetName + '"');
  }
  return sheet;
}

/**
 * Tạo pre-filled URL với placeholder cho trường Mã QR
 * QR_Landing_Page.html sẽ nối mã QR vào cuối URL này
 */
function getPrefilledUrl_(form, qrItem) {
  // Tạo pre-filled response
  const response = form.createResponse();
  const itemResponse = qrItem.createResponse('HMO-PLACEHOLDER');
  response.withItemResponse(itemResponse);
  const prefilledUrl = response.toPrefilledUrl();

  // Thay placeholder thành rỗng để Landing Page nối mã QR vào cuối
  // URL format: ...viewform?usp=pp_url&entry.XXXXX=HMO-PLACEHOLDER
  // → Đổi thành: ...viewform?usp=pp_url&entry.XXXXX=
  const cleanUrl = prefilledUrl.replace('HMO-PLACEHOLDER', '');

  return cleanUrl;
}

/**
 * Gửi email tổng kết cho admin sau khi tạo xong
 */
function sendSummaryEmail_(form1, form2, form3, form4) {
  const subject = '[KTTV&HDH] ✅ Đã tạo xong 4 Google Forms quản lý thiết bị';
  let body = 'Hệ thống đã tự động tạo 4 Google Forms:\n\n';

  body += '1. ' + form1.name + '\n';
  body += '   Edit: ' + form1.editUrl + '\n';
  body += '   Public: ' + form1.publishedUrl + '\n\n';

  body += '2. ' + form2.name + '\n';
  body += '   Edit: ' + form2.editUrl + '\n';
  body += '   Public: ' + form2.publishedUrl + '\n\n';

  body += '3. ' + form3.name + '\n';
  body += '   Edit: ' + form3.editUrl + '\n';
  body += '   Public: ' + form3.publishedUrl + '\n\n';

  body += '4. ' + form4.name + '\n';
  body += '   Edit: ' + form4.editUrl + '\n';
  body += '   Public: ' + form4.publishedUrl + '\n\n';

  body += '--- PRE-FILLED URLs (paste vào QR_Landing_Page.html) ---\n\n';
  body += 'borrow: ' + form1.prefilled + '\n';
  body += 'return: ' + form2.prefilled + '\n';
  body += 'maintain: ' + form3.prefilled + '\n';
  body += 'report: ' + form4.prefilled + '\n\n';

  body += 'BƯỚC TIẾP THEO:\n';
  body += '1. Mở file QR_Landing_Page.html, tìm phần "const FORMS = {"\n';
  body += '2. Thay 4 URL placeholder bằng pre-filled URLs ở trên\n';
  body += '3. Trong Google Sheet, rename các response sheet cho đúng tên\n';
  body += '4. Test thử: quét QR → điền form → kiểm tra response trong Sheet\n\n';

  body += '— Script tạo tự động bởi Hệ thống DATAI';

  try {
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
    Logger.log('\n📧 Đã gửi email tổng kết đến ' + ADMIN_EMAIL);
  } catch (e) {
    Logger.log('\n⚠️ Không gửi được email (có thể do quyền): ' + e.message);
    Logger.log('   Không sao — tất cả URL đã in ở trên.');
  }
}
