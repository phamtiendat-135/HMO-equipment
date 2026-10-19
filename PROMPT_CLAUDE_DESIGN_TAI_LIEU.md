# Prompt cho Claude Design — 3 tài liệu hệ thống quản lý thiết bị HMO

**Cách dùng:** mỗi tài liệu là **một khối prompt** bên dưới. Mở Claude Design → **đính kèm `HMO_logo.jpg`** → dán nguyên khối → gửi. Muốn sửa thì nhắn tiếp trong cùng cuộc trò chuyện (ví dụ "rút còn 4 trang", "đổi sơ đồ bước 3 thành dạng thẻ").

Nội dung lấy từ bản v2.0 ngày 19/10/2026 (hệ thống Apps Script v17). Hệ thống thay đổi thì sửa phần "NỘI DUNG" trong prompt.

---

## Phần chung (đã chép sẵn vào từng prompt)

- Thương hiệu: Khoa Khí tượng Thủy văn & Hải dương học (HMO), Trường ĐH Khoa học Tự nhiên – ĐHQG Hà Nội.
- Màu: navy `#1a3a6b` (chủ đạo), xanh `#2F5496`, cam `#F07800` (nhấn). Màu trạng thái: xanh lá `#2e7d32` (tốt), đỏ `#c62828` (cảnh báo), vàng cam `#b45309` (nhắc hạn), xanh ngọc `#00838f` (dùng tại chỗ).
- Font không chân, hỗ trợ tiếng Việt (Be Vietnam Pro, Inter hoặc Arial).

---

## 1. QUY TRÌNH SỬ DỤNG THIẾT BỊ — cho người dùng

```text
Hãy thiết kế tài liệu "HƯỚNG DẪN SỬ DỤNG THIẾT BỊ BẰNG MÃ QR" cho Khoa Khí tượng Thủy văn & Hải dương học (HMO), Trường ĐH Khoa học Tự nhiên – ĐHQG Hà Nội. Logo HMO đính kèm.

NGƯỜI ĐỌC: giảng viên, nghiên cứu sinh, học viên, sinh viên. Không rành công nghệ, đọc trên điện thoại hoặc bản in. Họ cần biết: bấm nút nào, điền gì, khi nào nhận email, phải làm gì tiếp.

MỤC TIÊU TRÌNH BÀY: đơn giản, dễ hiểu, làm theo được ngay.
- Khổ A4 dọc, 4–5 trang + 1 trang cuối "Thao tác nhanh" in riêng để dán phòng thí nghiệm.
- Mỗi quy trình là một dải bước đánh số (1 → 2 → 3), mỗi bước MỘT hành động, câu ≤ 15 từ, có biểu tượng.
- Có thể vẽ khung điện thoại đơn giản minh họa nút bấm. Không dùng ảnh chụp màn hình.
- Lưu ý quan trọng đặt trong hộp màu cam; cảnh báo trong hộp màu đỏ.
- Không dùng thuật ngữ kỹ thuật (không nói "form response", "trigger", "Apps Script"…). Gọi người đọc là "thầy/cô".
- Chỉ dùng nội dung dưới đây, không thêm chức năng khác.

MÀU & CHỮ: navy #1a3a6b (chủ đạo), xanh #2F5496, cam #F07800 (nhấn); trạng thái: xanh lá #2e7d32 (tốt), đỏ #c62828 (cảnh báo), vàng cam #b45309 (nhắc hạn), xanh ngọc #00838f (dùng tại chỗ). Font không chân hỗ trợ tiếng Việt (Be Vietnam Pro / Inter / Arial).

TRANG BÌA: "QUY TRÌNH QUẢN LÝ VÀ SỬ DỤNG TRANG THIẾT BỊ CỦA KHOA" — Mã số QT-KTTV-TB-2026 — Phiên bản 2.0 — Khoa KTTV&HDH. Phụ đề: "Quét mã QR – Mượn – Trả – Kiểm tra".

NỘI DUNG

A. Bắt đầu: quét mã QR
1. Mở camera điện thoại, hướng vào tem QR trên thiết bị.
2. Chạm vào đường link hiện ra → trang thông tin thiết bị mở.
3. Trang cho biết: tên, tình trạng, vị trí, cán bộ quản lý, và trạng thái hiện tại:
   🟢 Sẵn sàng · 🟠 Đang chờ duyệt · 🔴 Đang được mượn · 🔵 Đang dùng tại chỗ · ⏳ Đã trả – chờ cán bộ kiểm tra · ⚠️ Đang xử lý sự cố · ⚫ Không khả dụng.
   Thiết bị không sẵn sàng thì nút mượn bị khóa.
Mẹo: cài trang như ứng dụng (làm 1 lần) — Android: menu ⋮ → "Thêm vào màn hình chính"; iPhone (Safari): nút Chia sẻ → "Thêm vào MH chính"; máy tính: biểu tượng Cài đặt trên thanh địa chỉ.

B. 6 nút trên trang — chọn đúng nút
- 📦 Mượn mang đi — mang thiết bị ra khỏi phòng.
- 🔬 Sử dụng tại chỗ — dùng ngay tại phòng, không mang đi.
- ✅ Xác nhận trả — trả thiết bị đã mượn mang đi.
- 🔧 Ghi bảo trì — dành cho cán bộ ghi bảo trì, hiệu chuẩn.
- ⚠️ Báo hỏng — ai thấy hỏng cũng báo được.
- 🕘 Lịch sử sử dụng — xem các lượt dùng gần đây.

C. Mượn mang đi
1. Quét QR → bấm "📦 Mượn mang đi".
2. Điền: họ tên, đơn vị, mục đích, địa điểm, ngày mượn, NGÀY DỰ KIẾN TRẢ, tình trạng, phụ kiện. Gửi.
3. Hệ thống tự kiểm tra. Nếu không hợp lệ (thiết bị hỏng, đang có người mượn, ngày sai) → email báo lý do.
4. Thiết bị dưới 100 triệu: được ghi nhận ngay, nhận email "Đã ghi nhận mượn".
   Thiết bị từ 100 triệu trở lên: chờ Phó Trưởng khoa duyệt qua email, sau đó nhận email kết quả.
5. Gặp cán bộ quản lý để kiểm tra và nhận thiết bị, ký nhận.
Hộp cam: Chọn đúng "Ngày dự kiến trả" — trên điện thoại, ô ngày thường mặc định là hôm nay.
Ghi chú: email xác nhận có ô HẠN TRẢ nổi bật, nút "📅 Thêm vào lịch" và nút "📘 Hướng dẫn sử dụng thiết bị".

D. Sử dụng tại chỗ (không cần duyệt, không cần trả)
1. Quét QR → bấm "🔬 Sử dụng tại chỗ".
2. Đăng nhập email trường (@hus.edu.vn) nếu được hỏi.
3. Điền họ tên, đơn vị, mục đích, số giờ sử dụng (0,5–24 giờ). Gửi.
4. Trang hiện "🔵 Đang dùng tại chỗ — đến HH:mm". Hết giờ tự kết thúc.
Ghi chú: dùng nhiều ngày thì khai báo mỗi ngày. Hệ thống tính toán (máy chủ HPC) dùng qua tài khoản riêng, không dùng nút này.

E. Trả thiết bị
1. Quét QR → bấm "✅ Xác nhận trả".
2. Điền ngày trả, tình trạng, phụ kiện trả kèm (ảnh nếu có). Gửi.
3. Mang thiết bị đến cán bộ quản lý. Trang hiện "⏳ Đã trả – chờ cán bộ kiểm tra".
4. Cán bộ kiểm tra xong → thầy/cô nhận email "✅ Đã nhận lại thiết bị". Hoàn tất.
Hộp cam: Khoản mượn chỉ hoàn tất khi cán bộ quản lý xác nhận đã kiểm tra.

F. Email thầy/cô sẽ nhận (vẽ thành bảng 3 cột: Email · Khi nào · Cần làm gì)
- ✅ Đã ghi nhận mượn · ngay sau khi gửi (thiết bị < 100 triệu) · ghi nhớ hạn trả, bấm "Thêm vào lịch".
- ✅ Đã duyệt / ❌ Từ chối · khi Phó Trưởng khoa xử lý · nhận thiết bị / liên hệ cán bộ.
- ⛔ Từ chối tự động · yêu cầu không hợp lệ · đọc lý do, chọn thiết bị hoặc ngày khác.
- ⏰ Nhắc hạn trả · khi còn 2 ngày · trả đúng hạn hoặc xin gia hạn.
- 🔴 Quá hạn · từ ngày sau hạn trả, mỗi ngày · trả ngay.
- ✅ Đã nhận lại thiết bị · khi cán bộ kiểm tra xong · không cần làm gì.
Cần gia hạn: liên hệ cán bộ quản lý TRƯỚC khi hết hạn.

G. Báo hỏng
1. Quét QR → bấm "⚠️ Báo hỏng".
2. Mô tả sự cố, chọn mức độ (nhẹ / trung bình / nặng / nguy hiểm), gửi link ảnh nếu có.
3. Không tự sửa — cán bộ quản lý và Phó Trưởng khoa nhận báo ngay.

H. 5 điều cần nhớ (dạng biểu tượng + 1 dòng)
Dùng đúng mục đích · Khai đúng ngày trả, đúng số giờ · Không tự tháo, tự sửa · Trả đúng hạn và giao tận tay cán bộ quản lý · Làm hỏng, mất do lỗi chủ quan phải bồi thường.

TRANG CUỐI — "THAO TÁC NHANH" (1 trang, chữ to, in dán tường): 4 ô lớn
📦 Mang ra ngoài: Quét QR → Mượn mang đi → điền form (đúng ngày trả) → nhận email → nhận thiết bị.
🔬 Dùng tại phòng: Quét QR → Sử dụng tại chỗ → nhập số giờ → xong, không cần trả.
✅ Khi trả: Quét QR → Xác nhận trả → giao thiết bị cho cán bộ kiểm tra.
⚠️ Thấy hỏng: Quét QR → Báo hỏng → không tự sửa.
Chân trang: Hỗ trợ: datpt@hus.edu.vn — Khoa KTTV&HDH.
```

---

## 2. QUY TRÌNH QUẢN LÝ THIẾT BỊ — cho cán bộ quản lý

```text
Hãy thiết kế tài liệu "SỔ TAY QUẢN LÝ THIẾT BỊ" (quy trình quản lý, phiên bản 2.0) cho Khoa Khí tượng Thủy văn & Hải dương học (HMO), Trường ĐH Khoa học Tự nhiên – ĐHQG Hà Nội. Logo HMO đính kèm.

NGƯỜI ĐỌC: Phó Trưởng khoa, cán bộ quản lý từng thiết bị, cán bộ phụ trách mảng. Họ cần biết: việc của mình là gì, hệ thống tự làm gì, email nào sẽ đến và phải bấm gì.

MỤC TIÊU TRÌNH BÀY: đơn giản, dễ hiểu, làm theo được.
- Khổ A4 dọc, 5–7 trang + 1 trang "Việc của cán bộ quản lý" dạng checklist.
- Ưu tiên sơ đồ, bảng và checklist hơn đoạn văn. Câu ngắn. Mỗi bước MỘT hành động.
- Phân biệt rõ bằng màu/biểu tượng: việc HỆ THỐNG tự làm (biểu tượng bánh răng) và việc CON NGƯỜI làm (biểu tượng người).
- Không dùng thuật ngữ lập trình. Chỉ dùng nội dung dưới đây, không thêm chức năng khác.

MÀU & CHỮ: navy #1a3a6b (chủ đạo), xanh #2F5496, cam #F07800 (nhấn); trạng thái: xanh lá #2e7d32, đỏ #c62828, vàng cam #b45309, xanh ngọc #00838f. Font không chân hỗ trợ tiếng Việt.

NỘI DUNG

1. Tổng quan (1 trang)
- 74 thiết bị, 8 nhóm (HPC tính toán, NET mạng, OBS quan trắc, LAB thí nghiệm, SW phần mềm, PC máy tính, INF hạ tầng, OTH khác), 5 khu vực tòa T3 (P204, P206, P207, P401, phòng server).
- Mỗi thiết bị có tem QR dạng HMO-[NHÓM]-[MÃ], ví dụ HMO-OBS-8372. Quét tem → trang thông tin + 6 nút: Mượn mang đi · Sử dụng tại chỗ · Xác nhận trả · Ghi bảo trì · Báo hỏng · Lịch sử.
- Mọi dữ liệu nằm trong một bảng tính chung của Khoa; hệ thống tự kiểm tra, gửi email, nhắc việc, lập báo cáo.

2. Ai làm gì (bảng vai trò)
- Phó Trưởng khoa: duyệt mượn thiết bị ≥ 100 triệu; xử lý sự cố, xác nhận "Đã khắc phục"; quyết định thanh lý; cấp mã xem Nhật ký toàn Khoa.
- Cán bộ quản lý thiết bị (ghi theo từng thiết bị): bàn giao; KIỂM TRA KHI NHẬN LẠI; ghi bảo trì; nhận báo hỏng và nhắc bảo trì của thiết bị mình.
- Cán bộ phụ trách mảng (Tính toán / Quan trắc & Thí nghiệm / Phần mềm & PC): kiểm kê, kế hoạch bảo trì, đề xuất thanh lý.
- Người dùng (giảng viên, NCS, học viên; sinh viên qua giảng viên): mượn, dùng tại chỗ, trả, báo hỏng.
Ghi chú: thiết bị chưa khai email cán bộ quản lý thì email gửi về Phó Trưởng khoa.

3. Vòng đời một lượt mượn (vẽ SƠ ĐỒ TRẠNG THÁI, mỗi trạng thái một ô màu)
- Gửi yêu cầu mượn → hệ thống kiểm tra → không hợp lệ: ⛔ Tự động từ chối.
- Thiết bị < 100 triệu → 🔴 Đang mượn (ghi nhận ngay).
- Thiết bị ≥ 100 triệu → 🟠 Chờ duyệt → Phó Trưởng khoa ✅ duyệt → 🔴 Đang mượn, hoặc ❌ Từ chối.
- 🔴 Đang mượn → (quá hạn: nhắc mỗi ngày) → người mượn khai trả → ⏳ Chờ kiểm tra.
- ⏳ Chờ kiểm tra → cán bộ ✅ Hoạt động tốt → 🟢 Đã trả. Hoặc ⚠️ Có sự cố → Đang xử lý sự cố → Phó Trưởng khoa 🔧 Đã khắc phục → 🟢.
- Nhánh riêng: Khai báo tại chỗ → 🔵 Đang dùng tại chỗ → hết giờ tự kết thúc → 🟢.
Chú thích: các trạng thái Chờ duyệt, Đang mượn, Đang dùng tại chỗ, Chờ kiểm tra, Đang xử lý sự cố đều KHÓA, không ai mượn được.

4. Ba quy trình chính (mỗi quy trình một dải bước)
4a. Mượn mang đi: người mượn quét QR, điền form → ⚙ hệ thống kiểm tra (mã, tình trạng, còn trống, ngày hợp lệ) → ⚙ < 100 triệu: ghi nhận, email cho người mượn và Phó Trưởng khoa; ≥ 100 triệu: Phó Trưởng khoa nhận email có nút Phê duyệt / Từ chối, bấm → trang xác nhận → bấm xác nhận (link dùng 1 lần, hạn 14 ngày) → 👤 cán bộ quản lý kiểm tra, đối chiếu phụ kiện, bàn giao, người mượn ký nhận.
4b. Sử dụng tại chỗ: người dùng khai số giờ (0,5–24 giờ, đăng nhập email trường) → ⚙ không cần duyệt, giữ chỗ tới giờ kết thúc, Phó Trưởng khoa nhận thông báo → ⚙ hết giờ tự kết thúc.
4c. Trả và kiểm tra khi nhận lại: người mượn khai trả, giao thiết bị → ⚙ chuyển "Chờ kiểm tra", email cho cán bộ quản lý → 👤 cán bộ kiểm tra, bấm ✅ Hoạt động tốt (nhập tên) → khoản hoàn tất, người mượn nhận email; HOẶC ⚠️ Có sự cố (nhập tên, mức độ, mô tả) → ⚙ ghi sổ báo hỏng, khóa mượn, Phó Trưởng khoa nhận email có nút 🔧 Đã khắc phục.
Hộp cam: Chưa kiểm tra sau 2 ngày → hệ thống nhắc cán bộ (cứ 2 ngày một lần) và báo Phó Trưởng khoa.

5. Email tự động — ai nhận, khi nào (bảng)
- Mượn < 100 triệu → người mượn: "Đã ghi nhận mượn"; Phó Trưởng khoa: thông báo.
- Mượn ≥ 100 triệu → Phó Trưởng khoa: "Cần phê duyệt" (nút Phê duyệt / Từ chối).
- Yêu cầu không hợp lệ → người mượn + Phó Trưởng khoa: "Từ chối tự động" kèm lý do.
- Khai báo tại chỗ → Phó Trưởng khoa: thông báo.
- 7 giờ sáng, còn ≤ 2 ngày tới hạn → người mượn: "Nhắc hạn trả" (1 lần).
- 8 giờ sáng, từ ngày sau hạn trả → người mượn: "Quá hạn" (mỗi ngày); Phó Trưởng khoa: bản tổng hợp.
- Khai trả → cán bộ quản lý: "Kiểm tra thiết bị"; Phó Trưởng khoa: "Đã khai trả".
- Kiểm tra xong → người mượn: "Đã nhận lại thiết bị". Có sự cố → Phó Trưởng khoa: "Sự cố khi nhận lại".
- Báo hỏng → Phó Trưởng khoa + cán bộ quản lý.
- Thứ Hai 9 giờ → Phó Trưởng khoa (bản tổng) + từng cán bộ: lịch bảo trì sắp đến hạn (30 ngày) / quá hạn.
- Ngày 1 hằng tháng → Phó Trưởng khoa: báo cáo tháng; ngày 1/1 kèm báo cáo hiệu quả sử dụng năm.

6. Bảo trì & hiệu chuẩn
- Bảng chu kỳ: Máy chủ HPC 6 tháng (ổ cứng, quạt, firmware, sao lưu) · Mạng 12 tháng · AWAC, ADCP theo nhà sản xuất hoặc trước mỗi đợt khảo sát (hiệu chuẩn, pin, vệ sinh đầu dò) · GPS, thiết bị đo nước 12 tháng · Máng, bộ mô hình trước mỗi đợt thực hành · UPS 6 tháng.
- Bước: nhận email nhắc → lập kế hoạch, Phó Trưởng khoa duyệt kinh phí → thực hiện → quét QR, bấm "Ghi bảo trì", điền kết quả và NGÀY LẦN TIẾP THEO (hệ thống nhắc theo ngày này).

7. Báo hỏng & thanh lý
- Hai nguồn báo hỏng: người dùng bấm "Báo hỏng"; cán bộ phát hiện khi kiểm tra nhận lại.
- Đánh giá: chi phí sửa > 50% giá trị còn lại → đề xuất thanh lý.
- Thiết bị không dùng được: Phó Trưởng khoa đổi tình trạng thành "Hỏng" trong bảng danh mục → hệ thống tự khóa mượn. (Hệ thống không tự đổi tình trạng.)

8. Báo cáo & kiểm kê
- Báo cáo tháng: số thiết bị theo tình trạng; lượt mượn mang đi, lượt trả, lượt dùng tại chỗ (tổng giờ), lượt bảo trì.
- Báo cáo năm: từng thiết bị — số lượt, tổng giờ, tỷ lệ sử dụng, xếp loại 🟢 Tích cực / 🟡 Trung bình / 🔴 Kém / ⚫ Không sử dụng.
- Lịch sử từng thiết bị: xem trên trang (tên che bớt). Nhật ký toàn Khoa: cần mã 8 số do Phó Trưởng khoa cấp.
- Kiểm kê 6 tháng/lần: quét QR từng thiết bị, đối chiếu, ghi biên bản (làm tay), Phó Trưởng khoa ký.

TRANG CUỐI — "VIỆC CỦA CÁN BỘ QUẢN LÝ" (checklist có ô tick)
☐ Khi giao thiết bị: kiểm tra hoạt động, đếm phụ kiện, cho người mượn ký nhận.
☐ Khi nhận email "Kiểm tra thiết bị": kiểm tra trong ngày → bấm ✅ Hoạt động tốt hoặc ⚠️ Có sự cố (ghi rõ sự cố).
☐ Khi nhận email "Báo hỏng": xem thiết bị, đánh giá sửa / thanh lý, báo Phó Trưởng khoa.
☐ Sáng thứ Hai: xem email lịch bảo trì, lên kế hoạch.
☐ Sau bảo trì: quét QR → Ghi bảo trì, nhập ngày lần tiếp theo.
☐ 6 tháng: kiểm kê, quét QR từng thiết bị.
Chân trang: Liên hệ: TS. Phạm Tiến Đạt — Phó Trưởng khoa — datpt@hus.edu.vn.
```

---

## 3. HƯỚNG DẪN TRIỂN KHAI & VẬN HÀNH — cho người vận hành kỹ thuật

```text
Hãy thiết kế tài liệu "SỔ TAY VẬN HÀNH KỸ THUẬT — HỆ THỐNG QR QUẢN LÝ THIẾT BỊ" (phiên bản 2.0) cho Khoa Khí tượng Thủy văn & Hải dương học (HMO), Trường ĐH Khoa học Tự nhiên – ĐHQG Hà Nội. Logo HMO đính kèm.

NGƯỜI ĐỌC: người vận hành hệ thống (Phó Trưởng khoa hoặc cán bộ được giao). Biết dùng Google Sheets và chạy lệnh trong PowerShell, nhưng không phải lập trình viên. Họ cần: hiểu hệ thống gồm những gì, cập nhật an toàn, xử lý khi có sự cố.

MỤC TIÊU TRÌNH BÀY: đơn giản, dễ hiểu, làm theo được.
- Khổ A4 dọc, 6–8 trang.
- Trang 1: sơ đồ kiến trúc một hình. Ngay sau đó là hộp đỏ "5 ĐIỀU KHÔNG ĐƯỢC LÀM".
- Lệnh đặt trong khung chữ đơn cách (monospace), sao chép được, giữ NGUYÊN văn bản lệnh dưới đây.
- Dùng bảng và checklist; câu ngắn; mỗi bước một hành động.
- Chỉ dùng nội dung dưới đây.

MÀU & CHỮ: navy #1a3a6b (chủ đạo), xanh #2F5496, cam #F07800 (nhấn), đỏ #c62828 (cấm / cảnh báo), xanh lá #2e7d32 (đúng). Font không chân hỗ trợ tiếng Việt; lệnh dùng font monospace.

NỘI DUNG

1. Hệ thống gồm gì (vẽ sơ đồ dòng chảy)
Tem QR trên thiết bị → Trang tra cứu (phamtiendat-135.github.io/HMO-equipment, cài được như app) → 5 Google Form (mượn mang đi, sử dụng tại chỗ, trả, bảo trì, báo hỏng) → Google Sheet master → Google Apps Script (kiểm tra, ghi nhật ký, gửi email, nhắc việc, báo cáo) → email tới người mượn, cán bộ quản lý, Phó Trưởng khoa.
- Mã nguồn: github.com/phamtiendat-135/HMO-equipment (nhánh main).
- Phiên bản đang chạy: Apps Script version 17.

2. Hộp đỏ — 5 ĐIỀU KHÔNG ĐƯỢC LÀM
1) Không chạy "clasp create-deployment" (tạo địa chỉ mới, làm hỏng trang tra cứu và mọi link trong email).
2) Không chạy "clasp pull" trong thư mục dự án (ghi đè code trên máy).
3) Không xoá file .claspignore, không sửa khối "webapp" trong appsscript.json.
4) Không đổi tên câu hỏi trên 5 form, không xoá tab "Form Responses".
5) Không xoá, không chèn cột trong tab Log_Muon_Tra (cột A–V).

3. Bảng tính master — cần biết
- Cài đặt bảng tính: Ngôn ngữ Việt Nam, Múi giờ GMT+07:00.
- Tab Master_Data = danh mục gốc. Sửa là có hiệu lực ngay:
  · Tình trạng "Hỏng" / "Không hoạt động" → tự khóa mượn.
  · Nguyên giá ≥ 100 triệu → cần Phó Trưởng khoa duyệt khi mượn mang đi.
  · Cột "Link hướng dẫn sử dụng" → nút Hướng dẫn trong email (chỉ nhận https://).
  · Cột "Email CB quản lý" → nhận email kiểm tra, báo hỏng, bảo trì (nhiều email cách nhau dấu phẩy; trống → về Phó Trưởng khoa).
- Tab Log_Muon_Tra, Log_Bao_Tri, Log_Bao_Hong: hệ thống tự ghi.

4. Năm form và câu hỏi KHÔNG được đổi tên (bảng)
- Mượn mang đi (ai cũng mở): "Ngày mượn", "Ngày dự kiến trả".
- Sử dụng tại chỗ (chỉ email @hus.edu.vn): "Họ và tên người sử dụng", "Số giờ sử dụng (dự kiến)".
- Trả: "Tình trạng thiết bị khi trả", "Họ và tên người trả", "Phụ kiện trả kèm".
- Bảo trì: "Loại công việc", "Ngày thực hiện".
- Báo hỏng: "Mức độ hỏng", "Mô tả sự cố", "Người phát hiện".

5. Cập nhật trang tra cứu (3 bước)
1) Sửa index.html, rồi chép đè sang QR_Landing_Page.html (hai file phải giống hệt).
2) Tăng số phiên bản trong sw.js (ví dụ hmo-equipment-v13 → v14) để điện thoại tải bản mới.
3) git commit, git push → khoảng 1 phút sau trang tự cập nhật.

6. Cập nhật Apps Script
Chuẩn bị máy (1 lần): cài Node.js → npm install -g @google/clasp@3.4.0 → clasp login (tài khoản datpt@hus.edu.vn) → bật "Google Apps Script API" tại script.google.com/home/usersettings. Nếu PowerShell báo không nhận lệnh clasp: thêm %APPDATA%\npm vào PATH, mở lại cửa sổ.
Mỗi lần cập nhật — chạy liền 4 lệnh (khung lệnh):
cd D:\HMO_equipment\HMO-equipment
node tests/backend_regression.cjs
clasp push -f
clasp create-version "mô tả thay đổi"
clasp update-deployment AKfycbwfXPsePpUOqJp6F4-c58gCwzJPsCyBDFN3JMGWTHuO_F_HR4uMYl9r9s7UWfdGCmHI_Q -V N
Chú thích: thay N bằng SỐ version vừa in ra ở lệnh create-version (không gõ dấu < >). Lệnh test phải báo "pass" hết mới làm tiếp. Kiểm tra: "clasp list-deployments" hiện @N.
Chỉ chạy menu "Thiết lập trigger tự động" khi thay đổi lịch chạy; sửa thông thường thì không cần.

7. Cài đặt một lần sau cập nhật (menu "🔧 Quản lý TB" trong bảng tính)
- Tạo cột Link hướng dẫn sử dụng → điền link.
- Tạo cột Email CB quản lý → điền email.
- Tạo mã truy cập Nhật ký → gửi mã cho cán bộ cần xem.

8. Lịch tự động (bảng)
- Khi có người gửi form: kiểm tra, ghi nhật ký, gửi email.
- 7 giờ hằng ngày: nhắc hạn trả.
- 8 giờ hằng ngày: nhắc quá hạn + nhắc cán bộ kiểm tra thiết bị đã trả.
- Thứ Hai 9 giờ: nhắc bảo trì.
- Ngày 1 hằng tháng 8 giờ: báo cáo tháng (ngày 1/1 kèm báo cáo năm).

9. Khi có sự cố (bảng "Hiện tượng → Cách xử lý")
- Không thấy email → Apps Script → Executions xem dòng "Failed"; Phó Trưởng khoa cũng nhận email "Lỗi hệ thống".
- Nhận email "Không nhận diện được phản hồi form" → có người đổi tên câu hỏi; đổi lại đúng tên ở mục 4.
- Link trong email "không hợp lệ hoặc hết hạn" → menu "Gửi lại email phê duyệt / kiểm tra đang chờ".
- Menu chạy mãi không xong → tìm hộp thoại đang chờ bấm OK hoặc chờ cấp quyền.
- Cần duyệt tay → cột M ghi "✅ Đã phê duyệt — PTK" hoặc "❌ Từ chối — PTK".
- Cần xác nhận kiểm tra tay → cột V ghi bắt đầu bằng "Hoạt động tốt" hoặc "Đã khắc phục".
- Người mượn khai nhầm hạn trả → sửa cột H của dòng đó.
- Điện thoại chưa thấy giao diện mới → đóng hẳn app rồi mở lại; kiểm tra đã tăng số phiên bản sw.js.
- Thiết bị hỏng hẳn → đổi tình trạng trong Master_Data thành "Hỏng".

10. Checklist định kỳ (ô tick)
☐ Hằng ngày: đọc và xử lý email hệ thống (xin duyệt, quá hạn, sự cố).
☐ Hằng tuần: xem email bảo trì thứ Hai; xem tab Log_Bao_Hong các dòng "Mới — chờ xử lý".
☐ Hằng tháng: đọc báo cáo tháng; xem Apps Script → Executions có lỗi lặp lại không.
☐ Khi đổi nhân sự: cập nhật tên và email cán bộ quản lý trong Master_Data.
☐ 6 tháng: kiểm kê; đổi mã Nhật ký nếu đã chia sẻ rộng.
Chân trang: Liên hệ kỹ thuật: datpt@hus.edu.vn.
```
