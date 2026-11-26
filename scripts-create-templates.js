const XLSX = require('./lib/xlsx.full.min.js');
const fs = require('fs');
const schema = {
  '01_DS_HOC_SINH.xlsx': [['DS_HOC_SINH', [
    ['STT','Teacher','Shift','Class','Full name','MSHS','Address','STK_PH','Tên TK','Ghi chú','Học phí'],
    [1,'Cô Mẫu','Ca tối','Lớp Mẫu','Học sinh Ví dụ','HV000','Địa chỉ ví dụ','0123456789','PH Ví dụ','XÓA DÒNG VÍ DỤ TRƯỚC KHI DÁN',800000]
  ]]],
  '02_TIEN_MAT.xlsx': [['TIEN_MAT', [
    ['NGÀY ĐÓNG','LỚP','HỌ TÊN','SỐ TIỀN','MSHS','GHI CHÚ'],
    ['01/11/2026','Lớp Mẫu','Học sinh Ví dụ',800000,'HV000','XÓA DÒNG VÍ DỤ TRƯỚC KHI DÁN']
  ]]],
  '03_KE_TOAN_THANG_TRUOC.xlsx': [
    ['DS_THUC_TE', [['STT','MSHS','Lớp','Họ tên','Giáo viên','Học phí','Địa chỉ','Ghi chú'], [1,'HV000','Lớp Mẫu','Học sinh Ví dụ','Cô Mẫu',800000,'Địa chỉ ví dụ','XÓA DÒNG VÍ DỤ TRƯỚC KHI DÁN']]],
    ['DS_GHI_HD', [['STT','MSHS','Lớp','Họ tên','Giáo viên','Học phí','Địa chỉ','Ghi chú'], [1,'HV000','Lớp Mẫu','Học sinh Ví dụ','Cô Mẫu',800000,'Địa chỉ ví dụ','XÓA DÒNG VÍ DỤ TRƯỚC KHI DÁN']]]
  ],
  '04_NO_CHOT_THANG_TRUOC.xlsx': [['CHOT_NO', [['MSHS','Họ tên','Lớp','Số còn thiếu'],['HV000','Học sinh Ví dụ','Lớp Mẫu',200000]]]],
  '05_SAO_KE_VIETINBANK.xlsx': [['SAO_KE_VIETINBANK', [['STT/No.','Ngày hạch toán/Accounting date','Mô tả giao dịch/ Transaction description','Nợ/ Debit','Có / Credit','Số dư TK/ Account Balance','Số giao dịch/ Transaction number','Số tài khoản đối ứng/ Corresponsive account','Tên tài khoản đối ứng/ Corresponsive name','Ngày phát sinh giao dịch/ Transaction date'], [1,'01-11-2026 08:00:00','Ví dụ chuyển khoản học phí',0,800000,1000000,'GD_VI_DU','0123456789','NGUOI GUI VI DU','01-11-2026 08:00:00']]]],
  '06_SAO_KE_TPBANK.xlsx': [
    ['SAO_KE_TPBANK', [
      ['Ngày thực hiện Transaction Date','Số giao dịch Reference Number','Diễn giải Explanation','Nợ Debit','Có Credit','Số dư Balance'],
      ['01/11/2026 08:00:00','GD_VI_DU','Ví dụ chuyển khoản học phí',0,800000,1000000]
    ]]
  ]
};
for (const [filename, sheets] of Object.entries(schema)) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map(h => ({wch: Math.min(Math.max(String(h).length + 2, 14), 48)}));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  fs.writeFileSync(`forms_mau_import/${filename}`, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
}
console.log('Created 6 public samples with fictional data only.');
