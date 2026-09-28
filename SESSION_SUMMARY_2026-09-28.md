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
