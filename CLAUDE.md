# HMO Equipment Management System

## Project Overview

QR-based equipment management system for the **Faculty of Meteorology, Hydrology and Oceanography (Khoa KTTV&HDH)** at Hanoi University of Science (VNU). The project digitizes tracking of 74 pieces of equipment (~19.2 billion VND total value) across 5 locations in Building T3.

**Project owner:** TS. Pham Tien Dat (Vice Dean) — datpt@hus.edu.vn
**Project codename:** DATAI — Digital equipment management for the Faculty
**Version:** 1.0 (issued 28/04/2026)

## Architecture

The system uses a **Google Workspace stack** (Phase 1), with a planned migration to a custom DATAI platform (Phase 2, after 3-6 months).

```
QR Label on device
  → User scans with phone camera
  → QR_Landing_Page.html (hosted on GitHub Pages or faculty server)
  → Shows equipment info + action buttons
  → Google Forms (borrow / return / maintenance / report damage)
  → Google Sheets (master database + logs)
  → Google Apps Script (automated alerts, monthly reports)
```

## File Inventory

| File | Purpose | Status |
|------|---------|--------|
| `HMO_Master_Equipment_Database.xlsx` | Master database — 5 sheets. Log_Muon_Tra có cột O "Quá hạn" (formula + ✓ đỏ tự động) | ✅ Đã upload Google Sheets |
| `index.html` | Bản deploy của landing page (GitHub Pages) — đã wire-up PWA | ✅ 4 form chính có URL thật; ⚠️ training/research còn placeholder (~line 1251) |
| `QR_Landing_Page.html` | Mobile-friendly lookup page — scan QR → xem info + nút hành động (đồng bộ với index.html) | ✅ 4 form chính có URL thật; ⚠️ training/research còn placeholder (~line 1251) |
| `manifest.json` | PWA manifest — name, icons 192/512, standalone, theme_color #1a3a6b | ✅ Cấu hình sẵn |
| `sw.js` | Service worker — cache-first app shell, network-first script.google.com API (CACHE v6, có GET-guard) | ✅ Hoạt động |
| `icons/icon-192.png`, `icons/icon-512.png` | PWA icons | ✅ Có sẵn |
| `Kich_ban_video_HMO_Eq.docx` | Kịch bản video hướng dẫn (caption + storyboard, gồm đoạn cài đặt app 3 nền tảng) | ✅ Hoàn thành |
| `Slide_intro_outro_HMO_Eq.pptx` | Slide intro/outro 9:16 cho video | ✅ Hoàn thành |
| `QR_Labels_Print.html` | Printable A4 QR labels cho 54 thiết bị, organized by room | ✅ Fixed layout 7303/7897, ready to print |
| `Google_Apps_Script.js` | Apps Script: triggers, email mượn/quá hạn/bảo trì, sync Form→Log, monthly report | ✅ MASTER_SHEET_ID đã cấu hình |
| `Create_Google_Forms.js` | Script tạo 4 Google Forms tự động | ✅ Đã cập nhật 3 bộ môn |
| `Google_Forms_Template.md` | Template specs cho 4 Google Forms | ✅ Đã cập nhật 3 bộ môn |
| `TAI_LIEU_CHUYEN_GIAO.docx` | Tài liệu chuyển giao hệ thống | ✅ Hoàn thành |
| `QUY_TRINH_QUAN_LY_THIET_BI.md` | SOP — 5 quy trình (QT-01 → QT-05) | Reference document |
| `HUONG_DAN_TRIEN_KHAI.md` | Hướng dẫn triển khai (8 bước) | Reference document |
| `QUY_TRINH_SU_DUNG_THIET_BI.docx` / `.pdf` | Quy trình sử dụng thiết bị | Reference document |
| `hmo_deployment_workflow.svg` | Sơ đồ quy trình triển khai | Reference document |

## Equipment Classification

8 categories with code prefix `HMO-[GROUP]-[ASSET_ID]`:

| Code | Category | Count | Value (M VND) | Key items |
|------|----------|-------|---------------|-----------|
| HPC | Computing systems | 17 | 3,956 | SuperMicro servers, compute nodes |
| NET | Networking | 9 | 714 | Mellanox Infiniband, Cisco switches |
| OBS | Observation & measurement | 15 | 7,730 | AWAC, ADCP, GPS, Horiba U-52G |
| LAB | Laboratory equipment | 10 | 6,685 | GUNT HM160 flume, Tecquipment models |
| SW | Software | 14 | 990 | Delft3D, Intel oneAPI, HYPACK |
| PC | Personal computers | 3 | 106 | MacBook, iMac (all inactive) |
| INF | Infrastructure | 4 | 166 | UPS units, server rack |
| OTH | Other/accessories | 2 | 47 | ADCP accessories |

## Physical Locations (Building T3)

- **P204-T3** — Observation & Oceanography lab: AWAC, ADCP, GUNT flume equipment (21 items)
- **P206-T3** — HPC room: compute nodes, Mellanox networking, software (20 items)
- **P207-T3** — Server & network room: Dell server, Cisco switch, Apple PCs (9 items)
- **P401-T3** — Hydrology & Environment lab: Tecquipment models, Horiba sensors (8 items)
- **T3 (server room)** — FIRST project servers, UPS, Gigabit switch (9 items)

## Equipment Status Summary

- **57 operational** (status: "Binh thuong" or "Tot")
- **4 broken** (need assessment: Dell PE R720, HM1000, OCMA-310, LISST)
- **12 inactive** (mostly legacy software — proposed for disposal)
- **1 unknown** (AWAC Nortek 2007, ID 5617 — needs verification)

## Key Configuration Points

1. **Google_Apps_Script.js line 18:** `MASTER_SHEET_ID` — ✅ đã cấu hình: `1k3KYyN64NzRwAh0g8BsXieHkFqudhbu6Iy7UwOoAjK4`
2. **QR_Landing_Page.html + index.html ~line 1251:** `FORMS` object — ✅ 4 form chính (borrow/return/maintain/report) đã có URL thật; ⚠️ `training`/`research` còn placeholder (FORM_ID_DAOTAO, FORM_ID_NCKH)
3. **QR_Labels_Print.html:** QR codes → `phamtiendat-135.github.io/HMO-equipment/` — ✅ đã cấu hình

## Google Apps Script Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `setup()` | Manual (run once) | Creates all automated triggers (including form submit) |
| `checkOverdueReturns()` | Daily 8am | Quét tất cả sheet (Log + Form Responses) tìm TB quá hạn, gửi email |
| `checkMaintenanceSchedule()` | Weekly Monday 9am | Emails about upcoming/overdue maintenance |
| `monthlyReport()` | 1st of month 8am | Sends monthly summary report |
| `onFormSubmitBorrow(e)` | On form submit | Gửi email cho MỌI yêu cầu mượn (🟢 thông báo hoặc 🔴 cần phê duyệt) + ghi vào Log_Muon_Tra |
| `syncFormResponsesToLog()` | Manual (menu) | Đồng bộ dữ liệu cũ từ Form Responses → Log_Muon_Tra |
| `findBorrowSheets_()` | Helper | Tự động tìm sheet chứa dữ liệu mượn/trả (fuzzy column matching) |
| `findColIndex_()` | Helper | Fuzzy matching tên cột (hỗ trợ cả tên Form và tên Log) |
| `lookupEquipment(qrCode)` | API call | Returns equipment data by QR code |
| `doGet(e)` | Web App endpoint | JSON API for QR lookups |
| `onOpen()` | Sheet open | Menu "Quản lý TB" với 5 chức năng |

## Approval Workflow

- Equipment valued **< 100 million VND**: approved by section manager (CB phu trach mang)
- Equipment valued **>= 100 million VND**: requires Vice Dean approval (auto-email notification)
- High-value items always needing Vice Dean approval: AWAC (1.2B), ADCP (941M), GPS Hemisphere (1.9B), lab models (>400M)

## Management Structure

```
Vice Dean (Pho Truong khoa) — overall management, approval
├── Computing section manager (HPC, NET, INF) — rooms P206, P207, server T3
├── Observation & Lab section manager (OBS, LAB, OTH) — rooms P204, P401
└── Software & PC section manager (SW, PC) — licenses, personal computers
```

## Urgent Actions (from SOP document)

1. Reassign manager for **18 equipment items** where previous managers retired, passed away, or transferred
2. Prepare disposal documentation for **12 inactive software items**
3. Assess 4 broken equipment items for repair vs. disposal
4. Verify status of AWAC Nortek 2007 (ID 5617) — contact TT DLHTKMT

## Deployment Roadmap

| Week | Activity |
|------|----------|
| 1-2 | Appoint section managers, finalize master data |
| 3 | Print QR labels, create Google Forms, configure Sheets |
| 4 | Attach QR labels, initial inventory, photograph equipment |
| 5 | Staff training (15-20 min demo session) |
| 6 | Trial run, collect feedback |
| 7-8 | Adjust procedures, official launch |

## Development Notes

- The landing page (`QR_Landing_Page.html`) is a single-file static HTML/JS app with all 54 equipment records embedded as a JSON object — no backend required
- QR labels file is large (~49K tokens) as it contains inline SVG QR codes for all equipment
- The system currently has 6 form types in the landing page (borrow, return, maintain, report, training, research) though the SOP and template documents only describe 4 forms
- Software items (SW category) are managed digitally without physical QR labels
- The `.xlsx` master database should be the source of truth; the JSON in the landing page is a synchronized copy

## Organizational Structure (3 Bộ môn)

1. Bộ môn Khí tượng và Khí hậu học
2. Bộ môn Thủy văn và Tài nguyên nước
3. Bộ môn Khoa học và Công nghệ Biển

## Session Summary Rule (bắt buộc)

Trước khi kết thúc MỌI phiên làm việc trong workspace này, tạo hoặc cập nhật `SESSION_SUMMARY_YYYY-MM-DD.md` theo ngày local hiện tại.

- Chưa có file của hôm nay → tạo mới. Đã có → **nối thêm** một mục mới ghi rõ ngày giờ, KHÔNG ghi đè mục cũ.
- Chỉ ghi sự thật của phiên hiện tại:
  - công việc đã hoàn thành và các quyết định quan trọng
  - file đã tạo hoặc thay đổi
  - kiểm tra/test đã chạy và kết quả thực tế
  - việc còn lại, vướng mắc, và các bước vận hành cần theo dõi
- Ngắn gọn, đủ để phiên sau tiếp tục được.
- Nói rõ khi KHÔNG có file nào thay đổi hoặc KHÔNG chạy test nào.
- Cập nhật summary trước câu trả lời cuối cùng, kể cả khi người dùng không yêu cầu.
- KHÔNG được khẳng định đã deploy, đã sửa Google Sheets, hay đã push GitHub trừ khi việc đó thực sự đã được xác minh trong phiên.
- Summary là bộ nhớ dự án, không thay thế source code hay tài liệu chính thức.

> Rule này đồng bộ với `.github/instructions/session-summary.instructions.md` (bản dành cho Copilot). Sửa một bên thì sửa cả bên kia.

## Changes Log (Session 23/05/2026)

- Fixed: `onFormSubmitBorrow` — trigger, email cho mọi yêu cầu, đúng event object (Sheet-side)
- Fixed: `checkOverdueReturns` — fuzzy column matching, quét tất cả sheet (không chỉ Log_Muon_Tra)
- Fixed: QR labels 7303/7897 bị chồng HTML
- Added: `syncFormResponsesToLog()` — đồng bộ Form Responses → Log_Muon_Tra
- Added: Cột "Quá hạn" (O) trong Log_Muon_Tra — formula tự động + ✓ đỏ + highlight dòng
- Added: Menu "Đồng bộ Form → Log_Muon_Tra" trong onOpen()
- Updated: 3 bộ môn chính xác trong Forms và Template (bỏ "Khoa học Môi trường")
- Updated: CLAUDE.md với trạng thái hiện tại

## Changes Log (Session 03/06/2026)

- Added: PWA wire-up trong `index.html` + `QR_Landing_Page.html` — thêm `<link rel="manifest">`, `<meta name="theme-color" content="#1a3a6b">`, apple-touch-icon/apple-mobile-web-app meta, và `navigator.serviceWorker.register('sw.js')`. Giờ app "Thêm vào màn hình chính"/cài như ứng dụng được trên cả 3 nền tảng.
- Note: 2 file `index.html` và `QR_Landing_Page.html` giống hệt nhau — mọi sửa đổi phải áp dụng cho CẢ HAI để giữ đồng bộ.
- Added: `Kich_ban_video_HMO_Eq.docx` — kịch bản video hướng dẫn (caption-only + nhạc nền): Phần 1 cài đặt app (Android Chrome / iPhone Safari / PC Chrome-Edge), Phần 2 quy trình dùng hằng ngày (6 hành động), kèm storyboard + ghi chú sản xuất.
- Added: `Slide_intro_outro_HMO_Eq.pptx` — slide intro/outro dọc 9:16 theo HMO brand.

## Changes Log (Session 14/07/2026 — Code review toàn bộ + fix)

- Fixed (`Google_Apps_Script.js`):
  - `onFormSubmitDispatch`: phân loại mượn/trả — ưu tiên nội dung form ("dự kiến trả" ⇒ mượn), tên sheet match từ nguyên vẹn (tránh "tra" khớp nhầm "trang"/"training")
  - `onFormSubmitBorrow`: ngày mượn/hạn trả dùng `parseDate_()` (tránh misparse DD/MM/YYYY theo locale VN)
  - `onFormSubmitReturn`: ngày trả từ form dùng `parseDate_()`
  - `checkMaintenanceSchedule`: ngày hiệu chuẩn dùng `parseDate_()`, skip ngày không hợp lệ
  - `monthlyReport`: `lastOfMonth` = 23:59:59 (không bỏ sót giao dịch ngày cuối tháng) + `parseDate_()`
  - `generateAnnualUsageReport`: fix sortOrder falsy-zero (`|| 3` làm '🟢 Tích cực' = 0 thành 3) → dùng `in`-check
  - `checkBorrowStatus_`: hạn trả dùng `parseDate_()`
- Fixed (`sw.js`): thêm guard `method === 'GET' && response.ok` trước `cache.put` (tránh throw với POST); bump CACHE v5 → v6
- Verified: index.html ≡ QR_Landing_Page.html (identical); JS landing page, manifest.json, Create_Google_Forms.js, QR_Labels_Print.html — OK, không cần sửa
- Known issues còn lại: training/research form URL placeholder; 20 thiết bị chưa có người quản lý trong JSON; link phê duyệt qua email chưa có xác thực (chấp nhận được Phase 1)
- ~~Apps Script fixes phải paste lại + chạy `setup()`~~ → ĐÃ XONG: diff 26/08 xác nhận các fix này đã có sẵn trên Google, không cần `setup()` lại

## Changes Log (Session 26/08/2026 — Lịch sử sử dụng thiết bị)

- Added (`Google_Apps_Script.js`): route `?action=history&id=<QR>` trong `doGet()` + helper `getUsageHistory_(qrCode)` — đọc `Log_Muon_Tra`, trả lịch sử mượn/trả mới nhất trước (borrower, địa điểm, ngày mượn/trả, giờ sử dụng, `isActive`). Cố ý KHÔNG trả email (cột P) và ghi chú nội bộ (cột N).
- Added (`index.html` + `QR_Landing_Page.html`): nút "🕘 Lịch sử sử dụng" + panel gập/mở, `escapeHtml()` cho mọi giá trị nội suy, trạng thái loading/empty/error.
- Added: `.github/instructions/session-summary.instructions.md` — quy định tạo/cập nhật `SESSION_SUMMARY_YYYY-MM-DD.md` trước khi kết thúc session.
- ✅ Đã deploy **version 8** (26/08) và xác minh live: API trả đúng `{qrCode, history}`, GitHub Pages đã có nút, sw `v7`.
- ⚠️ Endpoint Web App đang để "Anyone" — route này công khai tên người mượn + địa điểm cho bất kỳ ai có `WEB_APP_URL` (URL nằm trong HTML public). Chấp nhận được ở Phase 1 nội bộ; cần xem lại nếu mở rộng.

## Deploy Apps Script (clasp)

Script là **container-bound** trong Sheet master. Cấu hình đã có sẵn trong repo: `.clasp.json`, `.claspignore`, `appsscript.json`.

```bash
clasp push -f                                   # đẩy Google_Apps_Script.js lên
clasp create-version "<mô tả>"                  # -> in ra số version mới
clasp update-deployment AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q -V <n>
```

Bốn điều dễ sai:

1. **Luôn `update-deployment`, KHÔNG `create-deployment`** — cái sau sinh URL `/exec` mới, làm chết link trong `index.html`.
2. **`clasp list-scripts` trả về NHẦM script** (bound script không hiện trong Drive). scriptId đúng đã nằm trong `.clasp.json`. Nên `clasp pull` đối chiếu trước khi push.
3. **Đừng xoá `.claspignore`** — clasp push thay TOÀN BỘ file set, không có whitelist sẽ upload nhầm `index.html`, `QR_Landing_Page.html`, `QR_Labels_Print.html`, `Create_Google_Forms.js`, `sw.js` lên Apps Script.
4. **Đừng sửa `appsscript.json`** — khối `webapp` (`USER_DEPLOYING` / `ANYONE_ANONYMOUS`) mất là đổi quyền truy cập web app.

Chỉ chạy lại `setup()` khi **thay đổi định nghĩa trigger**; sửa logic thường thì không cần.
Lần đầu trên máy mới: `npm i -g @google/clasp` → `clasp login` → bật Apps Script API tại script.google.com/home/usersettings (không bật thì push bị chặn dù pull vẫn chạy).

## Tech Stack

- **Frontend:** Static HTML/CSS/JS (vanilla, no framework)
- **Backend:** Google Sheets + Google Apps Script
- **Forms:** Google Forms with pre-filled URL linking
- **QR Generation:** Inline SVG in HTML
- **Hosting:** GitHub Pages (`phamtiendat-135.github.io/HMO-equipment/`)
- **Repo:** `github.com/phamtiendat-135/HMO-equipment` (đã init, `main` đồng bộ với remote)
- **Deploy Apps Script:** clasp 3.4.0 — xem mục *Deploy Apps Script (clasp)* bên trên
- **Language:** Vietnamese (all UI and documents)
