# Session Summary — 04/06/2026

## Đã hoàn thành trong phiên này

### 1. Cập nhật CLAUDE.md
- Bổ sung File Inventory: thêm `index.html`, `manifest.json`, `sw.js`, `icons/`, `Kich_ban_video_HMO_Eq.docx`, `Slide_intro_outro_HMO_Eq.pptx`.
- Đánh dấu PWA đã wired up cho `index.html` + `QR_Landing_Page.html`.
- Thêm mục **Changes Log (Session 03/06/2026)** ghi lại wire-up PWA và 2 file deliverable video.

### 2. Kiểm tra object FORMS (trong index.html + QR_Landing_Page.html, ~dòng 1251)
Phát hiện: ghi chú "cần thay URL Google Forms" trong CLAUDE.md đã **lỗi thời**.
- ✅ 4 form chính ĐÃ có URL thật (cập nhật 01/05/2026): `borrow`, `return`, `maintain`, `report`.
- ⚠️ 2 form còn placeholder: `training` (`FORM_ID_DAOTAO`) và `research` (`FORM_ID_NCKH`).

## Việc cần làm tiếp (mai)

### A. Điền 2 form còn thiếu (training + research)
Mỗi form cần 3 thứ:
1. URL form (`https://docs.google.com/forms/d/e/.../viewform`)
2. entry ID của trường mã QR (prefill mã thiết bị)
3. entry ID của trường mã học phần (Đào tạo) / mã đề tài (NCKH)

Cách lấy: mở form → ⋮ → "Get pre-filled link" → điền giá trị mẫu → "Get link" → đọc `entry.XXXXXXX=` trong URL.

**Lưu ý:** code dòng ~1306-1307 còn dùng placeholder `entry.FIELD_MAHP` và `entry.FIELD_MADT` — cũng cần thay bằng entry ID thật.

**Phương án thay thế:** nếu chưa tạo 2 form này, có thể tạm ẩn/vô hiệu hóa 2 nút (Đào tạo, NCKH) để tránh link lỗi.

### B. Sửa lại ghi chú lỗi thời trong CLAUDE.md
Bỏ "**cần thay URL Google Forms**" cho 4 form chính (đã xong); chỉ giữ ghi chú cho 2 form training/research.

### C. Push lên GitHub
```
git add index.html QR_Landing_Page.html manifest.json sw.js icons/ CLAUDE.md
git commit -m "PWA wire-up + cập nhật tài liệu"
git push
```
**Nhớ:** `index.html` và `QR_Landing_Page.html` giống hệt nhau — mọi sửa đổi phải áp dụng cho CẢ HAI.

### D. Sản xuất video
Hai file đã sẵn trong thư mục dự án:
- `Kich_ban_video_HMO_Eq.docx` — kịch bản caption + storyboard (gồm đoạn cài app 3 nền tảng + 6 hành động).
- `Slide_intro_outro_HMO_Eq.pptx` — slide intro/outro dọc 9:16.

Còn lại: quay màn hình theo storyboard → ghép intro/outro → chèn caption + nhạc nền → xuất 9:16.

## Trạng thái: code và tài liệu vẫn ở LOCAL, chưa push.
