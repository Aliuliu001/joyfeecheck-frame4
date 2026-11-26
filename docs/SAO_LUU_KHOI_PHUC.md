# Sao lưu và khôi phục

## Dữ liệu được giữ

App lưu riêng mỗi tháng đối soát: danh sách học sinh, sao kê VietinBank, sao kê TPBank, tiền mặt, file kế toán tháng trước, trạng thái nhập và nợ đầu kỳ. Mapping STK phụ, từ khóa, gia đình, gói, điều chỉnh, giới thiệu, ghi chú, giao dịch bỏ qua và danh bạ tên/lớp là dữ liệu dùng chung.

Bản JSON chứa toàn bộ khóa `joy_*`, bao gồm các phiên tháng đã lưu trong trình duyệt tại thời điểm bấm tải. File JSON không chứa mật khẩu hay token GitHub.

## Cách dùng an toàn

1. Cuối buổi làm việc, bấm **Tải backup toàn bộ (JSON)**.
2. Lưu file vào Google Drive hoặc USB; file nằm trong Downloads chỉ là bản trên máy.
3. Khi đổi máy hoặc lỡ xóa dữ liệu trình duyệt, bấm **Khôi phục từ file backup** và chọn JSON.
4. Xác nhận cảnh báo. Khôi phục nguyên trạng thay toàn bộ dữ liệu Joy hiện tại bằng dữ liệu trong file, không trộn sao kê giữa các tháng.
5. App mở lại tháng đã được backup gần nhất. Đối chiếu số học sinh, số giao dịch và tổng tiền trước khi tiếp tục.

## Lưu ý

- Refresh/Ctrl+Shift+R không làm mất dữ liệu đã lưu.
- Đổi tháng không xóa tháng cũ: dữ liệu được giữ thành phiên riêng.
- Nếu JSON là bản cũ không có cấu trúc đầy đủ, app chỉ gộp mapping; không coi đó là phục hồi nguyên trạng.
- Bản cứu hộ trước khi khôi phục chỉ nằm trong cùng trình duyệt; không thay cho file JSON đã lưu ngoài máy.
