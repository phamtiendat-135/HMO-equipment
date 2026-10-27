# CHECKLIST DEPLOY — Phiếu mượn thiết bị (làm sau `git pull`)

Code đã push (commit `61a2e82`), **chưa deploy**. Tính năng "ngủ" cho tới bước 4, nên deploy dở dang không làm hỏng luồng mượn hiện tại.

## Trước khi bắt đầu
- [ ] `git pull` rồi `git log --oneline -4` thấy commit `feat: phieu muon thiet bi…`.
- [ ] Máy này có `clasp` và đã `clasp login` (`clasp --version`). Chưa có: `npm i -g @google/clasp` → `clasp login`. Hoặc bỏ qua clasp: dán nội dung `Google_Apps_Script.js` vào Apps Script thủ công rồi làm bước 4–7.
- [ ] Thư mục có `.clasp.json`, `.claspignore`, `appsscript.json` (đừng sửa/xóa).

## Các bước
1. `node tests/backend_regression.cjs` → phải **125/125 pass**.
2. `clasp push -f`
3. `clasp pull` vào thư mục tạm, hoặc mở script.google.com xem code mới đã lên (có hàm `createLoanSlipTemplate`).
4. Mở **Google Sheet master** → tải lại trang → menu **🔧 Quản lý TB → 📄 Tạo mẫu phiếu mượn (chạy 1 lần)** → Google hỏi quyền → **Cho phép** (Drive, Docs). Xong sẽ có Google Doc mẫu (link hiện ở thông báo góc dưới; cũng thấy trong Drive).
5. Mở Doc mẫu, xem bố cục (bảng, 2 ô ký), chỉnh chữ/logo/căn lề nếu muốn. **Giữ nguyên các dấu `{{...}}`.**
6. `clasp create-version "phiếu mượn thiết bị"` → ghi lại **số version N** vừa in ra.
7. `clasp update-deployment AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q -V N` (**không** dùng `create-deployment`). Kiểm tra: `clasp list-deployments` hiện `@N`.

## Mượn thử (bắt buộc)
- [ ] **Thiết bị dưới 100 triệu** (VD thiết bị 1 chiếc rẻ, `Email CB quản lý` điền email của anh): gửi form mượn mang đi → người mượn nhận email "Đã ghi nhận mượn" **kèm PDF**; email "📄 Phiếu mượn thiết bị" tới CB quản lý kèm **PDF + Word**; cột **W** của `Log_Muon_Tra` có link.
- [ ] **Thiết bị từ 100 triệu**: gửi form → chưa có phiếu; bấm ✅ Phê duyệt trong email → có phiếu như trên, phiếu ghi "Phó Trưởng khoa đã phê duyệt qua email lúc …".
- [ ] **In thử PDF**: đủ 1 trang A4, 2 ô ký (trái: Cán bộ mượn thiết bị, phải: Cán bộ bàn giao), tên in sẵn dưới ô ký, tiếng Việt không lỗi font.
- [ ] Thử một ô có ký tự lạ (VD mục đích có `$1` hoặc `C:\x`) → phiếu in nguyên văn.

## Nếu có sự cố
- Không có file đính kèm / không có phiếu: PTK nhận email **"⚠️ Không tạo được phiếu mượn <mã>"** kèm nguyên nhân. Sửa xong → chọn dòng giao dịch trong `Log_Muon_Tra` → menu **📄 Tạo lại phiếu mượn (dòng đang chọn)**.
- Mẫu bị xóa nhầm: xóa `LOAN_SLIP_TEMPLATE_ID` trong Apps Script → Project Settings → Script Properties, rồi chạy lại menu Tạo mẫu.
- Quay về bản cũ: `clasp update-deployment <id> -V <số version trước đó>` (xem `clasp list-deployments`; theo `CLAUDE.md` bản trước là v18). Tính năng phiếu tự dừng vì cột W thừa không ảnh hưởng gì.

## Sau khi deploy xong
Báo Claude "đã deploy" để cập nhật flyer A4 (`FLYER_HUONG_DAN_SU_DUNG_A4.html` + PDF, bước 6), cảnh 8 của `KICH_BAN_MOTION_GRAPHIC_HMO_Eq.md`, `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf`; và ghi vào `CLAUDE.md` rằng đã deploy version N.

Chi tiết thiết kế: `docs/superpowers/specs/2026-10-27-phieu-muon-thiet-bi-design.md` · Vận hành: `HUONG_DAN_TRIEN_KHAI.md` mục 7 và 9.
