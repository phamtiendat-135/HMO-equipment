# Phiếu mượn thiết bị tự động — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi lần mượn mang đi được chấp nhận tự sinh phiếu mượn (PDF + Word) điền sẵn từ form, gửi cho người mượn (PDF) và cán bộ quản lý (PDF + Word) để in và ký.

**Architecture:** Thêm một mục "Phiếu mượn" vào `Google_Apps_Script.js`: mẫu là một Google Doc có dấu `{{...}}`, `issueLoanSlip_` sao chép mẫu, điền dấu, xuất PDF/Word và ghi link vào cột W của `Log_Muon_Tra`. Hai điểm gọi: `notifyLoanRequest_` (dưới 100 triệu) và `applyApprovalDecision_` (từ 100 triệu, sau khi PTK duyệt). Tính năng **ngủ** cho tới khi có `LOAN_SLIP_TEMPLATE_ID` trong Script Properties.

**Tech Stack:** Google Apps Script (V8), DocumentApp, DriveApp, UrlFetchApp, MailApp; test bằng `node tests/backend_regression.cjs` (VM với dịch vụ Google giả).

**Spec:** `docs/superpowers/specs/2026-10-27-phieu-muon-thiet-bi-design.md`

## Global Constraints

- Chỉ sửa `Google_Apps_Script.js`, `tests/backend_regression.cjs` và tài liệu. **Không** sửa `appsscript.json`, `.claspignore`, `index.html`, `QR_Landing_Page.html`. **Không** tách file `.gs` mới (`.claspignore` chỉ cho `Google_Apps_Script.js` lên Google và bộ test chỉ nạp file này).
- Không deploy, không `clasp push`, không commit, không push cho tới khi anh Đạt yêu cầu.
- Ngưỡng duyệt theo **giá một chiếc** (`master.unitValue`) so với `CONFIG.APPROVAL_THRESHOLD` (100 triệu).
- Có phiếu: mượn mang đi hợp lệ, dưới ngưỡng (ngay) hoặc từ ngưỡng sau khi PTK duyệt. Không có phiếu: sử dụng tại chỗ, bị từ chối (tay hoặc tự động), chờ duyệt.
- Người nhận: người mượn nhận **PDF** (đính vào email xác nhận có sẵn, không gửi email mới); cán bộ quản lý (`master.managerEmails`, trống thì `CONFIG.ADMIN_EMAIL`) nhận email riêng kèm **PDF + Word**.
- Lỗi tạo phiếu **không bao giờ** làm hỏng giao dịch hay chặn email xác nhận: bắt lỗi, ghi Logger, gửi email báo `CONFIG.ADMIN_EMAIL`.
- Tên file: `PhieuMuon_<Mã giao dịch>_<Mã QR>`. Ô trống trong form in "—". Không in giá trị thiết bị, không in số điện thoại.
- Email gửi người mượn xưng "thầy/cô". Dùng `toast` (không `alert`) cho thao tác menu.
- Theo mã nguồn hiện có: comment tiếng Việt, hàm nội bộ đặt tên kết thúc bằng `_`, dùng `escapeHtml_` cho HTML, khung email dùng `emailLayout_`/`emailBlock_`/`emailP_`…
- Mọi test hiện có (94) phải vẫn pass; chạy `node tests/backend_regression.cjs` từ thư mục gốc repo.

## Review Focus

1. Dữ liệu người dùng có `$1`, `\`, hoặc chuỗi `{{MA_QR}}` (tên, mục đích): phiếu in đúng nguyên văn, không lỗi, không bị thay lồng. → Task 3.
2. Người mượn không có email: không lỗi, cán bộ quản lý vẫn nhận phiếu. → Task 5.
3. Drive/Docs lỗi (hết quota, mẫu bị xóa): giao dịch, email xác nhận và email phê duyệt vẫn đi, chỉ thiếu file đính kèm, PTK nhận email báo lỗi. → Task 4, 5, 6.
4. Thiết bị không có cán bộ quản lý (20 thiết bị chưa có người): phiếu nhận qua PTK, tên cán bộ ở ô ký để trống, không in "undefined". → Task 3, 4.
5. Bấm duyệt hai lần / mở lại link: chỉ một phiếu, một lần gửi. → Task 6.

---

### Task 1: Cột W "Phiếu mượn" và cấu trúc Log v4

**Files:**
- Modify: `Google_Apps_Script.js` (khối `LOG_COL`, `LOG_WIDTH`, `LOG_NEW_HEADERS`, `LOG_SCHEMA_VERSION`, comment đầu khối)
- Test: `tests/backend_regression.cjs` (test "P1-07 nâng cấu trúc…" hiện có)

**Interfaces:**
- Produces: `LOG_COL.SLIP = 22` (cột W), `LOG_WIDTH = 23`, `LOG_SCHEMA_VERSION = '4'`, header cột W là `Phiếu mượn`.

- [ ] **Step 1: Sửa test hiện có cho đúng cấu trúc mới**

Trong test `P1-07 nâng cấu trúc…`: đổi tên "header S–W", `h.log.rows[0].slice(18, 23)` bằng `['Mã giao dịch', 'Nguồn phản hồi mượn', 'Nguồn phản hồi trả', 'Kiểm tra nhận lại', 'Phiếu mượn']`, và `h.props.LOG_SCHEMA_VERSION` bằng `'4'`.

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `node tests/backend_regression.cjs`
Expected: đúng test trên FAIL (slice thiếu `Phiếu mượn`, version `'3'`), 93 test còn lại PASS.

- [ ] **Step 3: Thêm `SLIP: 22` vào `LOG_COL`**, đổi `LOG_WIDTH = LOG_COL.SLIP + 1`, thêm `[LOG_COL.SLIP, 'Phiếu mượn']` vào `LOG_NEW_HEADERS`, `LOG_SCHEMA_VERSION = '4'`; cập nhật comment ("W từ 27/10/2026").

- [ ] **Step 4: Chạy lại toàn bộ test**

Run: `node tests/backend_regression.cjs`
Expected: `94/94 pass`.

---

### Task 2: Hàm thuần của phiếu (dấu điền, dòng phê duyệt, thoát ký tự)

**Files:**
- Modify: `Google_Apps_Script.js` (mục mới `// ==================== PHIẾU MƯỢN THIẾT BỊ ====================` đặt ngay sau `applyApprovalDecision_`, trước `// ==================== API ĐỌC CHO LANDING PAGE`)
- Test: `tests/backend_regression.cjs`

**Interfaces:**
- Produces:
  - `const SLIP_TAGS = ['SO_PHIEU','TEN_THIET_BI','MA_QR','PHU_KIEN','TINH_TRANG','NGUOI_MUON','DON_VI','EMAIL','MUC_DICH','DIA_DIEM','NGAY_MUON','HAN_TRA','DONG_PHE_DUYET','CAN_BO_BAN_GIAO']`
  - kiểu `SlipData`: `{ loanId, qrCode, equipName, accessories, condition, borrower, unit, email, purpose, location, borrowDate: Date, dueDate: Date, managerName, managerEmails: string[], needsApproval: boolean, approvedAt: Date|null }`
  - `slipApprovalLine_(needsApproval: boolean, approvedAt: Date|null): string`
  - `slipValues_(d: SlipData): Object` — map `tag → chuỗi` đủ cả 14 tag
  - `escapeSlipReplacement_(text: string): string` — thoát `\` và `$` cho đối số thay thế của `Body.replaceText`
  - `slipAttachmentName_(d: SlipData): string` — `PhieuMuon_<loanId>_<qrCode>`

- [ ] **Step 1: Viết test (thất bại)** — `slipApprovalLine_`, `slipValues_`, `escapeSlipReplacement_` qua `harness().ctx`:

```js
test('Phiếu: dòng phê duyệt có 3 dạng', () => {
  const f = harness().ctx.slipApprovalLine_;
  assert.equal(f(false, null), 'Thiết bị dưới 100 triệu đồng, không cần Phó Trưởng khoa phê duyệt.');
  assert.equal(f(true, new Date(2026, 9, 27, 8, 15)), 'Phó Trưởng khoa đã phê duyệt qua email lúc 08:15 27/10/2026.');
  assert.equal(f(true, null), 'Phó Trưởng khoa đã phê duyệt qua email.');
});
test('Phiếu: slipValues_ đủ 14 dấu, ô trống in "—", không in undefined, ngày dd/MM/yyyy', () => {
  const h = harness();
  const v = h.ctx.slipValues_(slipData({ accessories: '', condition: '', managerName: '' }));
  assert.deepEqual(Object.keys(v).sort(), [...h.ctx.SLIP_TAGS].sort());
  assert.equal(v.PHU_KIEN, '—'); assert.equal(v.TINH_TRANG, '—');
  assert.equal(v.CAN_BO_BAN_GIAO, '');           // ô ký để trống, không "—"
  assert.equal(v.NGAY_MUON, '28/10/2026'); assert.equal(v.HAN_TRA, '02/11/2026');
  assert.ok(!Object.values(v).some(x => /undefined|null/.test(x)));
});
test('Phiếu: escapeSlipReplacement_ thoát \\ và $', () => {
  assert.equal(harness().ctx.escapeSlipReplacement_('a$1\\b'), 'a\\$1\\\\b');
});
```

`slipData(over)` là helper trong file test: `SlipData` mẫu (loanId `L261027-A3F9C1`, qr `QR`, borrower `Nguyễn Văn A`, borrowDate `2026-10-28`, dueDate `2026-11-02`, managerName `Trần Thị B`, managerEmails `['b@example.invalid']`, `needsApproval:false`) cộng `over`. Dùng `fakeFormatDate` đã có để `formatDateVN_` chạy được.

- [ ] **Step 2: Chạy test, thấy FAIL** (`slipApprovalLine_ is not a function`).

- [ ] **Step 3: Implement bốn hàm trên** theo chữ ký ở Interfaces. Ngày dùng `formatDateVN_` (`dd/MM/yyyy`; giờ phê duyệt `HH:mm dd/MM/yyyy`). Chuỗi trống dùng hằng `SLIP_EMPTY = '—'` (riêng `CAN_BO_BAN_GIAO` giữ `''`).

- [ ] **Step 4: Chạy test, thấy PASS** — `node tests/backend_regression.cjs` toàn bộ pass.

---

### Task 3: Tạo phiếu trên Drive (`createLoanSlip_`)

**Files:**
- Modify: `Google_Apps_Script.js` (cùng mục "PHIẾU MƯỢN THIẾT BỊ")
- Test: `tests/backend_regression.cjs` (thêm `opts.globals` cho `harness()` và helper `slipGlobals(state)`)

**Interfaces:**
- Consumes: `SLIP_TAGS`, `slipValues_`, `escapeSlipReplacement_`, `slipAttachmentName_` (Task 2).
- Produces:
  - `const PROP_SLIP_TEMPLATE = 'LOAN_SLIP_TEMPLATE_ID'`, `const PROP_SLIP_FOLDER = 'LOAN_SLIP_FOLDER_ID'`, `const SLIP_FOLDER_NAME = 'Phiếu mượn thiết bị'`
  - `loanSlipEnabled_(): boolean` — có `PROP_SLIP_TEMPLATE`
  - `createLoanSlip_(d: SlipData): { docUrl: string, pdf: Blob, docx: Blob }` — ném lỗi nếu Drive/Docs lỗi (người gọi bắt)

- [ ] **Step 1: Mở rộng harness và viết test (thất bại)**

`harness()` nhận `opts.globals` và gộp vào đối tượng đưa cho `vm.createContext` (`...opts.globals`). `slipGlobals(state)` trả `{ DriveApp, DocumentApp, UrlFetchApp, ScriptApp }` giả, ghi vào `state`: `copies[]` (id, tên, thư mục), `replacements[copyId]` (tag → chuỗi sau khi áp dụng ngữ nghĩa thay thế Java: `\x` → `x`, `$` không thoát thì **ném lỗi**), `fetches[]` (URL xuất `.docx`, header `Authorization: Bearer …`), `state.copyFails`/`state.fetchFails` để giả lỗi; `getAs('application/pdf')` và `getBlob()` trả blob có `getName/setName`. Mẫu `TPL` mặc định có `replaceText` ghi lại theo `\{\{TAG\}\}`.

```js
test('Phiếu: sao chép mẫu, điền đủ 14 dấu, xuất PDF và Word', () => {
  const st = {}; const h = harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' }, globals: slipGlobals(st) });
  const out = h.ctx.createLoanSlip_(slipData());
  assert.equal(st.copies.length, 1);
  assert.equal(st.copies[0].name, 'PhieuMuon_L261027-A3F9C1_' + QR);
  assert.deepEqual(Object.keys(st.replacements[st.copies[0].id]).sort(), [...h.ctx.SLIP_TAGS].sort());
  assert.match(out.pdf.getName(), /\.pdf$/); assert.match(out.docx.getName(), /\.docx$/);
  assert.match(out.docUrl, /^https:\/\/docs\.google\.com\/document\/d\//);
  assert.match(st.fetches[0].url, /\/export\?format=docx$/);
});
test('Phiếu: $1, \\ và {{MA_QR}} trong dữ liệu được in nguyên văn', () => {
  const st = {}; const h = harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' }, globals: slipGlobals(st) });
  const purpose = 'Giảm $1 và C:\\tmp {{MA_QR}}';
  h.ctx.createLoanSlip_(slipData({ purpose }));
  assert.equal(st.replacements[st.copies[0].id].MUC_DICH, purpose);
});
test('Phiếu: thư mục "Phiếu mượn thiết bị" tạo một lần rồi dùng lại', () => {
  const st = {}; const h = harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' }, globals: slipGlobals(st) });
  h.ctx.createLoanSlip_(slipData()); h.ctx.createLoanSlip_(slipData({ loanId: 'L261027-B' }));
  assert.equal(st.foldersCreated, 1);
  assert.ok(h.props.LOAN_SLIP_FOLDER_ID);
});
test('Phiếu: loanSlipEnabled_ chỉ bật khi đã có mẫu', () => {
  assert.equal(harness().ctx.loanSlipEnabled_(), false);
  assert.equal(harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' } }).ctx.loanSlipEnabled_(), true);
});
```

- [ ] **Step 2: Chạy test, thấy FAIL** (`createLoanSlip_ is not a function`).

- [ ] **Step 3: Implement `loanSlipEnabled_` và `createLoanSlip_`.** Các bước: lấy mẫu từ Script Properties (thiếu thì ném lỗi); thư mục lấy theo `PROP_SLIP_FOLDER`, chưa có thì tạo `SLIP_FOLDER_NAME` và lưu ID; `makeCopy(slipAttachmentName_(d), folder)`; mở bản sao bằng `DocumentApp.openById`, với mỗi tag gọi `body.replaceText('\\{\\{' + tag + '\\}\\}', escapeSlipReplacement_(values[tag]))`, `saveAndClose()`; PDF = `file.getAs('application/pdf')` đặt tên `<tên>.pdf`; Word = `UrlFetchApp.fetch('https://docs.google.com/document/d/<id>/export?format=docx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob()` đặt tên `<tên>.docx`.

- [ ] **Step 4: Chạy test, thấy PASS** — toàn bộ pass.

---

### Task 4: Phát hành phiếu và email cho cán bộ quản lý

**Files:**
- Modify: `Google_Apps_Script.js` (mục "PHIẾU MƯỢN THIẾT BỊ"; menu `onOpen`)
- Test: `tests/backend_regression.cjs`

**Interfaces:**
- Consumes: `createLoanSlip_`, `loanSlipEnabled_` (Task 3); `withManagers_`-style danh sách email (`master.managerEmails`), `findLoanIndex_(data, loanId)`, `readLogData_(ss)`, `emailLayout_` và các `email*_`.
- Produces:
  - `issueLoanSlip_(d: SlipData): { docUrl, pdf, docx } | null` — mở `SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID)` khi cần ghi cột W; `null` khi tính năng ngủ hoặc lỗi; **không bao giờ ném**; thành công thì ghi `docUrl` vào cột W của dòng `d.loanId` (trong `LockService`); lỗi thì gửi email `[KTTV&HDH] ⚠️ Không tạo được phiếu mượn <loanId>` cho `CONFIG.ADMIN_EMAIL` kèm nguyên nhân và cách tạo lại.
  - `sendSlipToManagers_(d: SlipData, slip): void` — gửi `slipRecipients_(d)` email "[KTTV&HDH] 📄 Phiếu mượn thiết bị — <tên> (<mã QR>)" kèm `attachments: [slip.pdf, slip.docx]`, `htmlBody` dựng bằng `emailLayout_`; bỏ qua nếu `slip` null.
  - `slipRecipients_(d: SlipData): string[]` — `d.managerEmails` nếu có, không thì `[CONFIG.ADMIN_EMAIL]`.
  - `createLoanSlipTemplate(): string` — dựng mẫu Google Doc theo bố cục trong spec mục 3 (quốc hiệu, tiêu đề, mã giao dịch, bảng 1 và 2, dòng phê duyệt, câu cam kết, ngày, hai ô ký: trái "CÁN BỘ MƯỢN THIẾT BỊ" dưới là `{{NGUOI_MUON}}`, phải "CÁN BỘ BÀN GIAO" dưới là `{{CAN_BO_BAN_GIAO}}`); lưu ID vào `PROP_SLIP_TEMPLATE`; nếu đã có thì **không tạo lại**, chỉ trả URL; có `toast`. Thêm vào `onOpen`: `📄 Tạo mẫu phiếu mượn (chạy 1 lần)` → `createLoanSlipTemplate`.

- [ ] **Step 1: Viết test (thất bại)**

```js
test('Phiếu: tính năng ngủ khi chưa có mẫu → không Drive, không email', () => {
  const st = {}; const h = harness([], { globals: slipGlobals(st) });
  assert.equal(h.ctx.issueLoanSlip_(slipData()), null);
  assert.equal(st.copies.length, 0); assert.equal(h.mail.length, 0);
});
test('Phiếu: Drive lỗi → trả null, không ném, PTK nhận email báo lỗi có mã giao dịch', () => {
  const st = { copyFails: true }; const h = harness([], { props: { LOAN_SLIP_TEMPLATE_ID: 'TPL' }, globals: slipGlobals(st) });
  assert.equal(h.ctx.issueLoanSlip_(slipData()), null);
  assert.equal(h.mail.length, 1);
  assert.equal(h.mail[0][0], 'datpt@hus.edu.vn');
  assert.match(h.mail[0][1], /Không tạo được phiếu mượn L261027-A3F9C1/);
});
test('Phiếu: thành công → ghi link vào cột W đúng dòng theo Mã giao dịch', () => { /* thêm 1 dòng Log có LOAN_ID, gọi issueLoanSlip_, kiểm row[col(h).SLIP] === docUrl */ });
test('Phiếu: email cán bộ quản lý đính kèm PDF + Word; không có email CB → gửi PTK', () => {
  /* sendSlipToManagers_ với managerEmails ['b@example.invalid'] → m[0]==='b@example.invalid', m[3].attachments.length===2, tên .pdf/.docx;
     với managerEmails [] → m[0]==='datpt@hus.edu.vn'; slip null → không gửi */
});
test('Phiếu: createLoanSlipTemplate chứa đủ 14 dấu, lưu ID, gọi lần 2 không tạo mẫu mới', () => {
  /* globals.DocumentApp.create ghi lại mọi đối số gọi vào body (JSON.stringify) → chứa '{{TAG}}' cho cả SLIP_TAGS;
     props.LOAN_SLIP_TEMPLATE_ID được đặt; gọi lần 2: state.templatesCreated vẫn 1 */
});
```

Phần thân test dạng comment ở trên phải viết đầy đủ khi triển khai; `slipGlobals` được mở rộng thêm `DocumentApp.create`, `state.templatesCreated`, và `SpreadsheetApp.getActiveSpreadsheet().toast` giả nếu `createLoanSlipTemplate` dùng toast.

- [ ] **Step 2: Chạy test, thấy FAIL.**

- [ ] **Step 3: Implement `slipRecipients_`, `issueLoanSlip_`, `sendSlipToManagers_`, `createLoanSlipTemplate`** và dòng menu trong `onOpen`. `issueLoanSlip_` ghi cột W trong `LockService.getScriptLock()`; lỗi ghi cột W cũng được bắt (phiếu vẫn trả về).

- [ ] **Step 4: Chạy test, thấy PASS** — toàn bộ pass.

---

### Task 5: Nối vào luồng dưới 100 triệu

**Files:**
- Modify: `Google_Apps_Script.js` (`recordLoanRequest_`, `notifyLoanRequest_`, `sendAutoAcceptedEmail_`, `buildDecisionEmail_`)
- Test: `tests/backend_regression.cjs`

**Interfaces:**
- Consumes: `issueLoanSlip_`, `sendSlipToManagers_` (Task 4), `slipData` shape (Task 2).
- Produces:
  - `slipDataFromLoan_(loan): SlipData` — `needsApproval:false`, `approvedAt:null`
  - đối tượng `loan` của `recordLoanRequest_` có thêm `condition`, `accessories`, `managerName`, `managerEmails`
  - `sendAutoAcceptedEmail_(loan, slip)`: nếu `slip` có thì thêm `attachments: [slip.pdf]` vào tùy chọn `MailApp.sendEmail`
  - `buildDecisionEmail_(isApprove, o, autoAccepted)`: khi `o.hasSlip` và `isApprove` (kể cả `autoAccepted`) thêm câu "📄 Phiếu mượn thiết bị đính kèm (PDF). Thầy/cô in và ký trước khi nhận thiết bị." vào cả bản chữ và `htmlBody` (qua `emailNote_`)
- Thứ tự trong `notifyLoanRequest_` nhánh mượn không cần duyệt: `sendLoanRequestEmail_` → `issueLoanSlip_` → `sendAutoAcceptedEmail_(loan, slip)` → `sendSlipToManagers_`.

- [ ] **Step 1: Viết test (thất bại)** — dùng `withDevice` để thêm thiết bị dưới 100 triệu (`HMO-LAB-0002` đã có sẵn trong `MASTER_ROWS`, 10 tr × 2 chiếc) và cột `Email CB quản lý` (thêm header + ô vào `Master_Data`):

```js
test('Phiếu: dưới 100 tr → người mượn nhận PDF trong email xác nhận, CB nhận PDF+Word, cột W có link, đúng thứ tự', () => {
  /* onFormSubmitBorrow(borrowFields({'Mã QR thiết bị':'HMO-LAB-0002'})), mail sau đó:
     - email tới a@example.invalid: m[3].attachments.length===1, tên .pdf, htmlBody chứa 'Phiếu mượn thiết bị đính kèm'
     - email tới CB: attachments.length===2
     - chỉ số email người mượn < chỉ số email CB; lastRow(h)[col(h).SLIP] có link */
});
test('Phiếu: yêu cầu cần duyệt (200 tr), tự động từ chối, tại chỗ → không tạo phiếu', () => { /* 3 lần gọi riêng; st.copies.length===0, cột W trống */ });
test('Phiếu: Drive lỗi → email xác nhận vẫn gửi (không đính kèm) + PTK nhận email báo lỗi, giao dịch vẫn ghi', () => { /* st.copyFails */ });
test('Phiếu: người mượn không có email → không lỗi, CB vẫn nhận phiếu', () => { /* borrowFields({'Email Address': ''}) */ });
test('Phiếu: thiết bị không có CB quản lý → phiếu gửi PTK, ô ký CB để trống', () => { /* managerEmails [] và managerName '' */ });
```

Viết đầy đủ thân test khi triển khai; các assertion đã nêu trong chú thích là điều bắt buộc.

- [ ] **Step 2: Chạy test, thấy FAIL.**

- [ ] **Step 3: Implement** — bổ sung trường vào `loan` (lấy từ `req.condition`, `req.accessories`, `master.managerName`, `master.managerEmails`); viết `slipDataFromLoan_`; sửa `notifyLoanRequest_`, `sendAutoAcceptedEmail_`, `buildDecisionEmail_` theo Interfaces. Khi không có `loan.email`, `sendAutoAcceptedEmail_` vẫn giữ hành vi cũ (thoát sớm) nhưng `sendSlipToManagers_` vẫn chạy.

- [ ] **Step 4: Chạy test, thấy PASS** — toàn bộ pass (đặc biệt 94 test cũ, vì tính năng đang ngủ trong harness mặc định).

---

### Task 6: Nối vào luồng phê duyệt từ 100 triệu

**Files:**
- Modify: `Google_Apps_Script.js` (`applyApprovalDecision_`)
- Test: `tests/backend_regression.cjs`

**Interfaces:**
- Consumes: `issueLoanSlip_`, `sendSlipToManagers_`, `buildDecisionEmail_` (o.hasSlip), `getMasterRecord_(ss, qrCode)`.
- Produces: `outcome` của `applyApprovalDecision_` có thêm `unit`, `location`, `condition`, `accessories`, `approvedAt: Date`; `slipDataFromOutcome_(outcome, master): SlipData` (`needsApproval:true`, `approvedAt: outcome.approvedAt`).
- Hành vi: chỉ nhánh **duyệt**. Sau khi nhả khóa: tra `master` (lỗi tra không chặn), `issueLoanSlip_`, gửi email kết quả cho người mượn kèm `attachments: [slip.pdf]` nếu có, rồi `sendSlipToManagers_`. Email cán bộ vẫn gửi dù người mượn không có email. Nhánh từ chối và trả `ok:false` (đã xử lý) không đụng tới phiếu.

- [ ] **Step 1: Viết test (thất bại)** — dùng thiết bị `QR` (200 triệu, cần duyệt):

```js
test('Phiếu: từ 100 tr — chưa có phiếu khi chờ duyệt, có ngay sau khi PTK duyệt, đúng một lần', () => {
  /* onFormSubmitBorrow → st.copies.length===0; id = lastRow(h)[18];
     const r = h.ctx.applyApprovalDecision_('approve', id) → r.ok; st.copies.length===1;
     replacements.DONG_PHE_DUYET khớp /^Phó Trưởng khoa đã phê duyệt qua email lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}\.$/;
     email người mượn có attachments PDF; email CB có PDF+Word; cột W có link;
     gọi lần 2 → r2.ok===false và st.copies.length vẫn 1, số email không tăng */
});
test('Phiếu: PTK từ chối → không phiếu', () => { /* applyApprovalDecision_('reject', id): st.copies.length===0, cột W trống */ });
test('Phiếu: duyệt khi Drive lỗi → trạng thái duyệt vẫn ghi, email "Đã duyệt" vẫn gửi (không đính kèm), PTK nhận email báo lỗi', () => {
  /* st.copyFails: cột M bắt đầu '✅ Đã phê duyệt'; email người mượn m[3].attachments undefined; có email 'Không tạo được phiếu mượn' tới PTK */
});
test('Phiếu: duyệt khi người mượn không có email → CB vẫn nhận phiếu', () => { /* borrowFields({'Email Address': ''}): có email tới CB với 2 file đính kèm, không email tới người mượn */ });
```

- [ ] **Step 2: Chạy test, thấy FAIL.**

- [ ] **Step 3: Implement** theo Interfaces. Giữ nguyên thứ tự ghi cột M trong khóa như hiện nay; thêm các trường vào `outcome`; viết `slipDataFromOutcome_`.

- [ ] **Step 4: Chạy test, thấy PASS** — toàn bộ pass.

---

### Task 7: Menu "Tạo lại phiếu mượn"

**Files:**
- Modify: `Google_Apps_Script.js` (mục "PHIẾU MƯỢN THIẾT BỊ"; `onOpen`)
- Test: `tests/backend_regression.cjs`

**Interfaces:**
- Consumes: `issueLoanSlip_(d)`, `sendSlipToManagers_`, `loanStatus_(row)`, `isOnsite_(row)`, `getMasterRecord_`.
- Produces:
  - `regenerateLoanSlipForRow_(ss, rowNum: number): { ok: boolean, message: string, docUrl?: string }` — đủ điều kiện khi dòng không phải tại chỗ, không bị từ chối (tay/tự động), không chờ duyệt, có Mã giao dịch; ngược lại `ok:false` kèm lý do tiếng Việt. Tính năng ngủ → `ok:false` "Chưa tạo mẫu phiếu". Giờ phê duyệt lấy từ cột M nếu có dạng `(dd/MM/yyyy HH:mm)`, không có thì `approvedAt:null`. Gửi email phiếu **chỉ cho cán bộ quản lý** (người mượn đã nhận bản đầu), thay link cột W bằng link mới.
  - `regenerateLoanSlip(): void` — hàm menu: lấy dòng đang chọn của sheet `Log_Muon_Tra` (không phải sheet đó hoặc dòng tiêu đề thì báo bằng `toast`), gọi hàm trên, `toast` kết quả. Menu: `📄 Tạo lại phiếu mượn (dòng đang chọn)`.

- [ ] **Step 1: Viết test (thất bại)** trên `regenerateLoanSlipForRow_`:

```js
test('Tạo lại phiếu: dòng đã duyệt → ok, link cột W đổi, email chỉ gửi CB (không gửi người mượn)', () => {
  /* tạo phiếu lần đầu (Task 6), r = regenerateLoanSlipForRow_(ss, 2): r.ok, st.copies.length===2, cột W === r.docUrl ≠ link cũ,
     email mới chỉ tới CB, không có email nào tới a@example.invalid thêm */
});
test('Tạo lại phiếu: dòng chờ duyệt / từ chối / tại chỗ / tính năng ngủ → ok:false, không Drive', () => {
  /* 4 ca, mỗi ca r.ok===false, r.message không rỗng, st.copies.length===0 */
});
test('Tạo lại phiếu: từ 100 tr đọc giờ duyệt từ cột M; thiếu giờ → dòng "…đã phê duyệt qua email."', () => {
  /* cột M '✅ Đã phê duyệt — PTK (27/10/2026 08:15)' → DONG_PHE_DUYET chứa 'lúc 08:15 27/10/2026'; cột M '✅ Đã phê duyệt — PTK' → 'Phó Trưởng khoa đã phê duyệt qua email.' */
});
```

- [ ] **Step 2: Chạy test, thấy FAIL.**

- [ ] **Step 3: Implement** `regenerateLoanSlipForRow_` (dùng `slipDataFromRow_(row, master)` dựng `SlipData` từ một dòng Log, `needsApproval = master.unitValue >= CONFIG.APPROVAL_THRESHOLD`), `regenerateLoanSlip`, dòng menu.

- [ ] **Step 4: Chạy test, thấy PASS** — toàn bộ pass.

---

### Task 8: Tài liệu và nhật ký phiên

**Files:**
- Modify: `CLAUDE.md` (bảng hàm Apps Script, mục Changes Log mới, ghi chú cột W / `LOAN_SLIP_TEMPLATE_ID`), `HUONG_DAN_TRIEN_KHAI.md` (quyền mới, tạo mẫu phiếu, menu, xử lý sự cố: phiếu không tạo được), `QUY_TRINH_QUAN_LY_THIET_BI.md` (bước in và ký phiếu khi bàn giao mượn mang đi), `docs/superpowers/specs/2026-10-27-phieu-muon-thiet-bi-design.md` (mục 5, 7: tính năng ngủ tới khi có mẫu; tạo lại chỉ gửi CB), `SESSION_SUMMARY_2026-10-27.md` (nối mục mới).
- Không đụng `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf` (anh quyết sau).

- [ ] **Step 1:** Cập nhật các file trên theo đúng những gì Task 1–7 đã làm (không khẳng định đã deploy hay đã cấp quyền).
- [ ] **Step 2:** Chạy `node tests/backend_regression.cjs` và `node tests/frontend_regression.cjs`; Expected: cả hai pass, ghi kết quả thật vào nhật ký phiên.
- [ ] **Step 3:** Ghi vào `HUONG_DAN_TRIEN_KHAI.md` thứ tự deploy: chạy test → `clasp push -f` → mở Sheet, menu "Tạo mẫu phiếu mượn" (bấm "Cho phép") → `clasp create-version` → `clasp update-deployment <id> -V <n>`; ghi rõ "chưa kiểm thử với Drive thật, mượn thử một thiết bị dưới 100 tr và một từ 100 tr sau khi deploy".
