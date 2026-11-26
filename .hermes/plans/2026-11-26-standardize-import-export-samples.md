# Chuẩn hóa Import, Export và mẫu tải trong webapp — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Dùng thứ tự cột của kế toán làm chuẩn chung, đồng bộ các đầu ra liên quan và cho tải mẫu từng loại trực tiếp trong tab Import.

**Architecture:** Dùng một bộ định nghĩa cột/sheet chung cho mẫu và các đầu ra cùng loại. Import đọc theo ý nghĩa tiêu đề, không phụ thuộc tên file hay thứ tự sheet/cột. Giữ tương thích file cũ và đọc nguyên bản sao kê ngân hàng.

**Tech Stack:** JavaScript trình duyệt, SheetJS có sẵn trong lib/xlsx.full.min.js, Excel xlsx/xls, bộ test Node hiện có.

---

## Phạm vi và tình trạng kiểm tra

- Chỉ lập kế hoạch; chưa sửa ứng dụng, chưa tạo lại mẫu, chưa push/deploy.
- Workspace: /home/ubuntu/joyfeecheck-frame4.
- Đã đọc js/importer.js phần DS học sinh và VietinBank; kiểm tra các vị trí xuất liên quan trong js/exporter.js.
- Đã kiểm kê cấu trúc 6 file mẫu tại forms_mau_import bằng XML Excel. Tên sheet hiện có: DS_HOC_SINH; TIEN_MAT; DS_THUC_TE + DS_GHI_HD; CHOT_NO; SAO_KE (hai ngân hàng).
- Chưa đối chiếu file DS học sinh thực tế của kế toán với file của anh trong lượt này. KHÔNG chốt thứ tự cột từ mẫu cũ hoặc tự đoán.
- Đã đọc file anh gửi Vietinbank 29.10.xls bằng công cụ đọc tài liệu. Đây là Excel nhị phân, có phần thông tin tài khoản trước bảng giao dịch; tiêu đề song ngữ gồm Ngày hạch toán/Accounting date, Mô tả giao dịch/Transaction description, Nợ/Debit, Có/Credit, Số dư TK/Account Balance, Số giao dịch/Transaction number, tài khoản và tên tài khoản đối ứng, Ngày phát sinh giao dịch/Transaction date.
- Chưa chạy thử importer với file này. Kiểm tra mã cho thấy bộ nhận diện Ngày hiện tại chưa liệt kê rõ Accounting date/Transaction date; cần test nguyên file trước khi kết luận mức tương thích. maGD hiện được gán rỗng trong parser VietinBank dù file nguồn có số giao dịch.
- Bộ mẫu hiện có là tài sản sẵn có để sửa, không phải bằng chứng rằng tab Import đã có nút tải.

## Các quy tắc phải giữ

1. File kế toán là nguồn chuẩn cho thứ tự và tên cột nghiệp vụ tương ứng. Cột app cần nhưng kế toán không có nối sau cùng; không chen vào giữa.
2. Chuẩn hóa riêng từng loại dữ liệu, không ép mọi báo cáo dùng cùng một danh sách cột.
3. Tên file được đổi tự do; tên sheet mẫu ổn định theo vai trò. Chữ hoa/thường, dấu cách, gạch ngang/gạch dưới và tên cũ có danh sách tương thích.
4. Không bắt kế toán sửa file để vừa với app. Không bắt anh sửa dữ liệu cũ ngay khi chưa có phiên bản hỗ trợ.
5. Sao kê ngân hàng ưu tiên tải nguyên bản rồi nhập; không buộc sửa sheet, xóa thông tin đầu trang hoặc chép qua mẫu.
6. Mẫu công khai chỉ chứa dữ liệu giả minh họa; không chứa danh tính học sinh, số tài khoản hoặc giao dịch thật. File thật chỉ phục vụ đối chiếu riêng, không đưa lên GitHub/Pages.
7. Không thay đổi công thức học phí, ghép chuyển khoản, chia gia đình, dữ liệu tháng hoặc dữ liệu đã lưu trong đợt này.

## Giai đoạn 1 — Nhận đủ nguồn và lập bảng đối chiếu

**Read:** js/importer.js, js/exporter.js, js/app.js các hàm import/export, index.html khu Import, SPEC_04_TAB_IMPORT.md, tests/.

- Kiểm kê tất cả file anh gửi; mỗi file ghi vai trò, sheet, dòng tiêu đề, thứ tự cột, cột bắt buộc/tùy chọn, kiểu tiền/ngày/mã và dòng tổng.
- So DS_HOC_SINH mẫu hiện tại, DS thực tế của kế toán và DS anh đang dùng theo từng cột.
- Kiểm kê các đầu ra có danh sách học sinh: export kế toán, xuất Tab 7 và sheet DS Học Sinh Thực Tế; xác định rõ đầu ra nào được nhập lại tháng sau.
- Phân biệt báo cáo tổng hợp với file có thể nhập lại; không hứa mọi báo cáo đều dùng được làm nguồn.
- Lập bảng chốt: vai trò → sheet chuẩn → tên cột và thứ tự → cột thêm phía sau → tên cũ chấp nhận → đầu ra sử dụng.

**Gate:** Anh duyệt bảng thứ tự cột cụ thể trước khi sửa. Nếu chưa nhận đủ DS kế toán thì đánh dấu chờ, không lấy exporter hiện tại làm chuẩn thay thế.

## Giai đoạn 2 — Bộ chuẩn dùng chung

**Create (proposed):** js/import-schema.js; docs/CHUAN_FILE_IMPORT_EXPORT.md.
**Modify:** index.html thứ tự nạp script; js/importer.js.
**Test (proposed):** tests/test_import_schema.js (điều chỉnh theo cách chạy bộ test hiện có sau khi đọc).

- Khai báo trường nội bộ, nhãn xuất, thứ tự, alias tiêu đề, sheet chuẩn/alias, kiểu dữ liệu, bắt buộc/tùy chọn và phiên bản mẫu.
- Mẫu và exporter cùng loại dùng chung cấu hình để tránh lần sau lệch nhau.
- Bảo toàn MSHS, số điện thoại và STK dạng chữ, kể cả số 0 đầu; không tự thêm/bớt số 0.
- Tránh khớp nhầm do từ khóa quá rộng như Tên/Họ tên/Tên tài khoản; ưu tiên khớp chính xác đã chuẩn hóa trước khớp alias có kiểm soát.
- Giữ Chốt sau, học phí 0 và học phí trống khác nhau.

**TDD:** Viết test thứ tự/alias theo bảng đã duyệt → chạy thấy fail → triển khai tối thiểu → chạy lại pass.

## Giai đoạn 3 — Import tương thích và sao kê gốc

**Modify:** js/importer.js; js/app.js các hàm tiếp nhận dữ liệu.
**Test (proposed):** tests/test_import_contract.js; tests/test_bank_import_contract.js.

- Test tên file tùy ý, tên sheet cũ, đảo sheet/cột, thêm sheet bìa, tiêu đề nằm dưới phần hướng dẫn.
- Đọc và kiểm tra vào vùng tạm; chỉ thay dữ liệu đang dùng sau khi hợp lệ. Lỗi không xóa dữ liệu cũ.
- Nếu nhiều sheet cùng phù hợp: báo rõ hoặc cho chọn trong một bảng phẳng, không đoán theo vị trí.
- Báo số dòng nhập, dòng bỏ qua, cột thiếu; nguồn rỗng cần xác nhận riêng.
- Test nguyên bản VietinBank anh gửi: nhận tiêu đề song ngữ, phân biệt ngày hạch toán và ngày phát sinh; đề xuất dùng ngày hạch toán theo nghiệp vụ sao kê, ghi rõ quy tắc trước khi chốt.
- Giữ số giao dịch nguồn khi có; không dùng STT nguồn làm mã duy nhất. File gửi có STT lặp 0 nên không được coi STT là khóa.
- Chỉ lấy Có/Credit > 0; không xem mọi tiền vào là học phí đã ghép. Kiểm tra tiền nộp tài khoản và giao dịch chưa ghép vẫn ở luồng xử lý hiện có.
- Đối chiếu số giao dịch và tổng tiền đọc được với vùng dữ liệu thực tế; các số tổng trong đầu file chỉ là điểm đối chiếu, không thay cho phép đếm.

## Giai đoạn 4 — Đồng bộ các đầu ra

**Modify:** js/exporter.js.
**Test (proposed):** tests/test_export_contract.js.

- Với từng đầu ra cùng loại đã xác định: cột kế toán đứng trước theo đúng thứ tự; cột app thêm nối sau.
- Đồng bộ cả tiêu đề lẫn giá trị từng ô, không chỉ đổi tên cột.
- Đồng bộ tên sheet của đầu ra dùng nhập lại, giữ alias tên sheet xuất cũ trong importer.
- Không áp thứ tự DS học sinh lên sao kê hay báo cáo có cấu trúc khác.
- Test vòng khép kín: nhập → xuất → nhập file vừa xuất; đối chiếu MSHS, lớp, học phí, địa chỉ, ghi chú, số dòng và tổng tiền. Xác định rõ khi đầu ra có chủ ý gộp theo MSHS để không làm mất lớp hoặc dòng học phí.

## Giai đoạn 5 — Mẫu tải trực tiếp trong tab Import

**Modify:** forms_mau_import/01_DS_HOC_SINH.xlsx; 02_TIEN_MAT.xlsx; 03_KE_TOAN_THANG_TRUOC.xlsx; 04_NO_CHOT_THANG_TRUOC.xlsx; 05_SAO_KE_VIETINBANK.xlsx; 06_SAO_KE_TPBANK.xlsx; index.html; css/ file liên quan nếu cần.

- Chuẩn hóa lại 6 mẫu sau khi chốt bảng nguồn; thêm loại khác chỉ nếu kiểm kê phát hiện đầu vào thực sự có.
- Mỗi ô nhập có nút 📥 Tải mẫu [loại], kèm tên sheet chuẩn, cột bắt buộc và dòng bắt đầu dán dữ liệu.
- Có thể thêm 📥 Tải toàn bộ mẫu nếu không tăng phụ thuộc không cần thiết; nút từng loại vẫn bắt buộc.
- Dữ liệu ví dụ giả và hướng dẫn phải được phân biệt rõ để tránh nhập nhầm ví dụ vào danh sách thật; quy tắc xóa ví dụ trước khi dán được ghi ngay trong mẫu.
- Với ngân hàng ghi rõ: Có thể nhập file tải trực tiếp; mẫu chỉ dùng tham khảo/tạo thủ công.
- Link tải tương đối cùng nguồn, cập nhật phiên bản/cache để không tải nhầm mẫu cũ.

## Giai đoạn 6 — Kiểm chứng, tài liệu và bàn giao

- Chạy toàn bộ test hiện có sau khi đọc đúng lệnh chạy của dự án; ghi output thực, không tự đặt số PASS.
- Mở webapp, kiểm tra nút tải từng loại và mở file đã tải, không chỉ kiểm tra file trong thư mục.
- Import từng mẫu, test xuất/nhập lại; kiểm tra tên sheet và cột ở file tải về thực tế.
- Test thất bại giữ dữ liệu đang làm; test refresh/backup dữ liệu tháng không bị tác động.
- Chụp/ghi bằng chứng giao diện và kết quả đếm dòng/tổng tiền, không công khai dữ liệu thật.
- Cập nhật hướng dẫn sử dụng và quy chuẩn; rà mọi hướng dẫn cũ mâu thuẫn.
- Chỉ sau khi được duyệt triển khai: commit/push, kiểm tra Pages, báo link và nhắc Ctrl+Shift+R. Không triển khai trong lượt lập plan này.

## Điều kiện hoàn tất

- [ ] Có bảng thứ tự cột được đối chiếu từ file kế toán thật và anh duyệt.
- [ ] DS mẫu và đầu ra cùng loại có đúng cột/thứ tự; cột riêng app nằm cuối.
- [ ] File tên bất kỳ vẫn nhập được, file cũ có tương thích rõ ràng.
- [ ] Sao kê VietinBank nguyên bản được test thực tế, ngày/tiền/STK/mã GD đúng.
- [ ] Mẫu từng loại tải được ngay trong tab Import và nhập lại được.
- [ ] Mẫu công khai chỉ có dữ liệu giả.
- [ ] Dữ liệu tháng hiện tại, lịch sử, ghép tiền và công thức không bị đổi ngoài phạm vi.

## Đang chờ để chốt chi tiết

1. File DS học sinh thực tế của kế toán làm chuẩn.
2. File DS học sinh anh đang dùng để so khác biệt.
3. Các file mẫu nguồn còn lại và file xuất webapp anh thấy lệch, nếu có; nếu đã gửi ở lượt trước thì tìm lại trước khi yêu cầu gửi lại.
4. Quy tắc ngày dùng cho sao kê nếu nghiệp vụ cần ngày phát sinh thay vì ngày hạch toán.
