# QUY TRÌNH QUẢN LÝ TRANG THIẾT BỊ
## Khoa Khí tượng Thủy văn và Hải dương học — ĐHKHTN, ĐHQGHN

**Phiên bản:** 1.0  
**Ngày ban hành:** 28/04/2026  
**Người soạn thảo:** TS. Phạm Tiến Đạt — Phó Trưởng khoa  
**Dự án:** DATAI — Quản lý số trang thiết bị Khoa

---

## I. MỤC ĐÍCH VÀ PHẠM VI

### 1.1 Mục đích
Xây dựng quy trình quản lý trang thiết bị bằng mã QR nhằm: theo dõi chính xác vị trí, tình trạng, người phụ trách từng thiết bị; quản lý toàn bộ vòng đời từ tiếp nhận đến thanh lý; ghi nhận lịch sử mượn-trả, bảo trì, hiệu chuẩn; và cung cấp dữ liệu cho báo cáo kiểm kê và ra quyết định đầu tư.

### 1.2 Phạm vi
Áp dụng cho toàn bộ 74 trang thiết bị thuộc sổ tài sản Khoa KTTV&HDH, bao gồm 57 thiết bị đang hoạt động (Bình thường + Tốt), 4 thiết bị hỏng, 12 thiết bị không hoạt động (đề xuất thanh lý), và 1 thiết bị chưa rõ tình trạng. Thiết bị phân bố tại 5 khu vực chính trong tòa T3: P204, P206, P207, P401, và phòng server T3.

### 1.3 Đối tượng áp dụng
Tất cả cán bộ, giảng viên, nghiên cứu sinh, học viên cao học, và sinh viên thuộc Khoa khi sử dụng trang thiết bị của Khoa.

---

## II. PHÂN LOẠI THIẾT BỊ VÀ MÃ QR

### 2.1 Hệ thống phân loại

Thiết bị được chia thành 8 nhóm, mỗi nhóm có mã 2-3 ký tự:

| Mã | Nhóm | Số lượng | Giá trị (tr.đ) | Ví dụ |
|-----|------|----------|----------------|-------|
| HPC | Hệ thống tính toán | 17 | 3,956 | Server SuperMicro, Node tính toán |
| NET | Thiết bị mạng | 9 | 714 | Switch, Infiniband, cáp mạng |
| OBS | Quan trắc & đo đạc | 15 | 7,730 | AWAC, ADCP, GPS, Horiba U-52G |
| LAB | Thí nghiệm phòng | 10 | 6,685 | Máng HM160, bộ mô hình thủy văn |
| SW | Phần mềm | 14 | 990 | Delft3D, Intel oneAPI |
| PC | Máy tính cá nhân | 3 | 106 | MacBook, iMac |
| INF | Hạ tầng phụ trợ | 4 | 166 | UPS, tủ Rack |
| OTH | Khác | 2 | 47 | Phụ kiện ADCP |

### 2.2 Cấu trúc mã QR

Mã QR có dạng: **HMO-[NHÓM]-[MÃ TÀI SẢN]**

Ví dụ:
- `HMO-OBS-8372` = Thiết bị đo sóng dòng chảy AWAC600 Nortek
- `HMO-HPC-7879` = Máy chủ SuperMicro Server 1028U-TR4+
- `HMO-LAB-8373` = Máng thực nghiệm GUNT HM160

Khi quét mã QR, người dùng được chuyển đến trang thông tin thiết bị với các lựa chọn: Xem thông tin, Đăng ký mượn, Xác nhận trả, Báo bảo trì, Báo hỏng.

### 2.3 Yêu cầu nhãn QR vật lý

| Nhóm thiết bị | Loại nhãn | Vị trí dán | Ghi chú |
|---------------|-----------|-----------|---------|
| OBS (hiện trường) | Nhãn công nghiệp chống nước, chống UV | Thân thiết bị, tránh vùng tiếp xúc nước | Cần nhãn dự phòng trong hộp đựng |
| HPC, NET | Nhãn giấy thường, ép plastic | Mặt trước chassis hoặc trên rack | Thêm nhãn trên rack map |
| LAB | Nhãn vinyl bền | Khung thiết bị, tránh vùng nóng/ẩm | Thiết bị lớn: dán cả bảng QR treo tường cạnh TB |
| SW | Không dán vật lý | Quản lý số trong hệ thống | Gắn với license key |
| PC, INF | Nhãn giấy, ép plastic | Mặt sau hoặc đáy thiết bị | |

---

## III. CƠ CẤU TỔ CHỨC QUẢN LÝ

### 3.1 Sơ đồ quản lý

```
Phó Trưởng khoa (Tổng quản lý, phê duyệt)
├── CB phụ trách mảng Tính toán (HPC, NET, INF)
│   └── Phòng P206-T3, P207-T3, Phòng server T3
├── CB phụ trách mảng Quan trắc & Thí nghiệm (OBS, LAB, OTH)
│   └── Phòng P204-T3, P401-T3
└── CB phụ trách mảng Phần mềm & PC (SW, PC)
    └── Quản lý license, máy tính cá nhân
```

### 3.2 Phân quyền

| Vai trò | Xem | Mượn/Trả | Bảo trì | Phê duyệt | Thanh lý | Dashboard |
|---------|-----|----------|---------|-----------|---------|-----------|
| Phó Trưởng khoa | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CB phụ trách mảng | ✓ | ✓ | ✓ | TB < 100tr | Đề xuất | ✓ (mảng mình) |
| Giảng viên/NCS | ✓ | Yêu cầu | Báo cáo | — | — | — |
| Sinh viên | ✓ | Yêu cầu (qua GV) | Báo cáo | — | — | — |

---

## IV. QUY TRÌNH CHI TIẾT

### QT-01: KIỂM KÊ VÀ GÁN MÃ QR BAN ĐẦU

**Thời điểm:** Khi triển khai hệ thống (1 lần) + kiểm kê định kỳ 6 tháng.  
**Người thực hiện:** CB phụ trách mảng, Phó Trưởng khoa phê duyệt.

**Bước 1 — Chuẩn bị dữ liệu:** Đối chiếu file master data với sổ tài sản kế toán. Xác nhận danh sách 57 thiết bị hoạt động, cập nhật cán bộ quản lý cho 18 thiết bị cần gán lại.

**Bước 2 — In và dán mã QR:** In nhãn QR theo đúng loại cho từng nhóm thiết bị (xem mục 2.3). Mỗi nhãn gồm: mã QR, mã text (ví dụ HMO-OBS-8372), và tên viết tắt thiết bị.

**Bước 3 — Quét xác nhận tại chỗ:** CB phụ trách đến từng thiết bị, quét QR bằng điện thoại, xác nhận vị trí thực tế, chụp ảnh thiết bị. Hệ thống ghi nhận "đã kiểm kê" với timestamp và ảnh.

**Bước 4 — Hoàn tất:** Phó Trưởng khoa xem dashboard kiểm kê, xác nhận tỷ lệ hoàn thành 100%, ký biên bản kiểm kê.

### QT-02: MƯỢN — SỬ DỤNG — TRẢ THIẾT BỊ

**Phạm vi áp dụng:** Thiết bị nhóm OBS (quan trắc hiện trường), LAB (thí nghiệm di động), PC (máy tính). Thiết bị HPC/NET/INF cố định tại phòng server không áp dụng quy trình này mà quản lý qua tài khoản truy cập.

**Bước 1 — Đăng ký mượn:** Người mượn quét QR trên thiết bị → mở Google Form → điền: họ tên, đơn vị/nhóm nghiên cứu, mục đích sử dụng, địa điểm triển khai, ngày mượn, ngày dự kiến trả.

**Bước 2 — Kiểm tra trước khi bàn giao:** CB phụ trách mảng kiểm tra tình trạng thiết bị theo checklist: thiết bị chính hoạt động bình thường, phụ kiện đầy đủ (đối chiếu danh sách phụ kiện trong hệ thống — ví dụ ADCP 6527 kèm bộ rung điện 6532 và giá lắp xuồng 6530), pin/nguồn đầy đủ, tài liệu hướng dẫn kèm theo nếu cần.

**Bước 3 — Phê duyệt:** Thiết bị có nguyên giá < 100 triệu: CB phụ trách mảng phê duyệt trực tiếp. Thiết bị có nguyên giá ≥ 100 triệu: Phó Trưởng khoa phê duyệt qua form (nhận thông báo email tự động). Lưu ý: AWAC (1,2 tỷ), ADCP (941 tr), Thiết bị định vị vệ tinh (1,9 tỷ), và các bộ mô hình > 400 triệu luôn cần Phó Trưởng khoa phê duyệt.

**Bước 4 — Sử dụng:** Trong thời gian mượn, trạng thái thiết bị trong hệ thống chuyển sang "Đang sử dụng" kèm thông tin người mượn và địa điểm. Nếu quá hạn trả 3 ngày, hệ thống gửi nhắc nhở tự động.

**Bước 5 — Trả thiết bị:** Người mượn quét QR → điền form trả: ngày trả, tình trạng khi trả. CB phụ trách kiểm tra đối chiếu tình trạng, ghi nhận vào log. Nếu có hư hỏng, chuyển sang QT-04.

### QT-03: BẢO TRÌ VÀ HIỆU CHUẨN

**Chu kỳ khuyến nghị:**

| Nhóm | Chu kỳ | Nội dung chính |
|-------|--------|---------------|
| HPC | 6 tháng | Kiểm tra ổ cứng, quạt, firmware, backup config |
| NET | 12 tháng | Kiểm tra cổng, firmware update |
| OBS (AWAC, ADCP) | Theo NSX hoặc trước mỗi đợt khảo sát | Hiệu chuẩn sensor, kiểm tra pin, vệ sinh đầu dò |
| OBS (GPS, đo nước) | 12 tháng | Kiểm tra độ chính xác, cập nhật firmware |
| LAB (máng, bộ mô hình) | Trước mỗi đợt thực hành | Kiểm tra bơm, van, cảm biến, vệ sinh |
| INF (UPS) | 6 tháng | Test pin, kiểm tra tải, vệ sinh |

**Bước 1 — Cảnh báo tự động:** Hệ thống gửi email nhắc CB phụ trách mảng trước 30 ngày khi đến hạn bảo trì/hiệu chuẩn.

**Bước 2 — Lập kế hoạch:** CB phụ trách lập kế hoạch bảo trì: nội dung công việc, đơn vị thực hiện (tự làm hoặc thuê ngoài), dự toán chi phí.

**Bước 3 — Phê duyệt:** Phó Trưởng khoa phê duyệt kế hoạch và kinh phí.

**Bước 4 — Thực hiện:** Quét QR thiết bị → điền form bảo trì: loại công việc (bảo trì định kỳ / hiệu chuẩn / sửa chữa), ngày thực hiện, đơn vị thực hiện, chi phí, nội dung chi tiết, kết quả, đính kèm biên bản/chứng chỉ hiệu chuẩn.

**Bước 5 — Cập nhật hệ thống:** Hệ thống tự động tính ngày hiệu chuẩn/bảo trì tiếp theo dựa trên chu kỳ. Giấy chứng nhận hiệu chuẩn được lưu trữ digital, liên kết với mã QR thiết bị.

### QT-04: BÁO HỎNG VÀ THANH LÝ

**Bước 1 — Báo hỏng:** Bất kỳ ai phát hiện thiết bị hỏng đều có thể quét QR → điền form báo hỏng: mô tả sự cố, thời điểm phát hiện, ảnh chụp (nếu có). Hệ thống gửi thông báo ngay cho CB phụ trách mảng.

**Bước 2 — Đánh giá:** CB phụ trách đánh giá: có thể sửa chữa hay không, chi phí ước tính, thời gian sửa chữa. Nguyên tắc: nếu chi phí sửa chữa > 50% giá trị còn lại → đề xuất thanh lý.

**Bước 3 — Quyết định:** Nếu sửa chữa: chuyển sang QT-03 (bảo trì). Nếu thanh lý: Phó Trưởng khoa lập biên bản đề xuất thanh lý, trình Trường theo quy trình tài sản.

**Bước 4 — Cập nhật:** Trạng thái thiết bị chuyển sang "Hỏng — chờ sửa" hoặc "Thanh lý". Mã QR được đánh dấu ngừng hoạt động.

**Hành động ngay:** 17 thiết bị hiện tại cần xử lý theo quy trình này (12 không hoạt động đề xuất thanh lý, 4 hỏng cần đánh giá sửa/thanh lý, 1 chưa rõ tình trạng cần xác minh).

### QT-05: BÁO CÁO VÀ KIỂM KÊ ĐỊNH KỲ

**Báo cáo hàng tháng (tự động):** Hệ thống tổng hợp: số thiết bị đang mượn, thiết bị quá hạn trả, thiết bị đến hạn bảo trì, thống kê tần suất sử dụng theo nhóm. Gửi email cho Phó Trưởng khoa.

**Kiểm kê 6 tháng/lần:** CB phụ trách mảng đi kiểm kê thực tế, quét QR từng thiết bị tại chỗ. Hệ thống đối chiếu vị trí quét với vị trí ghi trong sổ. Phó Trưởng khoa ký biên bản kiểm kê, xuất báo cáo theo mẫu Trường.

---

## V. HẠ TẦNG KỸ THUẬT

### 5.1 Giai đoạn 1: Google Forms + Sheets (triển khai ngay)

| Thành phần | Công cụ | Ghi chú |
|-----------|---------|---------|
| Master data | Google Sheet "HMO_Master" | Import từ file Excel đã chuẩn hóa |
| Form mượn-trả | Google Form → Sheet "Log_Muon_Tra" | QR link đến form |
| Form bảo trì | Google Form → Sheet "Log_Bao_Tri" | QR link đến form |
| Form báo hỏng | Google Form → Sheet "Log_Bao_Hong" | QR link đến form |
| Dashboard | Google Sheet + Data Studio | Biểu đồ tổng quan |
| Cảnh báo | Google Apps Script | Email tự động |

### 5.2 Giai đoạn 2: Tích hợp DATAI (sau 3-6 tháng)

Chuyển toàn bộ dữ liệu từ Google Sheets sang hệ thống DATAI. Mã QR giữ nguyên, chỉ thay đổi URL đích. Bổ sung: xác thực người dùng, phân quyền chi tiết, API cho báo cáo tự động, tích hợp với hệ thống tài sản Trường.

---

## VI. TRIỂN KHAI

### 6.1 Lộ trình

| Tuần | Nội dung | Người thực hiện |
|------|---------|----------------|
| 1-2 | Bổ nhiệm CB phụ trách mảng, hoàn thiện master data | Phó TK |
| 3 | In nhãn QR, tạo Google Forms, cấu hình Sheets | Phó TK + CB |
| 4 | Dán QR, kiểm kê ban đầu, chụp ảnh thiết bị | CB phụ trách |
| 5 | Tập huấn cán bộ và giảng viên | Phó TK |
| 6 | Vận hành thử, thu thập phản hồi | Tất cả |
| 7-8 | Điều chỉnh quy trình, ban hành chính thức | Phó TK |

### 6.2 Hành động ưu tiên ngay

1. Gán lại cán bộ quản lý cho 18 thiết bị hiện đang trống (do CB nghỉ hưu, mất, chuyển công tác)
2. Lập hồ sơ thanh lý 12 thiết bị (phần mềm) không còn hoạt động
3. Đánh giá 4 thiết bị hỏng: Server Dell PE R720, máy đo kim loại nặng HM1000, máy phân tích dầu OCMA-310, máy đo độ đục LISST
4. Xác minh tình trạng AWAC Nortek 2007 (ID 5617) — cần liên hệ TT ĐLHTKMT

---

## VII. PHỤ LỤC

### Phụ lục A: Danh sách file dữ liệu
- `HMO_Master_Equipment_Database.xlsx` — File master data 5 sheet
- `QUY_TRINH_QUAN_LY_THIET_BI.md` — Tài liệu này

### Phụ lục B: Thiết bị có quan hệ phụ kiện
- ADCP FlowQuest 600 (HMO-OBS-6527) → Phụ kiện: Bộ rung điện (HMO-OTH-6532), Giá lắp xuồng (HMO-OTH-6530)
- Khi mượn thiết bị chính, hệ thống tự động nhắc kiểm tra phụ kiện kèm theo.

### Phụ lục C: Danh sách 18 thiết bị cần gán lại cán bộ quản lý

| Mã QR | Thiết bị | CB cũ | Lý do |
|-------|---------|-------|-------|
| HMO-SW-2767 | PM NK Graphics | Trần Tân Tiến | Nghỉ hưu |
| HMO-SW-2775 | PM Ram | Trần Tân Tiến | Nghỉ hưu |
| HMO-SW-5622 | SW Sedimeter | Đinh Văn Ưu | Đã mất |
| HMO-SW-5625 | HYPACK Max | Đinh Văn Ưu | Đã mất |
| HMO-OBS-5617 | AWAC Nortek 2007 | Nguyễn Thọ Sáo | Đã mất 2023 |
| HMO-HPC-7303 | Hệ thống Máy Chủ | Trần Tân Tiến | Nghỉ hưu |
| HMO-HPC-7302 | Server Super Micro | Nguyễn Thọ Sáo | Đã mất 2023 |
| HMO-NET-7308 | Mellanox cable | Ngô Đức Thành | Chuyển công tác |
| HMO-NET-7307 | Card nối mạng | Ngô Đức Thành | Chuyển công tác |
| HMO-NET-7306 | Hộp chia Mellanox | Ngô Đức Thành | Chuyển công tác |
| HMO-OBS-8372 | AWAC600 Nortek 2021 | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-LAB-8374 | Máy tạo sóng | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-LAB-8375 | Mô phỏng bãi biển | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-LAB-8376 | Bẫy trầm tích | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-LAB-8377 | Bộ cấp trầm tích | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-OBS-8378 | Máy đo vận tốc nước | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-LAB-8379 | Mười áp kế dạng ống | Đa/Trung chuyển CT | Chuyển công tác |
| HMO-OBS-8380 | Thiết bị đo mực nước | Đa/Trung chuyển CT | Chuyển công tác |
