/**
 * Importer - Xử lý đọc file Excel (SheetJS)
 */

window.Importer = {
  // Đọc file dưới dạng ArrayBuffer
  readFileAsArrayBuffer: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Không thể đọc file: ' + e.message));
      reader.readAsArrayBuffer(file);
    });
  },

  // Tìm index cột theo nhãn chuẩn và các tên cũ được chấp nhận.
  findColumnIndex: function(headers, keywords) {
    const lowerKeywords = keywords.map(k => Utils.normalizeText(k));
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i]) continue;
      const val = Utils.normalizeText(headers[i].toString());
      if (lowerKeywords.some(k => val === k)) return i;
    }
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i]) continue;
      const val = Utils.normalizeText(headers[i].toString());
      if (lowerKeywords.some(k => val.includes(k))) return i;
    }
    return -1;
  },

  fieldColumn: function(headers, field) {
    const aliases = window.ImportSchema?.aliases?.fields?.[field] || [];
    return this.findColumnIndex(headers, aliases);
  },

  getMatrix: function(workbook, sheetName) {
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
  },

  isFooterRow: function(row, mshs, fullName) {
    const text = Utils.normalizeText(`${mshs || ''} ${fullName || ''}`);
    return !mshs && /(tong cong|tong hp|giam doc|truong tuan ngoc|so tien bang chu)/.test(text);
  },

  getImportSummary: function(rows, amountField) {
    const total = (rows || []).reduce((sum, row) => sum + (amountField ? (Number(row[amountField]) || 0) : 0), 0);
    return { rows: (rows || []).length, total };
  },

  normalizeHeader: function(value) {
    return Utils.normalizeText(value || '').replace(/[\s_-]+/g, '');
  },

  findHeaderRow: function(matrix, requiredGroups, maxRows = 40) {
    let best = { index: -1, score: 0, headers: [] };
    for (let i = 0; i < Math.min(maxRows, matrix.length); i++) {
      const headers = matrix[i] || [];
      const normalized = headers.map(h => this.normalizeHeader(h));
      const score = requiredGroups.reduce((total, aliases) => total + (aliases.some(alias => normalized.some(h => h.includes(this.normalizeHeader(alias)))) ? 1 : 0), 0);
      if (score > best.score) best = { index: i, score, headers };
    }
    return best;
  },

  findSheetCandidates: function(workbook, requiredGroups, options = {}) {
    return workbook.SheetNames.map(name => {
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
      const header = this.findHeaderRow(matrix, requiredGroups, options.maxRows || 40);
      const normalizedName = Utils.normalizeText(name).replace(/[\s_-]+/g, '');
      const aliases = options.nameAliases || [];
      const nameScore = aliases.some(alias => normalizedName.includes(Utils.normalizeText(alias).replace(/[\s_-]+/g, ''))) ? 100 : 0;
      return { name, matrix, headerRowIdx: header.index, headerScore: header.score, score: nameScore + header.score, valid: header.score >= requiredGroups.length };
    }).filter(item => item.valid);
  },

  selectUniqueSheet: function(workbook, requiredGroups, options = {}) {
    const candidates = this.findSheetCandidates(workbook, requiredGroups, options);
    if (!candidates.length) throw new Error(options.missingMessage || 'Không tìm thấy sheet có đủ cột bắt buộc');
    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const best = candidates[0];
    const equallyBest = candidates.filter(c => c.score === best.score);
    if (equallyBest.length > 1) {
      throw new Error(`Có nhiều sheet cùng phù hợp: ${equallyBest.map(c => c.name).join(', ')}. Hãy giữ đúng 1 sheet dữ liệu hoặc đổi tên sheet theo hướng dẫn.`);
    }
    return best;
  },

  requireColumns: function(headers, fields, label) {
    const missing = Object.entries(fields).filter(([, index]) => index < 0).map(([name]) => name);
    if (missing.length) throw new Error(`${label} thiếu cột bắt buộc: ${missing.join(', ')}`);
  },

  // Parse Danh Sách Học Sinh (Google Sheets)
  parseGoogleSheets: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const selection = this.selectUniqueSheet(
        workbook,
        [['mshs', 'mã học sinh', 'mã hs'], ['họ tên', 'full name']],
        { nameAliases: ['ds_hoc_sinh', 'danh sach hoc sinh'], missingMessage: 'Không tìm thấy sheet DS học sinh có cả cột MSHS và Họ tên' }
      );
      const dataMatrix = selection.matrix;
      const headerRowIdx = selection.headerRowIdx;
      const headers = dataMatrix[headerRowIdx];
      const students = [];
      
      // Tìm các cột
      const colMap = {
        stt: this.findColumnIndex(headers, ['STT']), teacher: this.fieldColumn(headers, 'teacher'),
        shift: this.fieldColumn(headers, 'shift'), className: this.fieldColumn(headers, 'className'),
        fullName: this.fieldColumn(headers, 'fullName'), mshs: this.fieldColumn(headers, 'mshs'),
        phone: this.fieldColumn(headers, 'phone'), stkPH: this.fieldColumn(headers, 'stkPH'),
        tenTK: this.fieldColumn(headers, 'tenTK'), hocPhi: this.fieldColumn(headers, 'hocPhi'),
        diaChi: this.fieldColumn(headers, 'diaChi'), ghiChu: this.fieldColumn(headers, 'ghiChu')
      };
      this.requireColumns(headers, { MSHS: colMap.mshs, 'Họ tên': colMap.fullName }, `Sheet ${selection.name}`);

      // Đọc data rows
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;
        
        // Skip empty rows
        if (!row[colMap.mshs] && !row[colMap.fullName]) continue;

        let hocPhiVal = Utils.parseNumber(document.getElementById('default-fee')?.value) || APP_CONFIG.DEFAULT_HOC_PHI;
        const hocPhiRaw = row[colMap.hocPhi];
        // Đánh dấu ô HP trống → app đoán số mặc định (để tô vàng kiểm tra lại)
        let hocPhiIsDefault = false;
        // Học kèm "Chốt sau": HP chưa biết — hiện chữ, chỉ nhắc không cộng tổng
        let hocPhiPending = false;
        if (hocPhiRaw !== undefined && hocPhiRaw !== null && String(hocPhiRaw).trim() !== '') {
            const normHP = Utils.normalizeText(String(hocPhiRaw));
            if (normHP.includes('chot sau') || normHP.includes('chotsau') || normHP.includes('cho chot')) {
              hocPhiPending = true;
              hocPhiVal = 0;
            } else {
              const parsed = Utils.parseNumber(hocPhiRaw);
              // Cho phép HP = 0 (miễn phí) hoặc HP > 0 (giảm/miễn)
              // Chỉ dùng default nếu cột HP trống hoặc không parse được
              if (!isNaN(parsed)) hocPhiVal = parsed;
              else hocPhiIsDefault = true;
            }
        } else {
          hocPhiIsDefault = true;
        }

        const student = {
          stt: row[colMap.stt] || i,
          mshs: (row[colMap.mshs] || '').toString().trim().toUpperCase(),
          fullName: (row[colMap.fullName] || '').toString().trim(),
          teacher: colMap.teacher >= 0 ? (row[colMap.teacher] || '').toString().trim() : '',
          shift: colMap.shift >= 0 ? (row[colMap.shift] || '').toString().trim() : '',
          className: colMap.className >= 0 ? (row[colMap.className] || '').toString().trim() : '',
          phone: colMap.phone >= 0 ? (row[colMap.phone] || '').toString().trim() : '',
          stkPH: colMap.stkPH >= 0 ? Utils.normalizeSTK(row[colMap.stkPH]) : '',
          tenTK: colMap.tenTK >= 0 ? (row[colMap.tenTK] || '').toString().trim() : '',
          hocPhi: hocPhiVal,
          hocPhiIsDefault: hocPhiIsDefault,
          hocPhiPending: hocPhiPending,
          ghiChuGiaDinh: colMap.ghiChu >= 0 ? (row[colMap.ghiChu] || '').toString().trim() : '',
          diaChi: colMap.diaChi >= 0 ? (row[colMap.diaChi] || '').toString().trim() : ''
        };
        
        students.push(student);
      }

      console.log(`Đã parse ${students.length} học sinh`);
      return { students, rawHeaders: headers };
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc file học sinh: ' + e.message, 'error');
      throw e;
    }
  },

  // Parse Sao Kê VietinBank
  parseSaoKeVietinBank: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });
      const selection = this.selectUniqueSheet(
        workbook,
        [['ngày gd', 'ngày giao dịch', 'ngày hạch toán', 'ngaygd', 'accounting date', 'transaction date', 'date'], ['ghi có', 'có', 'credit'], ['mô tả', 'nội dung', 'diễn giải', 'mota', 'transaction description', 'details']],
        { nameAliases: window.ImportSchema?.aliases?.sheets?.vtb || [], maxRows: 60, missingMessage: 'Không tìm thấy sheet sao kê VietinBank có cột Ngày, Nội dung và Có/Credit' }
      );
      const dataMatrix = selection.matrix;
      const headerRowIdx = selection.headerRowIdx;
      const headers = dataMatrix[headerRowIdx];
      const colMap = {
        stt: this.findColumnIndex(headers, ['STT', 'STT/No.']),
        ngayGD: this.fieldColumn(headers, 'date'), moTa: this.fieldColumn(headers, 'description'),
        debit: this.fieldColumn(headers, 'debit'), credit: this.fieldColumn(headers, 'credit'),
        balance: this.fieldColumn(headers, 'balance'), maGD: this.fieldColumn(headers, 'transactionId'),
        stkDoiUng: this.fieldColumn(headers, 'counterAccount'), tenTKDoiUng: this.fieldColumn(headers, 'counterName')
      };
      this.requireColumns(headers, { Ngày: colMap.ngayGD, 'Nội dung': colMap.moTa, 'Có/Credit': colMap.credit }, `Sheet ${selection.name}`);

      const transactions = [];
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;

        const credit = Utils.parseNumber(row[colMap.credit]);
        if (credit <= 0) continue; // Chỉ lấy dòng có tiền VÀO

        transactions.push({
          stt: row[colMap.stt] || i,
          _rowNo: i + 1,
          date: Utils.formatDate(row[colMap.ngayGD]),
          description: (row[colMap.moTa] || '').toString().trim(),
          debit: Utils.parseNumber(row[colMap.debit]),
          credit: credit,
          balance: colMap.balance >= 0 ? Utils.parseNumber(row[colMap.balance]) : 0,
          maGD: colMap.maGD >= 0 ? (row[colMap.maGD] || '').toString().trim() : '',
          stkDoiUng: colMap.stkDoiUng >= 0 ? Utils.normalizeSTK(row[colMap.stkDoiUng]) : '',
          tenTKDoiUng: colMap.tenTKDoiUng >= 0 ? (row[colMap.tenTKDoiUng] || '').toString().trim() : '',
          matchedMSHS: null,
          matchSource: null
        });
      }

      return transactions;
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc sao kê VietinBank: ' + e.message, 'error');
      throw e;
    }
  },

  // Parse Sao Kê TPBank
  parseSaoKeTPBank: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });
      const selection = this.selectUniqueSheet(
        workbook,
        [['transaction date', 'ngày giao dịch', 'ngày gd'], ['credit', 'ghi có'], ['explanation', 'diễn giải', 'nội dung']],
        { missingMessage: 'Không tìm thấy sheet sao kê TPBank có cột Ngày, Diễn giải và Credit/Ghi có' }
      );
      const dataMatrix = selection.matrix;
      const headerRowIdx = selection.headerRowIdx;
      const headers = dataMatrix[headerRowIdx];
      const colMap = {
        date: this.findColumnIndex(headers, ['Transaction Date', 'Ngày giao dịch', 'Ngày', 'Ngày GD']),
        ref: this.findColumnIndex(headers, ['Reference Number', 'Số tham chiếu']),
        explanation: this.findColumnIndex(headers, ['Explanation', 'Diễn giải', 'Nội dung']),
        credit: this.findColumnIndex(headers, ['Credit', 'Ghi có']),
        balance: this.findColumnIndex(headers, ['Balance', 'Số dư']),
        debit: this.findColumnIndex(headers, ['Debit', 'Ghi nợ'])
      };

      const transactions = [];
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;

        const credit = Utils.parseNumber(row[colMap.credit]);
        const debit = Utils.parseNumber(row[colMap.debit]);
        
        if (credit <= 0 || debit > 0) continue; // Chỉ lấy tiền VÀO, không chi ra

        const explanation = (row[colMap.explanation] || '').toString().trim();
        
        // Bỏ qua các giao dịch nội bộ cá nhân
        // const isPersonal = /LE THI TUYET NHUNG chuyen tien/i.test(explanation);
        // if (isPersonal) return null;
                           
        transactions.push({
          stt: i + 1,
          _rowNo: i + 1,
          date: Utils.formatDate(row[colMap.date]),
          refNumber: colMap.ref >= 0 ? (row[colMap.ref] || '').toString().trim() : '',
          explanation: explanation,
          debit: debit,
          credit: credit,
          balance: colMap.balance >= 0 ? Utils.parseNumber(row[colMap.balance]) : 0,
          matchedMSHS: null,
          matchSource: null,
          matchedKeyword: null
        });
      }

      return transactions;
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc sao kê TPBank: ' + e.message, 'error');
      return [];
    }
  },

  // Parse Tiền Mặt
  parseTienMat: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });
      const selection = this.selectUniqueSheet(
        workbook,
        [['mshs', 'mã hs', 'mã học sinh'], ['số tiền', 'số tiền đóng']],
        { nameAliases: ['tien_mat', 'tiền mặt'], missingMessage: 'Không tìm thấy sheet Tiền mặt có cột MSHS và Số tiền' }
      );
      const dataMatrix = selection.matrix;
      const headerRowIdx = selection.headerRowIdx;
      const headers = dataMatrix[headerRowIdx];
      const colMap = {
        date: this.findColumnIndex(headers, ['NGAY', 'Ngày']),
        className: this.findColumnIndex(headers, ['LỚP', 'Lớp']),
        fullName: this.findColumnIndex(headers, ['HỌ TÊN', 'Họ tên', 'Tên']),
        amount: this.findColumnIndex(headers, ['SỐ TIỀN', 'Số tiền', 'Số tiền đóng']),
        mshs: this.findColumnIndex(headers, ['MSHS', 'Mã HS', 'Mã']),
        ghiChu: this.findColumnIndex(headers, ['GHI CHÚ', 'Ghi chú'])
      };

      const payments = [];
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;

        const amount = Utils.parseNumber(row[colMap.amount]);
        if (amount <= 0) continue;

        payments.push({
          date: Utils.formatDate(row[colMap.date]),
          className: colMap.className >= 0 ? (row[colMap.className] || '').toString().trim() : '',
          fullName: colMap.fullName >= 0 ? (row[colMap.fullName] || '').toString().trim() : '',
          amount: amount,
          mshs: colMap.mshs >= 0 ? (row[colMap.mshs] || '').toString().trim() : '',
          ghiChu: colMap.ghiChu >= 0 ? (row[colMap.ghiChu] || '').toString().trim() : ''
        });
      }

      return payments;
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc file Tiền mặt: ' + e.message, 'error');
      throw e;
    }
  },

  // Parse file Kế toán tháng trước (2 sheet: "Thực Tế" + "Danh sách viết HĐ")
  parsePrevInvoiceFile: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });

      const result = { prevThucTe: [], prevInvoiceStudents: [] };
      const required = [['mshs', 'mã hs', 'mã học sinh'], ['họ tên', 'full name']];
      const candidates = this.findSheetCandidates(workbook, required, { maxRows: 20 });
      const readStudents = (candidate) => {
        const dataMatrix = candidate.matrix;
        const headerRowIdx = candidate.headerRowIdx;
        const headers = dataMatrix[headerRowIdx];
        const colMap = {
          stt: this.findColumnIndex(headers, ['STT']),
          mshs: this.findColumnIndex(headers, ['MSHS', 'Mã HS', 'Mã']),
          fullName: this.findColumnIndex(headers, ['Họ tên', 'Tên', 'Full name']),
          className: this.findColumnIndex(headers, ['Lớp', 'Class', 'Mã lớp']),
          teacher: this.findColumnIndex(headers, ['Giáo viên', 'Teacher', 'GV']),
          hocPhi: this.findColumnIndex(headers, ['Học phí', 'Tổng HP']),
          diaChi: this.findColumnIndex(headers, ['Địa chỉ', 'Address', 'Dia chi', 'DiaChi']),
          trangThai: this.findColumnIndex(headers, ['Trạng thái', 'Status']),
          ghiChu: this.findColumnIndex(headers, ['Ghi chú', 'Note'])
        };
        this.requireColumns(headers, { MSHS: colMap.mshs, 'Họ tên': colMap.fullName }, `Sheet ${candidate.name}`);
        const students = [];
        for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
          const row = dataMatrix[i];
          if (!row || row.length === 0 || (!row[colMap.mshs] && !row[colMap.fullName])) continue;
          if (this.isFooterRow(row, row[colMap.mshs], row[colMap.fullName])) continue;
          students.push({
            mshs: (row[colMap.mshs] || '').toString().trim().toUpperCase(),
            fullName: colMap.fullName >= 0 ? (row[colMap.fullName] || '').toString().trim() : '',
            className: colMap.className >= 0 ? (row[colMap.className] || '').toString().trim() : '',
            teacher: colMap.teacher >= 0 ? (row[colMap.teacher] || '').toString().trim() : '',
            hocPhi: colMap.hocPhi >= 0 ? Utils.parseNumber(row[colMap.hocPhi]) : 0,
            diaChi: colMap.diaChi >= 0 ? (row[colMap.diaChi] || '').toString().trim() : '',
            trangThai: colMap.trangThai >= 0 ? (row[colMap.trangThai] || '').toString().trim() : '',
            ghiChu: colMap.ghiChu >= 0 ? (row[colMap.ghiChu] || '').toString().trim() : ''
          });
        }
        return students;
      };

      const byName = (aliases) => candidates.filter(c => aliases.some(alias => Utils.normalizeText(c.name).replace(/[\s_-]+/g, '').includes(Utils.normalizeText(alias).replace(/[\s_-]+/g, ''))));
      const thucTe = byName(window.ImportSchema?.aliases?.sheets?.previousActual || ['ds_thuc_te', 'thực tế', 'thuc te']);
      const ghiHD = byName(window.ImportSchema?.aliases?.sheets?.previousInvoice || ['ds_ghi_hd', 'ghi hd', 'viết hđ', 'viet hd', 'danh sach viet']);
      if (thucTe.length > 1 || ghiHD.length > 1) throw new Error('Có nhiều sheet Kế toán cùng vai trò. Hãy đổi tên rõ DS_THUC_TE và DS_GHI_HD rồi nhập lại.');
      if (!thucTe.length || !ghiHD.length) {
        throw new Error('File Kế toán cần đủ 2 sheet tên DS_THUC_TE và DS_GHI_HD (không đoán theo thứ tự để tránh nhầm dữ liệu).');
      }
      result.prevThucTe = readStudents(thucTe[0]);
      result.prevInvoiceStudents = readStudents(ghiHD[0]);
      return result;

    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc file Kế toán: ' + e.message, 'error');
      throw e;
    }
  },

  // Parse DS Ghi HĐ tháng trước (danh sách học sinh cần viết hóa đơn) - legacy
  parsePrevInvoice: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });

      // Find "Danh sach viet HD" sheet (may be named differently)
      let targetSheet = null;
      for (const name of workbook.SheetNames) {
        const normalizedName = Utils.normalizeText(name);
        if (normalizedName.includes('ghihd') || normalizedName.includes('ghideshow') || normalizedName.includes('viet hd') || normalizedName.includes('danh sach viet')) {
          targetSheet = workbook.Sheets[name];
          break;
        }
      }

      // Fallback: if not found, use first sheet
      if (!targetSheet) {
        console.log('Không tìm thấy sheet "Danh sách viết HĐ", dùng sheet đầu tiên');
        targetSheet = workbook.Sheets[workbook.SheetNames[0]];
      }

      const dataMatrix = XLSX.utils.sheet_to_json(targetSheet, { header: 1 });

      // Find header row (skip company info rows at top)
      let headerRowIdx = 0;
      let maxMatches = 0;
      const expectedKeywords = ['mshs', 'họ tên', 'lớp', 'học phí', 'stt'];

      for (let i = 0; i < Math.min(15, dataMatrix.length); i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;
        const rowStr = row.map(cell => Utils.normalizeText(cell || '')).join(' ');
        let matches = expectedKeywords.filter(kw => rowStr.includes(Utils.normalizeText(kw))).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIdx = i;
        }
      }

      const headers = dataMatrix[headerRowIdx];
      const colMap = {
        stt: this.findColumnIndex(headers, ['STT']),
        mshs: this.findColumnIndex(headers, ['MSHS', 'Mã HS', 'Mã']),
        fullName: this.findColumnIndex(headers, ['Họ tên', 'Tên', 'Full name']),
        className: this.findColumnIndex(headers, ['Lớp', 'Class']),
        hocPhi: this.findColumnIndex(headers, ['Học phí', 'Tổng HP']),
        trangThai: this.findColumnIndex(headers, ['Trạng thái', 'Status']),
        ghiChu: this.findColumnIndex(headers, ['Ghi chú', 'Note'])
      };

      const students = [];
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;
        if (!row[colMap.mshs] && !row[colMap.fullName]) continue;

        students.push({
          mshs: (row[colMap.mshs] || '').toString().trim().toUpperCase(),
          fullName: colMap.fullName >= 0 ? (row[colMap.fullName] || '').toString().trim() : '',
          className: colMap.className >= 0 ? (row[colMap.className] || '').toString().trim() : '',
          hocPhi: colMap.hocPhi >= 0 ? Utils.parseNumber(row[colMap.hocPhi]) : 0,
          trangThai: colMap.trangThai >= 0 ? (row[colMap.trangThai] || '').toString().trim() : '',
          ghiChu: colMap.ghiChu >= 0 ? (row[colMap.ghiChu] || '').toString().trim() : ''
        });
      }

      console.log(`Đã parse DS Ghi HĐ tháng trước: ${students.length} HS (từ sheet "${targetSheet ? 'Danh sách viết HĐ' : 'Sheet đầu tiên'}")`);
      return students;
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc DS Ghi HĐ: ' + e.message, 'error');
      return [];
    }
  },

  // Parse file Excel nợ chốt tháng trước (form ChotNo_YYYYMM.xlsx: MSHS | Họ tên | Lớp | Số còn thiếu)
  parseDebtFile: async function(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });
      // Ưu tiên sheet CHOT_NO, không có thì lấy sheet đầu
      let sheet = workbook.Sheets[workbook.SheetNames[0]];
      for (const name of workbook.SheetNames) {
        const nn = Utils.normalizeText(name);
        if (nn.includes('chotno') || nn.includes('chot no')) {
          sheet = workbook.Sheets[name];
          break;
        }
      }
      const dataMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // Tìm dòng tiêu đề (có MSHS + thiếu/tiền)
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(15, dataMatrix.length); i++) {
        const row = dataMatrix[i];
        if (!row) continue;
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('mshs') && (rowStr.includes('thiếu') || rowStr.includes('thieu') || rowStr.includes('tiền') || rowStr.includes('số'))) {
          headerRowIdx = i;
          break;
        }
      }
      if (headerRowIdx === -1) throw new Error('Không tìm thấy tiêu đề (cần cột MSHS + Số còn thiếu)');
      const headers = dataMatrix[headerRowIdx];
      const colMap = {
        mshs: this.findColumnIndex(headers, ['MSHS', 'Mã HS', 'Mã']),
        fullName: this.findColumnIndex(headers, ['Họ tên', 'Tên', 'Full name']),
        className: this.findColumnIndex(headers, ['Lớp', 'Class', 'Mã lớp']),
        amount: this.findColumnIndex(headers, ['Số còn thiếu', 'Còn thiếu', 'Số thiếu', 'Số tiền', 'Thiếu'])
      };
      const rows = [];
      for (let i = headerRowIdx + 1; i < dataMatrix.length; i++) {
        const row = dataMatrix[i];
        if (!row || row.length === 0) continue;
        const mshs = ((colMap.mshs >= 0 ? row[colMap.mshs] : '') || '').toString().trim().toUpperCase();
        if (!mshs || mshs.includes('KHÔNG AI NỢ') || mshs.includes('(')) continue;
        const amount = colMap.amount >= 0 ? Utils.parseNumber(row[colMap.amount]) : 0;
        if (amount <= 0) continue;
        rows.push({
          mshs,
          fullName: colMap.fullName >= 0 ? (row[colMap.fullName] || '').toString().trim() : '',
          className: colMap.className >= 0 ? (row[colMap.className] || '').toString().trim() : '',
          amount
        });
      }
      return rows;
    } catch (e) {
      console.error(e);
      if (window.Utils) window.Utils.showToast('Lỗi khi đọc file nợ: ' + e.message, 'error');
      return [];
    }
  }
};
