# Bộ kiểm chứng review 28/09/2026

Các script ghi nhận baseline trước sửa; đa số assertion **xác nhận lỗi đang tồn tại**. Exit 0 không có nghĩa hệ thống sẵn sàng production. Sau sửa, cần đổi assertion thành hành vi đúng hoặc viết regression mới.

Chạy từ thư mục gốc repository:

```powershell
node audits/2026-09-28/reproduce.cjs
node audits/2026-09-28/frontend_audit.cjs <duong-dan-module-jsdom>
python audits/2026-09-28/data_qr_audit.py <ban-export-master.xlsx>
node audits/2026-09-28/live_check.mjs
```

- `reproduce.cjs`: 21 kịch bản/đối chứng trên Apps Script thật trong VM, dùng Sheets/Mail/Properties/Cache giả. Không gửi mail/network hoặc sửa Sheet thật.
- `frontend_audit.cjs`: 10 kịch bản/đối chứng trên HTML thật với jsdom, fetch giả và PIN tổng hợp; có kiểm tra DOM trang tem. Cần truyền đường dẫn module jsdom hoặc cài sẵn ở môi trường riêng.
- `data_qr_audit.py`: đọc XLSX và giải mã QR bằng openpyxl/Pillow/zxing-cpp; không gọi `save`. Nếu không truyền XLSX, đọc bản local trong repo. Lần review dùng zxing-cpp ở `backups/audit-2026-09-28/python-deps`. Không commit bản export chứa thông tin người dùng. Output có metadata/ngày giao dịch nên phải bảo quản như dữ liệu nội bộ.
- `live_check.mjs`: GET bốn tài nguyên static và bốn URL Form, không submit. Chỉ thêm `--api` khi được phép đọc production: kiểm tra bốn route read-only và chỉ in metadata rút gọn. Không gọi approve/reject. Cần Node có `fetch`, `AbortSignal.timeout` và iterator helpers tương thích môi trường đã chạy.

Kết quả baseline: backend 21/21; frontend/DOM 10/10; QR 54/54 đúng URL/mã in và giải mã ở 80 px. Trang tem vẫn có 18 card ngoài grid và 19 card không là con trực tiếp của grid.

Chi tiết và bước tiếp theo: [báo cáo review](../../PRE_DEPLOY_REVIEW_2026-09-28.md).
