# Import, Mapping và An toàn dữ liệu Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Nhập Excel không phụ thuộc tên sheet từng tháng; hiển thị tên/lớp nhất quán; bảo toàn công việc theo tháng và có đường sao lưu rõ ràng.

**Architecture:** Giữ app vanilla JS + Alpine.js trên GitHub Pages. Tách nhận diện sheet, danh bạ học sinh và phiên làm việc theo tháng. Bổ sung sao lưu trước khi cân nhắc dịch vụ lưu trữ trực tuyến có đăng nhập.

**Tech Stack:** SheetJS, Alpine.js, localStorage hiện hữu; IndexedDB dự kiến cho dữ liệu phiên lớn; Node tests và browser tests.

---

## Phạm vi / hiện trạng đã đọc
- Repo local `/home/ubuntu/joyfeecheck-frame4`, origin `Aliuliu001/joyfeecheck-frame4`. Chỉ đọc bản local, chưa xác minh đồng bộ với HEAD trên GitHub. Trước triển khai phải kiểm tra remote và bảo toàn thay đổi local.
- Không sửa app, không commit/push trong lượt lập kế hoạch này.
- Graph đã thử: stale, không dùng làm căn cứ kết luận.
- `docs/PLAN_2026-10-22_import_ketoan_va_nochot.md` đang untracked; chỉ là kế hoạch cũ, KHÔNG coi như đã triển khai. Không ghi đè file này.
- `js/importer.js:354-440`: file Kế toán dùng tên sheet với fallback theo thứ tự; `DS ghi Hoá Đơn` không được nhận diện rõ; có nguy cơ ghi đè danh sách.
- `js/importer.js:145,222,295`: VTB/TPB/tiền mặt chỉ đọc sheet đầu; đổi tên không phải nguyên nhân duy nhất, đổi thứ tự sheet cũng làm đọc sai.
- `js/app.js:343-369`: STK phụ/từ khóa chỉ bổ sung tên/lớp từ `prevInvoiceStudents`, không từ danh sách học sinh hiện tại.
- `js/app.js:940-956`: Gói tra học sinh từ `state.students`; không có danh sách đó thì hiện mã thay tên.
- `js/app.js:293-341`: khởi động chưa nạp lại danh sách học sinh hiện tại/sao kê; danh sách kế toán trước đã ghi localStorage lúc import nhưng chưa đọc lại ở init.
- `js/app.js:1694-1730`: backup JSON quét `joy_*` đã lưu; KHÔNG thể bảo đảm chứa dữ liệu đang chỉ nằm trong RAM.
- `js/app.js:1834-1895`: restore hiện có đường gộp; phải kiểm thử xung đột trước khi gọi là phục hồi nguyên trạng.
- `js/storage.js:224-245`: gói dựa trên tháng bắt đầu + số tháng, tháng cuối vẫn được tính. UI lưu endMonth là tháng sau khoảng được bao phủ. Không đổi ngầm giá trị này.

## Hợp đồng Excel đề xuất
Tên file có thể kèm YYYY-MM. Tên sheet cố định, không kèm tháng. Chuẩn dưới đây là đích sau nâng cấp, KHÔNG khẳng định bộ đọc hiện tại đã hỗ trợ các tên này.

1. DS học sinh hiện tại: 1 sheet `DS_HOC_SINH`; tối thiểu MSHS, Họ tên, Lớp, Học phí. Giữ các cột bổ sung GV, STK, Tên TK, Địa chỉ, Ghi chú theo nhu cầu hiện hữu.
2. Sao kê VietinBank: 1 sheet dữ liệu giao dịch; giữ nguyên file ngân hàng, không bắt sửa tên sheet. Cần Ngày giao dịch, Nội dung/Diễn giải, Ghi có và STK đối ứng/Tên TK đối ứng khi có.
3. Sao kê TPBank: 1 sheet dữ liệu; giữ form ABBYY/ngân hàng, cần ngày, diễn giải, Credit/Ghi có; giữ các trường tham chiếu và Debit.
4. Tiền mặt: 1 sheet `TIEN_MAT`; Ngày, MSHS, Họ tên, Lớp, Số tiền, Ghi chú.
5. Kế toán tháng trước: 2 sheet `DS_THUC_TE` và `DS_GHI_HD`; mỗi sheet MSHS, Họ tên, Lớp, Học phí; Ghi HĐ giữ thêm Địa chỉ/Ghi chú khi sử dụng. Hai danh sách có vai trò khác nhau, không tự sao chép một sang hai. Nếu chỉ có một danh sách phải cho chọn chế độ thiếu sheet rõ ràng, không báo hoàn tất đủ hai.
6. Nợ chốt tháng trước: 1 sheet giữ form app xuất, ưu tiên `CHOT_NO`; MSHS, Họ tên, Lớp, Số còn thiếu. Không đổi tên sheet của exporter trước khi kiểm tra chéo importer.
7. Backup JSON là file phục hồi, không tính theo sheet. Backup Excel nhiều sheet là để xem/lưu trữ, không đồng nghĩa file đầu vào Kế toán 2 sheet.

## Task 1 — Bộ đọc an toàn và nhận diện sheet
**Files:** Modify `js/importer.js`, `js/app.js`, `index.html`; Create `tests/importer-sheets.test.js`, `docs/QUY_CHUAN_EXCEL.md`.
1. Viết test RED: tên có/không dấu, hoa/thường, khoảng trắng/gạch dưới, sheet đảo thứ tự, có sheet bìa, sai/thiếu cột, hai sheet cùng phù hợp, file rỗng, dòng tổng/chữ ký.
2. Run `node --test tests/importer-sheets.test.js`; ghi kết quả thất bại thực tế.
3. Parse các ứng viên trước, phân vai sau; không dùng fallback đoán thứ tự cho Kế toán vì hai bảng có thể cùng cấu trúc. Ưu tiên tên/alias; dùng cột để tìm ứng viên, nếu mơ hồ hiện chọn sheet trong một bảng phẳng.
4. Nhận tên cũ và tên chuẩn, kiểm tra cột bắt buộc theo loại file, không nhầm Tên TK thành Họ tên. Không lấy HP mặc định để che việc thiếu cột bắt buộc.
5. Parse vào dữ liệu tạm, chỉ thay dữ liệu đang dùng sau validation/xác nhận; lỗi phải giữ bản cũ và không báo thành công 0 dòng.
6. Hiện loại sheet, tên sheet, số dòng hợp lệ/bỏ qua; Kế toán hiển thị riêng hai số.
7. Run tests GREEN; thử trong trình duyệt bằng workbook giả không chứa thông tin cá nhân và file thật nếu anh cung cấp. Commit sau kiểm chứng khi đã được duyệt triển khai.

## Task 2 — Danh bạ tên/lớp dùng chung
**Files:** Modify `js/app.js`, `js/storage.js`, `index.html`; Create `tests/student-directory.test.js`.
1. RED: chỉ import danh sách hiện tại vẫn thấy tên/lớp STK phụ, từ khóa và Gói; import kế toán trước/sau không làm mất tên; mã có khoảng trắng/chữ thường; một MSHS nhiều lớp; người đã nghỉ; mã chưa biết.
2. Chuẩn hóa mã trim + uppercase, không tự thêm/bỏ số 0. Ưu tiên danh sách hiện tại, nguồn lịch sử chỉ bổ sung trường thiếu và có nhãn nguồn. Không lấy tên chủ tài khoản làm tên học sinh.
3. Dùng resolver chung cho mapping/gói; một mã nhiều lớp hiển thị đủ lớp không trùng. Mã không tra được hiển thị 'Chưa có trong danh sách', không âm thầm tạo học sinh.
4. Lưu danh bạ phục vụ hiển thị; phân biệt danh bạ lưu lần trước với danh sách đang học tháng này để không dùng người cũ tính học phí sai.
5. Cập nhật UI sau import/restore và nạp lại khi F5.
6. Run `node --test tests/student-directory.test.js`; browser kiểm tra trước/sau F5. Ghi lỗi và sửa đã kiểm chứng vào tài liệu bug hiện hữu; không đánh dấu xong chỉ dựa trên ảnh.

## Task 3 — Giữ phiên theo tháng và backup đầy đủ
**Files:** Modify `js/app.js`, `js/storage.js`, `index.html`; Create `tests/session-backup.test.js`, `docs/SAO_LUU_KHOI_PHUC.md`; có thể thêm `js/session-store.js` nếu cần IndexedDB.
1. Kiểm kê nguồn đang dùng: học sinh, sao kê, tiền mặt, kế toán trước, mapping, gói, gia đình, gán tay, bỏ qua, ghi chú, nợ/bản chốt, referrals, fee adjustments, settings. Phân loại dùng chung / theo tháng / báo cáo có thể tính lại.
2. RED: import -> F5, tháng 10 -> 11 -> 10, ghi lỗi/quota đầy, tháng rỗng, snapshot trước thay dữ liệu, export -> clear test origin -> restore -> so số dòng và tổng tiền.
3. Lưu dữ liệu phiên sau import/thay đổi thành công; chọn tháng rõ ràng, không tự chuyển hoặc ghi đè tháng cũ chỉ vì đồng hồ sang tháng. Không hồi tố thay bản chốt tài chính.
4. Đo dung lượng trước quyết định localStorage hay IndexedDB; nếu dùng IndexedDB, backup JSON phải đọc cả hai kho. Sao lưu cùng trình duyệt là điểm phục hồi nội bộ, KHÔNG phải bản ngoài máy.
5. Backup có version, thời gian, tháng và thống kê số dòng; chờ ghi xong rồi mới export, kiểm tra lỗi từng bước. Không đưa PAT/secret vào browser hoặc backup.
6. Tách 'Gộp dữ liệu' và 'Khôi phục nguyên trạng'; xem trước xung đột, có xác nhận và bản sao trước phục hồi. Không trộn sao kê các tháng hoặc nhân đôi giao dịch khi import lại.
7. Hiện lần tải backup gần nhất + thay đổi chưa sao lưu; nhắc sau buổi làm việc và trước đổi/chốt tháng. Trình duyệt không được hứa tự ghi Downloads khi tab đóng.
8. Run `node --test tests/session-backup.test.js` và toàn bộ tests; browser xác nhận số dòng/tổng trước-sau phục hồi.

## Task 4 — Chốt nền tảng lâu dài, triển khai riêng sau duyệt
- Khuyến nghị trước mắt giữ GitHub Pages, hoàn tất Tasks 1-3.
- Có thể thêm PWA để mở như app/offline; cài app không tự tạo lưu trữ đám mây hay backup.
- Google AI Studio là công cụ xây/thử ứng dụng AI, không phải giải pháp backup mặc định. Đổi nơi phát web không tự biến dữ liệu trình duyệt thành dữ liệu dùng chung.
- Nếu cần nhiều máy/người: thiết kế đăng nhập + quyền + database riêng (ví dụ Firebase/Supabase) và lịch backup/versioning. Khảo sát chi phí/khóa bảo mật/quy tắc truy cập trước lựa chọn; không deploy dữ liệu học sinh/sao kê công khai.
- Nếu cần Drive backup tự động: OAuth/quyền tối thiểu và versioning; không dùng thư mục công khai. JSON tải tay vẫn là đường dự phòng.
- Audit riêng `shared_data/joy_mappings.json` được app fetch: xác minh dữ liệu thật có đang public không trước đưa thêm danh bạ hoặc thông tin tài khoản lên repo. Không xuất dữ liệu cá nhân lên GitHub để chữa lỗi mất tên.

## Acceptance / ưu tiên
1. Đổi tên/thứ tự sheet không dẫn tới import nhầm hoặc mất dữ liệu cũ; mơ hồ thì hỏi chọn.
2. Mapping/Gói tra đúng tên và lớp khi đã có danh bạ; F5 vẫn thấy; thiếu nguồn báo rõ.
3. Sang tháng không mất mapping/gói, không lẫn dữ liệu phiên giữa tháng; phục hồi kiểm tra được số dòng/tổng.
4. Gói 3 tháng từ 07/2026 chỉ bao phủ 07-09, tháng 10 không còn active; nếu sửa nhãn 'Đến tháng' phải đổi cách hiển thị riêng, không sửa dữ liệu ngầm.
5. Chưa thực hiện hoặc deploy bất kỳ task nào; cần anh duyệt trước khi sửa code. Không gộp refactor nợ lớn từ kế hoạch cũ vào phạm vi này nếu chưa duyệt.
