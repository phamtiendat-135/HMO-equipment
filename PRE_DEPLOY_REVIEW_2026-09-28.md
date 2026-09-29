# Review trước vận hành chính thức — 28/09/2026

## Kết luận

**Chưa nên mở vận hành chính thức hoặc in tem hàng loạt ở trạng thái hiện tại.** Website, QR và API đã nối đúng địa chỉ, nhưng còn lỗi bảo mật phía trình duyệt, sai định tuyến biểu mẫu, sai đối tượng phê duyệt/trả thiết bị và nguy cơ mất hoặc sai nhật ký. Trang in QR cũng bị vỡ cấu trúc HTML dù nội dung mã QR đúng.

Đây là báo cáo review, **không phải biên bản đã sửa lỗi**. Đợt review không sửa mã ứng dụng, không push/deploy, không sửa Google Sheets, không gửi biểu mẫu, email hay thao tác mượn/trả/phê duyệt thật. Chỉ tạo bộ kiểm tra và tài liệu. Việc tải bản Sheet và GET API production đã được người dùng cho phép riêng.

## Phạm vi và bằng chứng

- Baseline Git `d588b30`; Apps Script production **version 10**; service worker **v9**.
- Đọc Apps Script, frontend, trình tạo Forms, service worker, cấu hình, công cụ cập nhật/deploy và tài liệu quy trình liên quan.
- Source Apps Script local, remote HEAD và version 10 cùng SHA-256 `0035DAF23AF39111F5092DE85ACC7D4A86D6744480CB5AC4E260AE26264A9616`.
- Bốn tài nguyên live `index.html`, `QR_Landing_Page.html`, `sw.js`, `manifest.json`: HTTP 200, nội dung trùng local. Hai file landing page cũng trùng nhau.
- Kiểm tra toàn bộ 74 bản ghi frontend; giải mã toàn bộ 54 ảnh QR; quan sát landing page, trang in, Forms, Sheet, trigger và execution trên trình duyệt.
- Tải bản XLSX của Google Sheets master theo quyền chỉ đọc; kiểm tra 10 tab bằng openpyxl. Bản tải không đưa vào repo.
- GET production các route thông tin thiết bị, lịch sử một thiết bị, `allStatus` và `alllog` không kèm mã. Không thử đoán PIN hoặc gọi approve/reject thật.
- **21/21 kịch bản backend và 10/10 kịch bản frontend/QR đã xác nhận kết quả của bộ audit.** Phần lớn là tái hiện lỗi, một số là đối chứng tích cực; không được hiểu là hệ thống đạt 31/31 tiêu chí an toàn.
- Kiểm tra cú pháp JavaScript, JSON, Python và whitespace Git không phát hiện lỗi cú pháp trong phạm vi đã chạy.

## Lỗi P1 — phải xử lý trước vận hành thật

### P1-01 — XSS qua tham số URL của landing page

**Vị trí:** `index.html:1712` (`showNotFound`), bản sao `QR_Landing_Page.html`; PIN lưu tại `index.html:1465`.

Chuỗi `?id=` không hợp lệ được đưa thẳng vào HTML. Bộ kiểm tra chèn event handler và xác nhận nó đọc được PIN tổng hợp trong localStorage cùng origin. Không đọc PIN thật. `?id=constructor` còn được coi là bản ghi kế thừa và render thiết bị giả “Object”.

**Cần làm:** dùng `textContent` hoặc DOM API an toàn; kiểm tra định dạng QR và own-property trước tra cứu; cân nhắc bỏ lưu PIN lâu dài và thêm CSP sau khi đã vá đường chèn.

### P1-02 — Form bảo trì và báo hỏng bị xử lý như mượn

**Vị trí:** `Google_Apps_Script.js:910`, `onFormSubmitDispatch`.

Dispatcher chỉ nhận diện mượn/trả; các nhánh còn lại gọi handler mượn. Event bảo trì và báo hỏng tổng hợp đều đi vào luồng mượn. Live có bốn tab phản hồi Forms nhưng `Log_Bao_Tri` chỉ có header và `Log_Bao_Hong` trống.

**Cần làm:** ánh xạ bốn nguồn form bằng ID ổn định, tạo handler riêng; nguồn không nhận diện phải bị từ chối và báo lỗi. Định nghĩa schema/trạng thái và cập nhật master cho bảo trì/báo hỏng.

### P1-03 — Link phê duyệt ký đúng nhưng có thể phê duyệt sai yêu cầu

**Vị trí:** `Google_Apps_Script.js:1725`, `:1870`, route GET từ `:1931`.

HMAC ký `action|qr|time`, không ký mã giao dịch. Handler tìm yêu cầu chờ mới nhất của QR. Trong giả lập, email của A phê duyệt B mới hơn; dùng lại cùng link tiếp tục phê duyệt A. Đối chứng HMAC hợp lệ/sửa/hết hạn hoạt động đúng, nhưng không gắn link với đúng giao dịch.

**Cần làm:** tạo `LoanID` bất biến trước khi gửi email; ký kèm ID, action, hạn và nonce; xử lý một lần, kiểm tra trạng thái và khóa đoạn cập nhật. Không dùng số dòng làm ID dài hạn. GET chỉ nên hiển thị xác nhận; thao tác thay đổi cần bước chủ động đã xác thực.

### P1-04 — Trả thiết bị có thể đóng khoản mượn của người khác

**Vị trí:** `Google_Apps_Script.js:968`, tìm dòng khoảng `:1027`.

Handler tìm ngược theo QR và ngày trả trống, không bắt buộc LoanID/người mượn. Tái hiện A trả nhưng đóng khoản của B; ngày trả trước ngày mượn cũng được chấp nhận. Form trả live tải được không đăng nhập; email tự nhập không chứng minh danh tính.

**Cần làm:** trả theo LoanID; kiểm tra người trả/quyền xác nhận, thứ tự ngày và số lượng; lưu audit trail.

### P1-05 — Trạng thái phê duyệt không điều khiển tồn khả dụng

**Vị trí:** `Google_Apps_Script.js:2002`, `:2086`, `:2118`; nhắc hạn từ `:269`, `:389`.

Dòng chưa có ngày trả bị coi là đang mượn bất kể trạng thái phê duyệt. Yêu cầu bị từ chối vẫn làm thiết bị bận và có thể bị báo quá hạn.

**Cần làm:** trạng thái tường minh: chờ duyệt, đã duyệt, đã bàn giao, đã trả, từ chối/hủy; quy định trạng thái giữ chỗ và tính giờ.

### P1-06 — Backend thiếu kiểm tra tài sản, tình trạng và số lượng

**Vị trí:** `Google_Apps_Script.js:677`.

Tái hiện được QR lạ ghi log như tài sản giá trị 0, tài sản hỏng vẫn mượn được, và số lượng 1 nhận hai khoản mượn đang mở. Chặn ở frontend không bảo vệ form trực tiếp.

**Cần làm:** validation server theo master, loại/tình trạng, tồn còn và khoảng thời gian; kiểm tra trong cùng vùng khóa ghi. Xác định rõ bản ghi nhiều thiết bị/license được mượn theo đơn vị hay theo nhóm.

### P1-07 — Có thể mất log, ghi trùng hoặc gắn metadata nhầm dòng

**Vị trí:** `Google_Apps_Script.js:831`–`:898`, `:910`; đồng bộ từ `:1116`.

- Gửi email trước `appendRow`: MailApp lỗi làm mất dòng nghiệp vụ; dispatcher nuốt lỗi nên execution có thể vẫn trông như hoàn tất.
- Chạy lại cùng event tạo hai log và hai email.
- `appendRow` rồi `getLastRow` không khóa; hai submit xen kẽ có thể ghi metadata A vào dòng B.
- Đồng bộ dùng QR + ngày để chống trùng, có thể gộp hai người mượn cùng QR trong ngày.

**Cần làm:** khóa kiểm tra/ghi; dùng ID phản hồi nguồn duy nhất; ghi giao dịch trước, gửi email sau và lưu trạng thái retry; job đối soát lỗi.

### P1-08 — Dữ liệu nhập được ghi như công thức hoặc nội suy HTML

**Vị trí:** `Google_Apps_Script.js:875`, `:1209`, email/response khoảng `:1809`.

Giá trị bắt đầu bằng `=` đi nguyên vào `appendRow`; chuỗi HTML do người dùng kiểm soát được nội suy vào phản hồi phê duyệt. Không khẳng định mọi payload HTML đều chạy trong mọi email client/iframe. Google xác nhận chuỗi bắt đầu bằng `=` trong `appendRow` được hiểu là công thức: [Sheet.appendRow](https://developers.google.com/apps-script/reference/spreadsheet/sheet#appendrowrowcontents).

**Cần làm:** ghi trường văn bản dưới dạng literal; chỉ cho công thức ở cột hệ thống; escape HTML đúng ngữ cảnh; kiểm tra kiểu, độ dài và định dạng.

### P1-09 — File in QR chưa sẵn sàng in

**Vị trí:** `QR_Labels_Print.html:61` và các thẻ đóng/mở tiếp theo.

54 ảnh đều đúng nhưng DOM có **18 tem ngoài `.qr-grid`**, 19 tem không phải con trực tiếp của grid và 8 tên thiết bị mồ côi. Trang live hiển thị nhiều tem thành hàng toàn chiều rộng thay vì lưới ba cột.

| Khu vực | Theo tiêu đề | Tem thực sự trong section |
|---|---:|---:|
| P204-T3 | 14 | 1 |
| P206-T3 | 18 | 18 |
| P207-T3 | 5 | 0 |
| P401-T3 | 8 | 8 |
| T3 | 9 | 9 |

**Cần làm:** sinh lại DOM từ dữ liệu, kiểm tra cấu trúc, xuất PDF A4 rồi in/quét thử trên điện thoại thật.

## P2 — dữ liệu, vận hành và kiến trúc

### Master và giao diện bị lệch

Frontend dùng dữ liệu nhúng và chỉ lấy `_borrowStatus` từ API. **16 thiết bị đã có cán bộ trong Sheet nhưng landing page vẫn báo chưa phân công.** Frontend có 20 ô cán bộ trống; live chỉ còn 4, đều thuộc nhóm SW: 2767, 2775, 4082, 5622.

`update_managers.py` chỉ sửa `QR_Landing_Page.html`, không đồng thời sửa `index.html`, lấy nguồn XLSX và thay chuỗi không qua serializer JSON an toàn. Nên chọn Sheet live làm nguồn chuẩn, sinh một tập dữ liệu public đã lọc và chỉ có một nguồn frontend.

### Google Sheets chưa đủ kiểm soát

| Hạng mục live | Kết quả |
|---|---|
| Master_Data | 74 QR duy nhất; tổng cột số lượng 123, không phải mặc nhiên 123 tài sản vật lý riêng |
| Tình trạng | 30 Bình thường, 21 Tốt, 3 Kém, 20 Không hoạt động sau chuẩn hóa |
| Thong_Ke | Số liệu tĩnh, không công thức; 45 Bình thường, 12 Tốt, 4 Hỏng, 12 Không hoạt động, 1 chưa rõ — không khớp master |
| Log_Muon_Tra | 2 dòng nghiệp vụ; O2/O3 có công thức; O1/P1 trống header |
| Form Responses | 2 phản hồi mượn, 7 phản hồi trả; cần đối soát thủ công với 2 dòng log |
| Bảo trì/báo hỏng | Tab phản hồi chỉ có header; Log_Bao_Tri có header; Log_Bao_Hong trống hoàn toàn |
| Can_Bo_QL | Chỉ hàng quản trị có email; ba cán bộ còn thiếu email và điện thoại |
| Chia sẻ | General access Restricted; ngoài chủ sở hữu còn một tài khoản Editor |
| Bảo vệ | UI không có protected sheet/range được khai báo |

Không thấy ô lỗi công thức trong bản xuất, nhưng đây không chứng minh nghiệp vụ đúng hoặc toàn workbook đã tái tính. Cần sinh thống kê từ master, hoàn thiện schema/danh bạ và bảo vệ cột hệ thống. Code tìm cột **“Phòng”** (`Google_Apps_Script.js:718`, `:1325`) trong khi header thật là **“Địa điểm (chuẩn)”**, làm thiếu địa điểm trong đầu ra liên quan.

### Forms live khác bản thiết kế

Bốn URL hoạt động trong phiên đăng nhập; QR 8693 được điền sẵn. Form mượn vẫn có **bốn bộ môn cũ**, chưa phải ba tên chính thức trong generator. Tên thiết bị bắt buộc vẫn cho người dùng tự nhập dù QR đã có.

HTTP không cookie: mượn/bảo trì/báo hỏng trả 401, form trả trả 200. Điều này chỉ chứng minh khác biệt truy cập chưa đăng nhập, chưa đủ kết luận giới hạn domain nào. Cần test tài khoản trong/ngoài đơn vị trên staging. Không chạy lại toàn bộ generator vì có thể tạo Forms mới và đổi URL.

### API và quyền riêng tư

`lookupEquipment` (`Google_Apps_Script.js:1704`) trả toàn bộ cột master; GET live xác nhận có cả ghi chú gốc và giải trình rà soát. Sheet Restricted không ngăn API do owner xuất công khai. Cần allowlist trường public.

Tên người mượn/địa điểm trong lịch sử từng thiết bị là quyết định giữ công khai từ phiên trước, không phải PIN bị bypass. Tuy nhiên danh mục QR công khai cho phép đọc lần lượt lịch sử 74 thiết bị. Cần chủ dự án xác nhận lại phạm vi công khai. Bản XLSX trong repo public cũng cần phân loại dữ liệu trước lần cập nhật sau.

`alllog` không mã hiện trả `not_configured`, `entries: []`: đang chặn đúng nhưng Nhật ký toàn khoa chưa dùng được cho tới khi chủ dự án tạo mã. Review không tạo mã hay đọc secrets. Cơ chế 30 lần sai khóa chung 15 phút có thể gây từ chối dịch vụ; chỉ tái hiện bằng Cache giả, không thử live. PIN trong query string/localStorage cũng chưa phải xác thực cá nhân.

### Báo cáo, ngày tháng và UX

- Báo cáo năm (`Google_Apps_Script.js:1308`) lấy giờ lịch chia 2.000 giờ làm việc; 10 ngày thành 240 giờ và 12%. Khoản kéo qua năm hoặc còn mở bị bỏ giờ. Cần chốt đo thời gian chiếm dụng hay giờ vận hành, cắt phần giao với kỳ và xét số lượng.
- Chạy báo cáo năm sáng 31/12 có thể thiếu phần còn lại ngày; nên chạy đầu năm sau. Ngưỡng quá hạn giữa config, công thức và SOP chưa thống nhất. Bảo trì cần lấy lịch hiệu lực mới nhất.
- `parseDate_` (`:179`) chấp nhận 31/02 rồi cuộn sang tháng 3. Trả thiết bị hỏng chỉ ghi log, master vẫn bình thường và API báo khả dụng.
- `submitInput` (`index.html:1314`) cho đào tạo/nghiên cứu báo “Đã ghi nhận” rồi xóa input nhưng không lưu/gửi.
- Lỗi hoặc thiếu log bị biểu diễn như “rỗng/rảnh”; offline history thành “không có lịch sử”. Phải phân biệt không dữ liệu với không đọc được dữ liệu.
- Danh sách chưa dùng `allStatus`; tình trạng kỹ thuật tĩnh không phải khả dụng mượn. Fetch thiếu timeout/retry giới hạn.
- Service worker xóa mọi cache khác tên hiện tại, kể cả app khác cùng origin. Chỉ nên xóa cache có prefix dự án và không fallback HTML cho mọi loại tài nguyên.

### Công cụ và tài liệu

Repo chưa có CI nghiệp vụ. `github_push.py` có kiểm tra hash cũ và cách nhận token cần rà lại; `push.bat` dùng danh sách file cố định, xóa lock và che một số lỗi. Không nên dùng làm đường phát hành mặc định trước khi sửa/test.

Tài liệu còn số liệu tình trạng cũ, gọi QR là SVG dù thực tế PNG, URL ví dụ cũ, khẳng định tem sẵn sàng in và mô tả bộ môn không trùng live. Có hai tem SW8698/SW8699 dù tài liệu nói software không có tem.

## Những phần đã xác minh tốt

- 54/54 PNG QR duy nhất giải mã đúng URL production, đúng mã in cạnh ảnh và có trong master/frontend.
- 54/54 giải mã được ở ảnh gốc 246×246 và bản thu nhỏ số 80×80. Đây chưa phải thử tem in thật.
- 20 bản ghi không có tem đều mang trạng thái “Không hoạt động”, phù hợp phạm vi bộ tem hiện tại.
- Tên, số lượng, vị trí, thông số, năm, xuất xứ và tình trạng giữa master live và frontend khớp sau chuẩn hóa; chênh lệch đối chiếu chính là 16 cán bộ.
- GET thiết bị 8693 hợp lệ và báo khả dụng; history có hai bản ghi; `allStatus` trả `{}` tại thời điểm kiểm tra. Đây chỉ là ảnh chụp trạng thái đọc.
- Có sáu trigger live. Một số job định kỳ gần đây hiện trạng thái Completed; vì code có bắt/nuốt exception, trạng thái này không chứng minh email/log luôn xử lý đúng.

## Kiến trúc đề xuất

Chưa cần thay toàn bộ Google Workspace stack cho quy mô danh mục hiện tại. Cần sửa ranh giới dữ liệu, mô hình trạng thái và tính toàn vẹn giao dịch:

1. Sheet live có schema/version; frontend được sinh từ một nguồn và chỉ chứa dữ liệu public đã lọc.
2. Giao dịch có LoanID, SourceResponseID, QR/AssetUnitID, số lượng, người yêu cầu, trạng thái và audit trail.
3. Luồng ghi: validation → khóa/chống trùng/lưu → thông báo có trạng thái retry; return/approval/maintenance tham chiếu ID.
4. Tách lookup public khỏi dữ liệu người dùng/chức năng cán bộ. Nếu phù hợp, dùng tài khoản Google cho quản trị; PIN chung không cho audit danh tính.
5. Có staging Sheet/Form/Script riêng, job đối soát, cảnh báo lỗi, backup và diễn tập restore. Theo dõi quota/email và owner trigger. Tham khảo [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [installable triggers](https://developers.google.com/apps-script/guides/triggers/installable), [quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Thứ tự sửa và điều kiện phát hành

1. Vá XSS, formula/HTML injection và lọc trường API.
2. Thiết kế LoanID/trạng thái; sửa dispatcher, validation, approval/return, khóa/chống trùng và retry email.
3. Đối soát log; chuẩn hóa schema, thống kê, cán bộ và Forms; dựng lại trang tem; bỏ thành công giả của placeholder.
4. Viết regression cho bốn Forms, duyệt/từ chối, nhiều yêu cầu cùng QR, đồng thời/chạy lại, email lỗi, quá hạn, trả hỏng, bảo trì và ngày biên.
5. Chạy E2E trên staging bằng đúng vai trò; xác nhận email, log, quyền, công thức và backup/restore.
6. Xem PDF A4, in thử và quét bằng camera iOS/Android; test mobile/PWA/offline/cache trên thiết bị thật.
7. Phát hành có rollback; đối chiếu remote, giữ `.claspignore`, cập nhật deployment hiện có. Trigger dùng source HEAD còn Web App dùng version deployment, nên phải kiểm soát cả hai.

## Giới hạn review

Không kiểm thử phá hoại/tải production, chèn công thức thật, gửi form/email, thay đổi quyền hoặc dữ liệu. Chưa nghiệm thu E2E ghi thật, camera/tem in, thiết bị vật lý, iOS/Android/PWA, quota hoặc restore. Lần thử viewport không tạo mobile viewport như mong muốn nên không tính là test responsive. Bản XLSX không giữ mọi cấu hình Sheets; quyền chia sẻ và protected ranges được kiểm tra thêm qua UI. Báo cáo không công bố thông tin cá nhân từ bản export.

Bộ kiểm chứng và cách chạy: [audits/2026-09-28/README.md](audits/2026-09-28/README.md).
