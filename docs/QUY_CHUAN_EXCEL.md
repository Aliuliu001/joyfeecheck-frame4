# Quy chuẩn nhập Excel

## Nguyên tắc an toàn

- App tìm sheet dựa trên cột dữ liệu, không dựa vào vị trí sheet đầu tiên.
- Có sheet bìa hoặc đổi thứ tự sheet vẫn được.
- Nếu có từ hai sheet cùng phù hợp, app dừng và báo rõ; không tự chọn để tránh nhập nhầm.
- Khi file không có dòng hợp lệ, dữ liệu đang mở được giữ nguyên.

## Danh sách học sinh

- Cần: `MSHS` (hoặc Mã học sinh/Mã HS) và `Họ tên` (hoặc Full name).
- Khuyên dùng tên sheet: `DS_HOC_SINH`.
- Có thể thêm: Lớp, GV, Học phí, STK, Tên TK, Địa chỉ, Ghi chú.

## Sao kê ngân hàng

- VietinBank cần: Ngày, Nội dung/Diễn giải và Ghi có/Credit.
- TPBank cần: Ngày giao dịch, Diễn giải/Nội dung và Credit/Ghi có.
- Giữ nguyên tên sheet ngân hàng; app tự nhận theo các cột.

## Tiền mặt

- Cần: `MSHS` và `Số tiền`.
- Khuyên dùng tên sheet: `TIEN_MAT`.
- Có thể thêm: Ngày, Họ tên, Lớp, Ghi chú.

## File Kế toán tháng trước

File bắt buộc có đúng hai sheet dữ liệu, không tính sheet bìa:

- `DS_THUC_TE`
- `DS_GHI_HD`

Mỗi sheet cần ít nhất `MSHS` và `Họ tên`. Có thể thêm Lớp, Học phí, GV, Địa chỉ, Ghi chú. App không đoán sheet theo thứ tự: thiếu hoặc trùng vai trò sẽ báo lỗi thay vì nhập nhầm.
