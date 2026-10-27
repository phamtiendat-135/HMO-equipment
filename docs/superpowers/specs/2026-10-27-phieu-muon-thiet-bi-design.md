# Thiết kế: Phiếu mượn thiết bị tự động (mượn mang đi)

Ngày: 27/10/2026 · Người đề xuất: TS. Phạm Tiến Đạt (PTK) · Trạng thái: **chờ anh Đạt duyệt**

## 1. Mục đích

Mỗi lần **mượn mang đi** được chấp nhận phải có ngay một **phiếu mượn thiết bị** điền sẵn dữ liệu từ Google Form, để cán bộ bàn giao in ra, hai bên ký, làm **chứng từ giấy** khi bàn giao (phục vụ quản lý tài sản, thanh tra). Không ai phải gõ lại gì.

Vì sao cần khi đã có đăng ký trên app: app chỉ ghi nhận bằng dữ liệu. Khi thiết bị rời phòng, Khoa cần một bằng chứng có chữ ký của cán bộ mượn.

## 2. Phạm vi

**Làm:**
- Tự tạo phiếu (Word `.docx` + PDF) cho mọi yêu cầu mượn mang đi hợp lệ, vào đúng thời điểm "đã chấp nhận" (mục 4).
- Email kèm file cho cán bộ quản lý để in, và đính kèm PDF vào email xác nhận gửi người mượn để họ tự in.
- Mẫu phiếu là một Google Doc mà anh sửa được như Word, không cần sửa code.
- Mục menu "Tạo lại phiếu mượn" cho phiếu mất hoặc in sai (chỉ gửi lại cho cán bộ quản lý, vì người mượn đã nhận bản đầu).

**Không làm (non-goals):**
- Sử dụng tại chỗ: không có phiếu.
- Phiếu trả, biên bản kiểm tra nhận lại: giữ nguyên luồng hiện có (cột V, trang kiểm tra).
- Chữ ký điện tử, lưu bản scan phiếu đã ký.
- Thay đổi luồng phê duyệt, form, landing page.
- Chữ ký hoặc ô ký của Phó Trưởng khoa trên phiếu: PTK đã duyệt trong email, phiếu chỉ ghi lại dòng đó.

**Anti-goal (coi là thất bại dù chạy được):**
- Lỗi tạo phiếu làm hỏng hoặc chặn giao dịch mượn. Giao dịch đã ghi vào Log phải luôn hợp lệ.
- Cán bộ nhận được phiếu của yêu cầu chưa được duyệt hoặc đã bị từ chối.

## 3. Phiếu trông thế nào

Bản phác đã được anh chốt (A4 dọc, một trang; file xem thử nằm ở `.superpowers/brainstorm/…/phieu-muon-v2.html`, chỉ có trên máy này, không commit). Bố cục nằm ngay dưới đây.

Bố cục: quốc hiệu và tên Khoa, tiêu đề **PHIẾU MƯỢN THIẾT BỊ**, mã giao dịch làm số phiếu, rồi:
1. **Thiết bị**: tên, mã QR, phụ kiện kèm theo, tình trạng khi giao.
2. **Cán bộ mượn thiết bị**: họ tên, đơn vị/bộ môn, email, mục đích, địa điểm, ngày mượn, hạn trả.
3. **Dòng phê duyệt** (xem mục 4).
4. Câu cam kết bảo quản, dùng đúng mục đích, trả đúng hạn.
5. **Hai ô ký ngang hàng**: trái "Cán bộ mượn thiết bị", phải "Cán bộ bàn giao". Dòng "Hà Nội, ngày … tháng … năm 20…" để trống, dùng chung. Họ tên in sẵn dưới mỗi ô ký.

Không in giá trị thiết bị.

**Khác với bản phác (em tự sửa):** bỏ dòng "Điện thoại". Form mượn chỉ thu email (`setCollectEmail`), không có câu hỏi số điện thoại, và Log cũng không có cột điện thoại. Chỉ in email.

### Dòng phê duyệt (chỗ duy nhất phiếu có hai dạng)
- Thiết bị từ 100 triệu **một chiếc**: "Phó Trưởng khoa đã phê duyệt qua email lúc HH:mm dd/MM/yyyy." (lấy giờ từ lúc PTK bấm duyệt)
- Thiết bị dưới 100 triệu: "Thiết bị dưới 100 triệu đồng, không cần Phó Trưởng khoa phê duyệt."

Ngưỡng tính theo **giá một chiếc** (`unitValue`), giống `recordLoanRequest_`.

## 4. Khi nào tạo và gửi cho ai

| Trường hợp | Tạo phiếu lúc | Ghi chú |
|---|---|---|
| Dưới 100 triệu, hợp lệ | Ngay sau khi `recordLoanRequest_` ghi Log (trong `notifyLoanRequest_`, cạnh `sendAutoAcceptedEmail_`) | tự ghi nhận |
| Từ 100 triệu | Ngay sau khi PTK xác nhận **Duyệt** (trong `applyApprovalDecision_`, nhánh duyệt) | anh nói: "sau khi tôi duyệt có ngay file" |
| Từ 100 triệu, bị từ chối | Không tạo | |
| Tự động từ chối (hỏng, hết số lượng, ngày sai) | Không tạo | |
| Sử dụng tại chỗ | Không tạo | |

**Hai nơi nhận phiếu** (anh chốt: người mượn cũng nhận để tự in):

1. **Cán bộ quản lý:** các email trong cột "Email CB quản lý" của thiết bị (`master.managerEmails`); cột trống thì gửi `CONFIG.ADMIN_EMAIL`. Email riêng, tiêu đề "[KTTV&HDH] 📄 Phiếu mượn thiết bị — <tên> (<mã QR>)", dùng khung email HTML chung (`emailLayout_`…), kèm **cả hai file** PDF (để in) và Word (để sửa).
2. **Người mượn:** đính kèm **PDF** (không đính Word, tránh bị sửa) vào email đang có sẵn, không gửi thêm email mới:
   - thiết bị dưới 100 triệu: `sendAutoAcceptedEmail_` ("✅ Đã ghi nhận mượn");
   - thiết bị từ 100 triệu: email kết quả phê duyệt của `applyApprovalDecision_` ("Đã duyệt").
   Email có thêm một dòng ngắn: "Phiếu mượn đính kèm, thầy/cô in và ký trước khi nhận thiết bị." Không có email người mượn thì bỏ qua phần này.

Cả hai nơi dùng chung **một** lần tạo phiếu, không tạo hai bản. Vì vậy phiếu phải được tạo **trước** khi các email này gửi đi (thứ tự: tạo phiếu → gửi email cho người mượn → gửi email cho cán bộ quản lý). Nếu tạo phiếu lỗi thì email cũ vẫn đi như trước, chỉ thiếu file đính kèm, và anh nhận email báo lỗi (mục 5).

Đính kèm file thay vì gửi link Drive để ai nhận cũng mở được, không cần chia sẻ quyền.

## 5. Cách làm (đã chọn: Hướng A)

### Các hướng đã cân nhắc
- **A. Mẫu Google Docs, điền chỗ trống, xuất PDF + Word. (anh đã chọn)** Sửa mẫu không cần code; đúng "mẫu Word" anh muốn; cùng hệ Google Workspace. Đổi lại cần quyền Drive và Docs.
- **B. Dựng PDF từ HTML trong code.** Không cần quyền mới, nhưng không có file Word để sửa, hay lệch font tiếng Việt và khung bảng. Không đáp ứng yêu cầu.
- **C. Điền trực tiếp vào XML của .docx.** Loại: dễ hỏng khi Word tách chỗ trống thành nhiều đoạn, khó bảo trì.

### Thành phần
1. **Mẫu Google Doc.** Hàm `createLoanSlipTemplate()` (chạy tay một lần từ menu) dựng mẫu theo bản phác, các chỗ cần điền là dấu `{{...}}`, lưu ID vào Script Properties. Sau đó anh sửa chữ, logo, căn lề ngay trong Google Docs, miễn giữ nguyên các dấu `{{...}}`.
2. **Dấu điền:** `{{SO_PHIEU}}` (mã giao dịch), `{{TEN_THIET_BI}}`, `{{MA_QR}}`, `{{PHU_KIEN}}`, `{{TINH_TRANG}}`, `{{NGUOI_MUON}}`, `{{DON_VI}}`, `{{EMAIL}}`, `{{MUC_DICH}}`, `{{DIA_DIEM}}`, `{{NGAY_MUON}}`, `{{HAN_TRA}}`, `{{DONG_PHE_DUYET}}`, `{{CAN_BO_BAN_GIAO}}`. Ô trống trong form thì in "—".
3. **Tạo phiếu** (`createLoanSlip_`): sao chép mẫu vào thư mục Drive "Phiếu mượn thiết bị" (tự tạo ở lần đầu, ID lưu Script Properties), điền dấu, đặt tên `PhieuMuon_<MãGD>_<MãQR>`, xuất PDF và `.docx`, trả về cả hai file để đính kèm email.
4. **Ghi vết:** thêm cột **W "Phiếu mượn"** vào `Log_Muon_Tra` (`LOG_SCHEMA_VERSION` 4, header tự thêm ở lần ghi đầu giống cột V), lưu link Google Doc. Dùng để (a) không tạo trùng khi cùng giao dịch bị gọi hai lần, (b) menu tạo lại tìm được phiếu cũ.
5. **Menu "📄 Tạo lại phiếu mượn (dòng đang chọn)":** anh chọn một dòng trong `Log_Muon_Tra`, bấm menu; chỉ chạy được với dòng đủ điều kiện ở mục 4. Tạo file mới, thay link ở cột W, gửi lại email cho đúng người nhận. Dùng `toast` thay vì `alert` (đã gặp: `alert` trông như treo).

### Quyền
Script cần thêm quyền Drive, Docs, và gọi dịch vụ ngoài để xuất `.docx`. **Không sửa `appsscript.json`**: Apps Script tự phát hiện quyền từ code, và khối `webapp` phải giữ nguyên. Sau khi `clasp push`, anh mở Sheet và chạy một hàm bất kỳ có dùng Drive (menu "Tạo mẫu phiếu mượn" chính là hàm đó) rồi bấm **Cho phép** một lần.

### Chống rủi ro
- **Tạo phiếu nằm trong khối bắt lỗi riêng**, không làm hỏng giao dịch. Lỗi thì ghi Logger và gửi email báo cho `ADMIN_EMAIL` kèm Mã giao dịch và lệnh tạo lại. Giao dịch vẫn hợp lệ, email phê duyệt và thông báo cũ vẫn đi.
- **Tính năng "ngủ" cho tới khi có mẫu** (quyết định thêm lúc lập kế hoạch): chỉ khi anh chạy menu "Tạo mẫu phiếu mượn" (lưu `LOAN_SLIP_TEMPLATE_ID`) thì phiếu mới được tạo; chưa có mẫu thì mọi luồng chạy y như trước, không email thêm, không lỗi. Lý do: trigger chạy theo code HEAD ngay sau `clasp push`, trước khi anh kịp bấm "Cho phép" quyền Drive/Docs. Thứ tự deploy: chạy test → `clasp push` → mở Sheet, menu "Tạo mẫu phiếu mượn", bấm "Cho phép" → `create-version` → `update-deployment` (luôn `update-deployment`, không `create-deployment`). Dù đã có mẫu, lỗi tạo phiếu vẫn chỉ làm mất phiếu, không mất giao dịch.
- **Giá trị người dùng đưa vào mẫu** (tên, mục đích…) có thể chứa `$` hoặc ký tự đặc biệt, mà `replaceText` dùng regex và diễn giải `$1`. Phải thoát ký tự trước khi thay; có test.

## 6. Kiểm thử và tài liệu

- Thêm test vào `tests/backend_regression.cjs` (chạy `node tests/backend_regression.cjs` trước mỗi lần deploy). Cần kiểm: thiết bị dưới 100 triệu ra phiếu ngay; từ 100 triệu chỉ ra sau khi duyệt, đúng một lần; từ chối, tự động từ chối, tại chỗ thì không ra; ngưỡng tính theo giá một chiếc; thoát ký tự `$`; ô trống ra "—"; lỗi tạo phiếu không làm hỏng giao dịch và email xác nhận vẫn gửi (không đính kèm); người nhận đúng (CB quản lý, trống thì PTK); người mượn nhận PDF (không nhận Word), không có email người mượn thì không lỗi; chỉ tạo phiếu một lần cho cả hai nơi nhận.
- Cập nhật sau khi xong: `CLAUDE.md` (bảng hàm, ghi chú cột W, mẫu phiếu), `HUONG_DAN_TRIEN_KHAI.md` (quyền, mẫu phiếu, menu), `QUY_TRINH_QUAN_LY_THIET_BI.md` (SOP: bước in và ký phiếu khi bàn giao), và tài liệu `QUY_TRINH_SU_DUNG_THIET_BI` nếu anh muốn đưa vào văn bản ban hành.
- Chưa xác minh được trong môi trường này: việc tạo Google Doc thật, quyền Drive, email thật. Các việc đó chỉ kiểm được sau khi deploy (một lần mượn thử thật).

## 7. Quyết định của em (anh xem và sửa)

1. Bỏ dòng điện thoại khỏi phiếu (form không thu).
2. Đính kèm file vào email thay vì gửi link Drive: cán bộ quản lý nhận PDF + Word, người mượn chỉ nhận PDF.
3. Cán bộ quản lý nhận phiếu (trống thì PTK); người mượn cũng nhận (anh chốt), qua email xác nhận đã có sẵn.
4. Thêm cột W "Phiếu mượn" (Log v4) để chống tạo trùng và phục vụ tạo lại.
5. Tạo lại phiếu bằng cách chọn dòng trong Log rồi bấm menu.
6. Họ tên in sẵn dưới hai ô ký (anh có thể bỏ để trống cho viết tay).
7. Không in giá trị thiết bị.
8. Tính năng ngủ tới khi có mẫu phiếu (mục 5, Chống rủi ro).
9. "Tạo lại phiếu" chỉ gửi cho cán bộ quản lý, không gửi lại người mượn.

## 8. Để người xây dựng quyết

- Cách xuất `.docx` (gọi URL xuất của Google Docs với token, hay dịch vụ Drive nâng cao).
- Chi tiết thoát ký tự cho `replaceText`.
- Định dạng ngày trong mẫu (dd/MM/yyyy cho ngày; dòng phê duyệt có kèm giờ).
- Tên thư mục Drive và cách xử lý khi mẫu bị xóa hoặc mất dấu `{{...}}`.
