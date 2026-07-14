# Template Google Forms — Hệ thống quản lý TB Khoa KTTV&HDH

Hướng dẫn: Tạo 3 Google Form theo cấu trúc bên dưới. Sau khi tạo xong, lấy pre-filled URL 
và cập nhật vào file `QR_Landing_Page.html` (phần `FORMS`).

---

## Form 1: ĐĂNG KÝ MƯỢN THIẾT BỊ

**Tiêu đề form:** Đăng ký mượn thiết bị — Khoa KTTV&HDH  
**Mô tả:** Vui lòng điền đầy đủ thông tin. Thiết bị có giá trị ≥ 100 triệu VNĐ cần được Phó Trưởng khoa phê duyệt.

| # | Tên trường | Loại | Bắt buộc | Ghi chú |
|---|-----------|------|----------|---------|
| 1 | Mã QR thiết bị | Short answer | Có | Validation: starts with "HMO-" |
| 2 | Tên thiết bị | Short answer | Có | Tự điền nếu quét QR |
| 3 | Họ và tên người mượn | Short answer | Có | |
| 4 | Email | Short answer | Có | Validation: email format |
| 5 | Đơn vị / Nhóm nghiên cứu | Dropdown | Có | Options: Bộ môn Khí tượng và Khí hậu học, Bộ môn Thủy văn và Tài nguyên nước, Bộ môn Khoa học và Công nghệ Biển, Nghiên cứu sinh, Học viên cao học, Khác |
| 6 | Vai trò | Dropdown | Có | Options: Giảng viên, Nghiên cứu sinh, Học viên cao học, Sinh viên, Cán bộ kỹ thuật |
| 7 | Mục đích sử dụng | Paragraph | Có | Mô tả ngắn gọn mục đích |
| 8 | Thuộc đề tài / dự án (nếu có) | Short answer | Không | Tên hoặc mã số đề tài |
| 9 | Địa điểm triển khai | Short answer | Có | Ví dụ: "Cửa Đại, Hội An" hoặc "P204-T3" |
| 10 | Ngày mượn | Date | Có | |
| 11 | Ngày dự kiến trả | Date | Có | |
| 12 | Tình trạng thiết bị khi mượn | Dropdown | Có | Options: Tốt, Bình thường, Có lưu ý (ghi ở ghi chú) |
| 13 | Phụ kiện kèm theo | Checkboxes | Không | Options: Cáp nguồn/sạc, Pin dự phòng, Tài liệu hướng dẫn, Hộp/vali chuyên dụng, Bộ rung điện (ADCP), Giá lắp xuồng (ADCP), Khác |
| 14 | Ghi chú | Paragraph | Không | |

**Response destination:** Sheet "Log_Muon_Tra" trong Google Sheet master

---

## Form 2: XÁC NHẬN TRẢ THIẾT BỊ

**Tiêu đề form:** Xác nhận trả thiết bị — Khoa KTTV&HDH  
**Mô tả:** Quét mã QR trên thiết bị và điền form khi trả.

| # | Tên trường | Loại | Bắt buộc | Ghi chú |
|---|-----------|------|----------|---------|
| 1 | Mã QR thiết bị | Short answer | Có | Validation: starts with "HMO-" |
| 2 | Tên thiết bị | Short answer | Có | |
| 3 | Họ và tên người trả | Short answer | Có | |
| 4 | Ngày trả | Date | Có | |
| 5 | Tình trạng thiết bị khi trả | Dropdown | Có | Options: Tốt - như khi mượn, Bình thường - có dấu hiệu hao mòn, Hư hỏng nhẹ - cần kiểm tra, Hỏng - cần sửa chữa |
| 6 | Phụ kiện trả kèm | Checkboxes | Không | Tương tự form mượn |
| 7 | Mô tả tình trạng (nếu có thay đổi) | Paragraph | Không | Bắt buộc nếu chọn "Hư hỏng" hoặc "Hỏng" |
| 8 | Ảnh thiết bị khi trả | File upload | Không | Cho phép upload ảnh |

**Response destination:** Cùng sheet "Log_Muon_Tra" (hoặc sheet riêng "Log_Tra" nếu muốn tách)

---

## Form 3: GHI NHẬN BẢO TRÌ / HIỆU CHUẨN

**Tiêu đề form:** Ghi nhận bảo trì & hiệu chuẩn — Khoa KTTV&HDH  
**Mô tả:** Dành cho CB phụ trách ghi nhận sau khi bảo trì, hiệu chuẩn, hoặc sửa chữa thiết bị.

| # | Tên trường | Loại | Bắt buộc | Ghi chú |
|---|-----------|------|----------|---------|
| 1 | Mã QR thiết bị | Short answer | Có | |
| 2 | Tên thiết bị | Short answer | Có | |
| 3 | Loại công việc | Dropdown | Có | Options: Bảo trì định kỳ, Hiệu chuẩn, Sửa chữa, Nâng cấp, Vệ sinh & kiểm tra |
| 4 | Ngày thực hiện | Date | Có | |
| 5 | Ngày hiệu chuẩn / bảo trì tiếp theo | Date | Có | Hệ thống sẽ tự nhắc trước 30 ngày |
| 6 | Đơn vị thực hiện | Dropdown | Có | Options: Tự thực hiện (CB Khoa), Hãng sản xuất / đại lý, Đơn vị bên thứ 3, Khác |
| 7 | Tên đơn vị (nếu thuê ngoài) | Short answer | Không | |
| 8 | Chi phí (triệu VNĐ) | Short answer | Không | Nhập 0 nếu tự làm |
| 9 | Nội dung công việc chi tiết | Paragraph | Có | Mô tả cụ thể đã làm gì |
| 10 | Kết quả | Dropdown | Có | Options: Hoàn thành - TB hoạt động bình thường, Hoàn thành - cần theo dõi thêm, Chưa hoàn thành - cần thêm linh kiện, Không sửa được - đề xuất thanh lý |
| 11 | Người thực hiện | Short answer | Có | |
| 12 | Tài liệu đính kèm | File upload | Không | Biên bản, chứng chỉ hiệu chuẩn, hóa đơn |
| 13 | Ghi chú | Paragraph | Không | |

**Response destination:** Sheet "Log_Bao_Tri" trong Google Sheet master

---

## Form 4: BÁO HỎNG THIẾT BỊ

**Tiêu đề form:** Báo hỏng thiết bị — Khoa KTTV&HDH  
**Mô tả:** Bất kỳ ai phát hiện thiết bị hỏng đều có thể báo qua form này. Thông báo sẽ được gửi ngay cho CB phụ trách.

| # | Tên trường | Loại | Bắt buộc | Ghi chú |
|---|-----------|------|----------|---------|
| 1 | Mã QR thiết bị | Short answer | Có | |
| 2 | Tên thiết bị | Short answer | Có | |
| 3 | Người phát hiện | Short answer | Có | |
| 4 | Email liên hệ | Short answer | Có | |
| 5 | Thời điểm phát hiện | Date + Time | Có | |
| 6 | Mức độ | Dropdown | Có | Options: Nhẹ - vẫn sử dụng được, Trung bình - hoạt động không ổn định, Nặng - không sử dụng được, Nguy hiểm - có nguy cơ an toàn |
| 7 | Mô tả sự cố | Paragraph | Có | Chi tiết triệu chứng hỏng hóc |
| 8 | Hoàn cảnh xảy ra | Paragraph | Không | Đang sử dụng bình thường / va đập / ngập nước / v.v. |
| 9 | Ảnh chụp hiện trạng | File upload | Không | Khuyến khích chụp ảnh |

**Response destination:** Sheet riêng "Log_Bao_Hong"  
**Notification:** Bật email notification → gửi cho CB phụ trách mảng + CC Phó TK

---

## Cách tạo pre-filled URL cho QR

Sau khi tạo Form xong:

1. Mở Form → nhấn 3 chấm (⋮) → "Get pre-filled link"
2. Điền "HMO-PLACEHOLDER" vào ô "Mã QR thiết bị"  
3. Nhấn "Get link" → copy URL
4. Trong URL, thay "HMO-PLACEHOLDER" bằng `${qrCode}` 
5. Paste URL vào phần `FORMS` trong file `QR_Landing_Page.html`

Ví dụ URL pre-filled:
```
https://docs.google.com/forms/d/e/1FAIpQ.../viewform?usp=pp_url&entry.123456=HMO-OBS-8372
```
