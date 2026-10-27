# QUY TRÌNH QUẢN LÝ TRANG THIẾT BỊ
## Khoa Khí tượng Thủy văn và Hải dương học — ĐHKHTN, ĐHQGHN

**Phiên bản:** 2.0 (dự thảo) — 19/10/2026
**Thay thế:** Phiên bản 1.0 ban hành 28/04/2026
**Người soạn thảo:** TS. Phạm Tiến Đạt — Phó Trưởng khoa
**Dự án:** DATAI — Quản lý số trang thiết bị Khoa

---

## I. MỤC ĐÍCH VÀ PHẠM VI

### 1.1 Mục đích
Quản lý trang thiết bị bằng mã QR nhằm: theo dõi chính xác vị trí, tình trạng, người phụ trách từng thiết bị; quản lý vòng đời từ tiếp nhận đến thanh lý; ghi nhận lịch sử mượn – sử dụng – trả, bảo trì, hiệu chuẩn, sự cố; cung cấp dữ liệu cho báo cáo kiểm kê, đánh giá hiệu quả sử dụng và quyết định đầu tư.

### 1.2 Phạm vi
Toàn bộ 74 trang thiết bị thuộc sổ tài sản Khoa KTTV&HDH (57 đang hoạt động, 4 hỏng, 12 không hoạt động — đề xuất thanh lý, 1 chưa rõ tình trạng), phân bố tại P204, P206, P207, P401 và phòng server tòa T3. Trong đó 54 thiết bị có tem QR; phần mềm (SW) quản lý số, không dán tem.

### 1.3 Đối tượng áp dụng
Cán bộ, giảng viên, nghiên cứu sinh, học viên cao học, sinh viên thuộc Khoa khi sử dụng trang thiết bị của Khoa.

---

## II. PHÂN LOẠI THIẾT BỊ VÀ MÃ QR

### 2.1 Hệ thống phân loại

| Mã | Nhóm | Số lượng | Giá trị (tr.đ) | Ví dụ |
|-----|------|----------|----------------|-------|
| HPC | Hệ thống tính toán | 17 | 3,956 | Server SuperMicro, node tính toán |
| NET | Thiết bị mạng | 9 | 714 | Switch, Infiniband, cáp mạng |
| OBS | Quan trắc & đo đạc | 15 | 7,730 | AWAC, ADCP, GPS, Horiba U-52G |
| LAB | Thí nghiệm phòng | 10 | 6,685 | Máng HM160, bộ mô hình thủy văn |
| SW | Phần mềm | 14 | 990 | Delft3D, Intel oneAPI |
| PC | Máy tính cá nhân | 3 | 106 | MacBook, iMac |
| INF | Hạ tầng phụ trợ | 4 | 166 | UPS, tủ rack |
| OTH | Khác | 2 | 47 | Phụ kiện ADCP |

### 2.2 Mã QR và trang tra cứu

Mã QR có dạng **HMO-[NHÓM]-[MÃ TÀI SẢN]**, ví dụ `HMO-OBS-8372` (AWAC600 Nortek), `HMO-LAB-8373` (máng GUNT HM160).

Quét mã QR bằng camera điện thoại sẽ mở **trang tra cứu thiết bị** (cài được như ứng dụng trên điện thoại/máy tính), gồm:

- **Thông tin:** tên, mã, tình trạng, thông số, vị trí, cán bộ quản lý.
- **Trạng thái thời gian thực:** 🟢 Sẵn sàng · 🟠 Đang giữ chỗ (chờ duyệt) · 🔴 Đang được mượn (hạn trả) · ⚠️ Quá hạn N ngày · 🔵 Đang sử dụng tại chỗ (đến giờ) · ⏳ Đã trả — chờ cán bộ kiểm tra · ⚠️ Đang xử lý sự cố · ⚫ Không khả dụng (thiết bị Hỏng / Không hoạt động).
- **Thao tác:** 📦 Mượn mang đi · 🔬 Sử dụng tại chỗ · ✅ Xác nhận trả · 🔧 Ghi bảo trì · ⚠️ Báo hỏng · 🕘 Lịch sử sử dụng (tên người mượn được che bớt).
- **Nhật ký sử dụng toàn Khoa:** xem đầy đủ mọi lượt mượn, cần mã truy cập 8 số do Phó Trưởng khoa cấp.

Mục "Đào tạo (mã học phần)" và "Nghiên cứu (mã đề tài)" trên trang **chưa hoạt động**.

### 2.3 Yêu cầu nhãn QR vật lý

| Nhóm thiết bị | Loại nhãn | Vị trí dán | Ghi chú |
|---------------|-----------|-----------|---------|
| OBS (hiện trường) | Nhãn công nghiệp chống nước, chống UV | Thân thiết bị, tránh vùng tiếp xúc nước | Cần nhãn dự phòng trong hộp đựng |
| HPC, NET | Nhãn giấy thường, ép plastic | Mặt trước chassis hoặc trên rack | Thêm nhãn trên rack map |
| LAB | Nhãn vinyl bền | Khung thiết bị, tránh vùng nóng/ẩm | Thiết bị lớn: dán thêm áp phích QR A4 tại phòng |
| SW | Không dán vật lý | Quản lý số trong hệ thống | Gắn với license key |
| PC, INF | Nhãn giấy, ép plastic | Mặt sau hoặc đáy thiết bị | |

---

## III. CƠ CẤU TỔ CHỨC QUẢN LÝ

### 3.1 Sơ đồ quản lý

```
Phó Trưởng khoa (tổng quản lý; duyệt mượn TB ≥ 100 tr; xử lý sự cố, thanh lý)
├── CB phụ trách mảng Tính toán (HPC, NET, INF) — P206, P207, phòng server T3
├── CB phụ trách mảng Quan trắc & Thí nghiệm (OBS, LAB, OTH) — P204, P401
├── CB phụ trách mảng Phần mềm & PC (SW, PC) — license, máy tính cá nhân
└── CB quản lý thiết bị (theo từng thiết bị, ghi trong Master_Data)
      — bàn giao, KIỂM TRA KHI NHẬN LẠI, nhận báo hỏng và nhắc bảo trì của thiết bị mình
```

Mỗi thiết bị có **cán bộ quản lý** (cột "CB quản lý hiện tại") và **email cán bộ quản lý** (cột "Email CB quản lý") trong Master_Data. Thiết bị chưa điền email thì các email nghiệp vụ gửi về Phó Trưởng khoa.

### 3.2 Phân quyền

| Vai trò | Xem / tra cứu | Mượn mang đi / tại chỗ | Duyệt mượn | Kiểm tra nhận lại | Ghi bảo trì | Báo hỏng | Xử lý sự cố, thanh lý | Nhật ký toàn Khoa |
|---|---|---|---|---|---|---|---|---|
| Phó Trưởng khoa | ✓ | ✓ | TB ≥ 100 tr | ✓ (TB chưa có email CB) | ✓ | ✓ | ✓ | ✓ (cấp mã) |
| CB quản lý thiết bị | ✓ | ✓ | — | ✓ | ✓ | ✓ | Đề xuất | Được cấp mã |
| Giảng viên / NCS / HVCH | ✓ | ✓ | — | — | — | ✓ | — | — |
| Sinh viên | ✓ | Qua giảng viên hướng dẫn | — | — | — | ✓ | — | — |

Thiết bị **< 100 triệu**: hệ thống tự ghi nhận yêu cầu hợp lệ, **không cần duyệt**; cán bộ quản lý bàn giao trực tiếp.

---

## IV. QUY TRÌNH CHI TIẾT

### QT-01: KIỂM KÊ VÀ GÁN MÃ QR BAN ĐẦU

**Thời điểm:** khi triển khai (1 lần) và khi tiếp nhận thiết bị mới.
**Người thực hiện:** CB phụ trách mảng; Phó Trưởng khoa phê duyệt.

1. **Chuẩn bị dữ liệu:** đối chiếu Master_Data với sổ tài sản kế toán; điền đủ "CB quản lý hiện tại", "Email CB quản lý", tình trạng, số lượng, nguyên giá.
2. **In và dán tem QR:** in theo loại nhãn ở mục 2.3. Mỗi tem gồm mã QR, mã chữ (ví dụ `HMO-OBS-8372`) và tên viết tắt.
3. **Quét xác nhận tại chỗ:** quét từng tem, kiểm tra trang tra cứu mở đúng thiết bị, đúng vị trí; chụp ảnh thiết bị (lưu thư mục ảnh của Khoa).
4. **Hoàn tất:** lập biên bản kiểm kê ban đầu, Phó Trưởng khoa ký.

> Hệ thống **chưa có** chức năng ghi nhận "đã kiểm kê" hay lưu ảnh tự động (dự kiến Phase 2). Kết quả quét ghi vào biên bản.

---

### QT-02A: MƯỢN MANG ĐI

**Áp dụng:** khi mang thiết bị **ra khỏi phòng** (khảo sát hiện trường, thí nghiệm nơi khác). Chủ yếu nhóm OBS, LAB di động, PC, OTH.

| Bước | Thao tác | Người thực hiện |
|---|---|---|
| 1 | Quét QR → **📦 Mượn mang đi** → điền form: họ tên, đơn vị, vai trò, mục đích, địa điểm, ngày mượn, **ngày dự kiến trả**, tình trạng khi mượn, phụ kiện | Người mượn |
| 2 | **Hệ thống tự kiểm tra**; **tự từ chối** (email báo người mượn + PTK) nếu: mã QR không có trong danh mục · thiết bị Hỏng / Không hoạt động · đã được mượn hoặc giữ chỗ hết · ngày trả không hợp lệ hoặc trước ngày mượn | Hệ thống |
| 3a | **Thiết bị < 100 tr:** hệ thống **ghi nhận ngay**. Người mượn nhận email **"✅ Đã ghi nhận mượn"** (hạn trả, nút "Thêm vào lịch", nút "Hướng dẫn sử dụng"); PTK nhận email thông báo | Hệ thống |
| 3b | **Thiết bị ≥ 100 tr:** trạng thái **Chờ duyệt** (đã giữ chỗ). PTK nhận email **"⚠️ Yêu cầu mượn cần phê duyệt"**, bấm **✅ Phê duyệt** hoặc **❌ Từ chối** → trang xác nhận → bấm xác nhận. Link dùng 1 lần, hạn 14 ngày. Người mượn nhận email kết quả (đã duyệt: có hạn trả, nút lịch, nút hướng dẫn) | Phó Trưởng khoa |
| 3c | **Phiếu mượn thiết bị** được tự tạo ngay khi yêu cầu được chấp nhận (< 100 tr: ngay lúc ghi nhận; ≥ 100 tr: ngay sau khi PTK duyệt), điền sẵn từ form. Người mượn nhận bản **PDF** đính kèm email xác nhận để tự in; CB quản lý nhận email riêng kèm PDF + Word. Yêu cầu bị từ chối thì không có phiếu | Hệ thống |
| 4 | **Kiểm tra trước khi bàn giao:** thiết bị chính hoạt động, phụ kiện đủ (ví dụ ADCP 6527 kèm bộ rung điện 6532, giá lắp xuồng 6530), pin/nguồn, tài liệu. **In phiếu mượn; cán bộ mượn thiết bị và cán bộ bàn giao cùng ký** (phiếu là chứng từ giấy của lần bàn giao) | CB quản lý thiết bị, người mượn |
| 5 | Sử dụng đúng mục đích, đúng hạn | Người mượn |

Ngưỡng 100 triệu tính theo **giá một chiếc** = nguyên giá ÷ số lượng (cột "Nguyên giá" trong danh mục ghi **tổng** của dòng tài sản, như sổ kế toán). Luôn qua Phó Trưởng khoa, ví dụ: AWAC600 Nortek 2021 (~1.216 tr), thiết bị định vị vệ tinh Hemisphere S631 (**960 tr/máy**, 2 máy, tổng 1.920 tr), ADCP FlowQuest (~471 tr/máy, 2 máy, tổng 941,6 tr), các bộ mô hình thí nghiệm (420 – 2.263 tr).

Bước 4 là **thao tác ngoài hệ thống** (chưa có bước "đã bàn giao" trên hệ thống); phiếu đã ký do Khoa lưu bản giấy. Nếu phiếu không tạo được (hết quota, mẫu bị xóa), PTK nhận email báo lỗi và tạo lại bằng menu "Tạo lại phiếu mượn".

---

### QT-02B: SỬ DỤNG TẠI CHỖ

**Áp dụng:** dùng thiết bị **ngay tại phòng**, không mang ra ngoài (máng thực nghiệm, bộ mô hình, thiết bị đo trong phòng thí nghiệm…).

| Bước | Thao tác | Người thực hiện |
|---|---|---|
| 1 | Quét QR → **🔬 Sử dụng tại chỗ** → điền (không cần đăng nhập): họ tên, email, đơn vị, mục đích, **số giờ sử dụng** (0,5–24 giờ) | Người sử dụng |
| 2 | Hệ thống kiểm tra như QT-02A (mã, tình trạng, còn trống, số giờ hợp lệ). **Không cần duyệt.** Thời gian bắt đầu = lúc gửi khai báo | Hệ thống |
| 3 | Trang tra cứu hiện **"🔵 Đang sử dụng tại chỗ — đến HH:mm"**; thiết bị được giữ chỗ tới giờ kết thúc. PTK nhận email thông báo | Hệ thống |
| 4 | Hết giờ: **tự kết thúc**, không cần xác nhận trả. Giờ sử dụng được tính vào báo cáo | Hệ thống |

Dùng nhiều ngày thì khai báo mỗi ngày. Thiết bị phát hiện hỏng trong lúc dùng: báo theo QT-04.

**HPC / server:** sử dụng qua **tài khoản truy cập từ xa** do CB mảng Tính toán cấp, không chia sẻ tài khoản; không dùng nút mượn / tại chỗ. Hiện **không thống kê giờ sử dụng HPC** trên hệ thống (ít người dùng); CB quản lý theo dõi qua tài khoản được cấp.

---

### QT-02C: TRẢ THIẾT BỊ VÀ KIỂM TRA KHI NHẬN LẠI

| Bước | Thao tác | Người thực hiện |
|---|---|---|
| 1 | Quét QR → **✅ Xác nhận trả** → điền: họ tên, ngày trả, tình trạng khi trả, phụ kiện trả kèm, mô tả (nếu có), link ảnh (nếu có). Mang thiết bị đến CB quản lý | Người trả |
| 2 | Hệ thống ghi nhận khai trả, chuyển sang **⏳ Chờ kiểm tra**: hết nhắc quá hạn với người mượn, nhưng thiết bị **chưa cho mượn tiếp** | Hệ thống |
| 3 | CB quản lý nhận email **"🔍 Kiểm tra thiết bị khi nhận lại"**. Kiểm tra thiết bị, đối chiếu tình trạng và phụ kiện so với lúc mượn | CB quản lý thiết bị |
| 4a | **✅ Hoạt động tốt** → nhập tên người kiểm tra (ghi chú nếu có) → khoản mượn **đóng**, thiết bị sẵn sàng; người mượn nhận email **"Đã nhận lại thiết bị"** | CB quản lý thiết bị |
| 4b | **⚠️ Có sự cố** → nhập tên, chọn mức độ, **mô tả sự cố** → hệ thống ghi `Log_Bao_Hong`, thiết bị **khóa mượn**; PTK nhận email kèm nút **🔧 Đã khắc phục** | CB quản lý thiết bị |
| 5 | Sau khi sửa chữa / xử lý xong: PTK bấm **🔧 Đã khắc phục** → thiết bị mở lại cho mượn. Hỏng không sửa được: chuyển QT-04 | Phó Trưởng khoa |

- CB chưa kiểm tra sau **2 ngày**: hệ thống nhắc lại (rồi cứ 2 ngày một lần) và gửi PTK danh sách.
- Hệ thống từ chối khai trả và báo PTK xử lý tay nếu: không xác định được khoản mượn, ngày trả trước ngày mượn hoặc ở tương lai, hoặc khoản mượn còn đang chờ duyệt.
- Người trả khác người mượn, hoặc khai tình trạng hư hỏng: hệ thống vẫn ghi nhận, kèm cảnh báo cho PTK.

---

### VÒNG ĐỜI MỘT KHOẢN MƯỢN

```
                       ┌──────────── ⛔ Tự động từ chối
Gửi form mượn ─────────┤
                       ├─ ≥100 tr ─► 🟠 Chờ duyệt ──► ❌ Từ chối
                       │                    │
                       │                    ▼ ✅ PTK duyệt
                       └─ <100 tr ─────► 🔴 Đang mượn ──(quá hạn: ⚠️ nhắc mỗi ngày)
                                            │
                                            ▼ Người mượn khai trả
                                     ⏳ Chờ kiểm tra ──(nhắc CB sau 2 ngày)
                                       │           │
                                ✅ Tốt │           │ ⚠️ Có sự cố
                                       ▼           ▼
                                  🟢 Đã trả   ⚠️ Đang xử lý sự cố ──🔧 PTK khắc phục──► 🟢

Gửi form tại chỗ ──► 🔵 Đang dùng tại chỗ ──(hết giờ, tự động)──► 🟢
```

**Khóa mượn** (người khác không đăng ký được): 🟠 Chờ duyệt · 🔴 Đang mượn · 🔵 Đang dùng tại chỗ · ⏳ Chờ kiểm tra · ⚠️ Đang xử lý sự cố. Thiết bị có số lượng > 1 được mượn song song tới hết số lượng.

---

### NHẮC VIỆC VÀ EMAIL TỰ ĐỘNG

| Khi nào | Gửi ai | Nội dung |
|---|---|---|
| Gửi form mượn TB < 100 tr | Người mượn · PTK | ✅ Đã ghi nhận mượn (hạn trả, lịch, hướng dẫn) · thông báo |
| Gửi form mượn TB ≥ 100 tr | PTK | ⚠️ Cần phê duyệt (nút Phê duyệt / Từ chối) |
| PTK duyệt / từ chối | Người mượn | Kết quả (đã duyệt: hạn trả, lịch, hướng dẫn) |
| Yêu cầu không hợp lệ | Người mượn · PTK | ⛔ Từ chối tự động + lý do |
| Khai báo tại chỗ | PTK | 🔬 Thông báo (giờ bắt đầu – kết thúc) |
| Còn ≤ 2 ngày tới hạn trả (7h) | Người mượn | ⏰ Nhắc hạn trả (1 lần) |
| Quá hạn, từ ngày sau hạn trả (8h, mỗi ngày) | Người mượn · PTK (tổng hợp) | 🔴 Quá hạn N ngày |
| Người mượn khai trả | CB quản lý (chưa có email → PTK) · PTK | 🔍 Kiểm tra thiết bị · ⏳ đã khai trả |
| Chờ kiểm tra ≥ 2 ngày (8h) | CB quản lý · PTK | Nhắc kiểm tra · danh sách chưa kiểm tra |
| CB xác nhận hoạt động tốt | Người mượn | ✅ Đã nhận lại thiết bị |
| CB báo sự cố | PTK | ⚠️ Sự cố khi nhận lại (nút Đã khắc phục) |
| Báo hỏng (form) | PTK · CB quản lý | 🚨 Báo hỏng |
| Bảo trì sắp đến hạn (≤ 30 ngày) / quá hạn (thứ Hai 9h) | PTK (bản tổng) · từng CB quản lý | 🔧 Lịch bảo trì |
| Ngày 1 hằng tháng 8h | PTK | 📊 Báo cáo tháng (ngày 1/1: kèm báo cáo hiệu quả sử dụng năm) |

Email gửi người mượn xưng "thầy/cô", có logo Khoa, kèm bản chữ thường cho hộp thư không hiển thị HTML.

---

### QT-03: BẢO TRÌ VÀ HIỆU CHUẨN

**Chu kỳ khuyến nghị:**

| Nhóm | Chu kỳ | Nội dung chính |
|-------|--------|---------------|
| HPC | 6 tháng | Kiểm tra ổ cứng, quạt, firmware, backup cấu hình |
| NET | 12 tháng | Kiểm tra cổng, cập nhật firmware |
| OBS (AWAC, ADCP) | Theo NSX hoặc trước mỗi đợt khảo sát | Hiệu chuẩn sensor, kiểm tra pin, vệ sinh đầu dò |
| OBS (GPS, đo nước) | 12 tháng | Kiểm tra độ chính xác, cập nhật firmware |
| LAB (máng, bộ mô hình) | Trước mỗi đợt thực hành | Kiểm tra bơm, van, cảm biến, vệ sinh |
| INF (UPS) | 6 tháng | Test pin, kiểm tra tải, vệ sinh |

1. **Cảnh báo tự động:** thứ Hai hằng tuần, hệ thống gửi email về các thiết bị **sắp đến hạn (≤ 30 ngày)** hoặc **quá hạn** bảo trì / hiệu chuẩn: PTK nhận bản tổng, mỗi CB quản lý nhận danh sách thiết bị mình quản lý.
2. **Lập kế hoạch:** CB quản lý lập kế hoạch (nội dung, đơn vị thực hiện, dự toán).
3. **Phê duyệt:** Phó Trưởng khoa duyệt kế hoạch và kinh phí (ngoài hệ thống).
4. **Thực hiện và ghi nhận:** quét QR → **🔧 Ghi bảo trì** → điền: loại công việc, ngày thực hiện, **ngày bảo trì / hiệu chuẩn tiếp theo**, đơn vị thực hiện, chi phí, nội dung, kết quả, người thực hiện, link biên bản / chứng chỉ (Google Drive). PTK nhận email thông báo.
5. **Lần tiếp theo:** hệ thống nhắc theo **ngày tiếp theo do người ghi nhập** (không tự tính theo chu kỳ). Chỉ bản ghi mới nhất của mỗi thiết bị được dùng để nhắc.

---

### QT-04: BÁO HỎNG VÀ THANH LÝ

1. **Báo hỏng:** có hai nguồn:
   - Bất kỳ ai phát hiện hỏng: quét QR → **⚠️ Báo hỏng** → điền người phát hiện, thời điểm, mức độ (nhẹ / trung bình / nặng / nguy hiểm), mô tả, hoàn cảnh, link ảnh. PTK và CB quản lý nhận email ngay.
   - CB quản lý phát hiện khi **kiểm tra nhận lại** (QT-02C bước 4b): hệ thống tự ghi `Log_Bao_Hong`.
2. **Đánh giá:** CB quản lý đánh giá sửa được hay không, chi phí, thời gian. Nguyên tắc: chi phí sửa > 50% giá trị còn lại thì đề xuất thanh lý. Cập nhật cột "Trạng thái xử lý" trong `Log_Bao_Hong`.
3. **Quyết định:** sửa chữa thì chuyển QT-03 (sự cố từ kiểm tra nhận lại: PTK bấm 🔧 Đã khắc phục khi xong). Thanh lý thì Phó Trưởng khoa lập biên bản đề xuất, trình Trường theo quy trình tài sản.
4. **Cập nhật:** hệ thống **không tự đổi** tình trạng thiết bị. PTK sửa cột tình trạng trong Master_Data thành **"Hỏng"** hoặc **"Không hoạt động"**; từ đó hệ thống **tự chặn** mượn và sử dụng tại chỗ, trang tra cứu hiện "⚫ Không khả dụng".

**Tồn đọng:** 17 thiết bị cần xử lý (12 không hoạt động đề xuất thanh lý, 4 hỏng cần đánh giá, 1 chưa rõ tình trạng).

---

### QT-05: BÁO CÁO, NHẬT KÝ VÀ KIỂM KÊ ĐỊNH KỲ

**Báo cáo tháng (tự động, ngày 1 hằng tháng gửi PTK):** tổng số và tổng giá trị thiết bị; số thiết bị theo tình trạng; trong tháng trước: **lượt mượn mang đi, lượt trả, lượt sử dụng tại chỗ (tổng giờ), lượt bảo trì**; phân bổ theo nhóm.

**Báo cáo hiệu quả sử dụng năm (tự động ngày 1/1, hoặc chạy menu bất kỳ lúc nào):** với từng thiết bị: số lượt, tổng giờ được sử dụng (mượn mang đi + tại chỗ), tỷ lệ sử dụng = giờ sử dụng / giờ lịch của năm × số lượng; phân loại 🟢 Tích cực / 🟡 Trung bình / 🔴 Kém / ⚫ Không sử dụng. Dùng cho đề xuất đầu tư, điều chuyển, thanh lý.

**Tra cứu lịch sử:** trang tra cứu từng thiết bị (🕘 Lịch sử sử dụng, tên che bớt); **Nhật ký toàn Khoa** (đầy đủ tên, đơn vị, địa điểm) cho cán bộ được cấp mã. Đổi mã khi đã chia sẻ rộng.

**Kiểm kê 6 tháng/lần:** CB phụ trách mảng đi kiểm kê thực tế, quét QR từng thiết bị để đối chiếu thông tin, vị trí, tình trạng với trang tra cứu; ghi chênh lệch vào biên bản; cập nhật Master_Data. Phó Trưởng khoa ký biên bản, xuất báo cáo theo mẫu Trường. *(Hệ thống chưa tự ghi nhận kết quả quét kiểm kê — dự kiến Phase 2.)*

---

## V. HẠ TẦNG KỸ THUẬT

### 5.1 Giai đoạn 1: Google Workspace + trang tra cứu (đang vận hành)

| Thành phần | Công cụ | Ghi chú |
|-----------|---------|---------|
| Trang tra cứu (đích của tem QR) | Trang web tĩnh trên GitHub Pages, cài được như ứng dụng (PWA) | `phamtiendat-135.github.io/HMO-equipment` |
| Master data | Google Sheet master, tab Master_Data | Nguồn dữ liệu gốc |
| Form | 5 Google Form: mượn mang đi, sử dụng tại chỗ, trả, bảo trì, báo hỏng | Mã QR điền sẵn từ trang tra cứu |
| Nhật ký | Tab Log_Muon_Tra, Log_Bao_Tri, Log_Bao_Hong | Hệ thống ghi tự động |
| Tự động hóa | Google Apps Script | Kiểm tra yêu cầu, email, nhắc việc, báo cáo; API trạng thái cho trang tra cứu; trang xác nhận khi bấm nút trong email |

Chi tiết kỹ thuật, deploy, xử lý sự cố: `HUONG_DAN_TRIEN_KHAI.md`.

### 5.2 Giai đoạn 2: Tích hợp DATAI (sau giai đoạn chạy thử)

Chuyển dữ liệu từ Google Sheets sang hệ thống DATAI; **tem QR giữ nguyên**, chỉ đổi địa chỉ trang tra cứu. Bổ sung: đăng nhập và phân quyền chi tiết, kiểm kê có ghi nhận và ảnh, thống kê giờ sử dụng HPC, đặt lịch thiết bị, tích hợp hệ thống tài sản Trường.

---

## VI. TRIỂN KHAI

### 6.1 Lộ trình

| Giai đoạn | Nội dung | Trạng thái (19/10/2026) |
|---|---|---|
| 1 | Bổ nhiệm CB phụ trách, hoàn thiện master data | Còn thiếu: cột "Email CB quản lý" |
| 2 | Tạo form, cấu hình Sheet, Apps Script, trang tra cứu | ✅ Đang vận hành (Apps Script v17) |
| 3 | In và dán tem QR, kiểm kê ban đầu, chụp ảnh thiết bị | File in sẵn: 54 tem, đợt 1 37 tem, áp phích A4 — *PTK cập nhật tiến độ dán* |
| 4 | Tập huấn cán bộ, giảng viên (kèm video hướng dẫn) | Video đang làm lại |
| 5 | Vận hành thử, thu thập phản hồi | Sau tập huấn |
| 6 | Điều chỉnh quy trình, ban hành chính thức v2.0 | Sau vận hành thử |

### 6.2 Hành động ưu tiên

1. Điền **"Email CB quản lý"** cho các thiết bị đang hoạt động trong Master_Data (chưa có thì email kiểm tra / báo hỏng / bảo trì dồn về PTK).
2. Dần bổ sung **"Link hướng dẫn sử dụng"** (Google Site) cho từng thiết bị.
3. Lập hồ sơ thanh lý 12 thiết bị (phần mềm) không còn hoạt động.
4. Đánh giá 4 thiết bị hỏng: Server Dell PE R720, máy đo kim loại nặng HM1000, máy phân tích dầu OCMA-310, máy đo độ đục LISST.
5. Xác minh tình trạng AWAC Nortek 2007 (ID 5617), liên hệ TT ĐLHTKMT.

---

## VII. PHỤ LỤC

### Phụ lục A: Tài liệu và dữ liệu liên quan
- Google Sheet master (dữ liệu thật); `HMO_Master_Equipment_Database.xlsx` (bản gốc)
- `QUY_TRINH_SU_DUNG_THIET_BI.docx` — quy trình ban hành cho người dùng
- `HUONG_DAN_TRIEN_KHAI.md` — hướng dẫn kỹ thuật, vận hành
- `QR_Labels_Print.html` (54 tem), `QR_Labels_Print_Dot1.html` (đợt 1, 37 tem), `QR_Poster_Landing_A4.html` (áp phích)

### Phụ lục B: Thiết bị có phụ kiện đi kèm
- ADCP FlowQuest 600 (`HMO-OBS-6527`) → bộ rung điện (`HMO-OTH-6532`), giá lắp xuồng (`HMO-OTH-6530`).
- Khi bàn giao và khi kiểm tra nhận lại, **CB quản lý đối chiếu đủ phụ kiện** (form mượn và form trả có mục phụ kiện; hệ thống chưa tự đối chiếu).

### Phụ lục C: Thiết bị chưa có cán bộ quản lý

Theo `HMO_Master_Equipment_Database.xlsx`: **mọi thiết bị đang hoạt động đã có cán bộ quản lý**. Danh sách 18 thiết bị cần gán lại ở bản 1.0 đã được gán. Còn **20 thiết bị chưa có cán bộ**, tất cả ở tình trạng **"Không hoạt động"** (chờ thanh lý / xác minh):

| Mã QR | Thiết bị | Nhóm | Vị trí |
|---|---|---|---|
| HMO-HPC-7748 | Server Dell PE R720 | HPC | P207-T3 |
| HMO-OBS-5617 | AWAC — thiết bị đo sóng và dòng chảy (2007) | OBS | P204-T3 |
| HMO-OBS-7083 | Thiết bị đo hàm lượng kim loại nặng xách tay | OBS | P204-T3 |
| HMO-OBS-7082 | Máy phân tích nồng độ dầu OCMA-310 | OBS | P204-T3 |
| HMO-OBS-7081 | Máy đo độ đục và nồng độ chất rắn lơ lửng | OBS | P204-T3 |
| HMO-PC-7753 | MacBook Pro 13 inch | PC | P207-T3 |
| HMO-PC-7754 | MacBook Air 11.6 inch | PC | P207-T3 |
| HMO-PC-7755 | iMac 21.5 inch | PC | P207-T3 |
| HMO-SW-2767 | Phần mềm NK Graphics | SW | P206-T3 |
| HMO-SW-2775 | Phần mềm Ram | SW | P206-T3 |
| HMO-SW-2917 | Phần mềm số trị | SW | P206-T3 |
| HMO-SW-4082 | Nâng cấp phần mềm chuyên dụng (1205) | SW | Đề tài KC 09.04 |
| HMO-SW-6052 … 6056 | Phần mềm (5 mục) | SW | P204-T3 |
| HMO-SW-4781 | Phần mềm hỗ trợ hệ thống đa xử lý | SW | P206-T3 |
| HMO-SW-5622 | Sedimeter test & communication software | SW | P204-T3 |
| HMO-SW-5625 | HYPACK Max | SW | P204-T3 |

> Số liệu lấy từ file xlsx trong repo; **cần đối chiếu với Google Sheet thật** trước khi ban hành.

### Phụ lục D: Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 28/04/2026 | Ban hành lần đầu |
| 2.0 (dự thảo) | 27/10/2026 | Thêm phiếu mượn thiết bị (mượn mang đi): tự điền từ form, người mượn và CB quản lý nhận, hai bên ký khi bàn giao |
| 2.0 (dự thảo) | 19/10/2026 | Tách mượn mang đi / sử dụng tại chỗ; hệ thống tự kiểm tra và từ chối; PTK duyệt qua email; TB < 100 tr tự ghi nhận; kiểm tra khi nhận lại và xử lý sự cố; bảng nhắc việc và email tự động; báo cáo hiệu quả sử dụng năm; Nhật ký toàn Khoa; bảo trì nhắc cả CB quản lý; cập nhật kiểm kê (làm tay), hạ tầng, phụ lục C |
