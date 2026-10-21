# Session Summary — 21/10/2026

## Brainstorm 2 việc (chưa làm)
- Việc 1, flyer A4 thay cho video motion: đã xếp vào loại nhỏ. Dự kiến khoảng 8 khung hình, gần với prompt A1. Chưa trình bày thiết kế, chưa làm.
- Việc 2, chọn số lượng khi mượn: đã xếp vào loại lớn, vì đổi mô hình "1 dòng = 1 chiếc". Đang hỏi câu đầu tiên: trả đủ một lần / trả lẻ / có chiếc sự cố. **Người dùng tạm dừng việc này.**

## Tem QR cho thiết bị nhiều chiếc
- Người dùng hỏi: 6 GPS nhưng chỉ có 1 tem. Đã giải thích: mỗi dòng tài sản một mã; việc đếm số lượng không bị ảnh hưởng, chỉ vướng ở chỗ dán tem.
- Tạo `QR_Labels_Print_NhieuChiec.html`: **15 tem**, mỗi chiếc một tem cùng mã QR, có nhãn "Chiếc k/N". Gồm HMO-OBS-8688 ×6, 8689 (S631) ×2, 8692 ×4, 8693 ×3. Tạo từ các thẻ trong `QR_Labels_Print_Dot1.html`.
- Kiểm tra: chụp màn hình bằng Edge headless và giải mã bằng zxing-cpp được đủ 15 mã, đúng URL `?id=` (6/2/4/3). Bố cục vừa 1 trang.
- Không sửa code hệ thống, không chạy test, không deploy.
