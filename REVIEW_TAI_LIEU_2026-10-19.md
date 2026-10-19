# REVIEW TÀI LIỆU — đối chiếu với hệ thống đang chạy (19/10/2026)

**Phạm vi:** `HUONG_DAN_TRIEN_KHAI.md`, `QUY_TRINH_QUAN_LY_THIET_BI.md`, `QUY_TRINH_SU_DUNG_THIET_BI.docx` (+ `.pdf`), `Kich_ban_video_HMO_Eq.docx`.
**Đối chiếu với:** Apps Script **v16** (deploy 19/10), trang tra cứu GitHub Pages (`sw.js` v13), 5 Google Form đang chạy.
**Trạng thái:** đề xuất để anh duyệt — **chưa sửa file nào**. Anh đánh dấu ✅ / ❌ / ✏️ vào từng mục rồi báo tôi.

---

## 0. Hệ thống đã khác tài liệu ở đâu (tóm tắt)

Các tài liệu viết ngày 28/04 (riêng kịch bản video viết ngày 03/06). Từ đó tới nay, hệ thống đã thay đổi:

| # | Thay đổi | Từ khi | Tài liệu đang nói |
|---|---|---|---|
| 1 | Nút mượn tách thành **📦 Mượn mang đi** và **🔬 Sử dụng tại chỗ** (form riêng, không cần duyệt, tự kết thúc sau số giờ khai) | 15/10 (v13) | Một nút "Đăng ký mượn"; dùng tại chỗ thì "đăng ký lịch với CB" |
| 2 | Hệ thống **tự kiểm tra và tự từ chối** yêu cầu mượn: mã lạ, thiết bị Hỏng/Không hoạt động, hết số lượng, ngày sai, số giờ sai | 29/09 (v11) | Không đề cập |
| 3 | Thiết bị ≥ 100 tr: PTK duyệt bằng **nút trong email** (link ký, dùng 1 lần, hạn 14 ngày, có trang xác nhận). Trong lúc chờ duyệt thì **giữ chỗ** | 29/09 | "Duyệt qua form / email tự động" (chung chung) |
| 4 | Thiết bị < 100 tr: **tự động chấp nhận**, chỉ gửi thông báo cho PTK. **Không có bước CB mảng duyệt** | từ đầu | "CB phụ trách mảng phê duyệt trực tiếp" |
| 5 | Email gửi người mượn khi được duyệt: **hạn trả nổi bật, nút "Thêm vào lịch", nút "Hướng dẫn sử dụng"** (link Google Site ở cột T Master_Data) | 15/10 | Không có |
| 6 | Trả thiết bị: khai trả → **⏳ Chờ kiểm tra** → **CB quản lý thiết bị** nhận email ✅ Hoạt động tốt / ⚠️ Có sự cố → sự cố thì khóa mượn tới khi PTK bấm **🔧 Đã khắc phục**. CB chưa kiểm tra thì nhắc vào ngày thứ 2, 4, 6… | 19/10 (v16) | "CB đối chiếu, ghi log" (làm tay) |
| 7 | Nhắc trả: **2 ngày trước hạn** (7h, 1 lần) + **quá hạn: nhắc mỗi ngày** (8h) cho người mượn + email tổng hợp gửi PTK | 23/05 | "Quá hạn 3 ngày nhắc, 7 ngày báo PTK" |
| 8 | Trang tra cứu: badge trạng thái thời gian thực (Sẵn sàng / Chờ duyệt / Đang mượn – hạn / Quá N ngày / Đang dùng tại chỗ – đến giờ / Chờ kiểm tra / Đang xử lý sự cố), **🕘 Lịch sử sử dụng** (tên đã che), **Nhật ký toàn Khoa** (cần mã 8 số) | 26/08–19/10 | Không có |
| 9 | Email đều dùng **mẫu HTML có logo HMO**, xưng "thầy/cô" | 15/10 | — |
| 10 | Báo cáo tháng tách **lượt mượn mang đi / lượt dùng tại chỗ (có giờ)**; báo cáo hiệu quả sử dụng năm chạy ngày 1/1 | 29/09, 15/10 | Báo cáo chung chung |
| 11 | Master_Data có thêm cột **"Link hướng dẫn sử dụng"** (cột T) và **"Email CB quản lý"** (cột kế tiếp, khi anh tạo bằng menu); Log_Muon_Tra có các cột **S–V** (Mã giao dịch, nguồn phản hồi, Kiểm tra nhận lại) | 29/09–19/10 | 5 sheet gốc |
| 12 | Deploy Apps Script bằng **clasp** (`push` → `create-version` → `update-deployment`), không dán code tay; app cài như ứng dụng (PWA) | 03/06–15/10 | Dán code vào trình soạn thảo, chạy `setup` |

---

## 1. Các quyết định anh cần chốt TRƯỚC (ảnh hưởng nhiều tài liệu)

| Mã | Vấn đề | Lựa chọn | Tôi đề xuất |
|---|---|---|---|
| **D1** | Thiết bị **< 100 tr**: tài liệu ghi "CB mảng duyệt", nhưng hệ thống tự chấp nhận | (a) Sửa tài liệu theo hệ thống: tự động chấp nhận, CB mảng bàn giao trực tiếp · (b) Làm thêm bước CB mảng duyệt qua email (code) | **(a)** cho đợt chạy thử: ít bước, hiện cũng chưa bổ nhiệm CB mảng |
| **D2** | Người mượn thiết bị **< 100 tr không nhận email nào**, nên không có hạn trả, nút lịch hay nút hướng dẫn | (a) Thêm email "Đã ghi nhận mượn" cùng mẫu với email duyệt (code nhỏ) · (b) Giữ như cũ | **(a)**: đồng bộ trải nghiệm, video cũng dễ kể |
| **D3** | **Lỗi phát hiện khi review:** đúng **ngày hạn trả**, hệ thống đã gửi "QUÁ HẠN… quá 0 ngày" (mượn trả trong ngày còn nhận cả email nhắc lẫn email quá hạn cùng sáng). Trang tra cứu/Nhật ký chỉ tính quá hạn từ hôm sau | (a) Sửa code: chỉ gửi quá hạn khi ≥ 1 ngày · (b) Thêm mốc báo PTK riêng khi quá 7 ngày như tài liệu cũ | **(a)**, bỏ (b) vì PTK đã nhận tổng hợp hằng ngày |
| **D4** | Email **báo hỏng** và **nhắc bảo trì** chỉ gửi PTK, trong khi tài liệu nói gửi "CB phụ trách" | (a) Sửa code: gửi thêm "Email CB quản lý" của thiết bị (cột mới) · (b) Sửa tài liệu: chỉ gửi PTK | **(a)**: đã có cột email, thêm ~10 dòng code |
| **D5** | Form **tại chỗ chỉ cho tài khoản @hus.edu.vn**; form mượn thì công khai | (a) Giữ, ghi vào tài liệu · (b) Mở công khai | **(a)**, nhưng ghi rõ "đăng nhập email trường" |
| **D6** | Mục **🎓 Đào tạo / 🔬 NCKH** trên trang tra cứu là chỗ giữ chỗ (báo "chưa kết nối") | (a) Ẩn khỏi trang tới khi có form · (b) Giữ | **(a)**: tránh người dùng bấm vào chức năng chết, và video không phải né |
| **D7** | **Kiểm kê:** tài liệu mô tả "hệ thống ghi đã kiểm kê + ảnh + dashboard", nhưng **chưa có** chức năng này | (a) Viết lại thành quy trình làm tay (quét QR xem thông tin, ghi biên bản), ghi "Phase 2" · (b) Làm chức năng kiểm kê | **(a)** |
| **D8** | **HPC/server:** tài liệu nói "dùng qua tài khoản, không áp dụng mượn"; nay ai cũng bấm được "Sử dụng tại chỗ" cho mọi thiết bị | (a) Giữ quy định HPC dùng qua tài khoản; "tại chỗ" dành cho thiết bị phòng thí nghiệm · (b) Cho HPC khai báo tại chỗ | **(a)**, và cân nhắc ẩn 2 nút mượn với nhóm HPC/NET/INF/SW (code nhỏ) |
| **D9** | Video: thay quay màn hình bằng **motion graphic** chỉ có điện thoại + email | Xem mục 5 (3 cách sản xuất) | Cách **C** |

---

## 2. `HUONG_DAN_TRIEN_KHAI.md`: đề xuất **viết lại** thành "Hướng dẫn triển khai & vận hành kỹ thuật"

Bản hiện tại là hướng dẫn **cài mới từ đầu** (tạo Sheet, tạo form tay, dán code), và hầu hết các bước nay đã làm xong hoặc đã đổi cách làm. Đề xuất bố cục mới:

| Mục mới | Nội dung | Thay cho |
|---|---|---|
| 1. Kiến trúc hiện tại | Sơ đồ: Tem QR → trang tra cứu (GitHub Pages, PWA) → 5 Google Form → Sheet master → Apps Script (trigger + web app). Kèm URL thật | (mới) |
| 2. Cấu trúc Google Sheet | Master_Data (thêm cột T "Link hướng dẫn sử dụng" và cột "Email CB quản lý": ý nghĩa, cách điền); Log_Muon_Tra A–V (cột hệ thống S–V **không sửa tay**, trừ V khi cần); Log_Bao_Tri, Log_Bao_Hong, các tab Form Responses (**không xoá, không đổi tên câu hỏi**). Sheet phải để Ngôn ngữ Việt Nam, múi giờ GMT+7 | Bước 1 |
| 3. Năm Google Form | Bảng: tên form, ai dùng, giới hạn đăng nhập, câu hỏi "chữ ký" không được đổi tên; tạo bằng `Create_Google_Forms.js` (`createOnsiteFormOnly`); **đừng chạy `createAllForms`** (tạo trùng) | Bước 2 (tạo tay) |
| 4. Trang tra cứu | `index.html` = `QR_Landing_Page.html` (giống hệt), mục `FORMS`; host GitHub Pages `phamtiendat-135.github.io/HMO-equipment/`; mỗi lần sửa phải tăng số phiên bản trong `sw.js` | Bước 3 (URL ví dụ sai: `hmo-equipment.github.io`, "dòng 170") |
| 5. Tem QR | Tem trỏ tới `…/HMO-equipment/?id=<mã>`; **54 tem** (`QR_Labels_Print.html`), **đợt 1: 37 tem** (`QR_Labels_Print_Dot1.html`), **áp phích A4** dán phòng (`QR_Poster_Landing_A4.html`) | Bước 4–5 (URL `/lookup?id=` sai; "61 nhãn" sai) |
| 6. Deploy Apps Script | clasp: cài, `clasp login`, bật Apps Script API; 3 lệnh; **luôn `update-deployment`**, không `create-deployment`; không `clasp pull` trong repo; khi nào mới cần `setup()` | Bước 6 (dán code) |
| 7. Cấu hình một lần sau deploy | Menu: tạo cột Link hướng dẫn, tạo cột Email CB quản lý, tạo mã Nhật ký; điền email CB | (mới) |
| 8. Kiểm thử | `node tests/backend_regression.cjs`, `node tests/frontend_regression.cjs <jsdom>`; kịch bản thử tay 1 vòng: mượn → duyệt → trả → kiểm tra; tại chỗ; báo hỏng | Bước 7 |
| 9. Menu "🔧 Quản lý TB" | Bảng 12 mục menu và khi nào dùng | (mới) |
| 10. Lịch tự động | 7h nhắc trả; 8h quá hạn + nhắc kiểm tra; thứ Hai 9h bảo trì; ngày 1 hằng tháng báo cáo; 1/1 báo cáo năm | (mới) |
| 11. Xử lý sự cố thường gặp | Email không đến (kiểm tra Executions), link hết hạn (menu gửi lại), sửa tay trạng thái (cột M / V), menu "chạy mãi" | (mới) |
| 12. Danh mục file | Cập nhật đầy đủ (hiện thiếu ~10 file: `index.html`, `sw.js`, `manifest.json`, tests, `.clasp.json`, `Create_Google_Forms.js`, tem đợt 1, áp phích…) | Bảng cuối |

Bỏ bảng "Thời gian ước tính ~1 ngày" (đã triển khai xong). Thay bằng **checklist vận hành định kỳ**.

---

## 3. `QUY_TRINH_QUAN_LY_THIET_BI.md` (SOP): nâng **phiên bản 2.0**

| Vị trí | Hiện tại | Đề xuất sửa |
|---|---|---|
| Đầu trang | v1.0, 28/04/2026 | **v2.0**, ngày ban hành mới; thêm mục "Lịch sử thay đổi" |
| 2.2 (cuối) | Lựa chọn: Xem, Đăng ký mượn, Xác nhận trả, Báo bảo trì, Báo hỏng | Cập nhật: Mượn mang đi · Sử dụng tại chỗ · Xác nhận trả · Ghi bảo trì · Báo hỏng · Lịch sử sử dụng; trạng thái hiển thị thời gian thực |
| 3.1–3.2 Phân quyền | 3 CB mảng; cột "Phê duyệt: CB mảng < 100tr" | Thêm vai trò **CB quản lý thiết bị** (theo từng thiết bị, cột "Email CB quản lý"): **kiểm tra khi nhận lại**. Sửa cột phê duyệt theo **D1**. Cột "Dashboard" → "Nhật ký toàn Khoa (cần mã)" |
| **QT-02** | 5 bước chung | **Tách thành 3 quy trình:** **QT-02A Mượn mang đi** (hệ thống tự kiểm tra/từ chối → < 100 tr: tự chấp nhận [D1] · ≥ 100 tr: PTK duyệt qua email, chờ duyệt vẫn giữ chỗ → email kết quả có hạn trả, nút lịch, hướng dẫn) · **QT-02B Sử dụng tại chỗ** (form, ≤ 24 giờ/lần, không duyệt, tự kết thúc, giữ chỗ tới giờ kết thúc, PTK nhận thông báo) · **QT-02C Trả và kiểm tra nhận lại** (khai trả → chờ kiểm tra → ✅ / ⚠️ → 🔧 khắc phục; nhắc CB sau 2 ngày) |
| QT-02 bước 2 | "CB kiểm tra trước khi bàn giao" | Giữ, ghi rõ là **thao tác ngoài hệ thống** (chưa có bước bàn giao trên hệ thống) |
| QT-02 bước 4 | "Quá hạn 3 ngày nhắc" | 2 ngày trước hạn: nhắc người mượn; **từ ngày sau hạn**: nhắc mỗi ngày + tổng hợp PTK (sau khi sửa **D3**) |
| (mới) | — | **Sơ đồ vòng đời một khoản mượn:** Chờ duyệt → Đang mượn → (Quá hạn) → Chờ kiểm tra → Đã trả / Có sự cố → Đã khắc phục; Từ chối. Ghi rõ trạng thái nào **khóa mượn** |
| QT-03 bước 1 | Email nhắc **CB mảng** trước 30 ngày | Email **PTK** (thứ Hai hằng tuần), hoặc thêm CB theo **D4** |
| QT-03 bước 5 | "Hệ thống tự tính ngày bảo trì tiếp theo theo chu kỳ" | **Sai:** người ghi bảo trì **tự nhập** ngày lần tiếp theo; hệ thống nhắc theo ngày đó |
| QT-04 bước 1 | Báo **CB mảng** | Báo **PTK** (+ CB theo D4). Thêm nguồn sự cố thứ 2: **phát hiện khi kiểm tra nhận lại** (tự ghi Log_Bao_Hong) |
| QT-04 bước 4 | "Trạng thái tự chuyển Hỏng, QR ngừng hoạt động" | Hệ thống **không tự đổi** Master_Data: PTK sửa cột tình trạng thành "Hỏng"/"Không hoạt động" thì hệ thống tự **chặn mượn** |
| QT-05 | Báo cáo tháng chung chung; kiểm kê "đối chiếu vị trí quét" | Báo cáo tháng (nội dung thật: tổng quan, tình trạng, lượt mượn mang đi / tại chỗ (giờ) / trả / bảo trì); **báo cáo hiệu quả sử dụng năm** (1/1); Nhật ký toàn Khoa; kiểm kê theo **D7** |
| V. Hạ tầng | Data Studio dashboard; "QR link đến form" | Bỏ Data Studio (không có). Cập nhật: trang tra cứu GitHub Pages (PWA) → form; Apps Script web app (API trạng thái, trang phê duyệt/kiểm tra) |
| Phụ lục B | "Mượn TB chính, hệ thống tự nhắc kiểm tra phụ kiện" | **Chưa có** chức năng này → ghi "CB đối chiếu phụ kiện khi bàn giao/nhận lại" |
| Phụ lục C | 18 thiết bị cần gán CB (danh sách tháng 4) | Cập nhật theo Master_Data hiện tại (file xlsx: **20 thiết bị** chưa có CB quản lý), bổ sung cột "Email CB quản lý" cần điền. *Cần anh xác nhận số liệu trên Sheet thật.* |

---

## 4. `QUY_TRINH_SU_DUNG_THIET_BI.docx` (văn bản ban hành): nâng **phiên bản 2.0**, xuất lại PDF

| Mục | Hiện tại | Đề xuất sửa |
|---|---|---|
| Trang bìa | Phiên bản 1.0, 28/04/2026 | 2.0, ngày mới |
| III. Cơ cấu | 4 vai trò | Thêm **CB quản lý thiết bị**: kiểm tra khi nhận lại; sửa quyền duyệt theo D1 |
| IV. Mượn | 1 bảng 5 bước, "chọn Đăng ký mượn" | **IV-A Mượn mang đi** (5 bước: quét → 📦 → điền form → hệ thống kiểm tra; ≥ 100 tr chờ email duyệt → nhận thiết bị, email có hạn trả). **IV-B Sử dụng tại chỗ** (3 bước: quét → 🔬 → nhập số giờ; đăng nhập email trường; không cần trả) |
| IV (đoạn đầu) | "TB tại chỗ… đăng ký lịch với CB phụ trách" | Thay bằng "dùng nút 🔬 Sử dụng tại chỗ" (trừ HPC, theo D8) |
| V. Trả | 4 bước, CB "xác nhận hoàn tất" | Người mượn: quét → ✅ → điền form (2 bước) → thiết bị chuyển "Chờ kiểm tra". **CB quản lý**: mở email → kiểm tra → ✅ hoặc ⚠️ (mô tả sự cố) → người mượn nhận email "đã nhận lại" |
| V (ghi chú) | "Quá hạn 3 ngày nhắc, 7 ngày báo PTK" | "Nhắc 2 ngày trước hạn; quá hạn nhắc mỗi ngày, PTK nhận tổng hợp" (theo D3) |
| VI.2 | "Hệ thống nhắc trước 30 ngày" | Ghi rõ nhắc **PTK** (+ CB theo D4) |
| VII. Báo hỏng | "Thông báo CB phụ trách và PTK" | Theo D4. Thêm: sự cố phát hiện khi nhận lại được ghi tự động |
| VIII 8.2 | Tại chỗ "đăng ký lịch với CB" | Dùng nút 🔬; HPC dùng tài khoản (D8) |
| (mới) VIII 8.4 | — | **Email thầy/cô sẽ nhận**: bảng loại email → khi nào → cần làm gì (duyệt, nhắc trả, quá hạn, đã nhận lại, từ chối tự động) |
| IX. Thao tác nhanh (trang dán phòng) | 3 khối: mượn / trả / hỏng | **5 khối:** 📦 Mượn mang đi · 🔬 Dùng tại chỗ · ✅ Trả · ⚠️ Báo hỏng · 🕘 Xem lịch sử; thêm 1 dòng "Cài app: thêm vào màn hình chính". *Nên đồng bộ với `QR_Poster_Landing_A4.html`* |

---

## 5. `Kich_ban_video_HMO_Eq.docx`: **thay bằng kịch bản motion graphic**

### 5.1 Khái niệm

- **Dọc 9:16, ~2:30–2:50**, chữ chèn + nhạc nền (không lời), theo màu HMO (navy `#1a3a6b`, cam `#F07800`, logo).
- **Chỉ có 2 loại khung hình:** (1) **điện thoại** (mockup) với giao diện trang tra cứu và Google Form; (2) **thẻ email** bay vào như thông báo, mở ra thành email HTML có logo. Không quay người, không quay màn hình thật.
- Chuyển cảnh bằng **chuyển động giao diện** (nút sáng lên, ngón tay chạm dạng chấm tròn, badge đổi màu), không cắt ghép.
- Dữ liệu mẫu cố định: thiết bị "Máy đo chất lượng nước Horiba U-52G", người mượn "Nguyễn Văn An", CB "Trịnh Minh Ngọc"…

### 5.2 Phân cảnh đề xuất

| Cảnh | Thời lượng | Hình (motion) | Chữ chèn |
|---|---|---|---|
| 1 Intro | 0:00–0:06 | Logo HMO, điện thoại trượt vào | **QUẢN LÝ THIẾT BỊ BẰNG MÃ QR** · Khoa KTTV&HDH |
| 2 Quét QR | 0:06–0:14 | Khung camera trên điện thoại, tem QR, vạch quét chạy → trang thiết bị mở | Quét mã QR trên thiết bị |
| 3 Trang thiết bị | 0:14–0:26 | Cuộn thẻ thiết bị; badge đổi lần lượt: 🟢 Sẵn sàng → 🔴 Đang mượn → ⏳ Chờ kiểm tra | Biết ngay thiết bị có sẵn hay không |
| 4 Chọn cách dùng | 0:26–0:34 | Hai nút 📦 / 🔬 sáng lên, mũi tên tách 2 nhánh | Mang ra ngoài → **Mượn mang đi** · Dùng tại phòng → **Sử dụng tại chỗ** |
| 5 Mượn mang đi | 0:34–0:50 | Form trượt lên, 3 ô tự điền (tên, mục đích, ngày trả), nút Gửi | Điền form (mã QR đã điền sẵn) |
| 6 Kiểm tra tự động | 0:50–0:56 | Dấu ✓ chạy qua 4 dòng: mã hợp lệ · thiết bị tốt · còn hàng · ngày hợp lệ | Hệ thống tự kiểm tra |
| 7 Email PTK duyệt | 0:56–1:10 | Thông báo email "⚠️ Yêu cầu mượn cần phê duyệt" → mở email → chạm **✅ PHÊ DUYỆT** → trang xác nhận | Thiết bị ≥ 100 triệu: Phó Trưởng khoa duyệt trong 1 chạm |
| 8 Email kết quả | 1:10–1:22 | Email xanh lá: ô **Hạn trả 20/10**, nút **📅 Thêm vào lịch** → lịch điện thoại có sự kiện | Nhận hạn trả, thêm vào lịch 1 chạm |
| 9 Nhắc trả | 1:22–1:32 | Thông báo vàng "⏰ Nhắc hạn trả — còn 2 ngày"; nhá nhanh thẻ đỏ "Quá hạn" | Nhắc trước 2 ngày · quá hạn nhắc mỗi ngày |
| 10 Sử dụng tại chỗ | 1:32–1:46 | Nút 🔬 → form ngắn (số giờ: 3) → badge 🔵 "Đang dùng tại chỗ — đến 17:00" → đồng hồ chạy → tự về 🟢 | Dùng tại phòng: không cần duyệt, tự kết thúc |
| 11 Trả thiết bị | 1:46–1:56 | Nút ✅ Xác nhận trả → form → badge ⏳ "Chờ cán bộ kiểm tra" | Trả: quét QR → Xác nhận trả |
| 12 CB kiểm tra | 1:56–2:12 | Email "🔍 Kiểm tra thiết bị khi nhận lại" → chạm ✅ Hoạt động tốt → trang nhập tên → email "✅ Đã nhận lại" tới người mượn | Cán bộ quản lý kiểm tra rồi mới nhận lại |
| 13 Nhánh sự cố | 2:12–2:22 | Chạm ⚠️ → mô tả sự cố → badge "⚠️ Đang xử lý sự cố" → PTK chạm 🔧 → về 🟢 | Có sự cố: khóa mượn tới khi khắc phục |
| 14 Báo hỏng & lịch sử | 2:22–2:32 | Lướt nút ⚠️ Báo hỏng, 🕘 Lịch sử sử dụng | Phát hiện hỏng? Báo ngay · Xem lịch sử |
| 15 Cài app | 2:32–2:42 | 3 điện thoại nhỏ: Android ⋮ / iPhone ⬆ / PC ⊕ → icon "HMO Thiết bị" | Thêm vào màn hình chính (1 lần) |
| 16 Outro | 2:42–2:50 | Tóm tắt 4 từ: **Quét · Mượn · Trả · Kiểm tra**; logo | Hỗ trợ: datpt@hus.edu.vn |

*Có thể tách cảnh 15 (cài app) thành clip ngắn riêng, hoặc cắt cảnh 13–14 để còn ~2 phút.*

### 5.3 Ba cách sản xuất

| Cách | Làm thế nào | Ưu / nhược |
|---|---|---|
| **A. Canva / CapCut** | Chụp màn hình thật, đặt vào khung điện thoại, tạo chuyển động bằng keyframe | Không cần chuyên môn; chuyển động đơn giản, mất nhiều giờ dựng tay |
| **B. Thuê dựng (After Effects / Figma)** | Gửi storyboard + ảnh giao diện cho người dựng | Đẹp nhất; tốn chi phí và thời gian trao đổi |
| **C. Dựng bằng code (tôi làm)** | Dùng **chính HTML thật** của trang tra cứu và email (đã có), dựng hoạt cảnh bằng HTML/CSS, render ra MP4 9:16 bằng trình duyệt headless; ghép nhạc bằng CapCut | Giao diện trong video **khớp 100%** với hệ thống; sửa chữ, đổi dữ liệu thì render lại nhanh. Nhược: chuyển động mức "gọn gàng", không cầu kỳ bằng After Effects |

**Đề xuất:** cách **C**. Tôi làm bản nháp (animatic) cảnh 1–8 trước để anh duyệt phong cách, rồi làm tiếp phần còn lại.

### 5.4 Bỏ khỏi kịch bản cũ

Cảnh quay tay cầm điện thoại thật; phần screen recording; nút "📋 Đăng ký mượn/Sử dụng" (không còn); 🎓 Đào tạo / 🔬 Nghiên cứu (D6); slide intro/outro `.pptx` (thay bằng intro/outro motion cùng phong cách, có thể giữ màu và chữ).

---

## 6. Tài liệu khác cũng đã cũ (chưa review chi tiết)

- `TAI_LIEU_CHUYEN_GIAO.docx`, `THUYET_TRINH_QUAN_LY_THIET_BI.docx`: chắc chắn thiếu các mục ở phần 0.
- `QR_Poster_Landing_A4.html`: nên đồng bộ nội dung với mục IX của quy trình sử dụng.
- `Google_Forms_Template.md`: thiếu ghi chú form trả đã đổi ý nghĩa (khai trả → chờ kiểm tra); lời cảm ơn form trả nên sửa trên Google Forms.
- `README.md`: rà lại.

---

## 7. Bước tiếp theo đề xuất

1. Anh chốt **D1–D9** (có thể trả lời gọn: "D1a D2a D3a…").
2. Tôi sửa code theo các mục anh chọn có code (D2, D3, D4, D6, D8): test → deploy → push.
3. Tôi viết lại `HUONG_DAN_TRIEN_KHAI.md` và `QUY_TRINH_QUAN_LY_THIET_BI.md` (Markdown), sửa `QUY_TRINH_SU_DUNG_THIET_BI.docx` **giữ nguyên định dạng văn bản hành chính**, xuất lại PDF.
4. Kịch bản video: viết lại file `.docx` theo mục 5; nếu chọn cách C thì làm animatic cảnh 1–8.
