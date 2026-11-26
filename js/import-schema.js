/* Chuẩn file Import / Export — một nơi dùng chung cho mẫu, xuất và đọc file. */
window.ImportSchema = {
  version: '2026-11-26',
  sheets: {
    students: 'DS_HOC_SINH', cash: 'TIEN_MAT', previousActual: 'DS_THUC_TE',
    previousInvoice: 'DS_GHI_HD', debt: 'CHOT_NO', vtb: 'SAO_KE_VIETINBANK', tpb: 'SAO_KE_TPBANK'
  },
  headers: {
    students: ['STT', 'Teacher', 'Shift', 'Class', 'Full name', 'MSHS', 'Address', 'STK_PH', 'Tên TK', 'Ghi chú', 'Học phí'],
    cash: ['NGÀY ĐÓNG', 'LỚP', 'HỌ TÊN', 'SỐ TIỀN', 'MSHS', 'GHI CHÚ'],
    accounting: ['STT', 'MSHS', 'Lớp', 'Họ tên', 'Giáo viên', 'Học phí', 'Địa chỉ', 'Ghi chú'],
    debt: ['MSHS', 'Họ tên', 'Lớp', 'Số còn thiếu'],
    vtb: ['STT/No.', 'Ngày hạch toán/Accounting date', 'Mô tả giao dịch/ Transaction description', 'Nợ/ Debit', 'Có / Credit', 'Số dư TK/ Account Balance', 'Số giao dịch/ Transaction number', 'Số tài khoản đối ứng/ Corresponsive account', 'Tên tài khoản đối ứng/ Corresponsive name', 'Ngày phát sinh giao dịch/ Transaction date'],
    tpb: ['Ngày thực hiện Transaction Date', 'Số giao dịch Reference Number', 'Diễn giải Explanation', 'Nợ Debit', 'Có Credit', 'Số dư Balance']
  },
  aliases: {
    sheets: {
      students: ['ds hoc sinh', 'danh sach hoc sinh', 'dshocsinh'],
      cash: ['tien mat'], previousActual: ['ds thuc te', 'thuc te', 'ds hoc sinh thuc te'],
      previousInvoice: ['ds ghi hd', 'ds ghi hoa don', 'danh sach viet hd', 'danh sach viet hoa don', 'ghi hoa don'],
      debt: ['chot no'], vtb: ['sao ke', 'sao ke vietinbank', 'lich su giao dich'], tpb: ['sao ke', 'sao ke tpbank']
    },
    fields: {
      mshs: ['mshs', 'ma hoc sinh', 'ma hs'], fullName: ['ho ten', 'full name', 'ho va ten', 'ten hoc sinh'],
      className: ['lop', 'class', 'ma lop'], teacher: ['teacher', 'giao vien', 'gv'], shift: ['shift', 'ca'],
      phone: ['sdt', 'so dien thoai', 'sdt lien lac'], stkPH: ['stk ph', 'stk_ph', 'stk', 'so tai khoan'],
      tenTK: ['ten tk', 'tentk', 'ten tai khoan'], hocPhi: ['hoc phi', 'hp', 'tong hp'], diaChi: ['dia chi', 'address'], ghiChu: ['ghi chu', 'ghichu', 'note'],
      date: ['ngay dong', 'ngay gd', 'ngay giao dich', 'ngay hach toan', 'accounting date', 'transaction date', 'date'],
      amount: ['so tien', 'so tien dong'], credit: ['ghi co', 'credit'], debit: ['ghi no', 'debit'], balance: ['so du', 'balance', 'so du tk', 'account balance'],
      description: ['mo ta', 'noi dung', 'dien giai', 'transaction description', 'explanation', 'details'],
      transactionId: ['so giao dich', 'transaction number', 'sogd', 'reference number', 'so tham chieu'],
      counterAccount: ['stk doi ung', 'so tk doi ung', 'so tai khoan doi ung', 'corresponsive account'],
      counterName: ['ten tk doi ung', 'ten tai khoan doi ung', 'ten doi ung', 'corresponsive name'],
      debtAmount: ['so con thieu', 'con thieu', 'so thieu', 'so tien', 'thieu']
    }
  }
};
