# 🐛 BUGS — Đã fix & Known Issues

> Cập nhật: 05/10/2026 (frame4 — Nợ cũ tháng trước, đợt 1)
> Toàn bộ code mới chỉ làm trên repo frame4, không đụng frame3.

---

## 🆕 ĐỢT 1 — Nợ cũ tháng trước (05/10/2026)

| # | Vấn đề | Cách sửa | Trạng thái |
|---|--------|----------|------------|
| N01 | CK tháng 10 trả nợ T9 bị tính nhầm thành HP T10 | Luật mới: tiền về trả nợ cũ trước, còn dư mới trả HP tháng này, dư nữa là tiền sách (không tự cấn sang tháng sau). Thêm 3 cột `Nợ cũ \| Tổng phải thu \| Còn thiếu` ở tab Báo cáo Đối soát | ✅ đã code + test 6 case |
| N02 | Tên tháng kết thúc gói hiển thị lệch 1 tháng (tính tiền vẫn đúng) | Sửa `confirmPackage()`: endMonth = start + months − 1 (VD gói 2T từ T9 → hết T10) | ✅ đã code + test |
| N03 | Thiếu nút "đóng 1 cục 1.6tr → chuyển thành gói 2 tháng" | Thêm gợi ý `doublePayRows` + nút 1 chạm `makePackage2Months` | ✅ đã code + test |
| N04 | Không biết bạn nào đang ăn HP mặc định 800k (ô trống) | Đánh dấu `hocPhiIsDefault` lúc import; tô vàng ô Tổng HP trong app + Excel; ghi chú "HP mặc định — kiểm tra lại" | ✅ đã code |
| N05 | Tab 3-4 (Giảm bớt / Stop) phải đọc HP tháng này, không đọc gộp nợ | Giữ `tongHocPhi` = HP tháng này; nợ nằm cột riêng `noCu` | ✅ đã code đúng |
| N06 | Chốt nợ cuối tháng | Nút "Chốt nợ cuối tháng": lấy ai còn thiếu → lưu + tự nhớ cho tháng sau + xuất file ChotNo | ✅ đã code + test |
| N07 | Nợ dán sai tháng (chốt T10 xong vẫn xem T10) | Chỉ tính nợ khi `forMonth` khớp tháng đang xem; sang tháng mới tự lấy chốt tháng trước | ✅ đã code + test |
| N08 | Tab 6 "Chuyển tiền sai" báo double 1 nhà thành 2 dòng | Lọc nhóm trùng y hệt thành viên (lỡ tay tạo 2 lần) → chỉ tính 1 lần | ✅ đã code + test |
| N09 | Copy Tab 6 sang Tổng hợp gộp 2 anh em chung 1 dòng | Tách mỗi bạn 1 dòng, ghi chú "Nhà ... — được cấp ..." | ✅ đã code |
| N10 | Ô HP tự sửa ở Tổng hợp chưa rõ | Tô vàng nền + viền đỏ ô HP khác mặc định | ✅ đã code |
| N11 | Bảng nợ: bạn học 2 lớp → 2 dòng cùng MSHS, nợ không cộng | `normalizeDebtRows`: gộp trùng MSHS (cộng nợ + gộp lớp), sort MSHS | ✅ đã code + test |
| N12 | Copy Tab 6 sang Tổng hợp: HP chỉ lấy 1 lớp + sort lộn xộn | Lấy tổng HP 2 lớp (cộng dồn DS tổng); sort Tổng hợp theo MSHS | ✅ đã code |
| N13 | Học kèm "Chốt sau": ô trống bị đắp 800k, tính thiếu ảo | Ghi "Chốt sau" vào ô HP → hiện chữ, vẫn Chưa đóng + Nhắc PH, KHÔNG cộng tổng | ✅ đã code + test 11 case |

### Quy ước đã chốt với Ngọc (đợt nợ cũ)

- File nợ 4 cột: `MSHS | Họ tên | Lớp | Số thiếu` — chỉ MSHS + Số thiếu bắt buộc.
- Bé mới HP lẻ (200k/300k/500k): app lấy đúng số trong file tổng, không cần code thêm.
- Vàng = ô HP trống nên app đoán 800k, cần kiểm tra lại. Bé cũ ghi 800k thật thì không vàng.
- Tiền dư = tiền sách, không tự cấn sang tháng sau.
- Đóng 2 tháng 1 lần → chuyển thành "Đóng gói".
- Bạn nghỉ học (không còn trong DS tổng): nợ tách ra "Nợ khó đòi", không cộng vào bảng chính, không đòi.
- Có gói mà vẫn nợ cũ → gói chỉ bao HP tháng này, nợ cũ vẫn phải trả.
- Test 6 case 05/10: trả đúng nợ ✅, trả 1 phần ✅, trả dư ✅, nhà 2 anh em 1 người nợ ✅, bé mới HP lẻ ✅, gói + nợ ✅.

---

## ✅ ĐÃ FIX (Session 2 — 03-04/08/2026)

### CRITICAL

| # | File | Dòng | Mô tả | Fix |
|:--|:--|:--|:--|:--|
| B01 | `reporter.js` | 125-128 | `filterReport()` khi filter = "all" (mặc định), `"all"` là truthy nên lọc ẩn TOÀN BỘ rows | Thêm `&& trangThai !== 'all'` cho mỗi điều kiện |
| B02 | `app.js` | 225 | Nút `#btn-export-full` không có event listener → bấm không có gì | Thêm `addEventListener` gọi `Exporter.exportFullExcel(this.state)` |
| B03 | `utils.js` | 191-194 | `showModal()` confirmBtn đóng modal trước khi gọi `onConfirm()` → nếu validation fail, modal đã đóng mất | Đổi logic: chỉ đóng modal nếu `onConfirm()` không return `false` |

### HIGH

| # | File | Dòng | Mô tả | Fix |
|:--|:--|:--|:--|:--|
| B04 | `storage.js` | 51, 57-63 | `mergeSTKPhu()` không update `currentMap` trong loop → nếu `newList` có duplicate key, chèn trùng | Thêm `currentMap.set(newItem.stk, entry)` sau push |
| B05 | `storage.js` | 93, 98-105 | `mergeKeywords()` cùng lỗi như B04 | Tương tự: thêm `currentMap.set()` |
| B06 | `storage.js` | 51, 93 | `return;` thay vì `return 0;` khi input không phải array → caller nhận `undefined` | Đổi thành `return 0;` |
| B07 | `app.js` | 429-435 | `suggestMatch()` truyền array `[{...}]` thay vì object `{...}` → `unmatchedTx.description` = undefined | Bỏ ngoặc vuông, truyền object trực tiếp |
| B08 | `app.js` | 433 | `suggestions[0].length` — `suggestions[0]` là object, `.length` = undefined → luôn hiện "Không có gợi ý" | Sửa: `suggestions.length > 0` rồi `suggestions.map(...)` |
| B09 | `app.js` | 460 | TPBank unmatched hard-code `"Chưa có gợi ý"` thay vì gọi `suggestMatch()` | Thêm gọi `Matcher.suggestMatch(t, this.state.students)` |
| B10 | `app.js` | 443, 895 | Inline `onclick` dùng template literal chứa dấu `'` → JS syntax error nếu tên/STK có `'` | Thêm `.replace(/'/g, "\\\\'")` |
| B11 | `app.js` | 635, 690 | Sau khi gán STK/keyword xong, chỉ gọi `renderSyncChanges()` → bảng ngoại lệ không cập nhật | Đổi thành `this.runMatching()` để re-match + re-render |
| B12 | `app.js` | 930 | `info.lastBackupDate` không tồn tại (đúng: `info.lastHistoryDate`) → luôn hiện "Chưa có" | Sửa tên biến |
| B13 | `matcher.js` | 68 | `b.keyword.length` crash nếu keyword undefined | Đổi: `(b.keyword || '').length` |
| B14 | `matcher.js` | 164-183 | `aggregateByMSHS` case-sensitive → `'hv001' !== 'HV001'` | Thêm `.toUpperCase()` |

### MEDIUM

| # | File | Dòng | Mô tả | Fix |
|:--|:--|:--|:--|:--|
| B15 | `utils.js` | 79-83 | `formatDate()` không parse DD-MM-YY (2 chữ số năm) → ngày tiền mặt hiện sai | Thêm nhánh `parts[2].length === 2` → `2000 + parseInt(parts[2])` |
| B16 | `importer.js` | 94 | Hardcode `APP_CONFIG.DEFAULT_HOC_PHI` thay vì đọc `#default-fee` input | Đổi: `Utils.parseNumber(document.getElementById('default-fee')?.value) \|\| APP_CONFIG.DEFAULT_HOC_PHI` |
| B17 | `importer.js` | 155-162 | VietinBank thiếu alias cột `"Số TK đối ứng"`, `"Số tài khoản đối ứng"` | Thêm vào mảng tìm kiếm |
| B18 | `importer.js` | 217-223 | TPBank thiếu alias cột `"Ngày"`, `"Ngày GD"` | Thêm vào mảng tìm kiếm |
| B19 | `importer.js` | 241 | Regex hard-code `LE THI TUYET NHUNG chuyen tien` (tên chủ TK cá nhân) | Comment ra — user sẽ tự filter nếu cần |
| B20 | `importer.js` | 313 | MSHS tiền mặt không `.toUpperCase()` → mismatch khi aggregate | Thêm `.toUpperCase()` |

---

## ✅ ĐÃ FIX 26/11/2026 — File DS_HOC_SINH nhiều sheet và nhãn tên/lớp

| # | Vấn đề | Cách sửa | Kiểm tra |
|---|---|---|---|
| B27 | File tải Google Sheets có 6 sheet, tiêu đề thật ở dòng 3; nguy cơ đọc nhầm sheet đầu hoặc mất dòng HS học nhiều lớp | Chọn theo tên sheet + cột bắt buộc, quét dòng tiêu đề; giữ từng dòng lớp, không gộp MSHS khi import | File thật: `Ds_HocSinh`, dòng 3, 196 dòng / 181 MSHS |
| B28 | `GhiChu_GiaDinh` không nằm trong alias chuẩn nên có thể rơi ghi chú | Bổ sung alias `GhiChu_GiaDinh` và các dạng có khoảng trắng/dấu gạch dưới | Unit + nhập file thật PASS |
| B29 | Cột Học phí trùng nghĩa có thể bị lấy cột đầu im lặng | Nếu chỉ một cột có dữ liệu thì dùng cột đó; nếu nhiều cột cùng có dữ liệu thì chặn và báo rõ | Unit PASS |
| B30 | STK phụ và từ khóa TPBank tra nhãn từ DS ghi HĐ tháng trước nên HS chỉ có trong DS tháng này có thể thiếu tên/lớp | Dùng chung `resolveStudent`: ưu tiên DS tháng đang làm, danh bạ chỉ bù chỗ trống | Unit PASS; không kéo lớp cũ vào tháng mới |
| B31 | STK lẫn ký tự/số dài có thể bị sửa thầm | Giữ nguyên giá trị đọc được và cảnh báo riêng; không tự thêm số 0 hoặc đổi E+ | File thật báo 1 STK cần kiểm tra |

---

## ✅ ĐÃ FIX 27/11/2026 — Chia CK STK chung, gói gia hạn và chi tiết thanh toán

| # | Vấn đề | Cách sửa | Kiểm tra |
|---|---|---|---|
| B32 | Một STK VTB dùng chung bị chia theo học phí dù nội dung ghi rõ đúng một bé | Với STK chung, app xét MSHS nguyên mã hoặc họ tên đầy đủ thuộc đúng nhóm STK trước khi chia. Nếu chỉ ra đúng 1 bé thì gán trọn giao dịch; không có chỉ định vẫn chia như cũ; mã/tên mâu thuẫn thì chuyển sang cần kiểm tra. | 6 case Node PASS, gồm mã `HV12`/`HV128`, tên trùng và nội dung mâu thuẫn |
| B33 | Sửa gán VTB trước đây biến thành STK phụ vĩnh viễn | Sửa theo từng giao dịch + tháng, dùng mã nhận diện đầy đủ (mã GD/thời điểm/STK/số tiền/nội dung); chạy lại, nhập lại và backup vẫn giữ đúng giao dịch đó. Khoản gán tay không bị chia lại trong nhóm gia đình. | Node PASS |
| B34 | Popup chi tiết cắt nội dung CK ở 80 ký tự, có thể hiển thị HTML từ sao kê | Hiện đầy đủ, xuống dòng và cuộn dọc; STK, tên chủ TK, nội dung đều được escape trước khi hiển thị. Có nút sửa người nhận ngay trên từng dòng VTB. | 3 case Node PASS |
| B35 | Gói cũ có thể làm gói gia hạn mới bị báo hết hạn do thứ tự lưu | Xét toàn bộ gói của bé; gói đang bao tháng đối soát ưu tiên hơn lịch sử cũ. Mốc kết thúc luôn tính từ tháng bắt đầu + số tháng, bao gồm cả tháng cuối. Gói chồng nhau được cờ xung đột, không miễn đôi. | 5 case Node PASS, gồm qua năm và dữ liệu không hợp lệ |
| B36 | Chỉ nhắc gói vừa hết, không có danh sách dọn gói cũ an toàn | Danh sách gói hết hạn có tên/bé/lớp/kỳ hạn/trạng thái gia hạn. Chọn từng gói hoặc chọn tất cả rồi xác nhận **Ẩn**; chỉ ẩn danh sách hiện dùng, không xóa lịch sử hay ảnh hưởng tháng cũ. | 6 case Node PASS |
| B37 | Tổng hợp, Kế toán và Excel có nguy cơ không cùng số phân bổ VTB | Bài kiểm tra luồng thật Matcher → Tổng hợp → Kế toán → Excel xác nhận VTB được chỉ định, tiền mặt, tổng thu và file Excel trùng nhau; chạy lại không nhân giao dịch, tháng/phiên cũ không đổi. | 1 case xuyên luồng Node PASS |

> Bộ kiểm tra mới: **23/23 PASS**. Bộ kiểm tra toàn dự án còn 3 lỗi `ENOENT` do 3 file Excel nguồn bên ngoài đã không còn ở thư mục cache, không do các thay đổi trên.

---

## ⚠️ KNOWN ISSUES (CHƯA FIX)

| # | File | Mô tả | Mức độ | Ghi chú |
|:--|:--|:--|:--|:--|
| K02 | `exporter.js` | `exportKeToan()` sheet "DS viết HĐ" — **ĐÃ FIX** (code hiện có 6 dòng header công ty + footer tổng + Giám đốc). Docs cũ ghi chưa fix là SAI. | — | Đã verify 28/08 |
| K03 | `exporter.js` | `exportFullExcel()` key mapping — **ĐÃ FIX** (app.js truyền đúng `vtb/tpb/cash`). Docs cũ ghi chưa fix là SAI. | — | Đã verify 28/08 |
| K06 | Toàn bộ | **ĐÃ TEST** bằng Node harness 28/08 với file thật tháng 7. Diff vs master BAO_CAO: 173 trùng, 3 mismatch (1.7%), lệch 800k do 2 HS thiếu keyword (đúng nghiệp vụ). | — | Xem session test bên dưới |

---

## ✅ ĐÃ FIX 28/08 (phát hiện qua test file thật tháng 7)

| # | File | Mô tả | Mức độ | Fix |
|:--|:--|:--|:--|:--|
| B21 | `exporter.js` | Xuất Excel lấy `row.ghiChuGiaDinh` (thường rỗng) thay vì `row.ghiChu` → **mất toàn bộ cảnh báo ⚠** trong file Excel | HIGH | Đổi sang `row.ghiChu` ở `exportBaoCao` + `exportFullExcel` (sheet BAO_CAO) |
| B22 | `exporter.js` | Format tháng `2026-08` (từ input type=month) không khớp mẫu kế toán `07.2026` | LOW | Chuẩn hóa thành `MM.YYYY` ở tất cả hàm export |
| B23 | `reporter.js` | Cảnh báo "⚠ Nghi nhầm" báo quá nhiều false positive (vì HP=800k, hầu hết GD lẻ đều bị gắn) | MEDIUM | User chọn bỏ hẳn, chỉ giữ "⚠ CK TK CT lệch HP" |
| B24 | `matcher.js:220` | `if (totalCKPool === 0) continue;` nằm trong `.forEach` → **SyntaxError crash toàn bộ app** nếu có nhóm GĐ | CRITICAL | Đổi `continue` → `return` |
| B25 | `importer.js:135` | Vòng lặp tìm header VTB giới hạn 20 dòng → sao kê có block "thông tin tài khoản" (24 dòng header) → chọn sai dòng → **toàn bộ VTB 0 match** | HIGH | Mở rộng 40 dòng + ưu tiên dòng chứa "đối ứng" |
| B26 | `matcher.js` | 1 STK chính (hoặc 1 keyword) có nhiều HS → chỉ gán khoản tiền vào HS đầu tiên `[0]`, bỏ sót các con còn lại | HIGH | Chia tiền theo tỉ lệ HP cho tất cả HS share cùng STK/keyword (áp dụng cho cả VTB và TPB) |

### Kết quả test (Node harness, file thật tháng 7)
- Parse: DS 185 HS, VTB 86 GD (match 90 sau chia), TPB 46 GD (match 42), Tiền mặt 27.
- Diff vs master `BAO_CAO`: 173 trùng / 3 mismatch (1.7%). Lệch tổng 800.000₫ do 2 HS (HV329, HV339) thiếu keyword mapping — đúng nghiệp vụ (tab Ngoại lệ để gán tay).
- File Excel xuất ra ĐÃ có cột Ghi chú chứa ⚠ (verify 6 dòng).
- Patch: `joyfeecheck_fixes.patch` (5 file, +134 dòng).
