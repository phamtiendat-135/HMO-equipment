# Khai báo Đào tạo / NCKH — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cán bộ khai "Phục vụ hoạt động" (Đào tạo / NCKH / Khác) ngay trên form mượn mang đi và form tại chỗ; cuối năm hệ thống xuất báo cáo Đào tạo (giờ tín chỉ + giờ chạy máy + bài thực tập) và NCKH (đề tài) theo thiết bị.

**Architecture:** Thêm 3 cột (X–Z) vào `Log_Muon_Tra` (Log v5), đọc 3 câu hỏi mới ở `readBorrowRequest_` / `readOnsiteRequest_`, ghi qua `recordLoanRequest_`. Báo cáo là các hàm thuần (`collectPurposeUsage_` → `buildTrainingReport_` / `buildResearchReport_`) dùng lại cách tính giờ của báo cáo năm (`loanOverlapHours_`), rồi một hàm ghi hai sheet. Form đang chạy được sửa bằng một hàm chạy tay một lần trong `Create_Google_Forms.js`.

**Tech Stack:** Google Apps Script (một file `Google_Apps_Script.js`, đẩy bằng clasp), Google Forms/Sheets, HTML/JS thuần, test Node (`tests/backend_regression.cjs`, `tests/frontend_regression.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-01-dao-tao-nckh-design.md` (đã duyệt 01/11/2026)

## Global Constraints

- Tên 4 câu hỏi mới, đúng chữ: `Phục vụ hoạt động` (Đào tạo / NCKH / Khác), `Mã học phần`, `Tên bài thực tập / thí nghiệm`, `Mã đề tài (NCKH)`.
- Tên câu hỏi mới KHÔNG được làm `classifyFormEvent_` nhận nhầm loại form và KHÔNG được bị `namedValueFinder_` đọc nhầm vào các trường cũ (tránh chữ "mục đích", "mã qr", "họ và tên", "số giờ", "ngày mượn", "người sử dụng"…).
- Log v5: `LOG_COL.SERVICE = 23` ("Phục vụ"), `SERVICE_REF = 24` ("Mã học phần / đề tài"), `EXERCISE = 25` ("Tên bài thực tập"); `LOG_WIDTH = 26`; `LOG_SCHEMA_VERSION = '5'`. Không đổi vị trí cột cũ.
- Sheet danh mục: `Danh_Muc_Hoc_Phan`, cột `Mã học phần | Tên học phần | Số tín chỉ | Giờ lý thuyết | Giờ thực hành | Ghi chú (khóa / ngành)`. Báo cáo chỉ dùng "Giờ thực hành"; trùng mã → lấy **lớn nhất**; ô trống / không phải số = "chưa có", KHÔNG tính 0.
- Sheet báo cáo mới: `Bao_Cao_Dao_Tao_YYYY`, `Bao_Cao_NCKH_YYYY`; không đụng `Bao_Cao_Nam_YYYY` và báo cáo tháng.
- Giờ chạy máy = giờ lượt nằm trong năm, cùng cách tính với báo cáo năm hiện có; chỉ lượt hợp lệ (loại `LOAN_STATUS.PENDING`, `LOAN_STATUS.REJECTED`). Giờ tín chỉ KHÔNG cộng dồn theo buổi; học phần dùng nhiều thiết bị → mỗi thiết bị đủ giờ.
- Một mã học phần mỗi lần khai; mã đề tài cho phép nhiều mã cách nhau bằng `,` hoặc `;`.
- Thiếu mã học phần / mã đề tài → VẪN ghi lượt, KHÔNG tự từ chối; báo cáo liệt kê riêng. Học phần chưa có trong danh mục → ô giờ tín chỉ ghi `Chưa có trong danh mục`.
- Không sửa `appsscript.json`, `.claspignore`; không `create-deployment` (chỉ `update-deployment`); mã mới nằm trong `Google_Apps_Script.js`.
- `index.html` và `QR_Landing_Page.html` phải giống hệt nhau sau khi sửa.

## Review Focus

1. Mã học phần gõ lẫn khoảng trắng / chữ thường (`mhh 3101`) phải ra đúng `MHH3101` và gộp với `MHH3101` gõ chuẩn. → Task 2, Task 4.
2. Hai nhóm cùng học phần khai hai lần (8 giờ + 8 giờ) phải ra 16 giờ chạy máy, còn giờ tín chỉ vẫn đúng 5 (không thành 10). → Task 4.
3. Lượt vắt qua năm (mượn 30/12, trả 03/01) chỉ tính phần trong năm báo cáo; lượt chưa trả tính tới hiện tại. → Task 4.
4. Dòng Log cũ (cột X–Z trống) và form chưa được thêm câu mới: không lỗi, không xuất hiện trong hai báo cáo, nhưng cũng không làm hỏng luồng mượn. → Task 1, Task 2.
5. Mã đề tài `QG.25.01, qg.25.01` trong cùng một lượt phải đếm là MỘT đề tài; thiết bị đã bị xóa khỏi Master_Data vẫn hiện (tên = mã QR) thay vì làm hàm ném lỗi. → Task 4, Task 5.

---

### Task 1: Log v5 (3 cột mới)

**Files:**
- Modify: `Google_Apps_Script.js:224-240` (`LOG_COL`, `LOG_WIDTH`, `LOG_NEW_HEADERS`, `LOG_SCHEMA_VERSION`); `ensureLogSchema_` (~377) không cần sửa logic vì dùng `LOG_NEW_HEADERS`.
- Test: `tests/backend_regression.cjs` (cạnh test "Phiếu: sheet còn cấu trúc v3 (22 cột)…" ~dòng 1688, dùng làm mẫu).

**Interfaces:**
- Produces: `LOG_COL.SERVICE`, `LOG_COL.SERVICE_REF`, `LOG_COL.EXERCISE` (số 23/24/25), `LOG_WIDTH === 26`. Các task sau đọc/ghi cột bằng tên này.

- [ ] **Step 1: Viết test (RED)**
  - `Log v5: sheet cấu trúc v4 (23 cột) → tự nâng, thêm header X–Z, dữ liệu cũ nguyên vẹn`: dựng harness với 1 dòng Log 23 cột và `props.LOG_SCHEMA_VERSION = '4'`, gọi một lần ghi (`onFormSubmitBorrow` với `borrowFields`), khẳng định `h.log.rows[0][23..25]` lần lượt là `'Phục vụ'`, `'Mã học phần / đề tài'`, `'Tên bài thực tập'`, dòng cũ giữ nguyên giá trị các cột 0–22, `h.props.LOG_SCHEMA_VERSION === '5'`.
  - `Log v5: LOG_WIDTH = 26 và SERVICE/SERVICE_REF/EXERCISE = 23/24/25`.
- [ ] **Step 2: Chạy `node tests/backend_regression.cjs`** — 2 test mới FAIL.
- [ ] **Step 3: Sửa hằng số** như Global Constraints; thêm 3 mục vào `LOG_NEW_HEADERS`. Cập nhật comment đầu `LOG_COL` ("X–Z từ 01/11/2026").
- [ ] **Step 4: Chạy lại toàn bộ test**; sửa các test cũ phụ thuộc độ rộng 23 cột nếu có (ví dụ test v3 ~1688 chỉ nên kiểm các cột nó quan tâm). Kỳ vọng: tất cả PASS.
- [ ] **Step 5: Commit** `feat: Log v5 them 3 cot phuc vu hoat dong`.

---

### Task 2: Đọc và ghi 3 câu trả lời mới

**Files:**
- Modify: `Google_Apps_Script.js` — `readBorrowRequest_` (~1267), `readOnsiteRequest_` (~1303), `recordLoanRequest_` (~1328, đoạn dựng `row`); thêm hàm mới ngay trên `readBorrowRequest_`.
- Test: `tests/backend_regression.cjs`.

**Interfaces:**
- Consumes: `LOG_COL.SERVICE/SERVICE_REF/EXERCISE` (Task 1), `namedValueFinder_`, `asText_`.
- Produces:
  - `const SERVICE_TYPE = { TRAINING: 'Đào tạo', RESEARCH: 'NCKH', OTHER: 'Khác' }`
  - `normalizeCourseCode_(text: string): string` — viết hoa, bỏ MỌI khoảng trắng.
  - `readServiceFields_(find: Function): { service: string, serviceRef: string, exercise: string }` — `service` ∈ `SERVICE_TYPE` hoặc `''` nếu không có câu trả lời; `serviceRef` = mã học phần đã chuẩn hóa (Đào tạo) / mã đề tài giữ nguyên chữ đã nhập, đã `trim` (NCKH) / `''` (Khác); `exercise` chỉ có khi Đào tạo.
  - `req.service`, `req.serviceRef`, `req.exercise` trên đối tượng trả về của hai hàm `read*Request_`.

- [ ] **Step 1: Viết test (RED)**
  - `Dịch vụ: tại chỗ Đào tạo "mhh 3101" → cột X = 'Đào tạo', Y = 'MHH3101', Z = tên bài` (qua `onFormSubmitDispatch(formEvent(onsiteFields…))`).
  - `Dịch vụ: mượn mang đi NCKH "QG.25.01, NAFOSTED-101" → X = 'NCKH', Y = 'QG.25.01, NAFOSTED-101', Z = ''`.
  - `Dịch vụ: chọn Khác → X = 'Khác', Y = Z = ''`.
  - `Dịch vụ: Đào tạo nhưng thiếu mã học phần → vẫn ghi lượt, KHÔNG từ chối` (cột M không bắt đầu bằng `AUTO_REJECT_PREFIX`, cột I có giờ kết thúc cho tại chỗ).
  - `Dịch vụ: form cũ chưa có câu mới → X–Z rỗng, không lỗi`.
  - `Dịch vụ: bộ câu hỏi mới không đổi kết quả đọc các trường cũ`: `readBorrowRequest_` và `readOnsiteRequest_` trên bộ trường có và không có 4 câu mới → `deepEqual` mọi trường ngoài `service/serviceRef/exercise`.
  - `Dịch vụ: bộ câu hỏi mới không làm classifyFormEvent_ nhận nhầm`: bộ trường borrow + 4 câu → `'borrow'`; onsite + 4 câu → `'onsite'`.
  - `Dịch vụ: giá trị bắt đầu bằng "=" được ghi dạng chữ (asText_)` cho cột Z.
- [ ] **Step 2: Chạy test** — FAIL.
- [ ] **Step 3: Cài đặt** `readServiceFields_` (dùng `find(['phục vụ hoạt động'])`, `find(['mã học phần'])`, `find(['tên bài thực tập'])`, `find(['mã đề tài'])`; nhận chữ "Đào tạo"/"NCKH" không phân biệt hoa thường/dấu qua `normalizeText_`), gắn vào hai hàm đọc, ghi ba ô trong `recordLoanRequest_` bằng `asText_`. Không đụng `validateLoanRequest_`.
- [ ] **Step 4: Chạy toàn bộ test** — PASS.
- [ ] **Step 5: Commit** `feat: doc va ghi phuc vu hoat dong tu form muon va tai cho`.

---

### Task 3: Sheet `Danh_Muc_Hoc_Phan`

**Files:**
- Modify: `Google_Apps_Script.js` — `CONFIG.SHEETS` (~21), hàm mới cạnh các hàm sheet khác, `onOpen` (~4199, thêm mục menu).
- Test: `tests/backend_regression.cjs`.

**Interfaces:**
- Consumes: `normalizeCourseCode_` (Task 2).
- Produces:
  - `CONFIG.SHEETS.COURSES = 'Danh_Muc_Hoc_Phan'`; `COURSE_CATALOG_HEADERS: string[]` (6 cột theo Global Constraints).
  - `ensureCourseCatalogSheet(): Sheet` (menu "📚 Tạo sheet Danh mục học phần"): tạo sheet + header định dạng nếu chưa có; đã có thì KHÔNG đụng dữ liệu, chỉ trả sheet; dùng `toast`, không `alert`.
  - `readCourseCatalog_(ss: Spreadsheet): Object<string, { name: string, practiceHours: number|null }>` — khóa = `normalizeCourseCode_(mã)`; nhiều dòng cùng mã → `practiceHours` lớn nhất trong các ô là số (chấp nhận `7,5`); không ô nào là số → `null`; thiếu sheet → `{}`.

- [ ] **Step 1: Viết test (RED)**
  - `Danh mục HP: ensureCourseCatalogSheet tạo sheet đủ 6 header; chạy lần 2 không xóa dữ liệu đã nhập`.
  - `Danh mục HP: cùng mã nhiều mức (3 và 5, "mhh 3101") → lấy 5`.
  - `Danh mục HP: giờ thực hành trống hoặc chữ → null, KHÔNG phải 0`.
  - `Danh mục HP: thiếu sheet → {}`.
- [ ] **Step 2: Chạy test** — FAIL.
- [ ] **Step 3: Cài đặt** hai hàm + mục menu `📚 Tạo sheet Danh mục học phần`.
- [ ] **Step 4: Chạy toàn bộ test** — PASS.
- [ ] **Step 5: Commit** `feat: sheet Danh_Muc_Hoc_Phan va ham doc danh muc`.

---

### Task 4: Tổng hợp dữ liệu báo cáo (hàm thuần)

**Files:**
- Modify: `Google_Apps_Script.js` — rút phần tính giờ trong vòng lặp `generateAnnualUsageReport` (~2638-2659) thành `loanOverlapHours_` và gọi lại ở đó; thêm các hàm mới ngay dưới `generateAnnualUsageReport`.
- Test: `tests/backend_regression.cjs`.

**Interfaces:**
- Consumes: `LOG_COL`, `loanStatus_`, `LOAN_STATUS`, `parseDate_`, `SERVICE_TYPE`, `normalizeCourseCode_`.
- Produces:
  - `loanOverlapHours_(row: any[], periodStart: Date, periodEnd: Date): number` — giờ của lượt nằm trong kỳ (0 nếu không giao hoặc không đọc được ngày bắt đầu); cùng công thức hiện có (start = ô Date giữ nguyên giờ hoặc `parseDate_`; end = ngày trả hoặc hiện tại). `generateAnnualUsageReport` phải cho kết quả y hệt trước đó.
  - `collectPurposeUsage_(logData: any[][], periodStart: Date, periodEnd: Date): Array<{ qr: string, service: string, ref: string, exercise: string, hours: number }>` — bỏ dòng tiêu đề, dòng không QR, lượt `PENDING`/`REJECTED`, lượt giờ = 0, và lượt có `service` không phải Đào tạo / NCKH.
  - `buildTrainingReport_(usages, catalog, masterMap): { rows: Array<{ qr, equipName, code, courseName, creditHours: number|null, machineHours: number, sessions: number, exercises: string[] }>, missingCode: Array<{ qr, equipName, sessions, hours }> }` — nhóm theo (qr, code), sắp theo qr rồi code, `machineHours` làm tròn 0,1, `exercises` duy nhất theo thứ tự xuất hiện; `equipName = masterMap[qr]?.name || qr`.
  - `buildResearchReport_(usages, masterMap): { rows: Array<{ qr, equipName, project, sessions }>, projectCountByQr: Object<string, number>, missingProject: Array<{ qr, equipName, sessions }> }` — tách mã bằng `,`/`;`, so sánh viết hoa, loại trùng trong cùng một lượt, hiển thị bản viết hoa.

- [ ] **Step 1: Viết test (RED)** (giá trị lấy từ spec §3):
  - `Tổng hợp: loanOverlapHours_ khớp báo cáo năm — lượt vắt qua năm chỉ tính phần trong năm; chưa trả tính tới kỳ` (30/12→03/01 của năm 2025 ra 48 giờ phần 2025).
  - `Tổng hợp: loại lượt chờ duyệt và bị từ chối`.
  - `Tổng hợp: Khác và dòng cũ (cột X rỗng) không vào báo cáo`.
  - `Đào tạo: hai nhóm 8 giờ + 8 giờ cùng học phần → giờ chạy máy 16, 2 buổi`.
  - `Đào tạo: giờ tín chỉ 5 qua 10 buổi vẫn là 5 (không cộng dồn)`.
  - `Đào tạo: học phần dùng 2 thiết bị → mỗi thiết bị đủ giờ tín chỉ`.
  - `Đào tạo: "mhh 3101" và "MHH3101" gộp một dòng`.
  - `Đào tạo: học phần không có trong danh mục → creditHours null`.
  - `Đào tạo: lượt thiếu mã học phần vào missingCode, không vào rows`.
  - `Đào tạo: bài thực tập duy nhất, giữ thứ tự`.
  - `NCKH: "QG.25.01, qg.25.01" đếm một đề tài; projectCountByQr đúng`.
  - `NCKH: nhiều mã trong một lượt → mỗi đề tài +1 lượt; thiếu mã → missingProject`.
  - `Tổng hợp: thiết bị không có trong masterMap → equipName = mã QR, không ném lỗi`.
- [ ] **Step 2: Chạy test** — FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces; chạy lại cả test báo cáo năm cũ (`annual(...)`) để chắc phần refactor không đổi số.
- [ ] **Step 4: Chạy toàn bộ test** — PASS.
- [ ] **Step 5: Commit** `feat: tong hop du lieu bao cao Dao tao va NCKH`.

---

### Task 5: Ghi hai sheet báo cáo + nối vào báo cáo năm

**Files:**
- Modify: `Google_Apps_Script.js` — hàm mới; `generateAnnualUsageReport` (~2589, gọi sau khối email, trước `alert`); `onOpen` (thêm mục menu).
- Test: `tests/backend_regression.cjs` (mở rộng mock `Sheet` nếu báo cáo dùng thêm hàm Range mà mock chưa có).

**Interfaces:**
- Consumes: Task 3, Task 4; `masterMap` hiện có trong `generateAnnualUsageReport` (`{ [qr]: { name, … } }`).
- Produces:
  - `writePurposeReports_(ss, year: number, periodStart: Date, periodEnd: Date, masterMap): void` — tạo/ghi đè `Bao_Cao_Dao_Tao_${year}` và `Bao_Cao_NCKH_${year}`. Bố cục: dòng 1 = tiêu đề, dòng 2 = header, dữ liệu từ dòng 3. Đào tạo: `Mã QR | Tên thiết bị | Mã học phần | Tên học phần | Giờ tín chỉ thực hành | Giờ chạy máy | Số buổi | Danh mục bài thực tập` (bài nối bằng `; `); `creditHours === null` → ô ghi `Chưa có trong danh mục` và tô màu cảnh báo. NCKH: `Mã QR | Tên thiết bị | Mã đề tài | Số lượt`, sau các dòng của mỗi thiết bị thêm một dòng đậm `…| Tổng số đề tài khác nhau | <số>`. Cuối mỗi sheet, cách một dòng trống, liệt kê các lượt thiếu mã (`missingCode` / `missingProject`).
  - `generatePurposeReports(year?: number): void` — hàm menu "📚 Tạo báo cáo Đào tạo / NCKH năm nay" (mặc định năm hiện tại, cùng cách tính kỳ với báo cáo năm), không gửi email.

- [ ] **Step 1: Viết test (RED)**
  - `Báo cáo Đào tạo: sheet có dòng [QR, tên, 'MHH3101', tên HP, 5, 16, 2, 'Bài 1; Bài 2']` (dựng Log 2 lượt tại chỗ 8 giờ + `Danh_Muc_Hoc_Phan` có giờ thực hành 5, gọi `generatePurposeReports(2026)` với lượt nằm trong 2026 và `Date` cố định nếu cần).
  - `Báo cáo Đào tạo: học phần chưa có trong danh mục → ô ghi "Chưa có trong danh mục"`; `lượt thiếu mã học phần` nằm ở phần cuối.
  - `Báo cáo NCKH: dòng đề tài + dòng "Tổng số đề tài khác nhau"; lượt thiếu mã đề tài ở phần cuối`.
  - `Báo cáo năm: generateAnnualUsageReport(năm) cũng tạo hai sheet mới và KHÔNG đổi sheet Bao_Cao_Nam_YYYY`.
  - `Báo cáo: chạy lại cùng năm ghi đè, không nhân đôi dòng`.
  - `Báo cáo: thiết bị đã xóa khỏi Master_Data vẫn có dòng (tên = mã QR)`.
- [ ] **Step 2: Chạy test** — FAIL.
- [ ] **Step 3: Cài đặt** `writePurposeReports_` + `generatePurposeReports` + mục menu; gọi `writePurposeReports_` ở cuối `generateAnnualUsageReport` (lỗi để lan ra: báo cáo chính và email đã xong trước đó).
- [ ] **Step 4: Chạy toàn bộ test** — PASS.
- [ ] **Step 5: Commit** `feat: bao cao Dao tao va NCKH hang nam`.

---

### Task 6: Thêm câu hỏi vào form đang chạy (`addPurposeQuestions`)

**Files:**
- Modify: `Create_Google_Forms.js` (thêm cuối mục "HÀM CHÍNH", cạnh `createOnsiteFormOnly`, ~dòng 211).
- Test: `tests/backend_regression.cjs` (kiểm tĩnh hợp đồng tên câu hỏi; phần Forms thật không chạy được trong VM).

**Interfaces:**
- Consumes: tên 4 câu hỏi trong Global Constraints.
- Produces:
  - `const PURPOSE_QUESTIONS = { SERVICE: 'Phục vụ hoạt động', COURSE: 'Mã học phần', EXERCISE: 'Tên bài thực tập / thí nghiệm', PROJECT: 'Mã đề tài (NCKH)' }`.
  - `addPurposeQuestions(): void` — chạy tay MỘT lần: duyệt `ss.getSheets()`, lấy form qua `sheet.getFormUrl()` (bỏ qua sheet không có form), nhận diện form mượn (có câu `Ngày dự kiến trả`) và form tại chỗ (có câu `Số giờ sử dụng (dự kiến)`), bỏ qua form khác; form đã có câu `PURPOSE_QUESTIONS.SERVICE` thì bỏ qua (chạy lại an toàn). Thêm vào cuối form: câu trắc nghiệm bắt buộc `SERVICE` rẽ nhánh — Đào tạo → trang chứa `COURSE` (bắt buộc) + `EXERCISE` (bắt buộc), kết thúc bằng gửi form; NCKH → trang chứa `PROJECT` (bắt buộc), kết thúc bằng gửi form; Khác → gửi luôn (`FormApp.PageNavigationType.SUBMIT`). Log ra tên form đã sửa/đã bỏ qua và link sửa. KHÔNG xóa câu "Thuộc đề tài / dự án (nếu có)" của form mượn, KHÔNG đổi các câu hiện có.

- [ ] **Step 1: Viết test (RED)** — `Hợp đồng form: Create_Google_Forms.js khai báo PURPOSE_QUESTIONS với đúng 4 tên` (đọc file bằng `fs`, regex lấy giá trị, so với 4 chuỗi) và `Hợp đồng form: các tên đó khớp với tên Task 2 đọc` (đưa đúng 4 tên vào `readServiceFields_` ra đủ 3 trường).
- [ ] **Step 2: Chạy test** — FAIL.
- [ ] **Step 3: Cài đặt** `PURPOSE_QUESTIONS` + `addPurposeQuestions`; kiểm cú pháp bằng `node --check Create_Google_Forms.js`.
- [ ] **Step 4: Chạy toàn bộ test** — PASS.
- [ ] **Step 5: Commit** `feat: ham them cau hoi phuc vu hoat dong vao form dang chay`.

> **Không kiểm thử được ở đây:** rẽ nhánh và sửa form thật. Đưa vào checklist Task 8.

---

### Task 7: Bỏ hai ô giữ chỗ trên trang tra cứu

**Files:**
- Modify: `index.html` và `QR_Landing_Page.html` (giống hệt nhau): khối `<div class="input-sections">` (~1703-1746), `FORMS.training` / `FORMS.research` (~1275-1276, sửa dấu phẩy cuối `onsite`), hàm `submitInput` và `toggleSection` (~1352-1380), CSS `.input-section*`, `.submit-btn`, `.clear-btn`, `.success-msg`, `.input-sections` (~96-117) — **grep từng class/hàm trước khi xóa**, chỉ xóa phần không còn dùng ở nơi khác. `sw.js:7` đổi `v13` → `v14`.
- Test: `tests/frontend_regression.cjs` (thay test "Đào tạo/NCKH chưa có form…", ~dòng 205).

**Interfaces:**
- Consumes: không. Produces: trang không còn `#sec-train`, `#sec-research`, `submitInput`; vẫn giống `QR_Landing_Page.html`.

- [ ] **Step 1: Cài jsdom ngoài repo để chạy được test frontend**: `npm install jsdom --prefix <scratchpad>/jsdom` rồi `node tests/frontend_regression.cjs <scratchpad>/jsdom/node_modules/jsdom`; ghi nhận số test PASS hiện có làm mốc.
- [ ] **Step 2: Viết test (RED)** — `Trang tra cứu: không còn ô Đào tạo/NCKH giữ chỗ`: `getElementById('sec-train')` và `'sec-research'` đều `null`, `typeof w.submitInput === 'undefined'`, nguồn HTML không chứa `FORM_ID_DAOTAO` / `FORM_ID_NCKH`. Xóa test cũ dùng `sec-train`.
- [ ] **Step 3: Chạy test** — FAIL.
- [ ] **Step 4: Sửa `index.html`**, sao chép sang `QR_Landing_Page.html`, kiểm `diff index.html QR_Landing_Page.html` rỗng; bump `sw.js`.
- [ ] **Step 5: Chạy `frontend_regression` (với jsdom ở trên) và `backend_regression`** — PASS, số test frontend = mốc − 1 + 1.
- [ ] **Step 6: Commit** `feat: bo hai o Dao tao/NCKH giu cho tren trang tra cuu`.

---

### Task 8: Tài liệu, triển khai, kiểm tra thật

**Files:**
- Modify: `CLAUDE.md` (bảng hàm + mục Changes Log 01/11), `HUONG_DAN_TRIEN_KHAI.md` (4 câu hỏi mới, Log v5, `Danh_Muc_Hoc_Phan`, 3 mục menu, 2 báo cáo, `addPurposeQuestions`), `QUY_TRINH_QUAN_LY_THIET_BI.md` (cán bộ khai phục vụ hoạt động khi mượn / dùng; đào tạo phải ghi mã học phần + tên bài), `SESSION_SUMMARY_2026-11-01.md`.

- [ ] **Step 1: Cập nhật 4 tài liệu trên** (chỉ ghi điều đã làm; những gì chưa kiểm với Google thật phải ghi rõ "chưa xác minh").
- [ ] **Step 2: Chạy cả hai bộ test** — PASS; `node --check Google_Apps_Script.js` và `node --check Create_Google_Forms.js`.
- [ ] **Step 3: Commit + push GitHub** `docs: huong dan va quy trinh Dao tao/NCKH`.
- [ ] **Step 4: Triển khai (theo thứ tự, anh Đạt xác nhận trước khi bắt đầu):** `clasp push -f` → anh dán `Create_Google_Forms.js` mới vào dự án chứa nó và chạy `addPurposeQuestions` → gửi thử 1 form tại chỗ chọn Đào tạo + 1 form mượn chọn NCKH + 1 form chọn Khác, kiểm tra cột X–Z trong `Log_Muon_Tra` → chạy menu "Tạo sheet Danh mục học phần" → chạy menu "Tạo báo cáo Đào tạo / NCKH năm nay" và xem hai sheet → `clasp create-version` → `clasp update-deployment AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q -V <n>` → `clasp list-deployments` xác nhận → push GitHub Pages (landing page) và xác minh live.
- [ ] **Step 5: Cập nhật `SESSION_SUMMARY` ghi rõ mục nào đã xác minh trên Google thật, mục nào chưa.**
