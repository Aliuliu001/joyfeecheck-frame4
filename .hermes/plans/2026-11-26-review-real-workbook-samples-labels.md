# Review file thật, mẫu nhập và tên/lớp — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Dùng trực tiếp file tải Google Sheets, sửa thiếu nhãn học sinh và đồng bộ mẫu/đầu ra mà không bắt anh đảo cột.

**Architecture:** Nhận diện vai trò sheet + tiêu đề, đọc cached cell value thay vì hình thức trình bày. Dùng resolver MSHS chung cho nhãn tên/lớp, không đưa danh bạ lịch sử vào danh sách tính phí. Đồng bộ mẫu/export theo schema hiện có và tên cũ tương thích.

**Tech Stack:** Vanilla JavaScript/Alpine, SheetJS, Node tests; audit XLSX XML bằng Python stdlib.

## Phạm vi / trạng thái
Chỉ review và kế hoạch. Chưa sửa sample/code, chưa push. Thay thế các đề xuất thêm bảng trung gian và tự động chọn tháng trong plan STK trước: anh tiếp tục tự chọn cột học phí và tải xlsx trực tiếp. File thật riêng tư ở native-inputs/doc_900283a37e98_DS_HOC_SINH.xlsx, không copy vào repo/public/test fixtures. Không ghi dữ liệu cá nhân vào tài liệu.

## Bằng chứng audit thực
Đã đọc workbook XML/cached values, không chạy được parser SheetJS trong lượt này vì lifecycle guard chặn quét thư viện; openpyxl cũng chưa cài. Vì vậy các đếm dưới đây là audit file, không phải PASS import trình duyệt.
- 6 sheet: Form (ẩn), Ds_HocSinh, DS Thực Tế  HĐ cho KETOAN, Mapping_PH (ẩn), SAOKE_RAW (ẩn), 2025-09 (ẩn).
- Ds_HocSinh tiêu đề dòng 3: STT, Teacher, Shift, Class, Full name, MSHS, Address, STK_PH, TenTK, GhiChu_GiaDinh, Học Phí. Có cột phụ ngoài vùng này và hàng điều khiển phía trên.
- 196 dòng có MSHS, 181 MSHS khác nhau, không thiếu tên hoặc lớp trong 196 dòng. Không được gộp thành 181 dòng vì có thể một HS học nhiều lớp.
- 111 ô STK có dữ liệu trong các dòng HS, được lưu dạng string/string formula-cache; 37 bắt đầu bằng 0; không có chuỗi E+ ở các ô này. Có 1 giá trị không thuần chữ số, cần kiểm tra riêng, không tự cắt rồi coi hợp lệ.
- Sheet kế toán cũng 196 dòng có mã, 181 mã khác nhau và không thiếu tên/lớp. Chưa đối chiếu bằng khóa để kết luận hai bảng hoàn toàn giống nhau.
- Sheet kế toán tiêu đề dòng 3 có Mã học sinh, Mã lớp, Họ tên học sinh, Giáo viên, Học phí, Địa chỉ, Ghi chú; phía sau còn tiêu đề TenTK, GhiChu_GiaDinh, Học Phí dù các cột này trống. Hai tiêu đề học phí giống nghĩa cần được phát hiện, không chọn tùy tiện.
- L1 hai sheet ghi Col53 và Col49. Đây là nhãn điều khiển khác nhau, chưa chứng minh công thức HP thực tế lấy cùng kỳ. Phải đối chiếu trước khi bỏ sheet phụ.
- File có 7 alignment styles wrapText; merges ở hai dòng điều khiển, không phát hiện merge trong dòng tiêu đề/vùng dữ liệu của hai sheet chính.

## Kết luận cho người dùng
Wrap/clip/overflow, fill màu nền, độ rộng/chiều cao, căn lề không thay giá trị ô nên bình thường không cản import. Khác với merge làm thiếu ô, newline trong tiêu đề cần chuẩn hóa, ô công thức không có cache hoặc báo lỗi, kiểu dữ liệu số/STK, sheet ẩn có chữ ký giống nguồn. Không cần bỏ wrap trước upload.
Giữ hai hợp đồng theo vai trò: DS_HOC_SINH với 11 cột đã chuẩn; DS_THUC_TE/DS_GHI_HD với 8 cột kế toán. Không ép file nguồn giống báo cáo. File tải nhiều sheet không tự động là file kế toán tháng trước hợp lệ: parser kế toán cần phân biệt đủ hai vai trò.

## Task 1 — Khóa hồi quy file nhiều sheet (read-only trước)
**Files:** js/importer.js, js/import-schema.js; tests/importer-sheets.test.js, tests/import-contract.test.js.
- Tạo fixture giả tái hiện 6 sheet, 2 sheet hiện, 4 ẩn, header dòng 3, dòng điều khiển có merge, cột thừa; cùng các alias thật nhưng không dùng dữ liệu thật.
- Test Ds_HocSinh được chọn đúng; Form/Mapping_PH/SAOKE_RAW/2025-09 không trở thành danh sách thu phí. Nếu tên/cấu trúc mơ hồ thì báo chọn rõ, không ưu tiên sheet ẩn hay sheet đầu theo phỏng đoán.
- Chạy test thất bại trước, sửa tối thiểu rồi chạy lại. Không loại mọi sheet ẩn toàn cục vì có thể có nguồn hợp lệ cần chọn rõ.
- Xác minh 196 dòng nguồn thực trên bản làm việc riêng, tên/lớp đủ và 181 mã; không dedup mất lớp. So HP, tên/lớp và khóa MSHS+lớp giữa hai sheet; chỉ sau đó kết luận sheet phụ chỉ đảo cột hay có logic khác.

## Task 2 — Alias tiêu đề và cảnh báo đầu vào
**Files:** js/import-schema.js, js/importer.js; tests/import-contract.test.js.
- Kiểm tra/chấp nhận TenTK, GhiChu_GiaDinh, Mã học sinh, Mã lớp, Họ tên học sinh, Học Phí cùng chuẩn hiện có. Hiện GhiChu_GiaDinh chưa có alias chính xác và có nguy cơ không đọc ghi chú.
- Chuẩn hóa whitespace/newline có kiểm soát, ưu tiên alias chính xác trước includes. Không làm nhầm tên TK với tên HS.
- Hai cột Học phí cùng nghĩa: nếu có xung đột phải chặn/cho chọn; một cột trống cũng cần quy tắc rõ và test, không chỉ lấy cột đầu vô điều kiện.
- Báo riêng thiếu trường nguồn và thiếu nhãn giao diện. HP 0/trống/Chốt sau giữ riêng; thời gian Shift dạng serial không đổi thành chuỗi số thiếu nghĩa nếu mẫu/export dùng giờ.
- Failed import giữ dữ liệu cũ; xem trước số dòng, mã khác nhau, thiếu tên/lớp, STK cần kiểm tra và HP trống.

## Task 3 — Sửa đường hiển thị tên/lớp còn sót
**Files:** js/app.js (getStudentDetails, loadSettingsUI, lookupStudentInfo), js/storage.js (saveStudentDirectory, resolveStudent), index.html các bảng liên quan; tests/student-labels.test.js (mới), tests/session-backup.test.js.
- Đã thấy getStudentDetails dùng resolveStudent nhưng loadSettingsUI dòng 353–372 vẫn dựng studentsMap từ prevInvoiceStudents cho STK phụ và keyword; đây là đường có nguy cơ thiếu tên/lớp khi HS không thuộc DS ghi HĐ. Chưa khẳng định đây là duy nhất hoặc nguyên nhân trên live.
- Inventory STK phụ, TPBank keyword, gia đình, gói, dropdown tìm HS, báo cáo và export; dùng resolver chung thay vì mỗi nơi đọc một danh sách.
- Ưu tiên từng trường từ DS tháng hiện tại; danh bạ đã lưu chỉ điền phần thiếu và ghi nguồn. Không nối lớp lịch sử vào lớp tháng hiện tại một cách vô điều kiện.
- Mã trim/uppercase nhất quán. Một mã nhiều lớp hiển thị đủ lớp hiện tại mà không gộp mất dòng thu phí; mã không rõ hiện nhãn thiếu nguồn, không lấy tên chủ tài khoản.
- Test nhập trước/sau mapping, refresh, đổi tháng, backup/restore; mã có trong DS_HOC_SINH nhưng không có DS_GHI_HD vẫn hiện tên/lớp; HS lịch sử không tự xuất hiện trong danh sách thu phí tháng mới.

## Task 4 — Điều chỉnh sample cùng exporter
**Files:** scripts-create-templates.js, js/import-schema.js, js/exporter.js, forms_mau_import/01_DS_HOC_SINH.xlsx, forms_mau_import/03_KE_TOAN_THANG_TRUOC.xlsx, index.html Import tab; tests/template-files.test.js, tests/import-contract.test.js.
- Giữ 11 cột student: STT, Teacher, Shift, Class, Full name, MSHS, Address, STK_PH, Tên TK, Ghi chú, Học phí. Alias giữ nguồn TenTK/GhiChu_GiaDinh, không bắt anh đổi nguồn.
- Kế toán 8 cột: STT, MSHS, Lớp, Họ tên, Giáo viên, Học phí, Địa chỉ, Ghi chú. DS_THUC_TE và DS_GHI_HD giữ khác vai trò, không sao chép một DS để giả thành hai nguồn.
- Không buộc đổi thứ tự cột để import; sample là bố cục khuyến nghị. Không bắt thêm header điều khiển của file nguồn vào sample.
- STK ví dụ giả có 0 đầu, lưu text thật; đủ ví dụ nhiều lớp và HP=0/Chốt sau nếu importer tương ứng hỗ trợ. Bỏ ví dụ trước dán được nhắc rõ.
- Mẫu mỗi loại tải ngay cạnh input trong Import; sửa hướng dẫn filename tùy ý, tên sheet theo vai trò, alias nguồn được nhận. Đồng bộ exporter cùng schema, roundtrip không mất ghi chú/địa chỉ/lớp/STK.

## Task 5 — STK: bảo toàn thay vì làm lại quy trình
**Files:** js/importer.js, js/utils.js, js/exporter.js; tests/stk-preservation.test.js mới.
- Giữ quy trình tải xlsx. Không yêu cầu Sheet trung gian hay TO_TEXT toàn bảng.
- Với file thật đã thấy STK text có 0 đầu được giữ trong XML, nhưng chưa đối chiếu ngân hàng nên không khẳng định toàn bộ STK chính xác.
- Kiểm tra riêng 1 giá trị không thuần chữ số; chỉ báo vấn đề, không tự suy luận hoặc xóa để ra số khác.
- Test đọc raw string thay vì display, 0 đầu, scientific display numeric, scientific text, numeric quá dài; cảnh báo những trường hợp không thể xác minh. Không tự thêm 0, không tự dùng chuỗi E+ để match.
- Rà callers normalizeSTK trước sửa helper chung, tránh ảnh hưởng sao kê/mapping đã ổn định.

## Task 6 — Kiểm chứng và bàn giao sau duyệt
- Node tests: `node --test tests/*.test.js`; nếu guard vẫn chặn phải dùng môi trường thực thi được cho phép hoặc browser script loading, không lách guard/giả PASS. Test có đường file cache cũ cần fixture giả ổn định hoặc skip rõ khi thiếu; không đưa tài liệu thật vào repo.
- Browser: nhập file thật riêng tư trên phiên thử không chứa dữ liệu làm việc; đối chiếu 196 dòng/181 mã, thiếu tên/lớp=0, 111 STK và 37 STK 0 đầu; kiểm tra lỗi/cảnh báo cụ thể. Không chụp công khai thông tin cá nhân.
- Thay wrap/fill/độ rộng trong fixture giả, import cho kết quả giống nhau. Test hidden sheets và header dòng 3.
- Xem các bảng tên/lớp thực, không chỉ unit test; refresh, đổi tháng, backup/restore. Tải sample qua UI, mở file thực tải và import/export/import.
- Đối chiếu số dòng, bộ khóa MSHS+lớp, tổng HP và các trường; không chỉ so mã unique.
- Update docs/CHUAN_FILE_IMPORT_EXPORT.md, docs/BUGS.md, docs/TASK.md và hướng dẫn Import. Chỉ đánh dấu xong khi có output thật.
- Chỉ commit/push/deploy sau anh chốt kế hoạch và kết quả kiểm thử đạt; nhắc Ctrl+Shift+R sau deploy. Không đổi logic ghép tiền/tính học phí ngoài phạm vi.

## Chờ anh chốt
Duyệt phạm vi 6 task trên. Không cần anh cung cấp header tháng hay sửa sheet ngay. Cần review kết quả đối chiếu hai sheet trước khi đề nghị bỏ sheet phụ; chưa có lý do phải xóa các sheet ẩn.
