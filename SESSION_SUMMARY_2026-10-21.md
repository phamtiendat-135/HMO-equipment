# Session Summary — 21/10/2026

## Brainstorm 2 việc (chưa làm)
- Việc 1, flyer A4 thay cho video motion: đã xếp vào loại nhỏ. Dự kiến khoảng 8 khung hình, gần với prompt A1. Chưa trình bày thiết kế, chưa làm.
- Việc 2, chọn số lượng khi mượn: đã xếp vào loại lớn, vì đổi mô hình "1 dòng = 1 chiếc". Đang hỏi câu đầu tiên: trả đủ một lần / trả lẻ / có chiếc sự cố. **Người dùng tạm dừng việc này.**

## Tem QR cho thiết bị nhiều chiếc
- Người dùng hỏi: 6 GPS nhưng chỉ có 1 tem. Đã giải thích: mỗi dòng tài sản một mã; việc đếm số lượng không bị ảnh hưởng, chỉ vướng ở chỗ dán tem.
- Tạo `QR_Labels_Print_NhieuChiec.html`: **15 tem**, mỗi chiếc một tem cùng mã QR, có nhãn "Chiếc k/N". Gồm HMO-OBS-8688 ×6, 8689 (S631) ×2, 8692 ×4, 8693 ×3. Tạo từ các thẻ trong `QR_Labels_Print_Dot1.html`.
- Kiểm tra: chụp màn hình bằng Edge headless và giải mã bằng zxing-cpp được đủ 15 mã, đúng URL `?id=` (6/2/4/3). Bố cục vừa 1 trang.
- Không sửa code hệ thống, không chạy test, không deploy.

## Flyer A4 hướng dẫn sử dụng (việc 1), người dùng chọn "khớp 100% với app"
- Tạo `FLYER_HUONG_DAN_SU_DUNG_A4.html` (ảnh nhúng base64, 703 KB) và `FLYER_HUONG_DAN_SU_DUNG_A4.pdf` (1 trang A4, xuất bằng Edge headless).
- Bố cục: dải tiêu đề có logo; 8 bước 2×4 (quét QR · xem trạng thái · chọn mang đi/tại chỗ · điền form · PTK duyệt qua email · email hạn trả + Thêm vào lịch · dùng tại chỗ · trả + kiểm tra nhận lại); chân trang có Báo hỏng / Ghi bảo trì / Lịch sử, cách cài app, QR mở trang tra cứu, khẩu hiệu.
- Nguồn ảnh (dữ liệu mẫu, tên giả định "Nguyễn Văn An", "Trần Thị Mai"):
  - Email và trang xác nhận: chạy CHÍNH `Google_Apps_Script.js` trong VM harness (lấy từ `tests/backend_regression.cjs`) với Master giả lập HMO-OBS-8693 (420 tr / 3), luồng mượn → duyệt → khai trả → kiểm tra OK; lưu htmlBody rồi chụp bằng Edge.
  - Trang thiết bị: bản sao `index.html` với `fetch` giả lập (CB "Trần Thị Mai", trạng thái theo tham số), chụp trong iframe 390 px (Edge headless có bề rộng tối thiểu lớn hơn 390). Chữ và lớp CSS của các nhãn trạng thái lấy từ `--dump-dom` của trang thật.
  - Form: Google Form mượn thật (`embedded=true` đặt trước `usp=pp_url` thì mới giữ mã điền sẵn), chỉ mở xem, không gửi.
- Kiểm tra: xem ảnh chụp và PDF; zxing-cpp giải mã được 2 mã QR trên PDF (`?id=HMO-OBS-8693` và trang tra cứu).
- Script dựng ở scratchpad (`flyer/render_emails.cjs`, `flyer/build_flyer.py`), không đưa vào repo. Không sửa code hệ thống, không chạy test, không deploy.

## Bỏ yêu cầu đăng nhập @hus.edu.vn ở phần "Dùng tại chỗ"
- Theo yêu cầu: đã bỏ dòng "Form này cần đăng nhập email trường @hus.edu.vn" khỏi flyer (bước 7; dựng lại HTML và xuất lại PDF 1 trang, kiểm tra text PDF không còn "hus") và khỏi kịch bản video (cảnh 10).
- Kiểm tra: mở form tại chỗ (`1FAIpQLSeOh3Py…/viewform`) khi không đăng nhập → **HTTP 401**, tức form VẪN giới hạn tài khoản @hus.edu.vn. Người dùng cần tự tắt trong Google Forms: Cài đặt → Câu trả lời → tắt "Chỉ cho phép người dùng trong HUS…" (giống 4 form đã mở ngày 30/09). Chưa xác minh sau khi tắt.
- Các tài liệu SOP/HUONG_DAN/QUY_TRINH v2.0 vẫn ghi D5a (form tại chỗ cần email trường), chưa sửa.
