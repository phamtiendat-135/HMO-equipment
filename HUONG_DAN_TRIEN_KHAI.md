# HƯỚNG DẪN TRIỂN KHAI TỪNG BƯỚC
## Hệ thống QR quản lý thiết bị — Khoa KTTV&HDH

---

## Bước 1: Tạo Google Sheet master (30 phút)

1. Mở file `HMO_Master_Equipment_Database.xlsx` trong folder này
2. Upload lên Google Drive → Open with Google Sheets
3. Đổi tên thành: **"[KTTV&HDH] Master Thiết bị"**
4. Copy Sheet ID từ URL (phần giữa `/d/` và `/edit`):
   ```
   https://docs.google.com/spreadsheets/d/[COPY_PHẦN_NÀY]/edit
   ```
5. Kiểm tra 5 sheet đã đúng: Master_Data, Thong_Ke, Log_Muon_Tra, Log_Bao_Tri, Can_Bo_QL
6. Điền tên CB phụ trách vào sheet Can_Bo_QL

---

## Bước 2: Tạo 4 Google Forms (1-2 giờ)

Mở file `Google_Forms_Template.md` và tạo 4 form theo hướng dẫn:

**Form 1 — Mượn thiết bị:**
1. Google Forms → Blank form → đặt tiêu đề
2. Thêm từng trường theo bảng template
3. Settings → Responses → chọn "Select existing spreadsheet" → chọn Sheet master → sheet "Log_Muon_Tra"
4. Lấy pre-filled URL (xem cuối file template)

**Form 2 — Trả thiết bị:** Tương tự, link response vào cùng Sheet

**Form 3 — Bảo trì:** Link response vào sheet "Log_Bao_Tri"

**Form 4 — Báo hỏng:** Tạo sheet mới "Log_Bao_Hong" trong Sheet master, link response vào đó

Sau khi tạo xong 4 form, lưu lại 4 pre-filled URL.

---

## Bước 3: Cập nhật Landing Page (15 phút)

1. Mở file `QR_Landing_Page.html` bằng text editor (VS Code, Notepad++)
2. Tìm phần `const FORMS = {` (khoảng dòng 170)
3. Thay 4 URL placeholder bằng pre-filled URL thực:
   ```javascript
   const FORMS = {
     borrow: 'https://docs.google.com/forms/d/e/YOUR_FORM_1/viewform?...',
     return: 'https://docs.google.com/forms/d/e/YOUR_FORM_2/viewform?...',
     maintain: 'https://docs.google.com/forms/d/e/YOUR_FORM_3/viewform?...',
     report: 'https://docs.google.com/forms/d/e/YOUR_FORM_4/viewform?...'
   };
   ```
4. Host file HTML lên một trong các cách sau:
   - **GitHub Pages** (miễn phí): tạo repo `hmo-equipment`, upload file, bật Pages
   - **Google Sites**: tạo site, embed HTML
   - **Server DATAI** (nếu đã có): upload vào web server

5. Sau khi host xong, lấy URL thực (ví dụ: `https://hmo-equipment.github.io/`)

---

## Bước 4: Cập nhật QR codes với URL thực (15 phút)

1. Mở file `QR_Landing_Page.html` và note lại URL host (ví dụ: `https://hmo-equipment.github.io/`)
2. Hiện tại QR codes trong file `QR_Labels_Print.html` trỏ đến: `https://hmo-equipment.github.io/lookup?id=HMO-XXX-XXXX`
3. Nếu URL host khác, cần tạo lại QR codes — liên hệ tôi để tạo lại
4. Nếu dùng GitHub Pages đúng tên `hmo-equipment` thì QR codes hiện tại đã đúng

---

## Bước 5: In và dán nhãn QR (2-3 giờ)

1. Mở file `QR_Labels_Print.html` trong trình duyệt
2. Ctrl+P → chọn A4 → bỏ Header/Footer → In
3. Cắt theo đường nét đứt
4. Dán theo hướng dẫn:
   - **P204-T3 (OBS/LAB):** 21 thiết bị — dùng nhãn vinyl cho TB quan trắc, ép plastic cho TB đi thực địa
   - **P206-T3 (HPC):** 20 thiết bị — nhãn giấy thường, dán mặt trước rack/chassis
   - **P207-T3:** 9 thiết bị — nhãn giấy thường
   - **P401-T3:** 8 thiết bị — nhãn vinyl cho TB thí nghiệm ẩm ướt
   - **T3 (server FIRST):** 9 thiết bị — nhãn giấy, dán trên rack map

---

## Bước 6: Cài đặt Apps Script (30 phút)

1. Mở Google Sheet master → Extensions → Apps Script
2. Xóa code mặc định
3. Copy toàn bộ nội dung file `Google_Apps_Script.js` vào
4. Sửa dòng `MASTER_SHEET_ID` bằng Sheet ID thực (đã copy ở Bước 1)
5. Kiểm tra email: `ADMIN_EMAIL: 'datpt@hus.edu.vn'` — đã đúng
6. Nhấn Run → chọn hàm `setup` → Run
7. Cấp quyền Gmail khi được hỏi
8. Kiểm tra: trong Sheet sẽ thấy menu mới "🔧 Quản lý TB"

---

## Bước 7: Test thử (30 phút)

1. Mở landing page trên điện thoại
2. Thử tìm kiếm "AWAC" hoặc nhập mã "HMO-OBS-8372"
3. Nhấn "Đăng ký mượn" → kiểm tra form hiện đúng
4. Điền thử form → kiểm tra response ghi vào Sheet
5. Quét thử 2-3 QR code bằng camera điện thoại
6. Trong Sheet, chạy menu "🔧 Quản lý TB" → "Kiểm tra quá hạn trả" → kiểm tra email

---

## Bước 8: Tập huấn và vận hành (tuần 5)

Nội dung tập huấn cho cán bộ Khoa (15-20 phút):
- Demo quét QR bằng điện thoại
- Hướng dẫn điền form mượn/trả
- Giải thích quy trình phê duyệt
- CB phụ trách: hướng dẫn thêm về form bảo trì và báo hỏng

---

## Tổng hợp files trong folder

| File | Mục đích | Hành động |
|------|---------|----------|
| `HMO_Master_Equipment_Database.xlsx` | Database gốc 74 TB, 5 sheet | Upload lên Google Sheets |
| `QR_Labels_Print.html` | 61 nhãn QR in được (A4) | In và dán lên thiết bị |
| `QR_Landing_Page.html` | Trang tra cứu khi quét QR | Host lên web (GitHub Pages / DATAI) |
| `Google_Apps_Script.js` | Script tự động hóa | Paste vào Apps Script trong Sheet |
| `Google_Forms_Template.md` | Cấu trúc 4 Google Forms | Tạo form theo template |
| `QUY_TRINH_QUAN_LY_THIET_BI.md` | Tài liệu quy trình SOP | Tham khảo, in nếu cần |
| `HUONG_DAN_TRIEN_KHAI.md` | File hướng dẫn này | Làm theo từng bước |

---

## Thời gian ước tính

| Bước | Thời gian | Ai làm |
|------|-----------|--------|
| 1. Tạo Google Sheet | 30 phút | Anh Đạt |
| 2. Tạo 4 Forms | 1-2 giờ | Anh Đạt |
| 3. Cập nhật Landing Page | 15 phút | Anh Đạt |
| 4. Cập nhật QR URL | 15 phút | Anh Đạt (hoặc nhờ Claude) |
| 5. In & dán QR | 2-3 giờ | CB phụ trách mảng |
| 6. Cài Apps Script | 30 phút | Anh Đạt |
| 7. Test | 30 phút | Anh Đạt |
| 8. Tập huấn | 30 phút | Anh Đạt |
| **Tổng** | **~1 ngày làm việc** | |
