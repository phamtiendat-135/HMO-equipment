# Thiết kế: Khai báo Đào tạo / NCKH khi mượn và dùng thiết bị

Ngày: 01/11/2026 · Người đề xuất: TS. Phạm Tiến Đạt (PTK) · Trạng thái: **chờ anh Đạt duyệt**
Liên quan: mục D6 trong `REVIEW_TAI_LIEU_2026-10-19.md`; ghi chú phiên 28/10 và 01/11.

## 1. Mục đích

Cuối năm Khoa phải khai báo hiệu quả sử dụng thiết bị theo form báo cáo. Form đó đòi:

- **Đào tạo:** với mỗi thiết bị, các học phần có dùng, kèm **hai loại giờ**:
  1. **Giờ tín chỉ thực hành theo đề cương** (ví dụ 5 giờ). Cố định theo học phần, KHÔNG cộng dồn theo buổi.
  2. **Giờ chạy máy thực tế** (ví dụ 2 nhóm × 8 giờ = 16). Cộng dồn từ từng buổi dùng.
  Các giờ thực hành phải có **minh chứng**: danh mục các bài thực tập, thí nghiệm.
- **NCKH:** chỉ tính theo **đề tài** (đề tài nào đã dùng thiết bị này). KHÔNG tính giờ.

Hiện hệ thống không trả lời được các câu này: hai ô "Đào tạo", "Nghiên cứu khoa học" trên trang tra cứu (`index.html:1703-1747`) là chỗ giữ chỗ, không nối đi đâu; báo cáo năm chỉ có số lần và giờ theo thiết bị, không tách theo mục đích.

## 2. Phạm vi

**Làm:**
- Thêm câu hỏi "Phục vụ hoạt động" (Đào tạo / NCKH / Khác) vào **form Mượn mang đi** và **form Sử dụng tại chỗ** đang chạy. Cán bộ chỉ khai một lần, cùng lúc với việc mượn hoặc dùng.
- Ghi 3 thông tin mới vào `Log_Muon_Tra` (Log cấu trúc v5).
- Sheet `Danh_Muc_Hoc_Phan` chứa giờ tín chỉ thực hành theo đề cương, anh nạp sau khi có chương trình đào tạo.
- Báo cáo năm mới cho Đào tạo và NCKH (mục 5).
- Bỏ hai ô giữ chỗ trên trang tra cứu.

**Không làm (non-goals):**
- Hai form riêng cho Đào tạo / NCKH (anh đã loại ngày 28/10 để cán bộ khai một lần).
- Đếm số sinh viên, số nhóm. Form báo cáo anh gửi không đòi; mỗi nhóm là một lần khai riêng.
- Nạp chương trình đào tạo ngay bây giờ (anh sẽ gửi file sau; khi đó là một việc riêng).
- Điền ngược dữ liệu cho các lượt mượn đã có trước ngày triển khai.
- Đổi luồng phê duyệt, phiếu mượn, kiểm tra nhận lại, email.

**Anti-goal (coi là thất bại dù chạy được):**
- Câu hỏi mới làm hỏng hoặc chặn việc mượn / dùng thiết bị. Thiếu mã học phần hay mã đề tài thì **vẫn ghi nhận lượt dùng** và gắn cờ trong báo cáo, KHÔNG tự động từ chối.
- Báo cáo tính cả yêu cầu bị từ chối hoặc đang chờ duyệt.
- Cộng dồn giờ tín chỉ theo số buổi (5 giờ × 10 buổi = 50 là SAI).
- Báo cáo âm thầm bỏ qua học phần chưa có trong danh mục, làm số liệu trông đủ mà thiếu.

## 3. Quy tắc nghiệp vụ (anh đã chốt)

1. Giờ chạy máy = tổng giờ của các lượt **hợp lệ** (đã duyệt, đã trả, chờ kiểm tra, có sự cố; bỏ chờ duyệt và bị từ chối) cùng thiết bị và cùng học phần, trong năm. Giờ của một lượt tính ĐÚNG như báo cáo năm hiện có (`generateAnnualUsageReport`): phần thời gian của lượt nằm trong năm báo cáo (lượt tại chỗ = số giờ khai báo; mượn mang đi = từ lúc mượn đến lúc trả, hoặc đến hiện tại nếu chưa trả), nên hai báo cáo không bao giờ lệch nhau.
2. Giờ tín chỉ thực hành = tra từ `Danh_Muc_Hoc_Phan` theo mã học phần. Một học phần dùng **nhiều thiết bị** thì **mỗi thiết bị đều ghi đủ** giờ tín chỉ của học phần, không chia.
3. Một mã học phần có **nhiều mức** giờ trong danh mục (khác khóa, khác ngành) thì lấy **mức cao nhất**.
4. NCKH: báo cáo liệt kê mỗi thiết bị đã phục vụ những đề tài nào, số lượt theo từng đề tài, và tổng số đề tài khác nhau.
5. Mã học phần: **một mã mỗi lần khai** (để giờ chạy máy không bị chia mơ hồ). Mã đề tài: cho phép **nhiều mã cách nhau bằng dấu phẩy** (vì NCKH không tính giờ, không có gì để chia). *(Em tự quyết, anh sửa nếu khác.)*

## 4. Cách làm (đã chọn: Hướng A — thêm cột vào Log)

### Các hướng đã cân nhắc
- **A. Thêm 3 cột vào `Log_Muon_Tra`. (anh chọn)** Báo cáo lấy giờ, trạng thái, việc bị từ chối từ chính Log nên không phải ghép hai nơi. Đổi lại phải nâng Log lên v5 (đã làm ba lần: v2, v3, v4; cột mới nằm sau cột W nên không đổi vị trí cột cũ).
- **B. Sheet riêng `Log_Muc_Dich` nối bằng Mã giao dịch.** Log giữ nguyên nên rủi ro cho luồng mượn thấp hơn, nhưng báo cáo phải ghép hai sheet và dễ lệch ở yêu cầu bị từ chối, trả muộn; cán bộ khó kiểm tra tay.

### Thành phần

**4.1 Form (sửa form đang chạy, không tạo lại).** Thêm vào cuối cả hai form, theo thứ tự:
- Câu bắt buộc **"Phục vụ hoạt động"**: Đào tạo / NCKH / Khác.
- Rẽ nhánh theo câu trả lời:
  - *Đào tạo* → trang có **"Mã học phần"** (bắt buộc) và **"Tên bài thực tập / thí nghiệm"** (bắt buộc).
  - *NCKH* → trang có **"Mã đề tài"** (bắt buộc; nhiều mã cách nhau dấu phẩy).
  - *Khác* → gửi luôn.
- Form mượn mang đi hiện có câu "Thuộc đề tài / dự án (nếu có)" mà code chưa đọc. Giữ nguyên câu cũ (không xóa dữ liệu), nhưng báo cáo chỉ dùng câu mới. Cần chọn tên câu mới để KHÔNG chứa chữ khiến `namedValueFinder_` đọc nhầm (đặc biệt "mục đích", "mã qr", "họ và tên") và KHÔNG làm `classifyFormEvent_` nhận nhầm loại form (chứa "ngày mượn", "số giờ sử dụng", "người sử dụng"...).
- Việc sửa form chạy bằng một hàm chạy tay một lần (`addPurposeQuestions`, trong `Create_Google_Forms.js`), mở form qua `Sheet.getFormUrl()` của các tab Form Responses (landing page chỉ giữ ID công khai, không đủ để sửa form). Thêm câu hỏi **không đổi** các `entry.…` đang dùng để điền sẵn mã QR.

**4.2 Ghi vào Log (v5).** `LOG_COL` thêm `SERVICE: 23` ("Phục vụ"), `SERVICE_REF: 24` ("Mã học phần / đề tài"), `EXERCISE: 25` ("Tên bài thực tập"); `LOG_WIDTH` = 26; `LOG_SCHEMA_VERSION` = '5', header tự thêm ở lần ghi đầu như cột V, W. `readBorrowRequest_` và `readOnsiteRequest_` đọc 3 câu mới, `recordLoanRequest_` ghi qua `asText_` (chống chèn công thức). Mã học phần chuẩn hóa: bỏ khoảng trắng thừa, viết hoa. Dòng cũ để trống = "Chưa phân loại".

**4.3 `Danh_Muc_Hoc_Phan`.** Sheet mới, cột theo đúng những gì chương trình đào tạo (CTĐT) có: *Mã học phần | Tên học phần | Số tín chỉ | Giờ lý thuyết | Giờ thực hành | Ghi chú (khóa / ngành)*. Báo cáo chỉ dùng cột **Giờ thực hành**; các cột còn lại để đối chiếu và để nạp thẳng từ CTĐT không phải bỏ cột. Menu tạo sheet với tiêu đề và định dạng, rỗng cho tới khi anh nạp. Cùng mã xuất hiện nhiều dòng → lấy giờ thực hành lớn nhất. Ô giờ thực hành để trống hoặc không phải số → coi là "chưa có" (không tính là 0).

**4.4 Báo cáo.** Mở rộng `generateAnnualUsageReport` (chạy cùng lúc, cùng chu kỳ 1/1 qua `monthlyReport`) tạo thêm hai sheet:
- **`Bao_Cao_Dao_Tao_YYYY`**, mỗi dòng là một cặp (thiết bị, học phần): *Mã QR | Tên thiết bị | Mã học phần | Tên học phần | Giờ tín chỉ thực hành | Giờ chạy máy | Số buổi | Danh mục bài thực tập (ngăn cách bằng ;)*. Học phần chưa có trong danh mục: ô giờ tín chỉ ghi **"Chưa có trong danh mục"** (tô màu), không để trống hay 0. Phần cuối: liệt kê lượt Đào tạo **thiếu mã học phần**.
- **`Bao_Cao_NCKH_YYYY`**, mỗi dòng là một cặp (thiết bị, đề tài): *Mã QR | Tên thiết bị | Mã đề tài | Số lượt*; hàng tổng cuối mỗi thiết bị: số đề tài khác nhau. Lượt NCKH thiếu mã đề tài liệt kê riêng.
- Chỉ lấy lượt có giao với năm báo cáo, theo ngày bắt đầu (cùng quy tắc của báo cáo năm hiện có). Hai sheet cũ (`Bao_Cao_Nam_YYYY`, báo cáo tháng) giữ nguyên.

**4.5 Trang tra cứu.** Xóa hai ô "Đào tạo" / "Nghiên cứu khoa học" và `FORMS.training`, `FORMS.research` (placeholder `FORM_ID_DAOTAO`, `FORM_ID_NCKH`), `submitInput`; áp dụng cho **cả** `index.html` và `QR_Landing_Page.html`; bump `sw.js` cache.

### Chống rủi ro
- Nâng Log v5 chạy trong vùng khóa của lần ghi đầu, giống v2–v4; cột mới ở cuối nên các hàm đọc theo chỉ số cũ không bị ảnh hưởng.
- Sửa form là bước thủ công một lần, có thể chạy lại không nhân đôi câu hỏi (kiểm tra tiêu đề đã có thì bỏ qua).
- Đổi tên câu hỏi trên Form sau này phải cập nhật `FORM_SIGNATURES` (đã là rủi ro chấp nhận từ trước, ghi lại trong tài liệu).
- Thứ tự deploy: chạy test → `clasp push` → chạy `addPurposeQuestions` trên form → kiểm tra gửi thử từng form → `create-version` → `update-deployment`. Trigger chạy theo code HEAD ngay sau push, nên code đọc cột mới phải chịu được form CHƯA có câu mới (đọc rỗng, không lỗi).

## 5. Kiểm thử và tài liệu

- Thêm vào `tests/backend_regression.cjs` (chạy trước mỗi lần deploy): đọc đúng 3 câu mới từ cả hai form; form chưa có câu mới vẫn ghi bình thường; thiếu mã học phần vẫn ghi lượt, không từ chối; Log v4 → v5 giữ nguyên dữ liệu; chuẩn hóa mã học phần; giờ chạy máy chỉ cộng lượt hợp lệ (loại chờ duyệt, bị từ chối); giờ tín chỉ KHÔNG cộng dồn theo buổi; học phần dùng 2 thiết bị → mỗi thiết bị đủ giờ; trùng mã nhiều mức → lấy cao nhất; học phần chưa có trong danh mục → "Chưa có trong danh mục"; NCKH nhiều mã đề tài tách đúng; tên câu hỏi mới không làm `classifyFormEvent_` nhận nhầm loại và không bị `namedValueFinder_` đọc nhầm.
- Frontend: kiểm hai ô cũ đã biến mất ở cả hai file và hai file vẫn giống hệt nhau (`tests/frontend_regression.cjs`; máy này đang thiếu `jsdom`).
- Cập nhật sau khi xong: `CLAUDE.md`, `HUONG_DAN_TRIEN_KHAI.md` (form, sheet danh mục, menu, báo cáo), `QUY_TRINH_QUAN_LY_THIET_BI.md` (cán bộ khai mục đích khi mượn / dùng), và `QUY_TRINH_SU_DUNG_THIET_BI` nếu anh muốn đưa vào văn bản ban hành.
- Chưa xác minh được trong môi trường này: sửa form thật, rẽ nhánh trên Google Forms, báo cáo trên Sheet thật. Chỉ kiểm được sau khi triển khai (mượn thử, dùng tại chỗ thử, chạy báo cáo).

## 6. Quyết định của em (anh xem và sửa)

1. Thiếu mã học phần / mã đề tài thì vẫn ghi lượt dùng, chỉ gắn cờ trong báo cáo.
2. Một mã học phần mỗi lần khai; nhiều mã đề tài cho phép.
3. Tên bài thực tập bắt buộc khi chọn Đào tạo (để có minh chứng).
4. Giữ câu "Thuộc đề tài / dự án (nếu có)" cũ trên form mượn, báo cáo chỉ dùng câu mới.
5. Đào tạo bằng **mượn mang đi** (đi thực địa): giờ chạy máy tính theo thời gian mượn đến trả, cùng cách với báo cáo năm hiện có (không đọc cột Q nên sửa tay cột Q không đổi báo cáo).
6. Hai sheet báo cáo mới, không đụng báo cáo năm và báo cáo tháng đang chạy.
7. Xóa hai ô giữ chỗ trên trang tra cứu thay vì giữ.

## 7. Còn mở

- ~~Giờ thực hành lấy từ đâu~~ → **đã chốt (01/11):** CTĐT có sẵn số tín chỉ và phân chia giờ lý thuyết / thực hành, báo cáo dùng giờ thực hành đó (mục 4.3). Việc nạp CTĐT là một việc riêng sau này, khi anh gửi file.
- Để người xây dựng quyết: tên chính xác của các câu hỏi mới; cách đặt rẽ nhánh trên Google Forms (trang kết thúc bằng gửi); định dạng hai sheet báo cáo.
