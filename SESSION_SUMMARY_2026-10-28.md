# Session summary 28/10/2026

## Phiên sáng: tiếp tục deploy phiếu mượn

**Đã làm:** `git pull` (đã mới nhất, HEAD `f797449`). Máy `Pham-Tien-Dat` có clasp và đã login. `node tests/backend_regression.cjs` → **125/125 pass**. `clasp pull` vào scratchpad: code đang chạy trên Google **giống hệt** `Google_Apps_Script.js` ở commit trước tính năng phiếu (`61a2e82~1`), chỉ khác BOM, nên push không ghi đè sửa tay nào.

**Chưa làm:** `clasp push -f` bị chặn bởi bộ kiểm tra quyền (deploy production), chờ anh Đạt xác nhận. CHƯA push, CHƯA create-version, CHƯA update-deployment, CHƯA chạy menu Tạo mẫu phiếu mượn.

**File thay đổi:** chỉ file này. Không sửa code.

## Phiên tối: đã deploy v19

- Anh Đạt xác nhận "deploy đi". `clasp push -f` (21:26) → `clasp pull` đối chiếu: code trên Google khớp repo, có `createLoanSlipTemplate`. `clasp create-version` → **version 19**. `clasp update-deployment AKfycbwfXP… -V 19` → `clasp list-deployments` xác nhận `@19`.
- Chưa gọi thử được API live: môi trường của Claude không phân giải được `script.google.com`.
- **Còn lại (anh Đạt tự làm):** mở Sheet, menu "📄 Tạo mẫu phiếu mượn", bấm "Cho phép" quyền Drive/Docs; xem bố cục Doc mẫu; mượn thử 1 TB dưới 100 tr và 1 TB từ 100 tr; in thử PDF. Xong thì báo để cập nhật flyer A4, cảnh 8 kịch bản motion graphic, `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf`.
- Quay về bản cũ nếu cần: `clasp update-deployment <id> -V 18`.
- **File thay đổi:** `CLAUDE.md` (ghi đã deploy v19), file này.
- (21:30) Anh Đạt đã chạy menu "Tạo mẫu phiếu mượn". Claude xác minh qua Google Drive: Doc "MẪU — Phiếu mượn thiết bị (HMO)" (id `1AvYsENudNIv3IQZc-SlZ59nX-tg4kIUqv95TL9nRHo0`, tạo 21:28) có đủ 14 dấu `{{...}}`, 2 ô ký. Còn lại: mượn thử 2 TB + in thử PDF.

## Phiên tối (tiếp): bắt đầu thiết kế khai báo Đào tạo / NCKH (D6) — CHƯA viết code, CHƯA có tài liệu thiết kế

- Anh Đạt chọn **làm thật** (không ẩn nút): cuối năm phải khai báo hiệu quả sử dụng thiết bị.
- Đã chốt: **gắn vào form mượn mang đi + form tại chỗ có sẵn** (thêm "Phục vụ: Đào tạo / NCKH / Khác" + mã học phần / mã đề tài), KHÔNG làm 2 form riêng, để cán bộ chỉ khai 1 lần. Đào tạo thường là dùng tại chỗ (máng sóng); NCKH nhiều hơn.
- Báo cáo cuối năm cần: mã thiết bị, học phần / đề tài có tham gia, số giờ sử dụng.
- **Câu hỏi đang chờ anh Đạt trả lời:** giờ đào tạo tính theo (A) buổi thực tế: mỗi buổi khai số giờ + số SV, cộng dồn; hay (B) khung chương trình: giờ tín chỉ của học phần × số SV, cần danh mục học phần, khai 1 lần/học kỳ? NCKH: giả định tính giờ thực tế từ lượt mượn/tại chỗ, chờ xác nhận.
- Hiện trạng đã đọc: mục Đào tạo/NCKH ở `index.html:1703-1747` là khai báo tách rời (ô mã, form giả `FORM_ID_DAOTAO`/`FORM_ID_NCKH`); Apps Script không có nhánh xử lý (`FORM_SIGNATURES` chỉ 5 form); `generateAnnualUsageReport` tính lần + giờ theo thiết bị, chưa tách theo mục đích.
- Lượt mượn thử phiếu mượn (2 TB) và in thử PDF: anh Đạt chưa báo kết quả.
- Test: không chạy thêm. Commit + push: CLAUDE.md và file này.
