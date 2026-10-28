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
| `sw.js` | Service worker — cache-first app shell, network-first script.google.com API (CACHE v13, có GET-guard) | ✅ Hoạt động |
| `icons/icon-192.png`, `icons/icon-512.png` | PWA icons | ✅ Có sẵn |
| `Kich_ban_video_HMO_Eq.docx` | Kịch bản video hướng dẫn (caption + storyboard, gồm đoạn cài đặt app 3 nền tảng) | ✅ Hoàn thành |
| `Slide_intro_outro_HMO_Eq.pptx` | Slide intro/outro 9:16 cho video | ✅ Hoàn thành |
| `QR_Labels_Print.html` | Printable A4 QR labels cho 54 thiết bị, organized by room | ✅ Fixed layout 7303/7897, ready to print |
| `Google_Apps_Script.js` | Apps Script: triggers, email mượn/quá hạn/bảo trì, sync Form→Log, monthly report | ✅ MASTER_SHEET_ID đã cấu hình |
| `Create_Google_Forms.js` | Script tạo 4 Google Forms tự động | ✅ Đã cập nhật 3 bộ môn |
| `Google_Forms_Template.md` | Template specs cho 4 Google Forms | ✅ Đã cập nhật 3 bộ môn |
| `TAI_LIEU_CHUYEN_GIAO.docx` | Tài liệu chuyển giao hệ thống | ✅ Hoàn thành |
| `QUY_TRINH_QUAN_LY_THIET_BI.md` | SOP **v2.0 dự thảo (19/10)** — QT-01, QT-02A mượn mang đi, QT-02B tại chỗ, QT-02C trả + kiểm tra nhận lại, QT-03→05, bảng nhắc việc/email | ✅ Cập nhật theo v17 |
| `HUONG_DAN_TRIEN_KHAI.md` | **Hướng dẫn triển khai & vận hành kỹ thuật v2.0 (19/10)** — kiến trúc, Sheet A–V, 5 form, clasp, menu, lịch, xử lý sự cố | ✅ Cập nhật theo v17 |
| `QUY_TRINH_SU_DUNG_THIET_BI.docx` / `.pdf` | Quy trình quản lý & sử dụng (văn bản ban hành) **v2.0 dự thảo (19/10)** — dựng lại bằng docx-js giữ định dạng v1.0; PDF xuất bằng Word (có emoji → ~4,3 MB) | ✅ Cập nhật theo v17 |
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
| `onFormSubmitDispatch(e)` | On form submit | Nhận diện 5 form theo bộ câu hỏi (`FORM_SIGNATURES`) → mượn / tại chỗ / trả / bảo trì / báo hỏng; form lạ → báo admin, không xử lý; lỗi → ném ra (execution Failed) |
| `onFormSubmitBorrow(e)` | qua dispatcher | Kiểm tra (QR có trong Master, không Hỏng/Không hoạt động, còn số lượng, ngày hợp lệ) → khóa → ghi Log (có LoanID) → gửi mail. Không hợp lệ → tự động từ chối |
| `onFormSubmitOnsite(e)` | qua dispatcher | Sử dụng tại chỗ: cùng kiểm tra như mượn + số giờ (≤ `ONSITE_MAX_HOURS`), KHÔNG cần duyệt, tự đóng (cột I = lúc gửi + số giờ, giữ chỗ tới lúc đó), email thông báo PTK |
| `onFormSubmitReturn(e)` | qua dispatcher | Chọn đúng khoản (1 khoản / khớp email / khớp tên) → ghi ngày trả + cột V "⏳ Chờ kiểm tra" (CHƯA đóng) → email CB quản lý kiểm tra; không chắc chắn hoặc ngày sai → KHÔNG ghi, báo admin |
| `confirmInspectionFromPage()` | google.script.run | Trang kiểm tra nhận lại (link ký `inspect_ok` / `inspect_issue` / `resolve`): ✅ đóng khoản + email người mượn; ⚠️ ghi Log_Bao_Hong + email PTK (khóa mượn); 🔧 PTK mở lại |
| `checkPendingInspections_()` | qua `checkOverdueReturns` (8h hằng ngày) | Khoản chờ kiểm tra ≥ 2 ngày → nhắc CB (rồi 2 ngày/lần) + báo PTK |
| `resendPendingInspections()` / `ensureManagerEmailColumn()` | Manual (menu) | Gửi lại email kiểm tra đang chờ / tạo cột "Email CB quản lý" trong Master_Data |
| `onFormSubmitMaintenance(e)` / `onFormSubmitDamage(e)` | qua dispatcher | Ghi `Log_Bao_Tri` / `Log_Bao_Hong`, báo admin |
| `createLoanSlipTemplate()` | Manual (menu, 1 lần) | Dựng Google Doc mẫu phiếu mượn (14 dấu `{{...}}`), lưu `LOAN_SLIP_TEMPLATE_ID`; có mẫu rồi thì không tạo lại. **Chưa chạy = tính năng phiếu ngủ** |
| `issueLoanSlip_(d)` / `createLoanSlip_(d)` | qua `notifyLoanRequest_` (< 100 tr) và `applyApprovalDecision_` (≥ 100 tr, sau khi duyệt) | Sao chép mẫu → điền → PDF + Word → ghi link cột W. **Không bao giờ ném lỗi**: lỗi → email PTK "Không tạo được phiếu mượn", giao dịch/email xác nhận vẫn đi |
| `sendSlipToManagers_(d, slip)` / `regenerateLoanSlip()` | tự động / menu | Email PDF+Word cho CB quản lý (trống → PTK) / tạo lại phiếu cho dòng đang chọn trong Log |
| `resendPendingApprovals()` | Manual (menu) | Gửi lại email phê duyệt cho mọi yêu cầu còn chờ (link mới) |
| `confirmApprovalFromPage()` | google.script.run | Bước 2 phê duyệt: kiểm lại chữ ký, chỉ ghi khi còn CHỜ DUYỆT |
| `syncFormResponsesToLog()` | Manual (menu) | Đồng bộ dữ liệu cũ từ Form Responses → Log_Muon_Tra |
| `findBorrowSheets_()` | Helper | Tự động tìm sheet chứa dữ liệu mượn/trả (fuzzy column matching) |
| `findColIndex_()` | Helper | Fuzzy matching tên cột (hỗ trợ cả tên Form và tên Log) |
| `lookupEquipment(qrCode)` | API call | Returns equipment data by QR code |
| `doGet(e)` | Web App endpoint | `?id=` (chỉ trường công khai), `history` (tên che, không địa điểm), `alllog` (cần mã), `allStatus`, `approve/reject` (chỉ hiện trang xác nhận) |
| `onOpen()` | Sheet open | Menu "Quản lý TB" (gồm gửi lại email phê duyệt, tạo mã truy cập Nhật ký) |

## Approval Workflow

- Equipment valued **< 100 million VND**: approved by section manager (CB phu trach mang)
- Equipment valued **>= 100 million VND**: requires Vice Dean approval (auto-email notification)
- Threshold is per UNIT: `unitValue = Nguyên giá ÷ Số lượng` ("Nguyên giá (tr.đ)" in Master_Data is the LINE TOTAL, as in the accounting ledger — do not change it to per-unit; monthly report sums line totals)
- High-value items always needing Vice Dean approval: AWAC600 2021 (~1,216M), Hemisphere S631 (960M/unit × 2 = 1,920M), ADCP FlowQuest (~471M/unit × 2 = 941.6M), lab models (420–2,263M)

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

## Changes Log (Session 29/09/2026 — Sửa lỗi theo PRE_DEPLOY_REVIEW_2026-09-28.md, Apps Script v11)

- **Trạng thái giao dịch** suy ra một chỗ (`loanStatus_`): chờ duyệt / đã duyệt / từ chối / đã trả. Chờ duyệt **giữ chỗ**; bị từ chối nhả ngay, không nhắc quá hạn.
- `Log_Muon_Tra` thêm cột **S Mã giao dịch, T Nguồn phản hồi mượn, U Nguồn phản hồi trả** — tự nâng cấu trúc ở lần ghi đầu (cờ `LOG_SCHEMA_VERSION=2` trong Script Properties), gán LoanID cho dòng cũ, cập nhật công thức cột O bỏ qua dòng từ chối/chờ duyệt.
- Link phê duyệt ký theo **LoanID**, dùng 1 lần, mở ra **trang xác nhận** (bấm nút mới ghi). Link trước v11 không còn hiệu lực → menu "Gửi lại email phê duyệt đang chờ".
- Dữ liệu người dùng ghi vào Sheet qua `asText_` (chống chèn công thức); HTML email/trang duyệt escape qua `escapeHtml_`.
- API công khai lọc trường (`PUBLIC_EQUIPMENT_FIELDS`); lịch sử từng thiết bị **che tên** (`maskName_`) và bỏ địa điểm; lỗi đọc dữ liệu trả `ok:false` thay vì "rảnh/rỗng".
- Báo cáo năm: tỷ lệ = giờ được mượn (cắt theo kỳ, tính cả khoản chưa trả) / giờ lịch của kỳ × số lượng; chạy ngày 1/1 cho năm trước (qua `monthlyReport`), `yearlyReport` thành no-op.
- Frontend: vá XSS `?id=`, `hasEquipment()` (chặn khóa kế thừa), `fetchJson` timeout 15s, lỗi ≠ rỗng, cán bộ quản lý lấy từ API, Đào tạo/NCKH không báo thành công giả. `sw.js` v10: chỉ xóa cache `hmo-equipment-*`, chỉ fallback HTML cho điều hướng.
- `QR_Labels_Print.html` dựng lại cấu trúc (54 tem, đúng lưới/khu vực). `update_managers.py` cập nhật cả 2 file, escape JSON.
- Test: `node tests/backend_regression.cjs` và `node tests/frontend_regression.cjs [jsdom]` — **chạy trước mỗi lần deploy**.
- Rủi ro còn chấp nhận: khóa 15 phút của mã Nhật ký là khóa chung; nhận diện form theo tên câu hỏi (đổi tên câu hỏi trên Form phải cập nhật `FORM_SIGNATURES`).

## Changes Log (Session 14/10/2026 — Apps Script v12: đọc ngày từ ô)

- Ngày trên 4 form (mượn, hạn trả, ngày trả, ngày bảo trì/hiệu chuẩn, thời điểm phát hiện hỏng) đọc từ **giá trị Date trong ô** của tab Form Responses (`formCellValues_` + `formDateFinder_`), quy về múi giờ của Sheet (`wallClockDate_`). Không còn phụ thuộc Ngôn ngữ của Sheet (locale Mỹ từng làm `e.namedValues` thành M/D/YYYY → đọc sai ngày). Không đọc được ô thì dùng chữ dd/MM/yyyy như cũ.
- Test: `tests/backend_regression.cjs` 46 test (thêm 6 test ngày; 5 test mới fail trên code cũ).
- Vẫn nên để Sheet: Ngôn ngữ Việt Nam, Múi giờ GMT+07:00 (dấu thời gian trong cột T và hiển thị).

## Changes Log (Session 15/10/2026 — Mượn mang đi / Sử dụng tại chỗ, Apps Script v13)

- ✅ Đã deploy **version 13** (15/10) và xác minh: deployment `@13`, API live trả đúng, code trên Google khớp repo. Máy này đã cài clasp 3.4.0 (`%APPDATA%\npm` trong PATH User) và đã `clasp login`.
- ✅ **Version 14** (15/10): dòng mượn mang đi định dạng G:H `dd/MM/yyyy` (bỏ "0:00:00"); email PTK đánh dấu "⚠️ trả trong ngày" khi hạn trả = ngày mượn (`returnsSameDay_`, vẫn hợp lệ); menu tạo cột Link hướng dẫn: toast thay alert, nhảy tới ô tiêu đề, báo tên cột dạng chữ (`columnLetter_`). Đã xác minh `@14` + code trên Google khớp repo.
- Lưu ý menu: `alert()` chặn script tới khi bấm OK → menu trông như treo. Hàm menu mới nên dùng `toast`.

- Thêm hình thức **Sử dụng tại chỗ** (không cần phê duyệt, không cần quét trả) bên cạnh **Mượn mang đi** (giữ nguyên luồng duyệt ≥ 100 tr).
- Form riêng tạo bằng `createOnsiteFormOnly()` (`Create_Google_Forms.js`); chữ ký nhận diện: câu hỏi "Họ và tên người sử dụng", "Số giờ sử dụng (dự kiến)".
- Log: dòng tại chỗ có cột M = `🔬 Sử dụng tại chỗ — không cần duyệt` (`isOnsite_`), cột I = giờ kết thúc, cột Q = số giờ khai báo. Không thêm cột, không đổi schema. API trả status `onsite`.
- Landing page: `FORMS.onsite` = form thật (`1FAIpQLSeOh3Py…`, `entry.1095952640` = Mã QR, tạo 15/10) → 2 nút "📦 Mượn mang đi" / "🔬 Sử dụng tại chỗ" (nếu là placeholder `FORM_ID…` thì tự quay về 1 nút). `sw.js` v12. Form tại chỗ tạo ra ở chế độ chỉ tài khoản @hus.edu.vn (mặc định Workspace); **đã mở công khai 21/10/2026** như 4 form kia.
- Báo cáo tháng tách lượt mượn mang đi / tại chỗ (có giờ); báo cáo năm giữ giờ bắt đầu thật (không cắt về 00:00).
- Email kết quả phê duyệt gửi người mượn: HTML (`buildDecisionEmail_`) — hạn trả trong tiêu đề + ô nổi bật, tên in đậm, nút "Thêm vào lịch" (Google Calendar). Mọi email gửi người mượn xưng "thầy/cô" (không dùng "bạn").
- Nút "📘 Hướng dẫn sử dụng" trong email đã duyệt: link lấy từ cột **"Link hướng dẫn sử dụng"** của Master_Data (tạo bằng menu "📘 Tạo cột Link hướng dẫn…" → `ensureGuideColumn()`), chỉ nhận `https://`; thiếu thì dùng `CONFIG.GUIDE_DEFAULT_URL`; cả hai trống → nút mờ + "(đang cập nhật)". Thêm link vào Sheet là có hiệu lực ngay, không cần deploy.
- Header email có logo HMO (`CONFIG.LOGO_URL` → `HMO_logo.jpg` trên GitHub Pages). **Không xoá/đổi tên `HMO_logo.jpg` trong repo** — email sẽ mất logo.
- Khung email HTML dùng chung (`emailLayout_` + `emailBlock_`, `emailPill_`, `emailHighlight_`, `emailNotice_`, `emailDetails_`, `emailButton_`…, tông màu `EMAIL_TONE`). Đã áp dụng cho: kết quả phê duyệt, xin duyệt / thông báo mượn (PTK), tại chỗ, từ chối tự động, nhắc trả, quá hạn (người mượn + tổng hợp PTK). Mỗi email vẫn gửi kèm bản chữ thường. **Chưa** đổi: trả TB, bảo trì, báo hỏng, báo cáo tháng/năm, lỗi hệ thống.

## Changes Log (Session 19/10/2026 — Kiểm tra thiết bị khi nhận lại)

- Khai trả **không còn đóng khoản ngay**: ghi ngày trả + cột **V "Kiểm tra nhận lại"** = `⏳ Chờ kiểm tra` → email **CB quản lý** (cột Master_Data **"Email CB quản lý"**, nhiều email cách dấu phẩy; trống → PTK) có 2 nút ✅ Hoạt động tốt / ⚠️ Có sự cố (link ký theo Mã giao dịch, trang xác nhận bắt buộc nhập người kiểm tra; sự cố bắt buộc mô tả + mức độ).
- Trạng thái mới (`loanStatus_`): `inspecting` (V bắt đầu "Chờ kiểm tra"), `issue` ("Có sự cố"); "Hoạt động tốt" / "Đã khắc phục" / trống → `returned`. Cả `inspecting` và `issue` **giữ chỗ** (không cho mượn), không nhắc quá hạn. Dòng cũ cột V trống = đã trả. Khai báo tại chỗ không qua kiểm tra.
- Sự cố → dòng `Log_Bao_Hong` (nguồn `kiem-tra:<Mã GD>`) + email PTK có nút **🔧 Đã khắc phục** (mở lại cho mượn, cập nhật "Trạng thái xử lý"). Sửa tay trong Sheet: ghi cột V bắt đầu bằng "Đã khắc phục" hoặc "Hoạt động tốt".
- Nhắc: chạy trong `checkOverdueReturns` (không cần `setup()`), ngày thứ 2, 4, 6… sau khai trả.
- Cấu trúc Log v3 (`LOG_SCHEMA_VERSION=3`) — tự thêm header cột V ở lần ghi đầu.
- Landing page: badge "⏳ Đã trả — chờ cán bộ kiểm tra" / "⚠️ Đang xử lý sự cố", nhãn lịch sử; `sw.js` v13.

## Changes Log (Session 19/10/2026 — v17 + tài liệu)

- ✅ Deploy **version 17** (xác minh `@17`, code trên Google khớp repo): email "✅ Đã ghi nhận mượn" cho TB < 100 tr (`sendAutoAcceptedEmail_`, `buildDecisionEmail_(…, autoAccepted)`); nhắc quá hạn từ ngày SAU hạn trả (`OVERDUE_DAYS=1`, trước đó gửi "quá 0 ngày"); báo hỏng gửi PTK + Email CB quản lý (`withManagers_`); nhắc bảo trì gửi thêm từng CB (`sendMaintenanceToManagers_`); nhắc bảo trì tính theo ngày lịch (trước hụt 1 ngày).
- Viết lại `HUONG_DAN_TRIEN_KHAI.md` và `QUY_TRINH_QUAN_LY_THIET_BI.md` (v2.0) theo `REVIEW_TAI_LIEU_2026-10-19.md` (D1a: TB < 100 tr tự ghi nhận). Chưa làm: `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf`, kịch bản video (motion graphic).
- Viết lại `QUY_TRINH_SU_DUNG_THIET_BI.docx/.pdf` v2.0 (12 mục, trang cuối = Thao tác nhanh để in). D8: giữ nguyên — HPC dùng qua tài khoản, không thống kê giờ (ít người dùng). Còn mở: D6 (Đào tạo/NCKH), kịch bản video.

## Changes Log (Session 19/10/2026 chiều — v18: giá một chiếc)

- Phát hiện: "Nguyên giá (tr.đ)" ghi TỔNG dòng tài sản (16 dòng có Số lượng > 1, VD Hemisphere S631: 2 máy = 1.920 tr → 960 tr/máy; ADCP 2 máy = 941,6 tr → ~471 tr/máy) nhưng email và ngưỡng duyệt dùng số tổng.
- Quyết định (anh Đạt): GIỮ cột tổng (khớp sổ tài sản); code tính `unitValue = value / qty` trong `getMasterRecord_` → ngưỡng duyệt (`recordLoanRequest_`, `syncFormResponsesToLog`) và email (`equipValueText_`, `formatMillion_`: "960 triệu VNĐ/chiếc (tổng 2 chiếc: 1.920 triệu)"). Báo cáo tháng vẫn cộng tổng dòng. Không đổi kết quả duyệt của thiết bị nào hiện có.
- ✅ Deploy **version 18** (xác minh `@18`, code trên Google khớp repo). Sửa số trong SOP, HUONG_DAN, QUY_TRINH_SU_DUNG (.docx/.pdf).

## Changes Log (Session 27/10/2026 — Phiếu mượn thiết bị)

- Thêm **phiếu mượn thiết bị** cho mượn mang đi (thiết kế: `docs/superpowers/specs/2026-10-27-phieu-muon-thiet-bi-design.md`, kế hoạch: `docs/superpowers/plans/2026-10-27-phieu-muon-thiet-bi.md`). Mẫu là Google Doc (sửa như Word, giữ các dấu `{{...}}`); hai ô ký: Cán bộ mượn thiết bị (trái) + Cán bộ bàn giao (phải); dòng phê duyệt ghi lại việc PTK duyệt (không có ô ký PTK); không in giá trị, không in điện thoại (form không thu).
- Thời điểm: TB < 100 tr → ngay khi ghi nhận; TB ≥ 100 tr → ngay sau khi PTK duyệt. Từ chối / tự từ chối / tại chỗ → không phiếu. Người mượn nhận PDF (đính vào email "Đã ghi nhận mượn"/"Đã duyệt"); CB quản lý (cột "Email CB quản lý", trống → PTK) nhận email riêng kèm PDF + Word.
- Log_Muon_Tra thêm cột **W "Phiếu mượn"** (link Google Doc; `LOG_SCHEMA_VERSION=4`).
- **Tính năng ngủ cho tới khi chạy menu "📄 Tạo mẫu phiếu mượn"** (cần "Cho phép" quyền Drive/Docs lần đầu) → deploy code trước không làm lỗi trigger. Không sửa `appsscript.json` (Apps Script tự phát hiện quyền).
- Menu "📄 Tạo lại phiếu mượn (dòng đang chọn)": chỉ gửi CB quản lý.
- Test: `tests/backend_regression.cjs` 125 test (94 cũ + 31 mới; harness có thêm `opts.globals` và `slipGlobals` giả Drive/Docs).
- ✅ Đã deploy **version 19** (28/10, xác minh `@19`, code trên Google khớp repo). ⚠️ **CHƯA kiểm thử với Drive/Docs/email thật.** Việc còn lại: menu Tạo mẫu phiếu mượn (Cho phép) → mượn thử 1 TB < 100 tr và 1 TB ≥ 100 tr → in thử PDF.

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
**Trigger chạy theo code HEAD ngay sau `clasp push`**, còn Web App chạy theo version đã deploy → luôn chạy test trước, và làm push → create-version → update-deployment liền một mạch.
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
