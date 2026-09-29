# Session Summary — 28/09/2026

## Mục 1 (~22:10) — Chặn lộ dữ liệu Nhật ký + vá link phê duyệt (Apps Script v10)

### Quyết định
- Người dùng chọn: **mã truy cập** cho Nhật ký toàn Khoa; **vá luôn** link phê duyệt trong email.
- Web App BẮT BUỘC giữ `ANYONE_ANONYMOUS` (GitHub Pages gọi không đăng nhập) → kiểm soát truy cập
  làm trong code, bí mật lưu ở **Script Properties** (không nằm trong repo/HTML).
- Route `history` theo thiết bị và `borrower` trong `?id=` GIỮ NGUYÊN (công khai), không che tên.

### Thay đổi
- `Google_Apps_Script.js`:
  - CONFIG: `APPROVAL_LINK_TTL_DAYS: 14`, `LOG_MAX_FAILED_ATTEMPTS: 30`, `LOG_LOCKOUT_SECONDS: 900`.
  - Khối helper mới trước `doGet`: `safeEqual_`, `getApprovalSecret_` (tự tạo lần đầu, có LockService),
    `signApproval_` / `buildApprovalLink_` / `verifyApprovalLink_` (HMAC-SHA256 trên `action|qr|t`),
    `checkLogAccess_` (sai ≥30 lần → khóa 15 phút qua CacheService), `buildUsageLogResponse_`,
    `generateLogAccessCode()` (8 chữ số, hiện hộp thoại, mã cũ hết hiệu lực, gỡ khóa).
  - `doGet`: route approve/reject kiểm chữ ký trước khi gọi `handleApproval_`;
    route `alllog` trả `{ok, error?, entries}` — không mã/sai mã → `entries: []`.
  - Email PTK dùng `buildApprovalLink_()` (thêm `&t=` và `&sig=`).
  - Menu `onOpen`: thêm "🔑 Tạo mã truy cập Nhật ký mới".
- `index.html` + `QR_Landing_Page.html` (IDENTICAL): tách `showUsageLog` thành
  `showUsageLog` / `renderLogCodeForm` / `loadUsageLog` / `renderUsageLogEntries` / `lockUsageLog`;
  form nhập mã (password, numeric), lưu mã ở `localStorage` (bọc try/catch), tự xóa mã khi server báo
  `unauthorized`, nút "🔒 Khóa nhật ký trên máy này". CSS thêm `.log-code-form`, `.log-lock-btn`.
- `sw.js`: CACHE v8 → v9.

### Kiểm tra đã chạy
- `node --check` Apps Script + khối `<script>` inline → OK.
- Harness Node giả lập Utilities/Properties/Cache (scratchpad, không commit): **21/21 pass** —
  link hợp lệ qua; đổi action/QR/t, thiếu sig, t không phải số, quá 14 ngày, t tương lai → bị chặn;
  link kiểu cũ không gọi `handleApproval_`; mã chưa tạo → not_configured; sai → unauthorized;
  ≥30 lần sai → locked kể cả mã đúng; tạo mã mới gỡ khóa.
- jsdom chạy thật `index.html` với fetch giả: **15/15 pass** — lần đầu hỏi mã, chưa gọi API; sai mã
  không lưu; đúng mã lưu + hiện dữ liệu; tên TB chứa HTML bị escape; mở lại dùng mã đã lưu;
  mã bị đổi phía server → xóa + hỏi lại; locked → báo 15 phút; nút Khóa; localStorage bị chặn → không vỡ.
- Trước push: `clasp clone` bản remote, so với HEAD → trùng v9, không ai sửa trên editor.
- Deploy: `clasp push -f` → version 10 → `update-deployment ... -V 10`. URL không đổi.
- curl production v10: `alllog` không mã / mã bừa → `not_configured`, entries rỗng;
  `approve` không chữ ký và `reject` chữ ký giả → trang "Link phê duyệt không hợp lệ";
  regression `history`, `?id=`, `allStatus` → vẫn chạy.

### Việc người dùng PHẢI làm để Nhật ký hoạt động lại
- Mở Sheet master → menu **🔧 Quản lý TB → 🔑 Tạo mã truy cập Nhật ký mới** → cấp quyền nếu hỏi
  → ghi lại mã 8 số → gửi cho cán bộ cần xem. Trước bước này Nhật ký báo "chưa được mở".
  (Menu mới chỉ hiện sau khi tải lại Sheet.)

### Lưu ý / rủi ro còn lại
- Email phê duyệt CŨ đang chờ (gửi trước v10) giờ bấm sẽ báo "không hợp lệ" → xử lý tay ở cột M.
- Chữ ký chưa gắn với đúng dòng Log (email gửi TRƯỚC khi appendRow nên chưa có số dòng): trong 14 ngày,
  link còn hạn của QR X có thể tác động lên yêu cầu chờ duyệt MỚI HƠN của cùng QR X. Cần có link gốc
  trong email PTK mới khai thác được. Muốn khóa chặt → đảo thứ tự appendRow trước gửi mail và ký kèm số dòng.
- Link GET làm thay đổi dữ liệu: bộ quét link email (vd. Outlook Safe Links) có thể tự "bấm". Có từ trước v10.
- Khóa 15 phút là khóa CHUNG → người ngoài cố tình nhập sai có thể làm cán bộ tạm không xem được Nhật ký.
- Mã truy cập đi qua query string `&key=` (HTTPS, nhưng có thể nằm trong log proxy).

### Xác minh sau push (`4d1403f`)
- GitHub Pages ra bản mới sau ~1 phút: `renderLogCodeForm` có trong HTML live, `sw.js` = v9.
- Commit `4d1403f` lỡ gắn dòng `Co-Authored-By`, trái quy ước "attribution disabled" của người dùng.
  Không sửa lịch sử (đã push); các commit sau không gắn nữa.

## Mục 2 (~23:00) — Review toàn bộ trước vận hành chính thức

### Kết luận
- **Chưa sẵn sàng vận hành chính thức hoặc in tem hàng loạt.** Báo cáo chi tiết: `PRE_DEPLOY_REVIEW_2026-09-28.md`.
- Không sửa application code, không push GitHub, không deploy Apps Script, không sửa Sheet, không submit Form/email và không gọi approve/reject thật.
- Người dùng đã cho phép riêng việc tải bản Sheet để audit và GET API production chỉ đọc.

### Kiểm tra đã hoàn thành
- Đối chiếu Apps Script local, remote HEAD và deployment v10: cùng SHA-256; bốn tài nguyên GitHub Pages live trùng local, HTTP 200.
- Audit 74 thiết bị; 54/54 PNG QR đúng URL/mã in và giải mã được ở kích thước gốc lẫn 80 px.
- Phát hiện `QR_Labels_Print.html` sai DOM: 18 card ngoài grid, 19 card không là con trực tiếp của grid, 8 tên mồ côi; P204/P207 bị sai phân nhóm và layout live bị vỡ.
- Audit Google Sheets live 10 tab: 74 QR duy nhất; master có 30 Bình thường, 21 Tốt, 3 Kém, 20 Không hoạt động; `Thong_Ke` là số tĩnh và không khớp; 16 cán bộ đã cập nhật trong Sheet chưa có ở frontend; không có protected range; General access Restricted.
- Forms live điền sẵn QR đúng nhưng form mượn còn bốn bộ môn cũ. HTTP không cookie: mượn/bảo trì/báo hỏng 401, trả 200.
- API read-only hoạt động; `alllog` chưa có mã trả `not_configured`; lookup đang công khai cả trường ghi chú/giải trình; lịch sử từng thiết bị vẫn công khai theo quyết định cũ.
- Xem sáu trigger live và execution gần đây; Completed không chứng minh nghiệp vụ hoàn tất vì code có bắt/nuốt exception.

### Bộ audit được tạo
- `audits/2026-09-28/reproduce.cjs`: 21/21 kịch bản/đối chứng backend xác nhận, gồm sai dispatch, sai giao dịch approval/return, mất/trùng/race log, thiếu validation, formula/HTML injection, ngày/báo cáo và PIN lockout.
- `audits/2026-09-28/frontend_audit.cjs`: 10/10 kịch bản/đối chứng, gồm XSS URL, inherited key, offline bị coi rỗng, placeholder báo thành công giả, dữ liệu manager bị bỏ qua, service worker xóa cache ngoài dự án và DOM tem.
- `audits/2026-09-28/data_qr_audit.py`: đọc XLSX/QR, không save workbook.
- `audits/2026-09-28/live_check.mjs`: GET read-only static/Form/API, không submit hoặc mutate.
- `audits/2026-09-28/README.md`: phạm vi và cách chạy; nhấn mạnh pass của audit là tái hiện lỗi, không phải readiness pass.

### Ưu tiên tiếp theo
1. Vá XSS, formula/HTML injection và giảm trường API public.
2. Thiết kế LoanID/trạng thái, sửa dispatcher bốn Form, validation, approval/return, khóa/chống trùng và retry email.
3. Đối soát/chuẩn hóa Sheet và Forms, đồng bộ frontend từ một nguồn, dựng lại trang tem.
4. Regression + E2E staging; in/quét tem và test mobile/PWA trên thiết bị thật trước phát hành.
