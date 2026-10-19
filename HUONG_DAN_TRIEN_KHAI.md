# HƯỚNG DẪN TRIỂN KHAI & VẬN HÀNH KỸ THUẬT
## Hệ thống QR quản lý thiết bị — Khoa KTTV&HDH

**Phiên bản:** 2.0 — 19/10/2026 (thay bản 1.0 "triển khai từng bước" ngày 28/04/2026)
**Áp dụng cho:** Apps Script **version 17**, trang tra cứu `sw.js` **v13**
**Dành cho:** người vận hành kỹ thuật (Phó Trưởng khoa hoặc cán bộ được giao). Quy trình nghiệp vụ cho cán bộ và người mượn xem `QUY_TRINH_QUAN_LY_THIET_BI.md` và `QUY_TRINH_SU_DUNG_THIET_BI.docx`.

> Hệ thống **đã được triển khai**. Tài liệu này mô tả cấu trúc hiện tại, cách cập nhật và cách xử lý sự cố. Nếu phải dựng lại từ đầu, làm lần lượt mục 2 → 6.

---

## 1. Kiến trúc hiện tại

```
Tem QR trên thiết bị ──► Trang tra cứu (GitHub Pages, cài được như app)
                          │  phamtiendat-135.github.io/HMO-equipment/?id=<mã QR>
                          │  • thông tin thiết bị + trạng thái thời gian thực
                          │  • 5 nút → 5 Google Form (mã QR điền sẵn)
                          ▼
                     Google Forms ──► Google Sheet master (tab Form Responses)
                                          │ trigger onFormSubmit
                                          ▼
                     Google Apps Script (gắn trong Sheet master)
                       • kiểm tra, ghi Log_Muon_Tra / Log_Bao_Tri / Log_Bao_Hong
                       • gửi email (phê duyệt, xác nhận, nhắc trả, kiểm tra nhận lại…)
                       • Web App: API trạng thái/lịch sử cho trang tra cứu,
                         trang xác nhận khi bấm nút trong email
```

| Thành phần | Địa chỉ / vị trí |
|---|---|
| Trang tra cứu | `https://phamtiendat-135.github.io/HMO-equipment/` |
| Mã nguồn | `github.com/phamtiendat-135/HMO-equipment` (nhánh `main`, GitHub Pages phục vụ thư mục gốc) |
| Google Sheet master | ID `1k3KYyN64NzRwAh0g8BsXieHkFqudhbu6Iy7UwOoAjK4` |
| Apps Script | Gắn trong Sheet master (Tiện ích mở rộng → Apps Script); scriptId trong `.clasp.json` |
| Web App | `https://script.google.com/macros/s/AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q/exec` (quyền: chạy bằng tài khoản PTK, ai cũng gọi được) |
| Email quản trị | `datpt@hus.edu.vn` (`CONFIG.ADMIN_EMAIL`) |

---

## 2. Google Sheet master

**Cài đặt bắt buộc** (Tệp → Cài đặt): Ngôn ngữ **Việt Nam**, Múi giờ **GMT+07:00**.

### 2.1 Các tab

| Tab | Nội dung | Ai sửa |
|---|---|---|
| `Master_Data` | Danh mục 74 thiết bị — **nguồn dữ liệu gốc** | PTK / người vận hành |
| `Log_Muon_Tra` | Mọi khoản mượn mang đi, sử dụng tại chỗ, trả | **Hệ thống ghi**; chỉ sửa tay khi xử lý sự cố (mục 9) |
| `Log_Bao_Tri` | Bản ghi bảo trì / hiệu chuẩn | Hệ thống ghi |
| `Log_Bao_Hong` | Báo hỏng (từ form) + sự cố phát hiện khi kiểm tra nhận lại | Hệ thống ghi; PTK cập nhật cột "Trạng thái xử lý" |
| `Can_Bo_QL`, `Thong_Ke` | Danh sách cán bộ, thống kê | Tham khảo |
| `Form Responses …` (5 tab) | Dữ liệu thô từ 5 form | **Không xoá, không sửa** (được đổi tên tab) |

### 2.2 Master_Data — các cột hệ thống dùng

| Cột | Hệ thống dùng để |
|---|---|
| `Mã QR` | Khóa tra cứu (`HMO-XXX-NNNN`) |
| `Tên thiết bị`, `Địa điểm (chuẩn)` | Hiển thị, email |
| `Nguyên giá (tr.đ)` | ≥ 100 → cần PTK duyệt khi mượn mang đi (`CONFIG.APPROVAL_THRESHOLD`) |
| `Số lượng` | Số lượt được mượn/giữ chỗ cùng lúc |
| `Tình trạng thực tế (01/2025)` | **"Hỏng" / "Không hoạt động" → chặn mượn và dùng tại chỗ** |
| `CB quản lý hiện tại` | Tên hiển thị trên trang tra cứu; điền sẵn tên người kiểm tra |
| `Link hướng dẫn sử dụng` (cột T) | Nút "📘 Hướng dẫn sử dụng" trong email xác nhận / đã duyệt. Chỉ nhận `https://…`. Trống → "(đang cập nhật)" |
| `Email CB quản lý` (tạo bằng menu) | Nhận email **kiểm tra khi nhận lại**, **báo hỏng**, **nhắc bảo trì** của thiết bị. Nhiều email cách nhau bằng dấu phẩy. Trống → gửi PTK |

Sửa Master_Data có hiệu lực **ngay**, không cần deploy.

### 2.3 Log_Muon_Tra — cấu trúc A–V

| Cột | Ý nghĩa | Cột | Ý nghĩa |
|---|---|---|---|
| A | Mã QR | L | Phụ kiện kèm theo |
| B | Tên thiết bị | M | **Phê duyệt / trạng thái mượn** (Chờ phê duyệt PTK · ✅ Đã phê duyệt · ❌ Từ chối · ⛔ Tự động từ chối · 🔬 Sử dụng tại chỗ) |
| C | Người mượn | N | Ghi chú |
| D | Đơn vị | O | Quá hạn (công thức ✓ đỏ) |
| E | Mục đích | P | Email người mượn |
| F | Địa điểm (tại chỗ: "Tại chỗ — phòng") | Q | Giờ sử dụng (tự tính) |
| G | Ngày mượn (tại chỗ: giờ bắt đầu) | R | Đã nhắc trả |
| H | Ngày dự kiến trả (tại chỗ: giờ kết thúc) | S | Mã giao dịch (`Lyymmdd-XXXXXX`) |
| I | Ngày trả (khai trả / tại chỗ: giờ kết thúc) | T, U | Nguồn phản hồi mượn / trả (chống ghi trùng) |
| J, K | Tình trạng khi mượn / khi trả | V | **Kiểm tra nhận lại** (⏳ Chờ kiểm tra · ✅ Hoạt động tốt · ⚠️ Có sự cố · 🔧 Đã khắc phục) |

Các cột S–V do hệ thống tự thêm (cấu trúc phiên bản 3, cờ `LOG_SCHEMA_VERSION` trong Script Properties). **Không xoá cột, không chèn cột giữa A–V.**

---

## 3. Năm Google Form

| # | Form | Nút trên trang tra cứu | Ai mở được | Câu hỏi "chữ ký" — **không đổi tên** |
|---|---|---|---|---|
| 1 | Đăng ký mượn thiết bị (mượn mang đi) | 📦 Mượn mang đi | Ai cũng mở (thu email) | "Ngày mượn", "Ngày dự kiến trả" |
| 2 | Khai báo sử dụng tại chỗ | 🔬 Sử dụng tại chỗ | **Chỉ tài khoản @hus.edu.vn** | "Họ và tên người sử dụng", "Số giờ sử dụng (dự kiến)" (0,5–24) |
| 3 | Xác nhận trả thiết bị | ✅ Xác nhận trả | Ai cũng mở | "Tình trạng thiết bị khi trả", "Họ và tên người trả", "Phụ kiện trả kèm" |
| 4 | Ghi nhận bảo trì & hiệu chuẩn | 🔧 Ghi bảo trì | Ai cũng mở | "Loại công việc", "Ngày thực hiện" |
| 5 | Báo hỏng thiết bị | ⚠️ Báo hỏng | Ai cũng mở | "Mức độ hỏng", "Mô tả sự cố", "Người phát hiện" |

- Hệ thống nhận ra form nào bằng **tên câu hỏi** (`FORM_SIGNATURES` trong `Google_Apps_Script.js`). Đổi tên câu hỏi thì phải sửa code, nếu không phản hồi sẽ bị bỏ qua (PTK nhận email "Không nhận diện được phản hồi form").
- Cả 5 form gửi phản hồi về **Sheet master**; trigger `onFormSubmitDispatch` bắt chung.
- Tạo form mới bằng script `Create_Google_Forms.js` (dán vào **một dự án Apps Script riêng**). Ví dụ `createOnsiteFormOnly()` chỉ tạo form tại chỗ. **Không chạy `createAllForms()`**: hàm này tạo lại cả 4 form cũ thành bản trùng.
- Nên sửa lời cảm ơn của form 3 thành: "Đã ghi nhận khai trả — cán bộ quản lý sẽ kiểm tra thiết bị."

---

## 4. Trang tra cứu (GitHub Pages)

| File | Vai trò |
|---|---|
| `index.html` | Trang được phục vụ. **`QR_Landing_Page.html` phải giống hệt** (sửa một thì chép đè sang file kia) |
| `sw.js` | Service worker (chạy offline, cài app). **Mỗi lần sửa trang phải tăng số `CACHE_NAME`** (`hmo-equipment-v13` → `v14`…), nếu không điện thoại vẫn dùng bản cũ |
| `manifest.json`, `icons/` | Thông tin app khi "Thêm vào màn hình chính" |
| `HMO_logo.jpg` | Logo trong header email (`CONFIG.LOGO_URL`) — **không xoá / đổi tên** |

Cấu hình trong `index.html`:
- `FORMS` — link điền sẵn của 5 form (+ 2 chỗ giữ chỗ `training` / `research`, chưa hoạt động). Link tại chỗ là placeholder (`FORM_ID…`) thì trang tự quay về 1 nút "Đăng ký mượn/Sử dụng".
- `WEB_APP_URL` — URL Web App ở mục 1.
- `EQUIPMENT` — danh mục thiết bị nhúng (54 thiết bị có tem). Tên cán bộ quản lý lấy theo Sheet qua API; thêm/bớt thiết bị thì chạy `update_managers.py` hoặc sửa tay.

**Cập nhật:** sửa file → `git commit` → `git push` lên `main` → GitHub Pages tự cập nhật sau ~1 phút.

---

## 5. Tem QR và áp phích

| File | Nội dung |
|---|---|
| `QR_Labels_Print.html` | **54 tem**, chia theo phòng (P204, P206, P207, P401, T3) |
| `QR_Labels_Print_Dot1.html` | **Đợt 1: 37 tem** (bỏ thiết bị kém và hệ thống tính toán P206) |
| `QR_Poster_Landing_A4.html` | Áp phích A4 dán phòng thí nghiệm, trỏ tới trang tra cứu |

Tem trỏ tới `…/HMO-equipment/?id=<mã QR>`. In: mở file bằng Chrome → Ctrl+P → A4, bỏ header/footer, tỉ lệ 100%. Loại nhãn và vị trí dán: xem SOP mục 2.3.

---

## 6. Deploy Apps Script (clasp)

Code nằm trong `Google_Apps_Script.js`; cấu hình clasp có sẵn: `.clasp.json`, `.claspignore`, `appsscript.json`.

### 6.1 Chuẩn bị máy (một lần)
1. Cài Node.js, rồi `npm install -g @google/clasp@3.4.0`.
2. Nếu PowerShell báo không nhận lệnh `clasp`: thêm `%APPDATA%\npm` vào PATH (biến môi trường của tài khoản), **mở lại terminal**.
3. `clasp login` bằng tài khoản `datpt@hus.edu.vn`.
4. Bật **Google Apps Script API** tại https://script.google.com/home/usersettings.

### 6.2 Mỗi lần deploy — chạy liền một mạch
```powershell
cd D:\HMO_equipment\HMO-equipment
node tests/backend_regression.cjs      # phải pass hết
clasp push -f
clasp create-version "mô tả thay đổi"  # in ra: Created version N
clasp update-deployment AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q -V N
```
- Thay `N` bằng **số** version vừa in ra (không gõ dấu `<` `>`).
- **Trigger chạy code mới ngay sau `clasp push`**, còn Web App chỉ đổi sau `update-deployment`, nên làm 3 lệnh liền nhau.
- Kiểm tra: `clasp list-deployments` phải hiện `@N`.

### 6.3 Những điều **không** làm
1. **Không `clasp create-deployment`**: lệnh này tạo URL Web App mới, làm hỏng trang tra cứu và mọi link trong email.
2. **Không `clasp pull` trong thư mục repo**: lệnh này ghi đè code local bằng bản trên Google. Muốn đối chiếu thì pull vào thư mục khác.
3. **Không xoá `.claspignore`**: nếu thiếu, `clasp push` sẽ đẩy cả trang HTML lên Apps Script.
4. **Không sửa khối `webapp` trong `appsscript.json`**: sửa là đổi quyền truy cập Web App.
5. `clasp list-scripts` **không** hiện script gắn trong Sheet; scriptId đúng nằm trong `.clasp.json`.

### 6.4 Khi nào chạy `setup()`
Chỉ khi **thay đổi định nghĩa trigger** (thêm/bớt lịch chạy). `setup()` xoá và tạo lại toàn bộ trigger. Sửa logic thông thường thì **không** cần chạy.

---

## 7. Cấu hình một lần sau khi deploy

Trong Google Sheet master, menu **🔧 Quản lý TB**:

1. **📘 Tạo cột Link hướng dẫn sử dụng (Master_Data)**, rồi dán link Google Site của từng thiết bị khi có.
2. **📧 Tạo cột Email CB quản lý (Master_Data)**, rồi điền email cán bộ quản lý từng thiết bị.
3. **🔑 Tạo mã truy cập Nhật ký mới**: gửi mã 8 số cho cán bộ cần xem Nhật ký toàn Khoa.

Có thể chỉnh trong `CONFIG` (đầu `Google_Apps_Script.js`, sửa xong phải deploy):

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `APPROVAL_THRESHOLD` | 100 | Ngưỡng (tr.đ) cần PTK duyệt khi mượn mang đi |
| `ONSITE_MAX_HOURS` | 24 | Số giờ tối đa một lần khai báo tại chỗ (khớp kiểm tra trên form) |
| `REMIND_DAYS_BEFORE` | 2 | Nhắc người mượn trước hạn trả bao nhiêu ngày |
| `OVERDUE_DAYS` | 1 | Quá hạn bao nhiêu ngày thì bắt đầu nhắc (tối thiểu 1) |
| `INSPECTION_REMIND_DAYS` | 2 | CB chưa kiểm tra sau bao nhiêu ngày thì nhắc |
| `MAINTENANCE_REMINDER_DAYS` | 30 | Nhắc bảo trì trước bao nhiêu ngày |
| `APPROVAL_LINK_TTL_DAYS` | 14 | Hạn dùng link trong email (duyệt / kiểm tra / khắc phục) |
| `GUIDE_DEFAULT_URL` | trống | Trang hướng dẫn chung cho thiết bị chưa có link riêng |

---

## 8. Kiểm thử

### 8.1 Test tự động (chạy trước mỗi lần deploy)
```powershell
node tests/backend_regression.cjs                                  # Apps Script (90 test)
node tests/frontend_regression.cjs <thư-mục>/node_modules/jsdom    # trang tra cứu (28 test)
```
Cài jsdom một lần, **ngoài repo**: `npm i jsdom@24.1.3` trong một thư mục tạm.

### 8.2 Thử tay một vòng (sau thay đổi lớn)
1. Quét/mở một thiết bị **< 100 tr** → 📦 Mượn mang đi → điền form → nhận email "✅ Đã ghi nhận mượn" (hạn trả, nút lịch).
2. Quét lại → badge "🔴 Đang được mượn". Bấm ✅ Xác nhận trả → điền form → badge "⏳ Đã trả — chờ cán bộ kiểm tra"; CB (hoặc PTK) nhận email "🔍 Kiểm tra thiết bị trả".
3. Bấm **✅ Hoạt động tốt** → nhập tên → người mượn nhận "Đã nhận lại thiết bị"; badge về 🟢.
4. Thử **≥ 100 tr**: PTK nhận email xin duyệt → bấm Phê duyệt → trang xác nhận → người mượn nhận email kết quả.
5. Thử **🔬 Sử dụng tại chỗ** (1 giờ) → badge "🔵 Đang sử dụng tại chỗ — đến HH:mm".
6. **Xoá các dòng thử** trong `Log_Muon_Tra` (và `Log_Bao_Hong` nếu thử nhánh sự cố).

---

## 9. Vận hành hằng ngày

### 9.1 Lịch tự động (trigger)

| Thời điểm | Hàm | Việc |
|---|---|---|
| Mỗi lần gửi form | `onFormSubmitDispatch` | Nhận diện form → xử lý → gửi email |
| 7h hằng ngày | `checkUpcomingReturns` | Nhắc người mượn khi còn ≤ 2 ngày tới hạn trả (mỗi khoản 1 lần, đánh dấu cột R) |
| 8h hằng ngày | `checkOverdueReturns` | Nhắc quá hạn (người mượn + tổng hợp PTK) **và** nhắc CB kiểm tra nhận lại (ngày thứ 2, 4, 6…) |
| Thứ Hai 9h | `checkMaintenanceSchedule` | Nhắc bảo trì sắp đến hạn / quá hạn: PTK (bản tổng) + từng CB quản lý |
| Ngày 1 hằng tháng 8h | `monthlyReport` | Báo cáo tháng; ngày 1/1 kèm báo cáo hiệu quả sử dụng năm trước |

### 9.2 Menu "🔧 Quản lý TB"

| Mục | Khi nào dùng |
|---|---|
| Kiểm tra quá hạn trả / Kiểm tra lịch bảo trì / Gửi báo cáo tháng | Chạy ngay thay vì chờ lịch |
| 📊 Tạo báo cáo hiệu quả sử dụng năm nay | Xem số liệu năm hiện tại bất kỳ lúc nào |
| 🔢 Backfill giờ sử dụng | Chạy 1 lần cho dữ liệu cũ |
| Đồng bộ Form → Log_Muon_Tra | Dữ liệu cũ (trước khi có trigger); chạy lại không tạo trùng |
| Thiết lập trigger tự động | = `setup()` (mục 6.4) |
| 📧 Gửi lại email phê duyệt đang chờ | Link duyệt hết hạn / email lỗi |
| 🔑 Tạo mã truy cập Nhật ký mới | Đổi mã khi cần (mã cũ hết hiệu lực) |
| 📘 / 📧 Tạo cột Link hướng dẫn / Email CB quản lý | Một lần |
| 🔍 Gửi lại email kiểm tra đang chờ | Sau khi điền email CB, hoặc CB báo không thấy email |

### 9.3 Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy email sau khi gửi form | Apps Script → **Executions**: xem dòng `onFormSubmitDispatch` có Failed không. PTK cũng nhận email "⚠️ Lỗi hệ thống" kèm lý do |
| PTK nhận "Không nhận diện được phản hồi form" | Có người đổi tên câu hỏi trên form → đổi lại đúng tên ở mục 3 |
| Link trong email báo "không hợp lệ hoặc đã hết hạn" | Link quá 14 ngày hoặc đã dùng → menu **Gửi lại email phê duyệt / kiểm tra đang chờ** |
| Menu chạy mãi không xong | Thường là hộp thông báo đang chờ bấm OK hoặc chờ cấp quyền: tìm hộp thoại trên Sheet |
| Cần duyệt / từ chối tay | Cột **M**: ghi "✅ Đã phê duyệt — PTK" hoặc "❌ Từ chối — PTK" |
| Cần xác nhận kiểm tra tay | Cột **V**: ghi bắt đầu bằng "Hoạt động tốt" (đóng khoản) hoặc "Đã khắc phục" (mở lại cho mượn) |
| Người mượn khai nhầm hạn trả | Sửa cột **H** của dòng đó; nhắc trả theo ngày mới |
| Điện thoại không thấy giao diện mới | Đóng hẳn app/trình duyệt rồi mở lại (kiểm tra đã tăng `CACHE_NAME` chưa) |
| Thiết bị hỏng hẳn | Đổi cột tình trạng trong Master_Data thành "Hỏng" → hệ thống tự chặn mượn |

---

## 10. Danh mục file trong repo

| File | Mục đích |
|---|---|
| `Google_Apps_Script.js`, `appsscript.json`, `.clasp.json`, `.claspignore` | Apps Script + cấu hình clasp |
| `index.html`, `QR_Landing_Page.html`, `sw.js`, `manifest.json`, `icons/`, `HMO_logo.jpg` | Trang tra cứu (GitHub Pages) |
| `Create_Google_Forms.js`, `Google_Forms_Template.md` | Tạo form / đặc tả form |
| `QR_Labels_Print.html`, `QR_Labels_Print_Dot1.html`, `QR_Poster_Landing_A4.html` | Tem QR, áp phích |
| `tests/backend_regression.cjs`, `tests/frontend_regression.cjs` | Test tự động |
| `update_managers.py` | Đồng bộ tên cán bộ quản lý vào trang tra cứu |
| `HMO_Master_Equipment_Database.xlsx` | Bản gốc master data (dữ liệu thật nằm trên Google Sheet) |
| `QUY_TRINH_QUAN_LY_THIET_BI.md`, `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf` | Quy trình nghiệp vụ |
| `HUONG_DAN_TRIEN_KHAI.md` | Tài liệu này |
| `CLAUDE.md`, `SESSION_SUMMARY_*.md`, `PRE_DEPLOY_REVIEW_*.md`, `REVIEW_TAI_LIEU_*.md`, `audits/` | Ghi chép phát triển, review |
| `Kich_ban_video_HMO_Eq.docx`, `Slide_intro_outro_HMO_Eq.pptx`, `TAI_LIEU_CHUYEN_GIAO.docx`, `THUYET_TRINH_QUAN_LY_THIET_BI.docx` | Truyền thông / chuyển giao (đang cập nhật) |

---

## 11. Checklist định kỳ cho người vận hành

| Tần suất | Việc |
|---|---|
| Hằng ngày | Đọc email hệ thống (xin duyệt, quá hạn, sự cố khi nhận lại) và xử lý |
| Hằng tuần | Xem email nhắc bảo trì thứ Hai; xem `Log_Bao_Hong` các dòng "Mới — chờ xử lý" |
| Hằng tháng | Đọc báo cáo tháng; kiểm tra Apps Script → Executions có lỗi lặp lại không |
| Khi đổi nhân sự | Cập nhật `CB quản lý hiện tại` + `Email CB quản lý` trong Master_Data |
| Khi thiết bị hỏng / thanh lý | Đổi cột tình trạng trong Master_Data |
| 6 tháng | Kiểm kê (SOP QT-05); đổi mã Nhật ký nếu đã chia sẻ rộng |
