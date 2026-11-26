# Chuẩn file nhập và xuất — Joy Fee Check

Phiên bản: 2026-11-26

## Nguyên tắc

- Tên file có thể đổi tự do.
- App tìm dữ liệu theo tên cột, không dựa vào vị trí cột.
- Các sheet chuẩn dưới đây giúp dễ nhận biết; tên sheet cũ vẫn được nhận.
- Cột riêng của webapp chỉ đặt sau các cột kế toán.
- File nhập lỗi hoặc thiếu cột sẽ báo lỗi và giữ nguyên dữ liệu đang làm.
- Mẫu công khai chỉ dùng dữ liệu ví dụ, không có học sinh hay giao dịch thật.

## DS học sinh

- Sheet chuẩn: `DS_HOC_SINH`
- Bắt buộc: `MSHS`, `Họ tên` hoặc `Full name`
- Thứ tự mẫu: `STT`, `Teacher`, `Shift`, `Class`, `Full name`, `MSHS`, `Address`, `STK_PH`, `Tên TK`, `Ghi chú`, `Học phí`.
- Cột cần cho kế toán: `STT`, `MSHS`, `Lớp`, `Họ tên`, `Giáo viên`, `Học phí`, `Địa chỉ`, `Ghi chú`.

## Tiền mặt

- Sheet chuẩn: `TIEN_MAT`
- Bắt buộc: `MSHS`, `SỐ TIỀN`
- Thứ tự: `NGÀY ĐÓNG`, `LỚP`, `HỌ TÊN`, `SỐ TIỀN`, `MSHS`, `GHI CHÚ`.

## Kế toán tháng trước

- Sheet chuẩn: `DS_THUC_TE` và `DS_GHI_HD`.
- Thứ tự cột kế toán đã đối chiếu: `STT`, `MSHS`, `Lớp`, `Họ tên`, `Giáo viên`, `Học phí`, `Địa chỉ`, `Ghi chú`.
- Hai danh sách được giữ riêng; app không phân loại theo vị trí sheet.

## Nợ chốt

- Sheet chuẩn: `CHOT_NO`
- Bắt buộc: `MSHS`, `Số còn thiếu`
- Thứ tự: `MSHS`, `Họ tên`, `Lớp`, `Số còn thiếu`.

## Sao kê ngân hàng

- VietinBank: có thể chọn nguyên file `.xls`/`.xlsx` tải từ ngân hàng. App đọc dòng tiêu đề giao dịch sau phần thông tin tài khoản, dùng **Ngày hạch toán/Accounting date**, chỉ lấy `Có/Credit > 0`, giữ số giao dịch và số tài khoản đối ứng.
- TPBank: nhận tiêu đề tiếng Việt/Anh của sao kê hoặc mẫu `SAO_KE_TPBANK`.
- Mẫu ngân hàng chỉ để tham khảo/tạo thủ công, không thay thế sao kê gốc.

## Đầu ra dùng lại

- File `ChotNo_YYYYMM.xlsx` xuất cuối tháng nhập lại được ở ô Nợ chốt tháng trước.
- File kế toán xuất có hai sheet danh sách dùng các cột chuẩn kế toán ở trên.
- File Tổng hợp (Tab 7) là báo cáo; không dùng làm nguồn thay thế DS học sinh gốc.
