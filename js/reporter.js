/**
 * JOY FEE CHECK - Reporter Module
 * Handles report generation, filtering, and statistics logic.
 */

window.Reporter = {
  /**
   * Generates report rows aggregating multiple classes per student and mapping payments.
   * @param {Array} students - Array of STUDENT objects from importer
   * @param {Map} paymentsByMSHS - Map of MSHS -> {vtb, tpb, cash, total}
   * @returns {Array} Array of REPORT_ROW objects
   */
  generateReport(students, paymentsByMSHS, familyGroups = [], monthYear = '') {
    const reportRows = [];
    const grouped = new Map();

    // Nợ cũ đầu kỳ (MSHS -> số tiền). Chỉ MSHS + số tiền dùng để tính.
    // Chỉ áp dụng khi nợ dán cho đúng tháng đang xem (tránh chốt T10 xong vẫn xem T10 bị lệch)
    let priorDebtMap = new Map();
    try {
      if (window.Storage && window.Storage.getPriorDebtMap) {
        const saved = window.Storage.loadPriorDebt ? window.Storage.loadPriorDebt() : null;
        const forMonth = saved ? (saved.forMonth || saved.monthYear || '') : '';
        if (!forMonth || !monthYear || forMonth === monthYear) {
          priorDebtMap = window.Storage.getPriorDebtMap() || new Map();
        }
      }
    } catch (e) { priorDebtMap = new Map(); }

    // Group student rows by MSHS
    for (const student of students) {
      if (!grouped.has(student.mshs)) {
        grouped.set(student.mshs, []);
      }
      grouped.get(student.mshs).push(student);
    }

    // Build family lookup: MSHS -> familyGroup
    const familyLookup = new Map();
    for (const fg of familyGroups) {
      if (fg.members) {
        for (const mshs of fg.members) {
          familyLookup.set(mshs, fg);
        }
      }
    }

    // Load suspended students
    const suspendedList = window.Storage.getSuspendedForMonth ? (window.Storage.getSuspendedForMonth(monthYear) || []) : [];
    const suspendedMap = new Map(); // mshs -> Set of suspended classNames
    for (const sus of suspendedList) {
      if (!suspendedMap.has(sus.mshs)) suspendedMap.set(sus.mshs, new Set());
      suspendedMap.get(sus.mshs).add(sus.className);
    }

    // Load fee adjustments for current month
    const allAdjustments = Storage.loadFeeAdjustments() || [];
    const adjustments = allAdjustments.filter(a => a.monthYear === monthYear);
    const adjMap = new Map(); // mshs -> total adjustment amount
    for (const adj of adjustments) {
      adjMap.set(adj.mshs, (adjMap.get(adj.mshs) || 0) + adj.amount);
    }
    // Ghi chú tay (chỉ chữ, lưu trong máy — import lại không mất)
    let manualMap = new Map();
    try {
      const mn = (Storage.loadManualNotes ? Storage.loadManualNotes() : []) || [];
      for (const n of mn) {
        if ((n.monthYear || '') === (monthYear || '') && n.note) manualMap.set((n.mshs || '').toUpperCase(), n.note);
      }
    } catch (e) { manualMap = new Map(); }

    for (const [mshs, classRows] of grouped.entries()) {
      let tongHocPhi = 0;
      let classes = [];
      let teachers = [];
      
      const primaryRow = classRows[0];
      
      for (const row of classRows) {
        // If student is suspended for this class, don't add the fee
        const suspendedClasses = suspendedMap.get(mshs);
        const isSuspended = suspendedClasses && suspendedClasses.has(row.className);
        if (!isSuspended) {
          tongHocPhi += (Number(row.hocPhi) || 0);
        }
        if (row.className && !classes.includes(row.className)) {
          classes.push(row.className);
        }
        if (row.teacher && !teachers.includes(row.teacher)) {
          teachers.push(row.teacher);
        }
      }

      // Apply fee adjustments (giới thiệu, tạm ngưng, miễn giảm...)
      const totalAdj = adjMap.get(mshs) || 0;
      const tongHocPhiGoc = tongHocPhi;
      if (totalAdj !== 0) {
        tongHocPhi = Math.max(0, tongHocPhi + totalAdj); // HP không thể âm
      }

      const paymentData = paymentsByMSHS.get(mshs) || { vtb: 0, tpb: 0, cash: 0, total: 0 };
      
      // =========================
      // FAMILY SPLIT LOGIC (Sequential Allocation)
      // =========================
      const familyGroup = familyLookup.get(mshs);
      let familySplit = null;
      let adjustedPayment = paymentData.total;
      let familyNote = '';

      if (familyGroup) {
        // Chia tiền nhà theo HP tháng này (giữ nguyên cách cũ).
        // Nợ cũ trừ ở từng bạn sau (daTraNo) — nhà có bạn nợ thì phần được chia trả nợ trước.
        // Bạn "Chốt sau" (HP chưa biết): xếp cuối, hưởng phần còn dư.
        let familyTotalFee = 0;
        const familyStudentFees = {};
        const pendingSet = new Set();
        for (const fmshs of familyGroup.members) {
          const fmRows = grouped.get(fmshs) || [];
          let fFee = 0;
          for (const r of fmRows) {
            fFee += (Number(r.hocPhi) || 0);
          }
          if (fmRows.some(r => r.hocPhiPending)) pendingSet.add(fmshs);
          familyStudentFees[fmshs] = fFee;
          familyTotalFee += fFee;
        }

        // Get all family payments
        let familyTotalPayment = 0;
        for (const fmshs of familyGroup.members) {
          const fp = paymentsByMSHS.get(fmshs) || { vtb: 0, tpb: 0, cash: 0, total: 0 };
          familyTotalPayment += fp.total;
        }

        // Sequential allocation: allocate to each student in order until pool is exhausted
        let pool = familyTotalPayment;
        let myAllocated = 0;
        
        // Sort members by fee (highest first) to allocate fairly
        // Bạn "Chốt sau" xếp cuối (HP chưa biết, không tranh phần bạn đã chốt)
        const sortedMembers = [...familyGroup.members].sort((a, b) => {
          const pa = pendingSet.has(a) ? 1 : 0, pb = pendingSet.has(b) ? 1 : 0;
          if (pa !== pb) return pa - pb;
          return (familyStudentFees[b] || 0) - (familyStudentFees[a] || 0);
        });
        
        for (const fmshs of sortedMembers) {
          const fFee = familyStudentFees[fmshs] || 0;
          if (fmshs === mshs) {
            // This is the current student - allocate what's left or their fee, whichever is smaller
            myAllocated = Math.min(pool, fFee);
            pool -= myAllocated; // Trừ pool sau khi phân bổ
            break;
          } else {
            // Allocate to other students first
            const alloc = Math.min(pool, fFee);
            pool -= alloc;
          }
        }

        adjustedPayment = myAllocated;
        
        familySplit = {
          group: familyGroup,
          totalFee: familyTotalFee,
          myFee: tongHocPhi,
          familyTotalPayment: familyTotalPayment,
          adjustedPayment: adjustedPayment,
          pool: pool
        };
      }

      // Nợ cũ đầu kỳ của bạn này (chỉ tính khi còn trong DS tổng — bạn nghỉ tự rớt ra)
      const noCu = priorDebtMap.get((mshs || '').toUpperCase()) || 0;
      const hocPhiIsDefault = classRows.some(r => r.hocPhiIsDefault);
      // Học kèm "Chốt sau": HP chưa biết — vẫn nhắc, không cộng tổng
      const hocPhiPending = classRows.some(r => r.hocPhiPending);

      // Check if student has active package
      const packageInfo = Storage.isPackageActive(mshs, monthYear);
      let trangThai = '';
      let soTienThieu = 0;

      // Luật chia tiền: trả NỢ CŨ trước, còn dư mới trả HP tháng này, dư nữa là tiền sách
      const tongPhaiThu = noCu + tongHocPhi;
      const daTraNo = Math.min(adjustedPayment, noCu);
      const noCuConLai = noCu - daTraNo;
      let conThieu = Math.max(0, tongPhaiThu - adjustedPayment);

      // Học kèm "Chốt sau": HP chưa biết — vẫn Chưa đóng/nhắc, nhưng thiếu = 0 (không cộng tổng)
      if (hocPhiPending && noCu === 0 && !packageInfo.active) {
        if (adjustedPayment > 0) {
          trangThai = APP_CONFIG.STATUS.PARTIAL;
        } else {
          trangThai = APP_CONFIG.STATUS.UNPAID;
        }
        soTienThieu = 0;
        conThieu = 0;
      } else if (tongHocPhi === 0 && noCu === 0 && !hocPhiPending) {
        trangThai = 'MIỄN PHÍ';
      } else if (packageInfo.active) {
        // Gói chỉ bao HP tháng này, KHÔNG xóa nợ cũ
        if (noCuConLai === 0) {
          trangThai = APP_CONFIG.STATUS.PACKAGE;
          soTienThieu = 0;
          conThieu = 0;
        } else {
          trangThai = APP_CONFIG.STATUS.PARTIAL;
          soTienThieu = noCuConLai;
          conThieu = noCuConLai;
        }
      } else if (noCu > 0) {
        // Có nợ cũ → so với TỔNG phải thu (nợ + HP)
        if (adjustedPayment >= tongPhaiThu && tongPhaiThu > 0) {
          trangThai = adjustedPayment > tongPhaiThu ? APP_CONFIG.STATUS.OVERPAID : APP_CONFIG.STATUS.PAID;
        } else if (adjustedPayment > 0 && adjustedPayment < tongPhaiThu) {
          trangThai = APP_CONFIG.STATUS.PARTIAL;
          soTienThieu = conThieu;
        } else if (adjustedPayment === 0) {
          trangThai = APP_CONFIG.STATUS.UNPAID;
          soTienThieu = tongPhaiThu;
        }
      } else if (adjustedPayment >= tongHocPhi && tongHocPhi > 0) {
        trangThai = adjustedPayment > tongHocPhi ? APP_CONFIG.STATUS.OVERPAID : APP_CONFIG.STATUS.PAID;
      } else if (adjustedPayment > 0 && adjustedPayment < tongHocPhi) {
        trangThai = APP_CONFIG.STATUS.PARTIAL;
        soTienThieu = tongHocPhi - adjustedPayment;
      } else if (adjustedPayment === 0) {
        trangThai = APP_CONFIG.STATUS.UNPAID;
        soTienThieu = tongHocPhi;
      }

      if (soTienThieu < 0) soTienThieu = 0;
      
      // ==========================
      // Tạo Ghi Chú Tự Động
      // ==========================
      let notes = [];
      
      // 0. Đóng gói
      if (packageInfo.active) {
        const discountPercent = packageInfo.discountPercent || 0;
        const discountAmount = Math.floor(tongHocPhi * discountPercent / 100);
        notes.push(`📦 Đã đóng gói: ${packageInfo.packageName} (${packageInfo.startMonth} → ${packageInfo.endMonth})${discountPercent > 0 ? ` — Giảm ${discountPercent}% (${Utils.formatCurrency(discountAmount)}/tháng)` : ''}`);
        if (packageInfo.expiring) notes.push(`⏰ Gói hết đúng tháng này → tháng sau thu HP bình thường`);
      }

      // 0. Nợ cũ tháng trước
      if (noCu > 0) {
        if (noCuConLai === 0) {
          notes.push(`✅ Đã hết nợ cũ (${Utils.formatCurrency(noCu)})`);
        } else if (daTraNo > 0) {
          notes.push(`⚠️ Còn nợ cũ ${Utils.formatCurrency(noCuConLai)} (đã trả ${Utils.formatCurrency(daTraNo)}/${Utils.formatCurrency(noCu)})`);
        } else {
          notes.push(`❌ Còn nợ cũ ${Utils.formatCurrency(noCu)}`);
        }
      }

      // 0.5b. HP đoán mặc định (ô trống) → nhắc kiểm tra, nhất là bé mới HP lẻ
      // (Bạn "Chốt sau" không vàng — đã có dấu riêng bên dưới)
      if (hocPhiIsDefault && tongHocPhi > 0 && !hocPhiPending) {
        notes.push(`⚠️ HP mặc định (ô trống) — kiểm tra lại`);
      }

      // 0.5c. Học kèm "Chốt sau": chỉ nhắc, không cộng tổng
      if (hocPhiPending) {
        notes.push(`⏳ HP chốt sau — chỉ nhắc, không cộng tổng`);
      }

      // 0.5. Điều chỉnh học phí
      if (totalAdj !== 0) {
        const adjDetails = allAdjustments.filter(a => a.mshs === mshs && a.monthYear === monthYear);
        const adjTypes = adjDetails.map(a => a.type).join(', ');
        notes.push(`📝 Điều chỉnh: ${Utils.formatCurrency(totalAdj)} (${adjTypes})`);
        if (tongHocPhiGoc !== tongHocPhi) {
          notes.push(`HP: ${Utils.formatCurrency(tongHocPhiGoc)} → ${Utils.formatCurrency(tongHocPhi)}`);
        }
      }

      // 1. CK VietinBank khác mức học phí quy định (cảnh báo hụt HĐ)
      if (paymentData.vtb > 0 && paymentData.vtb !== tongHocPhi) {
        notes.push(`⚠ CK TK CT: ${Utils.formatCurrency(paymentData.vtb)} (HP: ${Utils.formatCurrency(tongHocPhi)})`);
      }

      // 3. Học nhiều lớp
      if (classes.length > 1) {
        notes.push(`Học ${classes.length} lớp`);
      }

      // 4. Nhóm gia đình
      if (familyGroup) {
        notes.push(`👨‍👩‍👧‍👦 GĐ: ${familyGroup.name || familyGroup.groupId}`);
        if (familySplit) {
          notes.push(`HP ${Utils.formatCurrency(tongHocPhi)} / Tổng GD: ${Utils.formatCurrency(familySplit.familyTotalPayment)}`);
          notes.push(`Đã phân bổ: ${Utils.formatCurrency(adjustedPayment)}${familySplit.pool > 0 ? ` (còn dư: ${Utils.formatCurrency(familySplit.pool)})` : ''}`);
        }
      }

      // 5. Thiếu / Dư
      if (trangThai === APP_CONFIG.STATUS.PARTIAL) {
        notes.push(`Thiếu: ${Utils.formatCurrency(soTienThieu)}`);
      } else if (trangThai === APP_CONFIG.STATUS.OVERPAID) {
        notes.push(`Dư: ${Utils.formatCurrency(adjustedPayment - tongHocPhi)}`);
      }

      let ghiChu = notes.join(' · ');
      // Ghi chú tay của bạn (chỉ chữ, không đổi tiền)
      try {
        const myNote = manualMap.get((mshs || '').toUpperCase());
        if (myNote) ghiChu = (ghiChu ? ghiChu + ' · ' : '') + `✏️ ${myNote}`;
      } catch (e) {}

      reportRows.push({
        mshs: mshs,
        fullName: primaryRow.fullName || '',
        className: classes.join(', '),
        teacher: teachers.join(', '),
        phone: primaryRow.phone || '',
        tongHocPhi: tongHocPhi, // HP tháng này — Tab 3/4 đọc cột này, KHÔNG gồm nợ
        hocPhiPending: hocPhiPending, // true = "Chốt sau": chỉ nhắc, không cộng tổng
        noCu: noCu,
        tongPhaiThu: tongPhaiThu,
        conThieu: conThieu,
        daTraNo: daTraNo,
        noCuConLai: noCuConLai,
        hocPhiIsDefault: hocPhiIsDefault,
        chuyenKhoanVTB: paymentData.vtb,
        tienMat: paymentData.cash,
        chuyenKhoanTPB: paymentData.tpb,
        tongDaDong: familySplit ? adjustedPayment : paymentData.total,
        tongDaDongGoc: paymentData.total,
        familySplit: familySplit,
        trangThai: trangThai,
        soTienThieu: soTienThieu,
        ghiChu: ghiChu,
        ghiChuGiaDinh: primaryRow.ghiChuGiaDinh || '',
        coChuyenTKCongTy: paymentData.vtb > 0,
        txList: paymentData.txList || []
      });
    }

    // Sort by MSHS
    reportRows.sort((a, b) => a.mshs.localeCompare(b.mshs));
    return reportRows;
  },

  /**
   * Calculates overall statistics from report rows.
   */
  getStatistics(reportRows) {
    let stats = {
      tongHS: reportRows.length,
      daDong: 0,
      chuaDong: 0,
      dongThieu: 0,
      dongDu: 0,
      dongGoi: 0,
      tongThu: 0,
      tongHocPhi: 0,
      tongNoCu: 0,      // tổng nợ đầu kỳ
      noCuDaThu: 0,     // nợ cũ thu được trong tháng
      tongPhaiThu: 0,   // nợ + HP
      conThieu: 0       // còn thiếu gồm cả nợ
    };

    for (const row of reportRows) {
      stats.tongThu += (row.tongDaDong || 0);
      // Bạn "Chốt sau" (HP chưa biết): chỉ nhắc, KHÔNG cộng vào bất kỳ tổng nào
      if (!row.hocPhiPending) {
        stats.tongHocPhi += (row.tongHocPhi || 0);
        stats.tongNoCu += (row.noCu || 0);
        stats.noCuDaThu += (row.daTraNo || 0);
        stats.tongPhaiThu += (row.tongPhaiThu || 0);
        stats.conThieu += (row.conThieu || 0);
      } else {
        stats.tongNoCu += (row.noCu || 0);
        stats.noCuDaThu += (row.daTraNo || 0);
      }
      
      switch (row.trangThai) {
        case APP_CONFIG.STATUS.PAID:
          stats.daDong++;
          break;
        case APP_CONFIG.STATUS.UNPAID:
          stats.chuaDong++;
          break;
        case APP_CONFIG.STATUS.PARTIAL:
          stats.dongThieu++;
          break;
        case APP_CONFIG.STATUS.OVERPAID:
          stats.dongDu++;
          break;
        case APP_CONFIG.STATUS.PACKAGE:
          stats.dongGoi++;
          break;
      }
    }
    return stats;
  },

  /**
   * Filters report rows based on active filter criteria.
   */
  filterReport(reportRows, filters) {
    const { trangThai, className, teacher, searchText } = filters || {};
    
    return reportRows.filter(row => {
      if (trangThai && trangThai !== 'all' && row.trangThai !== trangThai) return false;
      if (className && className !== 'all' && !row.className.includes(className)) return false;
      if (teacher && teacher !== 'all' && !row.teacher.includes(teacher)) return false;
      
      if (searchText) {
        const query = searchText.toLowerCase();
        if (!row.mshs.toLowerCase().includes(query) && !row.fullName.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }
};
