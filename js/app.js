// Alpine.js Setup
document.addEventListener('alpine:init', () => {

  // Global Toast Store
  Alpine.store('toasts', {
    items: [],
    show(message, type = 'info', duration = 4000) {
      const id = Date.now();
      this.items.push({ id, message, type });
      setTimeout(() => this.remove(id), duration);
    },
    remove(id) {
      this.items = this.items.filter(item => item.id !== id);
    }
  });

  // Global App State
  Alpine.store('appState', {
    activeTab: 'import-tab',
    cashflowFilter: { search: '', onlyWithMoney: false },
    
    // Import status
    importStatus: {
      dsHocSinh: false,
      vietinBank: false,
      tpBank: false,
      tienMat: false,
      prevInvoice: false,
      priorDebt: false // file Excel nợ chốt tháng trước (form ChotNo)
    },
    
    // Data
    students: [],
    vtbTransactions: [],
    tpbTransactions: [],
    cashPayments: [],
    prevInvoiceStudents: [],
    prevThucTeStudents: [],
    
    // Results
    vtbMatched: [],
    tpbMatched: [],
    vtbUnmatched: [],
    tpbUnmatched: [],
    reportRows: [],
    accountingData: { tab1: [], tab2: [], tab3: [], tab4: [], tab5: [], tab6: [], tab7: [] },
    
    // UI state
    matchingDone: false,
    exceptionCount: 0,
    
    // Settings
    monthYear: '2026-09',
    defaultFee: 800000,
    accTab7FilterTags: []
  });

      
    // Magic Properties
  Alpine.magic('formatCurrency', () => {
    return (value) => {
      if (value === undefined || value === null || isNaN(value)) return '-';
      return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    };
  });

  Alpine.magic('formatDate', () => {
    return (dateStr) => {
      if (!dateStr) return '';
      try {
        if (window.Utils && window.Utils.formatDate) return window.Utils.formatDate(dateStr);
      } catch (e) { /* fallback */ }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('vi-VN');
    };
  });
});

// Main App Component
function appComponent() {
  return {
    // UI State
    showModal: false,
    modalTitle: '',
    modalBody: '',
    modalConfirm: null,
    showLoading: false,
    
    // Report Filters
    filters: {
      status: 'all',
      className: 'all',
      teacher: 'all',
      searchText: '',
      cashflowSource: 'all',
      onlyDebt: false // chỉ hiện bạn còn nợ cũ
    },
    reportClassOptions: [],
    reportTeacherOptions: [],
    suspendedData: [],
    adjustmentData: [],
    referralData: [],
    referralAlerts: [],
    historyData: [],
    filteredReportRows: [],
    // Nợ cũ tháng trước (Bước 1): dán 4 cột MSHS|Họ tên|Lớp|Số thiếu
    priorDebtText: '',
    priorDebtRows: [],
    debtTicked: [], // MSHS đã tick trong bảng nợ
    debtDirty: false, // có sửa số chưa lưu
    
    // Accounting UI
    activeAccTab: 'acc-tab1',
    cashflowSearch: '',
    adjModal: { show: false, mshs: '', fullName: '', type: 'Ghi chú thường', amount: 0, monthYear: '', note: '' },
    tab4Choice: {}, // Track Nghỉ học / Vẫn học
    
    // Settings State
    stkPhuData: [],
    keywordData: [],
    familyGroups: [],
    packageData: [],
    stkPhuSearch: '',
    keywordSearch: '',
    // Drag states
    dsHocSinhDragging: false,
    vtbDragging: false,
    tpbDragging: false,
    cashDragging: false,
    prevDragging: false,
    debtDragging: false,
    // Assign modal state
    showAssignModal: false,
    assignTx: null,
    assignType: 'vtb',
    assignMode: 'auto',
    assignSuggestions: [],
    assignSearch: '',
    assignKeyword: '',
    assignSelected: '',
    ignoredKeys: [],
    lastIgnored: null,
    // Form modal Thêm nhóm gia đình (1 form 4 ô như bản cũ, thay prompt hỏi dồn 4 lần)
    showFamilyModal: false,
    familyForm: { groupName: '', membersRaw: '', tenPH: '', stk: '' },
    familyEditingId: null,
    // Form modal Gói / Điều chỉnh / Giới thiệu (bỏ prompt hỏi dồn nhiều lần)
    showPackageModal: false,
    packageForm: { packageName: '', membersRaw: '', months: '6', startMonth: '', discountPercent: '6' },
    showAdjustmentModal: false,
    adjustmentForm: { mshs: '', type: 'Ưu đãi khác', amount: '-400000', monthYear: '', note: '' },
    showReferralModal: false,
    referralForm: { mshs: '', referredMSHS: '', startMonth: '', amount: '-400000' },
    // Dropdown gợi ý HS đang mở ở ô nào + form tạm ngưng
    pickOpen: '',
    showSuspendModal: false,
    suspendForm: { mshs: '', className: '', note: '' },
    showMissingNoteModal: false,
    missingNoteStudent: { mshs: '', name: '' },
    missingNoteForm: { type: 'Giới thiệu học sinh mới', note: '', amount: '-400000' },
    rowMenuOpen: '', // MSHS đang mở menu 3 chấm ở cột Ghi chú
    openMissingNote(row) {
      this.rowMenuOpen = '';
      this.missingNoteStudent = { mshs: row.mshs || '', name: row.fullName || '' };
      this.missingNoteForm = { type: 'Giới thiệu học sinh mới', note: '', amount: '-400000' };
      // Nạp sẵn ghi chú tay đã lưu (sửa/xoá)
      try {
        const saved = (window.Storage.loadManualNotes ? window.Storage.loadManualNotes() : []) || [];
        const my = this.$store ? this.$store.appState.monthYear : '';
        const hit = saved.find(n => (n.mshs || '').toUpperCase() === (row.mshs || '').toUpperCase() && (n.monthYear || '') === (my || ''));
        if (hit && hit.note) {
          this.missingNoteForm = { type: 'Ghi chú tay (không đổi số tiền)', note: hit.note, amount: '0' };
        }
      } catch (e) {}
      this.showMissingNoteModal = true;
    },
    confirmMissingNote() {
      const mshs = this.missingNoteStudent.mshs;
      const type = this.missingNoteForm.type;
      const noteText = (this.missingNoteForm.note || '').trim();
      const monthYear = this.$store.appState.monthYear || '';
      if (!mshs) { this.showToast('⚠️ Lỗi học sinh', 'error'); return; }
      const rawAmt = parseInt(String(this.missingNoteForm.amount || '').replace(/[^0-9-]/g, ''), 10);
      if (type.includes('Giới thiệu')) {
        const referred = noteText.toUpperCase().replace(/\s+/g, '');
        if (!referred || referred === 'HS_MOI') { this.showToast('⚠️ Gõ MSHS của bé mới vào ô nội dung (VD: HV500)', 'error'); return; }
        if (referred === (mshs || '').toUpperCase()) { this.showToast('⚠️ Bé mới phải khác bé giới thiệu', 'error'); return; }
        let amount = isNaN(rawAmt) ? -400000 : rawAmt;
        if (amount > 0) amount = -amount; // giảm luôn âm
        if (amount === 0) amount = -400000;
        if (window.Storage.addReferral) {
          // Tháng bắt đầu = tháng đang xem, giảm từ sau 3 tháng (giống form Giới thiệu ở Cài đặt)
          const [sy, sm] = monthYear.split('-').map(Number);
          let applyMonth = monthYear;
          if (sy && sm) {
            const d = new Date(sy, sm - 1 + 3);
            applyMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
          const res = window.Storage.addReferral({
            mshs: mshs,
            referredMSHS: referred,
            startMonth: monthYear || '2026-09',
            applyMonth: applyMonth,
            amount: amount,
            note: `Giới thiệu ${referred}`
          });
          if (res && res.error) {
            this.showToast('⚠️ ' + res.error, 'warning');
          } else {
            this.showToast(`✅ Đã lưu giới thiệu: ${mshs} → ${referred}, giảm ${this.$formatCurrency(amount)} từ ${applyMonth}`, 'success');
          }
        }
      } else if (type.includes('Ghi chú tay')) {
        // Chỉ chữ, KHÔNG đụng tiền — lưu trong máy, import lại không mất. Xoá chữ = bấm lưu khi ô trống.
        if (window.Storage.saveManualNote) {
          window.Storage.saveManualNote(mshs, monthYear, noteText);
          this.showToast(noteText ? '✅ Đã lưu ghi chú tay' : '🗑️ Đã xoá ghi chú tay', 'success');
        }
      } else {
        // Hỗ trợ / giảm đặc biệt: số tiền tự gõ
        let amount = isNaN(rawAmt) ? -400000 : rawAmt;
        if (amount > 0) amount = -amount;
        if (amount === 0) { this.showToast('⚠️ Số tiền giảm phải khác 0', 'error'); return; }
        if (window.Storage.addFeeAdjustment) {
          window.Storage.addFeeAdjustment({
            mshs: mshs,
            studentName: this.missingNoteStudent.name || '',
            type: type,
            amount: amount,
            monthYear: monthYear,
            note: noteText
          });
          this.showToast(`✅ Đã giảm ${this.$formatCurrency(amount)} cho ${mshs}`, 'success');
        }
      }
      this.showMissingNoteModal = false;
      this.loadSettingsUI();
      this.runMatching();
    },

        getStudentDetails(mshs) {
      if (!mshs) return { fullName: '', className: '' };
      const s = (this.$store.appState.students || []).find(st => st.mshs === mshs);
      return s ? { fullName: s.fullName || '', className: s.className || '' } : { fullName: '', className: '' };
    },

    init() {
    },
    // Cashflow Methods
    groupedCashflow() {
      const state = this.$store.appState;
      if (!state.paymentsByMSHS) return [];
      
      let result = [];
      const students = state.students || [];
      const sMap = new Map(students.map(s => [s.mshs.toUpperCase(), s]));

      for (const [mshs, data] of state.paymentsByMSHS.entries()) {
        const s = sMap.get(mshs);
        result.push({
          mshs: mshs,
          fullName: s ? s.fullName : '',
          className: s ? s.className : '',
          txList: data.txList || [],
          total: data.total || 0
        });
      }
      
      result.sort((a, b) => a.mshs.localeCompare(b.mshs));

      if (state.cashflowFilter.onlyWithMoney) {
        result = result.filter(r => r.total > 0);
      }

      if (state.cashflowFilter.search) {
        const s = state.cashflowFilter.search.toLowerCase();
        result = result.filter(r => (
          (r.mshs || '').toLowerCase().includes(s) ||
          (r.fullName || '').toLowerCase().includes(s) ||
          (r.className || '').toLowerCase().includes(s)
        ));
      }
      return result;
    },
    reassignTransaction(tx) {
      if (tx.source === 'vtb') {
        this.openAssignVtb(tx);
      } else if (tx.source === 'tpb') {
        this.openAssignTpb(tx);
      }
    },
    init() {
      // Set default month
      const now = new Date();
      this.$store.appState.monthYear = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}`;
      
      // Load UI settings
      this.loadSettingsUI();
      this.ignoredKeys = window.Storage._get('joy_ignored_tx') || [];
      // Nợ cũ: nạp lại lần trước đã lưu
      try {
        const savedDebt = window.Storage.loadPriorDebt ? window.Storage.loadPriorDebt() : null;
        if (savedDebt && savedDebt.rows && savedDebt.rows.length) {
          this.priorDebtRows = savedDebt.rows;
          this.debtTicked = []; this.debtDirty = false;
          this.priorDebtText = savedDebt.rows.map(r => [r.mshs, r.fullName || '', r.className || '', r.amount].join('\t')).join('\n');
        }
        // Sang tháng mới mà chưa có nợ → tự lấy file chốt tháng trước (khỏi dán tay)
        const cur = this.$store.appState.monthYear || '';
        if (cur && (!this.priorDebtRows || !this.priorDebtRows.length) && window.Storage.prevMonth && window.Storage.loadClosingDebt) {
          const pm = window.Storage.prevMonth(cur);
          const closed = pm ? window.Storage.loadClosingDebt(pm) : null;
          if (closed && closed.rows && closed.rows.length) {
            window.Storage.savePriorDebt(cur, closed.rows);
            this.priorDebtRows = closed.rows;
            this.debtTicked = []; this.debtDirty = false;
            this.priorDebtText = closed.rows.map(r => [r.mshs, r.fullName || '', r.className || '', r.amount].join('\t')).join('\n');
            setTimeout(() => this.showToast(`📌 Đã tự lấy nợ chốt T${pm} (${closed.rows.length} bạn)`, 'success'), 800);
          }
        }
      } catch (e) { console.error('Prior debt load error:', e); }
      // Mapping thống nhất: local trống → tự nạp shared_data/joy_mappings.json (khi chạy web tĩnh)
      try {
        const hasMapping = (window.Storage.loadSTKPhu() || []).length || (window.Storage.loadKeywords() || []).length;
        if (!hasMapping && typeof fetch === 'function') {
          fetch('shared_data/joy_mappings.json').then(r => r.ok ? r.json() : null).then(d => {
            if (!d) return;
            if (d.joy_stk_phu && d.joy_stk_phu.length) window.Storage.mergeSTKPhu(d.joy_stk_phu);
            if (d.joy_keywords && d.joy_keywords.length) window.Storage.mergeKeywords(d.joy_keywords);
            if (d.joy_family_groups && d.joy_family_groups.length) window.Storage.mergeFamilyGroups(d.joy_family_groups);
            this.loadSettingsUI();
          }).catch(() => {});
        }
      } catch (e) { /* chạy file:// không fetch được thì bỏ qua */ }
      // P1-3: nạp lại Tab7 Tổng hợp đã lưu từ lần trước
      try {
        const savedTab7 = window.Storage._get('joy_acc_tab7_rows', []);
        if (savedTab7 && savedTab7.length) this.$store.appState.accountingData.tab7 = savedTab7;
      } catch (e) { console.error('Tab7 load error:', e); }
    },

    loadSettingsUI() {
      const stk = window.Storage.loadSTKPhu() || [];
      const kw = window.Storage.loadKeywords() || [];
      // Mới gán nhất lên đầu → dễ phát hiện gán nhầm mấy ngày gần đây
      const byDate = (a, b) => new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
      
      const studentsMap = new Map();
      (this.$store.appState.prevInvoiceStudents || []).forEach(s => {
        const mshs = typeof s === 'string' ? s : s.mshs;
        if (mshs) studentsMap.set(mshs, typeof s === 'string' ? { mshs, fullName: mshs } : s);
      });
      
      this.stkPhuData = [...stk].sort(byDate).map(item => {
        const student = studentsMap.get(item.mshs);
        if (student) {
          return { ...item, tenHS: student.fullName, className: student.className };
        }
        return item;
      });
      
      this.keywordData = [...kw].sort(byDate).map(item => {
        const student = studentsMap.get(item.mshs);
        if (student) {
          return { ...item, tenHS: student.fullName, className: student.className };
        }
        return item;
      });
      this.familyGroups = window.Storage.loadFamilyGroups() || [];
      this.packageData = window.Storage.loadPackages() || [];
      this.adjustmentData = window.Storage.loadFeeAdjustments ? (window.Storage.loadFeeAdjustments() || []) : [];
      this.referralData = [...(window.Storage.loadReferrals ? (window.Storage.loadReferrals() || []) : [])].sort((a, b) => {
        if (a.confirmed !== b.confirmed) return a.confirmed ? 1 : -1;
        return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
      });
      this.historyData = window.Storage.loadHistory ? (window.Storage.loadHistory() || []).slice(0, 30) : [];
      this.checkPendingReferrals();
    },
    
    showToast(message, type = 'info') {
      Alpine.store('toasts').show(message, type);
    },
    
    switchTab(tabId) {
      this.$store.appState.activeTab = tabId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    get canStartMatching() {
      const s = this.$store.appState.importStatus;
      return s.dsHocSinh && (s.vietinBank || s.tpBank || s.tienMat);
    },

    async handleFileImport(event, type) {
      const file = event.target ? event.target.files[0] : null;
      if (!file) return;
      await this.processImportFile(file, type);
      if (event.target) event.target.value = null; // reset
    },

    async handleFileDrop(event, type) {
      const files = event.dataTransfer ? event.dataTransfer.files : null;
      if (!files || files.length === 0) {
        this.showToast('❌ Không tìm thấy file. Thử click để chọn file.', 'error');
        return;
      }
      await this.processImportFile(files[0], type);
    },

    async processImportFile(file, type) {
      this.showLoading = true;
      try {
        let result;
        const state = this.$store.appState;
        
        switch(type) {
          case 'dsHocSinh':
            const parsed = await window.Importer.parseGoogleSheets(file);
            state.students = parsed.students || parsed;
            result = Array.isArray(parsed.students) ? parsed.students : parsed;
            break;
          case 'vietinBank':
            state.vtbTransactions = await window.Importer.parseSaoKeVietinBank(file);
            result = state.vtbTransactions;
            break;
          case 'tpBank':
            state.tpbTransactions = await window.Importer.parseSaoKeTPBank(file);
            result = state.tpbTransactions;
            break;
          case 'tienMat':
            state.cashPayments = await window.Importer.parseTienMat(file);
            result = state.cashPayments;
            break;
          case 'prevInvoice':
            const prevData = await window.Importer.parsePrevInvoiceFile(file);
            state.prevInvoiceStudents = prevData.prevInvoiceStudents;
            state.prevThucTeStudents = prevData.prevThucTe;
            result = prevData.prevInvoiceStudents;
            window.Storage._set('joy_prev_invoice_students', result);
            window.Storage._set('joy_prev_thuc_te_students', prevData.prevThucTe);
            break;
          case 'priorDebt':
            // File Excel nợ chốt tháng trước (form ChotNo do app xuất)
            const debtRows = await window.Importer.parseDebtFile(file);
            result = debtRows;
            if (debtRows && debtRows.length) {
              // Grill: chặn nhầm file tháng khác — tên file ChotNo_YYYYMM phải khớp tháng trước của tháng đang xem
              const digits = (file.name || '').replace(/[^0-9]/g, '');
              const expectPrev = (window.Storage.prevMonth ? window.Storage.prevMonth(state.monthYear || '') : '').replace(/-/g, '');
              if (digits && expectPrev && !digits.includes(expectPrev)) {
                this.showToast(`⚠️ File ${file.name} có vẻ của tháng khác (đang xem ${state.monthYear}, cần file tháng ${expectPrev.slice(0,4)}-${expectPrev.slice(4)}). Vẫn nạp — kiểm tra lại!`, 'warning');
              }
              // Grill: MSHS lạ (gõ sai mã) sẽ rớt vào "Nợ khó đòi" — báo ngay để sửa
              const inMaster = new Set((state.students || []).map(s => (s.mshs || '').toUpperCase()));
              const strange = debtRows.filter(r => !inMaster.has((r.mshs || '').toUpperCase())).map(r => r.mshs);
              if (strange.length) {
                this.showToast(`⚠️ ${strange.length} MSHS không có trong DS tổng (sai mã?): ${strange.slice(0, 8).join(', ')}${strange.length > 8 ? '...' : ''}`, 'warning');
              }
              window.Storage.savePriorDebt(state.monthYear, debtRows);
              this.priorDebtRows = debtRows;
              this.debtTicked = []; this.debtDirty = false;
              this.priorDebtText = debtRows.map(r => [r.mshs, r.fullName || '', r.className || '', r.amount].join('\t')).join('\n');
              if (state.matchingDone) this.runMatching();
            } else {
              this.showToast('⚠️ File nợ không có dòng nào (ai cũng hết nợ thì khỏi import)', 'warning');
            }
            break;
        }
        
        state.importStatus[type] = true;
        this.showToast(`✅ Import ${file.name} thành công: ${result?.length || 0} dòng`, 'success');
        
      } catch (err) {
        this.showToast(`❌ Lỗi import file: ${err.message}`, 'error');
        console.error('Import error:', err);
      } finally {
        this.showLoading = false;
      }
    },

    async startMatching() {
      this.showLoading = true;
      try {
        await this.runMatching();
        this.switchTab('report-tab');
        this.showToast('✅ Đối soát hoàn tất!', 'success');
      } catch (err) {
        this.showToast(`❌ Lỗi đối soát: ${err.message}`, 'error');
      } finally {
        this.showLoading = false;
      }
    },

    async runMatching() {
      const state = this.$store.appState;
      
      const stkPhu = window.Storage.loadSTKPhu();
      const keywords = window.Storage.loadKeywords();
      
      let vtbResult = { matched: [], unmatched: [] };
      if (state.vtbTransactions && state.vtbTransactions.length > 0) {
        vtbResult = window.Matcher.matchVietinBank(state.vtbTransactions, state.students, stkPhu);
        state.vtbMatched = vtbResult.matched;
        // Lọc GD đã bỏ qua (tránh gán nhầm cho HS khác sau khi bỏ qua)
        state.vtbUnmatched = (vtbResult.unmatched || []).filter(tx => {
          const key = `vtb|${tx.date}|${tx.debitAccount}|${tx.credit}`;
          return !this.ignoredKeys.includes(key);
        });
      }
      
      let tpbResult = { matched: [], unmatched: [] };
      if (state.tpbTransactions && state.tpbTransactions.length > 0) {
        tpbResult = window.Matcher.matchTPBank(state.tpbTransactions, keywords, state.students);
        state.tpbMatched = tpbResult.matched;
        state.tpbUnmatched = (tpbResult.unmatched || []).filter(tx => {
          const key = `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
          return !this.ignoredKeys.includes(key);
        });
      }
      
      let paymentsByMSHS = window.Matcher.aggregateByMSHS(
        state.vtbMatched || [],
        state.tpbMatched || [],
        state.cashPayments || []
      );
      state.paymentsByMSHS = paymentsByMSHS;
      
      const familyGroups = window.Storage.loadFamilyGroups();
      state.reportRows = window.Reporter.generateReport(
        state.students,
        paymentsByMSHS,
        familyGroups,
        state.monthYear
      );
      
      this.applyFilters();
      this.populateReportFilters();
      this.loadSuspendedUI();
      this.computeAccountingData();

      state.matchingDone = true;
      state.exceptionCount = (state.vtbUnmatched?.length || 0) + (state.tpbUnmatched?.length || 0);

      // Nhắc gói sắp hết / vừa hết hạn (VD: gói 7,8,9 → đối soát tháng 9 báo để tháng 10 thu HP)
      try {
        const exp = window.Storage.getExpiringPackages ? window.Storage.getExpiringPackages(state.monthYear, state.students) : [];
        state.packageAlerts = exp;
        if (exp && exp.length) {
          const lines = exp.map(e => `• ${(e.pkg.packageName || e.pkg.groupName || 'Gói')} (${(e.pkg.members || []).join(', ')}) ${e.msg}`).join('\n');
          setTimeout(() => this.showToast(`⏰ Gói hết hạn:\n${lines}`, 'warning'), 600);
        }
      } catch (e) { console.error('package alert error:', e); }
    },

    computeAccountingData() {
      const state = this.$store.appState;
      
      const vtbMatchedMSHS = new Set(
        (state.vtbMatched || []).map(tx => tx.matchedMSHS).filter(Boolean)
      );
      
      const currMap = new Map();
      (state.students || []).forEach(s => {
        if (currMap.has(s.mshs)) {
          const existing = currMap.get(s.mshs);
          if (s.className && (!existing.className || !existing.className.includes(s.className))) {
            existing.className = (existing.className ? existing.className + ', ' : '') + s.className;
          }
          existing.hocPhi = (Number(existing.hocPhi) || 0) + (Number(s.hocPhi) || 0);
        } else {
          currMap.set(s.mshs, { ...s });
        }
      });
      
      const vtbAmountByMSHS = new Map();
      (state.vtbMatched || []).forEach(tx => {
        if (tx.matchedMSHS) {
          vtbAmountByMSHS.set(
            tx.matchedMSHS,
            (vtbAmountByMSHS.get(tx.matchedMSHS) || 0) + tx.credit
          );
        }
      });
      
      const oldTab7 = (state.accountingData && state.accountingData.tab7) || window.Storage._get('joy_acc_tab7_rows', []);
      state.accountingData = window.Accounting.computeInvoiceComparison(
        state.prevInvoiceStudents || [],
        vtbMatchedMSHS,
        currMap,
        vtbAmountByMSHS,
        state.reportRows || [],
        window.Storage.loadFamilyGroups(),
        state.defaultFee
      );
      state.accountingData.tab7 = oldTab7;
    },

    // Report Utils


    get reportStats() {
      const s = window.Reporter.getStatistics(this.filteredReportRows || []);
      // Map tên tiếng Việt từ Reporter sang tên UI đang dùng
      return {
        totalStudents: s.tongHS || 0,
        paidCount: s.daDong || 0,
        unpaidCount: s.chuaDong || 0,
        partialCount: s.dongThieu || 0,
        overpaidCount: s.dongDu || 0,
        packageCount: s.dongGoi || 0,
        totalMoney: s.tongThu || 0,
        totalFee: s.tongHocPhi || 0,
        totalDebt: s.tongNoCu || 0,
        debtCollected: s.noCuDaThu || 0,
        totalReceivable: s.tongPhaiThu || 0,
        stillMissing: s.conThieu || 0
      };
    },

    // Nợ cũ: dán 4 cột MSHS | Họ tên | Lớp | Số thiếu (tab hoặc | hoặc ,)
    savePriorDebt() {
      const raw = (this.priorDebtText || '').trim();
      if (!raw) { this.showToast('⚠️ Chưa dán danh sách nợ', 'warning'); return; }
      const rows = [];
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        // Bỏ dòng tiêu đề
        if (/mshs/i.test(t) && /thiếu|thieu|tiền|số/i.test(t)) continue;
        const parts = t.split(/\t|\||;|,/).map(s => s.trim()).filter(s => s !== '');
        if (parts.length < 1) continue;
        const mshs = (parts[0] || '').toUpperCase();
        if (!mshs || /^HV?0*$/.test(mshs)) continue;
        // Số thiếu = cụm số cuối cùng trong dòng
        let amount = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
          const n = window.Utils ? window.Utils.parseNumber(parts[i]) : Number(String(parts[i]).replace(/[^0-9]/g, '')) || 0;
          if (n > 0) { amount = n; break; }
        }
        if (amount <= 0) continue;
        rows.push({ mshs, fullName: parts[1] || '', className: parts[2] || '', amount });
      }
      if (!rows.length) { this.showToast('❌ Không đọc được dòng nào (cần MSHS + Số thiếu)', 'error'); return; }
      const state = this.$store.appState;
      window.Storage.savePriorDebt(state.monthYear, rows);
      this.priorDebtRows = rows;
      this.debtTicked = []; this.debtDirty = false;
      this.showToast(`✅ Đã lưu nợ ${rows.length} bạn`, 'success');
      if (state.matchingDone) this.runMatching();
    },
    clearPriorDebtUI() {
      window.Storage.clearPriorDebt && window.Storage.clearPriorDebt();
      this.priorDebtRows = [];
      this.priorDebtText = '';
      const state = this.$store.appState;
      state.importStatus.priorDebt = false;
      this.showToast('🗑️ Đã xóa hết nợ cũ', 'success');
      if (state.matchingDone) this.runMatching();
    },
    // Gỡ 1 bạn khỏi nợ chốt (đóng tiền sau khi chốt → gỡ để khỏi tính nợ sai)
    removePriorDebtRow(mshs) {
      const key = (mshs || '').toUpperCase();
      this.priorDebtRows = (this.priorDebtRows || []).filter(r => (r.mshs || '').toUpperCase() !== key);
      this.debtTicked = (this.debtTicked || []).filter(m => (m || '').toUpperCase() !== key);
      this.persistDebtRows(`✅ Đã gỡ nợ ${mshs} (đóng sau chốt)`);
    },
    // Bảng nợ gọn: tick 1 / tick all / sửa số / gỡ hàng loạt / lưu 1 lần
    toggleDebtOne(mshs, on) {
      const key = (mshs || '').toUpperCase();
      this.debtTicked = this.debtTicked || [];
      if (on && !this.debtTicked.some(m => (m || '').toUpperCase() === key)) this.debtTicked.push(mshs);
      if (!on) this.debtTicked = this.debtTicked.filter(m => (m || '').toUpperCase() !== key);
    },
    toggleDebtAll(on) {
      this.debtTicked = on ? (this.priorDebtRows || []).map(r => r.mshs) : [];
    },
    removeTickedDebt() {
      const ticked = new Set((this.debtTicked || []).map(m => (m || '').toUpperCase()));
      if (!ticked.size) return;
      this.priorDebtRows = (this.priorDebtRows || []).filter(r => !ticked.has((r.mshs || '').toUpperCase()));
      const n = ticked.size;
      this.debtTicked = [];
      this.persistDebtRows(`✅ Đã gỡ ${n} bạn đã tick`);
    },
    editDebtAmount(mshs, val) {
      const n = window.Utils ? window.Utils.parseNumber(val) : Number(String(val).replace(/[^0-9]/g, '')) || 0;
      const row = (this.priorDebtRows || []).find(r => (r.mshs || '').toUpperCase() === (mshs || '').toUpperCase());
      if (!row) return;
      if (n <= 0) { this.showToast('⚠️ Số nợ phải > 0 (muốn xóa thì bấm ❌)', 'warning'); return; }
      row.amount = n;
      this.debtDirty = true;
    },
    saveDebtTable() {
      this.debtDirty = false;
      this.persistDebtRows(`✅ Đã lưu bảng nợ (${(this.priorDebtRows || []).length} bạn)`);
    },
    persistDebtRows(msg) {
      const state = this.$store.appState;
      if (!this.priorDebtRows.length) {
        window.Storage.clearPriorDebt && window.Storage.clearPriorDebt();
        this.priorDebtText = '';
        state.importStatus.priorDebt = false;
      } else {
        window.Storage.savePriorDebt(state.monthYear, this.priorDebtRows);
        this.priorDebtText = this.priorDebtRows.map(r => [r.mshs, r.fullName || '', r.className || '', r.amount].join('\t')).join('\n');
      }
      if (msg) this.showToast(msg, 'success');
      if (state.matchingDone) this.runMatching();
    },

    // Bước 3: Chốt nợ cuối tháng — lấy ai còn thiếu làm nợ đầu kỳ tháng sau + xuất file
    closeDebtUI() {
      const state = this.$store.appState;
      if (!state.matchingDone || !(state.reportRows || []).length) {
        this.showToast('⚠️ Chưa đối soát — bấm "Bắt đầu đối soát" trước', 'warning');
        return;
      }
      const month = state.monthYear || '';
      const rows = (state.reportRows || [])
        .filter(r => (r.conThieu || 0) > 0)
        .map(r => ({ mshs: r.mshs, fullName: r.fullName || '', className: r.className || '', amount: r.conThieu }));
      const bad = (this.badDebtRows || []).map(b => ({ mshs: b.mshs, fullName: b.fullName || '', className: b.className || '', amount: b.amount }));
      const all = rows.concat(bad.filter(b => !rows.some(r => r.mshs === b.mshs)));
      window.Storage.saveClosingDebt(month, all);
      // Tự nhớ cho tháng sau: sang tháng mới app lấy luôn, khỏi import tay
      const nm = window.Storage.nextMonth ? window.Storage.nextMonth(month) : '';
      if (nm) window.Storage.savePriorDebt(nm, all);
      // Output duy nhất cho nợ: file Excel form ChotNo → tháng sau import lại đúng form này
      window.Exporter.exportClosingDebt(all, month);
      this.showToast(all.length ? `✅ Đã chốt nợ T${month} (${all.length} bạn) → file Excel, tự nhớ cho tháng ${nm}` : `✅ Tháng ${month} không ai nợ`, 'success');
    },

    // Xuất mapping thống nhất (1 JSON cho web + vẫn giữ Excel để Ngọc đọc)
    exportUnifiedMapping() {
      window.Exporter.exportUnifiedMappingJSON();
      this.showToast('✅ Đã xuất mapping thống nhất (STK + từ khóa + gia đình + gói + nợ)', 'success');
    },

    // Gợi ý gói 2 tháng: không nợ cũ, đóng gấp 2 lần HP trở lên (VD 1.6tr cho HP 800k)
    get doublePayRows() {
      const state = this.$store.appState;
      return (state.reportRows || []).filter(r =>
        !(r.noCu > 0) && (r.tongHocPhi || 0) > 0 && (r.tongDaDong || 0) >= 2 * (r.tongHocPhi || 0)
        && !(window.Storage.isPackageActive && window.Storage.isPackageActive(r.mshs, state.monthYear).active)
      );
    },
    // 1 chạm: chuyển bạn đóng 1 cục thành gói 2 tháng (tháng này + tháng sau)
    makePackage2Months(mshs) {
      const state = this.$store.appState;
      const row = (state.reportRows || []).find(r => r.mshs === mshs);
      if (!row) return;
      const month = state.monthYear || '';
      const nm = window.Storage.nextMonth ? window.Storage.nextMonth(month) : '';
      window.Storage.addPackage({
        packageName: `Gói 2 tháng ${mshs}`,
        members: [mshs],
        months: 2,
        startMonth: month,
        endMonth: nm,
        discountPercent: 0
      });
      this.loadSettingsUI();
      this.runMatching();
      this.showToast(`✅ ${mshs} → gói 2 tháng (${month} → ${nm})`, 'success');
    },

    applyFilters() {
      const state = this.$store.appState;
      // Reporter.filterReport đọc field trangThai — map từ filters.status của UI
      this.filteredReportRows = window.Reporter.filterReport(state.reportRows, {
        trangThai: this.filters.status,
        className: this.filters.className,
        teacher: this.filters.teacher,
        searchText: this.filters.searchText
      });
      // Lọc nhanh: chỉ bạn còn nợ cũ
      if (this.filters.onlyDebt) {
        this.filteredReportRows = (this.filteredReportRows || []).filter(r => (r.noCuConLai || 0) > 0);
      }
    },

    // Nợ khó đòi: có nợ cũ nhưng không còn trong DS tổng (nghỉ học) → tách sổ riêng
    get badDebtRows() {
      const state = this.$store.appState;
      let debtMap = new Map();
      try { debtMap = window.Storage.getPriorDebtMap ? window.Storage.getPriorDebtMap() : new Map(); } catch (e) { debtMap = new Map(); }
      if (!debtMap || debtMap.size === 0) return [];
      const inMaster = new Set((state.students || []).map(s => (s.mshs || '').toUpperCase()));
      const saved = (window.Storage.loadPriorDebt ? window.Storage.loadPriorDebt() : null) || {};
      const infoMap = new Map(((saved && saved.rows) || []).map(r => [(r.mshs || '').toUpperCase(), r]));
      const out = [];
      for (const [mshs, amount] of debtMap) {
        if (!inMaster.has(mshs)) {
          const info = infoMap.get(mshs) || {};
          out.push({ mshs, fullName: info.fullName || '', className: info.className || '', amount });
        }
      }
      return out.sort((a, b) => a.mshs.localeCompare(b.mshs));
    },

    // Nạp danh sách Lớp + GV vào 2 ô lọc (bản cũ có, bản Alpine làm rơi)
    populateReportFilters() {
      const state = this.$store.appState;
      this.reportClassOptions = [...new Set((state.students || []).map(s => s.className).filter(Boolean))].sort();
      this.reportTeacherOptions = [...new Set((state.students || []).map(s => s.teacher).filter(Boolean))].sort();
    },

    exportReport() {
      const state = this.$store.appState;
      const s = window.Reporter.getStatistics(state.reportRows || []);
      const stats = { tongHS: s.tongHS, daDong: s.daDong, chuaDong: s.chuaDong, dongThieu: s.dongThieu, dongDu: s.dongDu, dongGoi: s.dongGoi, tongThu: s.tongThu, tongHocPhi: s.tongHocPhi };
      window.Exporter.exportBaoCao(state.reportRows, stats, state.monthYear);
      this.showToast('✅ Đã xuất báo cáo!', 'success');
    },
    
    getNguonCK(row) {
      if (row.chuyenKhoanVTB > 0) return '<span class="tag-vtb" style="cursor: pointer;">🏦 VTB</span>';
      if (row.chuyenKhoanTPB > 0) return '<span class="tag-tpb" style="cursor: pointer;">🏦 TPBank</span>';
      if (row.tienMat > 0) return '<span class="tag-cash" style="cursor: pointer;">💵 Tiền mặt</span>';
      return '—';
    },

    showNguonCKDetail(row) {
      const mshs = row.mshs;
      const paymentData = this.$store.appState.paymentsByMSHS?.get?.(mshs);
      if (!paymentData || !paymentData.txList || paymentData.txList.length === 0) {
        this.showToast('Không có thông tin chi tiết', 'warning');
        return;
      }
      
      let html = `<div style="max-height: 400px; overflow-y: auto;">`;
      html += `<h4 style="margin-bottom: 12px;">💳 Chi tiết thanh toán: ${mshs}</h4>`;
      html += `<table style="width: 100%; font-size: 14px; border-collapse: collapse;">`;
      html += `<thead><tr style="background: var(--bg-main);">`;
      html += `<th style="padding: 8px; text-align: center; width: 40px;">No.</th>`;
      html += `<th style="padding: 8px; text-align: left;">Ngày</th>`;
      html += `<th style="padding: 8px; text-align: left;">Nguồn</th>`;
      html += `<th style="padding: 8px; text-align: right;">Số tiền</th>`;
      html += `<th style="padding: 8px; text-align: left;">STK</th>`;
      html += `<th style="padding: 8px; text-align: left;">Chủ TK</th>`;
      html += `<th style="padding: 8px; text-align: left;">Nội dung</th>`;
      html += `</tr></thead><tbody>`;
      
      paymentData.txList.forEach((tx, idx) => {
        const typeTag = tx.type === 'vtb' ? '🏦 VTB' : (tx.type === 'tpb' ? '🏦 TPBank' : '💵 Tiền mặt');
        const stk = tx.account || '—';
        const chuTK = tx.tenChuTK || '—';
        const desc = (tx.description || '—').substring(0, 80);
        html += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        html += `<td style="padding: 8px; text-align: center; color: var(--text-secondary);">${tx._rowNo || idx + 1}</td>`;
        html += `<td style="padding: 8px; white-space: nowrap;">${this.$formatDate(tx.date)}</td>`;
        html += `<td style="padding: 8px; white-space: nowrap;">${typeTag}</td>`;
        const origText = tx.originalAmount && tx.originalAmount !== tx.amount ? `<br><small style="color: var(--text-secondary); font-weight: normal;">(Gốc: ${this.$formatCurrency(tx.originalAmount)})</small>` : '';
        html += `<td style="padding: 8px; text-align: right; font-weight: 600; white-space: nowrap;">${this.$formatCurrency(tx.amount)}${origText}</td>`;
        html += `<td style="padding: 8px; font-family: monospace; font-size: 13px;">${stk}</td>`;
        html += `<td style="padding: 8px; font-size: 13px;">${chuTK}</td>`;
        html += `<td class="wrap" style="padding: 8px; font-size: 13px; color: var(--text-secondary); max-width: 200px;" title="${tx.description || ''}">${desc}</td>`;
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
      
      this.modalTitle = '💳 Chi tiết thanh toán';
      this.modalBody = html;
      this.modalConfirm = null;
      this.showModal = true;
    },

    getStatusBadge(status) {
      if (status === 'Đã đóng') return 'status-paid';
      if (status === 'Chưa đóng') return 'status-unpaid';
      if (status === 'Đóng thiếu') return 'status-partial';
      if (status === 'Đóng dư') return 'status-overpaid';
      if (status === '📦 Đã đóng gói') return 'status-package';
      return 'badge-default';
    },

    // Exception suggestions (reuse Matcher.suggestMatch logic)
    // Chỉ hiện gợi ý khi độ tin cậy cao (score >= 0.8), tránh gợi ý bừa
    getVtbSuggestion(tx) {
      const students = this.$store.appState.students || [];
      if (!students.length) return '—';
      const sug = window.Matcher.suggestMatch(tx, students);
      if (sug && sug.length > 0 && sug[0].score >= 0.8) return `${sug[0].mshs} (${sug[0].studentName || sug[0].hoTen || ''})`;
      return '—';
    },

    getTpbSuggestion(tx) {
      const students = this.$store.appState.students || [];
      if (!students.length) return '—';
      const sug = window.Matcher.suggestMatch(tx, students);
      if (sug && sug.length > 0 && sug[0].score >= 0.8) return `${sug[0].mshs} (${sug[0].studentName || sug[0].hoTen || ''})`;
      return '—';
    },

    // Manual assign VTB: save STK mapping, re-run matching
    openAssignVtb(tx) { this.openAssignModal(tx, 'vtb'); },
    openAssignTpb(tx) { this.openAssignModal(tx, 'tpb'); },

    // Modal Gán MSHS: top 3 gợi ý + search thủ công, tên tự nhảy theo DS HS
    openAssignModal(tx, type) {
      const students = this.$store.appState.students || [];
      const sug = window.Matcher.suggestMatch(tx, students) || [];
      this.assignSuggestions = sug.slice(0, 3);
      this.assignTx = tx;
      this.assignType = type;
        this.assignMode = 'auto';
      this.assignSearch = '';
      // Tự điền Từ khóa gợi ý cho mapping (STK phụ TPB / keyword)
      const rawDesc = (tx.description || tx.explanation || '');
      if (type === 'tpb') {
        const kws = (window.Utils && window.Utils.extractKeywordsFromDescription) ? window.Utils.extractKeywordsFromDescription(rawDesc) : [];
        this.assignKeyword = (kws && kws.length > 0) ? kws.slice(0, 3).join(' ') : rawDesc.substring(0, 20).trim().toUpperCase();
      } else {
        this.assignKeyword = '';
      }
      // Auto-select gợi ý cao nhất nếu score >= 0.8
      this.assignSelected = (sug.length > 0 && sug[0].score >= 0.8) ? sug[0].mshs : '';
      this.showAssignModal = true;
    },

    get assignStudentName() {
      const students = this.$store.appState.students || [];
      const found = students.find(s => s.mshs === this.assignSelected);
      return found ? found.fullName : '';
    },

    get assignFilteredStudents() {
      const students = this.$store.appState.students || [];
      const q = (this.assignSearch || '').toLowerCase().trim();
      if (!q) return students.slice(0, 50);
      return students.filter(s =>
        (s.mshs || '').toLowerCase().includes(q) ||
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.className || '').toLowerCase().includes(q)
      ).slice(0, 50);
    },

    // Tra cứu tên + lớp từ MSHS (dùng cho bảng Gói, gợi ý gán — phân biệt HS trùng tên bằng Lớp)
    studentByMshs(mshs) {
      const students = (this.$store && this.$store.appState && this.$store.appState.students) || [];
      return students.find(s => s.mshs === mshs) || null;
    },

    studentClass(mshs) {
      const s = this.studentByMshs(mshs);
      return s ? (s.className || '') : '';
    },

    pkgMemberNames(members) {
      if (!members || !members.length) return '';
      return members.map(m => {
        const s = this.studentByMshs(m);
        return s ? (s.fullName || m) : m;
      }).join(', ');
    },

    // Tra cứu HS dùng chung cho mọi form nhập liệu (gõ MSHS / tên / lớp đều ra)
    matchStudents(q, limit = 8) {
      const students = (this.$store && this.$store.appState && this.$store.appState.students) || [];
      const query = (q || '').toLowerCase().trim();
      if (query.length < 2) return [];
      return students.filter(s =>
        (s.mshs || '').toLowerCase().includes(query) ||
        (s.fullName || '').toLowerCase().includes(query) ||
        (s.className || '').toLowerCase().includes(query)
      ).slice(0, limit || 8);
    },

    // Gợi ý cho dropdown đang mở (pickOpen: family | pkg | adj | ref1 | ref2 | sus)
    pickSuggestions() {
      let q = '';
      if (this.pickOpen === 'family') q = (this.familyForm.membersRaw || '').split(',').pop() || '';
      else if (this.pickOpen === 'pkg') q = (this.packageForm.membersRaw || '').split(',').pop() || '';
      else if (this.pickOpen === 'adj') q = this.adjustmentForm.mshs || '';
      else if (this.pickOpen === 'ref1') q = this.referralForm.mshs || '';
      else if (this.pickOpen === 'ref2') q = this.referralForm.referredMSHS || '';
      else if (this.pickOpen === 'sus') q = this.suspendForm.mshs || '';
      else return [];
      return this.matchStudents(q);
    },

    // Chọn 1 gợi ý: ô 1 bé thì điền thẳng, ô nhiều bé thì thêm vào cuối
    pickStudent(mshs) {
      if (this.pickOpen === 'family') {
        const parts = (this.familyForm.membersRaw || '').split(',');
        parts.pop();
        parts.push(' ' + mshs);
        this.familyForm.membersRaw = parts.join(',').replace(/^,\s*/, '') + ', ';
      } else if (this.pickOpen === 'pkg') {
        const parts = (this.packageForm.membersRaw || '').split(',');
        parts.pop();
        parts.push(' ' + mshs);
        this.packageForm.membersRaw = parts.join(',').replace(/^,\s*/, '') + ', ';
      } else if (this.pickOpen === 'adj') this.adjustmentForm.mshs = mshs;
      else if (this.pickOpen === 'ref1') this.referralForm.mshs = mshs;
      else if (this.pickOpen === 'ref2') this.referralForm.referredMSHS = mshs;
      else if (this.pickOpen === 'sus') {
        this.suspendForm.mshs = mshs;
        const c = this.studentClasses(mshs);
        if (c.length === 1) this.suspendForm.className = c[0];
        else if (c.length > 1 && !c.includes(this.suspendForm.className)) this.suspendForm.className = '';
      }
      this.pickOpen = '';
    },

    // Xem trước từng bé trong ô nhập nhiều MSHS (báo đỏ bé không có trong DS)
    previewMembers(raw) {
      const tokens = (raw || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      return tokens.map(t => {
        const s = this.studentByMshs(t);
        return { mshs: t, found: !!s, fullName: s ? (s.fullName || '') : '', className: s ? (s.className || '') : '' };
      });
    },

    // Xem trước 1 MSHS (ô nhập 1 bé)
    previewOne(mshs) {
      const t = (mshs || '').trim().toUpperCase();
      if (!t) return null;
      return this.studentByMshs(t);
    },

    studentClasses(mshs) {
      const s = this.studentByMshs((mshs || '').trim().toUpperCase());
      if (!s) return [];
      return (s.className || '').split(',').map(c => c.trim()).filter(Boolean);
    },

    pkgMemberClasses(members) {
      if (!members || !members.length) return '';
      return members.map(m => this.studentClass(m)).filter(Boolean).join(', ');
    },

    confirmAssign() {
      const m = (this.assignSelected || '').trim().toUpperCase();
      if (!m) { this.showToast('⚠️ Chưa chọn MSHS', 'warning'); return; }
      const students = this.$store.appState.students || [];
      const found = students.find(s => s.mshs === m);
      if (!found) { this.showToast(`⚠️ Không tìm thấy MSHS ${m} trong DS học sinh`, 'error'); return; }
      const tx = this.assignTx;
      if (this.assignType === 'vtb') {
        // Gán VTB = lưu mapping STK phụ (STK đối ứng → MSHS), lần sau tự khớp
        window.Storage.addSTKPhu({ mshs: m, stk: tx.debitAccount || tx.stkDoiUng || '', tenTK: tx.debitAccountName || tx.tenTKDoiUng || '' });
        this.showToast(`✅ Đã lưu STK → ${m}. Đang chạy lại...`, 'success');
      } else {
        // Gán TPB = lưu keyword (Từ khóa → MSHS), lần sau tự khớp
                  const txId = `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
          if (this.assignMode === 'manual') {
              window.Storage.addManualMatch(txId, m);
              this.showToast(`Đã gán thủ công cho ${m}. Đang chạy lại...`, 'success');
            } else {
              const kwInput = (this.assignKeyword || '').trim().toUpperCase();
              if (!kwInput) { this.showToast('Nhập Từ khoá để lưu', 'warning'); return; }
              if (window.Utils && window.Utils.isWeakKeyword && window.Utils.isWeakKeyword(kwInput)) {
                this.showToast(`Từ khoá "${kwInput}" chung chung quá. Sửa lại thành tên người gửi.`, 'error');
                return;
              }
              const rawDesc = window.Utils.normalizeText(tx.description || tx.explanation || '');
              const isHit = window.Utils.looseKeywordHit ? window.Utils.looseKeywordHit(kwInput, rawDesc) : rawDesc.includes(window.Utils.normalizeText(kwInput));
              if (!isHit) {
                window.Storage.addManualMatch(txId, m);
              }
              window.Storage.addKeyword({ keyword: kwInput, mshs: m, tenHS: found.fullName || '' });
              this.showToast(`Đã lưu từ khoá "${kwInput}" cho ${m}. Đang chạy lại...`, 'success');
            }
          }
                this.showAssignModal = false;
      this.loadSettingsUI();
      this.runMatching();
    },

    // Bỏ qua GD không phải học phí (VD: lãi ngân hàng, trả lại tiền)
    ignoreTx(tx, type) {
      const key = type === 'vtb'
        ? `vtb|${tx.date}|${tx.debitAccount}|${tx.credit}`
        : `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
      if (!this.ignoredKeys.includes(key)) this.ignoredKeys.push(key);
      // Lưu full object để hoàn tác chính xác (không gán nhầm HS khác)
      this.lastIgnored = { tx: JSON.parse(JSON.stringify(tx)), type };
      const state = this.$store.appState;
      if (type === 'vtb') state.vtbUnmatched = (state.vtbUnmatched || []).filter(t => t !== tx);
      else state.tpbUnmatched = (state.tpbUnmatched || []).filter(t => t !== tx);
      state.exceptionCount = (state.vtbUnmatched?.length || 0) + (state.tpbUnmatched?.length || 0);
      window.Storage._set('joy_ignored_tx', this.ignoredKeys);
      this.showToast('⏭️ Đã bỏ qua GD này', 'info');
    },

    undoIgnore() {
      if (!this.lastIgnored) { this.showToast('Không có gì để hoàn tác', 'warning'); return; }
      const { tx, type } = this.lastIgnored;
      const state = this.$store.appState;
      if (type === 'vtb') state.vtbUnmatched = [...(state.vtbUnmatched || []), tx];
      else state.tpbUnmatched = [...(state.tpbUnmatched || []), tx];
      state.exceptionCount = (state.vtbUnmatched?.length || 0) + (state.tpbUnmatched?.length || 0);
      const key = type === 'vtb'
        ? `vtb|${tx.date}|${tx.debitAccount}|${tx.credit}`
        : `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
      this.ignoredKeys = this.ignoredKeys.filter(k => k !== key);
      window.Storage._set('joy_ignored_tx', this.ignoredKeys);
      this.lastIgnored = null;
      this.showToast('↩️ Đã hoàn tác', 'success');
    },

    // Xóa mapping sai (STK / keyword) rồi chạy lại toàn bộ từ sao kê gốc → hiệu lực ngay
    // Sửa mapping: form 1 lần (MSHS + Từ khóa/STK + Tên), lưu xong chạy lại → hiệu lực ngay, không refresh/import lại
    editMappingKey: '',
    editMappingType: '',
    editMappingForm: { mshs: '', key: '', tenTK: '' },
    showEditMappingModal: false,
    editStkMapping(stk) {
      const item = (window.Storage.loadSTKPhu() || []).find(x => x.stk === stk);
      if (!item) { this.showToast('⚠️ Không tìm thấy mapping này', 'error'); return; }
      this.editMappingType = 'stk';
      this.editMappingKey = stk;
      this.editMappingForm = { mshs: item.mshs || '', key: item.stk || '', tenTK: item.tenTK || '' };
      this.pickOpen = '';
      this.showEditMappingModal = true;
    },
    editKeywordMapping(keyword) {
      const item = (window.Storage.loadKeywords() || []).find(x => x.keyword === keyword);
      if (!item) { this.showToast('⚠️ Không tìm thấy từ khóa này', 'error'); return; }
      this.editMappingType = 'keyword';
      this.editMappingKey = keyword;
      this.editMappingForm = { mshs: item.mshs || '', key: item.keyword || '', tenTK: item.tenHS || '' };
      this.pickOpen = '';
      this.showEditMappingModal = true;
    },
    confirmEditMapping() {
      const students = (this.$store && this.$store.appState && this.$store.appState.students) || [];
      const mshs = (this.editMappingForm.mshs || '').trim().toUpperCase();
      if (!mshs) { this.showToast('⚠️ Chưa chọn MSHS', 'error'); return; }
      const found = students.find(s => s.mshs === mshs);
      if (!found) { this.showToast(`⚠️ Không tìm thấy MSHS ${mshs} trong DS học sinh`, 'error'); return; }
      if (this.editMappingType === 'stk') {
        const newStk = (this.editMappingForm.key || '').trim();
        if (!newStk) { this.showToast('⚠️ STK không được trống', 'error'); return; }
        window.Storage.removeSTKPhu(this.editMappingKey);
        window.Storage.addSTKPhu({ mshs, stk: newStk, tenTK: (this.editMappingForm.tenTK || '').trim() });
        window.Storage.addHistory && window.Storage.addHistory({ action: 'Sửa STK Phụ', detail: `${this.editMappingKey} → ${newStk} (${mshs})` });
      } else {
        const newKw = (this.editMappingForm.key || '').trim().toUpperCase();
        if (!newKw) { this.showToast('⚠️ Từ khóa không được trống', 'error'); return; }
        if (window.Utils && window.Utils.isWeakKeyword && window.Utils.isWeakKeyword(newKw)) {
          this.showToast(`⚠️ Từ khóa "${newKw}" chung chung quá (giống CK nhiều nhà) — sửa lại thành tên người gửi. Dữ liệu đã nhập vẫn giữ nguyên.`, 'error');
          return;
        }
        window.Storage.removeKeyword(this.editMappingKey);
        window.Storage.addKeyword({ keyword: newKw, mshs, tenHS: found.fullName || '' });
        window.Storage.addHistory && window.Storage.addHistory({ action: 'Sửa Từ khóa TPB', detail: `"${this.editMappingKey}" → "${newKw}" (${mshs})` });
      }
      this.showEditMappingModal = false;
      this.editMappingKey = ''; this.editMappingType = '';
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('✅ Đã lưu sửa đổi, đối soát chạy lại ngay', 'success');
    },
    deleteStkMapping(stk) {
      if (!confirm(`Xóa mapping STK ${stk}? GD liên quan sẽ quay lại Ngoại lệ.`)) return;
      window.Storage.removeSTKPhu(stk);
      this.loadSettingsUI();
      this.showToast('🗑️ Đã xóa mapping STK', 'success');
      this.runMatching();
    },

    deleteKeywordMapping(keyword) {
      if (!confirm(`Xóa keyword "${keyword}"? GD liên quan sẽ quay lại Ngoại lệ.`)) return;
      window.Storage.removeKeyword(keyword);
      this.loadSettingsUI();
      this.showToast('🗑️ Đã xóa keyword', 'success');
      this.runMatching();
    },

    // Thêm nhóm Gia đình: mở form modal 1 lần 4 ô (bản cũ) — không hỏi prompt dồn 4 lần
    addFamilyGroupUI() {
      this.familyForm = { groupName: '', membersRaw: '', tenPH: '', stk: '' };
      this.familyEditingId = null;
      this.showFamilyModal = true;
    },

    // Sửa nhóm Gia đình: mở lại form cũ, đổi thông tin rồi lưu đè (giữ nguyên groupId)
    editFamilyGroup(group) {
      this.familyForm = {
        groupName: group.groupName || group.name || '',
        membersRaw: (group.members || []).join(', '),
        tenPH: group.tenPH || group.parentName || '',
        stk: group.stkDaiDien || group.stk || ''
      };
      this.familyEditingId = group.groupId;
      this.showFamilyModal = true;
    },

    confirmFamilyGroup() {
      const name = (this.familyForm.groupName || '').trim();
      const membersRaw = (this.familyForm.membersRaw || '').trim();
      if (!name) { this.showToast('⚠️ Nhập Tên nhóm (gợi nhớ, VD: Nhà Cô Lan)', 'error'); return; }
      if (!membersRaw) { this.showToast('⚠️ Nhập DS MSHS các con (bắt buộc)', 'error'); return; }
      const members = membersRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (members.length < 2) { this.showToast('⚠️ Nhóm gia đình cần ít nhất 2 MSHS', 'error'); return; }
      const students = (this.$store && this.$store.appState && this.$store.appState.students) || [];
      const unknown = members.filter(m => !students.find(s => s.mshs === m));
      if (unknown.length) { this.showToast('⚠️ MSHS không có trong DS học sinh: ' + unknown.join(', ') + ' — kiểm tra lại, dữ liệu đã nhập vẫn giữ nguyên', 'error'); return; }
      const tenPH = (this.familyForm.tenPH || '').trim();
      const stk = (this.familyForm.stk || '').trim();
      if (this.familyEditingId) {
        const list = window.Storage.loadFamilyGroups() || [];
        const g = list.find(x => x.groupId === this.familyEditingId);
        if (g) {
          g.groupName = name; g.members = members; g.tenPH = tenPH;
          g.stkDaiDien = stk || tenPH || members[0];
          window.Storage.saveFamilyGroups(list);
          window.Storage.addHistory && window.Storage.addHistory({ action: 'Sửa nhóm gia đình', detail: `${name}: ${members.join(', ')}` });
        }
        this.familyEditingId = null;
      } else {
        window.Storage.addFamilyGroup({ groupName: name, stkDaiDien: stk || tenPH || members[0], tenPH, members });
        window.Storage.addHistory && window.Storage.addHistory({ action: 'Thêm nhóm gia đình', detail: `${name}: ${members.join(', ')}` });
      }
      this.showFamilyModal = false;
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('✅ Đã lưu nhóm gia đình', 'success');
    },

    deleteFamilyGroup(groupId) {
      if (!confirm('Xóa nhóm gia đình này?')) return;
      window.Storage.removeFamilyGroup(groupId);
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('🗑️ Đã xóa nhóm gia đình', 'success');
    },

    // Gói đóng trước nhiều tháng: mở form modal 1 lần (bỏ prompt hỏi dồn 5 lần)
    addPackageUI() {
      const state = this.$store.appState;
      this.packageForm = { packageName: '', membersRaw: '', months: '6', startMonth: state.monthYear || new Date().toISOString().slice(0, 7), discountPercent: '6' };
      this.showPackageModal = true;
    },

    confirmPackage() {
      const packageName = (this.packageForm.packageName || '').trim();
      const membersRaw = (this.packageForm.membersRaw || '').trim();
      if (!packageName) { this.showToast('⚠️ Nhập Tên gói (VD: Gói 6 tháng Nhà Cô Lan)', 'error'); return; }
      if (!membersRaw) { this.showToast('⚠️ Nhập DS MSHS (bắt buộc)', 'error'); return; }
      const members = membersRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!members.length) { this.showToast('⚠️ Chưa nhập MSHS', 'error'); return; }
      const students = (this.$store && this.$store.appState && this.$store.appState.students) || [];
      const unknown = members.filter(m => !students.find(s => s.mshs === m));
      if (unknown.length) { this.showToast('⚠️ MSHS không có trong DS học sinh: ' + unknown.join(', ') + ' — kiểm tra lại, dữ liệu đã nhập vẫn giữ nguyên', 'error'); return; }
      const months = parseInt(this.packageForm.months || '6', 10) || 6;
      const startMonth = (this.packageForm.startMonth || '').trim();
      if (!/^\d{4}-\d{2}$/.test(startMonth)) { this.showToast('⚠️ Tháng bắt đầu phải dạng YYYY-MM (VD: 2026-08)', 'error'); return; }
      const discountPercent = parseFloat(this.packageForm.discountPercent || '0') || 0;
      const [sy, sm] = startMonth.split('-').map(Number);
      // Tháng kết thúc = tháng bắt đầu + số tháng - 1 (VD gói 2 tháng từ T9 → hết T10)
      const endD = new Date(sy, sm - 1 + months - 1);
      const endMonth = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}`;
      window.Storage.addPackage({ packageName, members, months, startMonth, endMonth, discountPercent });
      window.Storage.addHistory && window.Storage.addHistory({ action: 'Thêm gói học phí', detail: `${packageName}: ${members.join(', ')} (${months} tháng, giảm ${discountPercent}%)` });
      this.showPackageModal = false;
      this.loadSettingsUI();
      this.runMatching();
      this.showToast(`✅ Đã thêm gói "${packageName}" (${months} tháng, giảm ${discountPercent}%)`, 'success');
    },

    deletePackage(packageId) {
      if (!confirm('Xóa gói này? HS trong gói sẽ đối soát như bình thường.')) return;
      window.Storage.removePackage(packageId);
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('🗑️ Đã xóa gói', 'success');
    },

    // Điều chỉnh HP: mở form modal 1 lần (bỏ prompt hỏi dồn 4 lần)
    openAdjustmentModal(mshs, fullName) {
      const state = this.$store.appState;
      if (!mshs) {
        mshs = prompt('Nhập MSHS:');
        if (!mshs) return;
        const student = (state.students || []).find(s => s.mshs === mshs.trim().toUpperCase());
        if (!student) { this.showToast('Không tìm thấy MSHS', 'error'); return; }
        fullName = student.fullName || '';
      }
      this.adjModal = { 
        show: true,
        mshs: mshs.trim().toUpperCase(), 
        fullName: fullName || '',
        type: 'Ghi chú thường', 
        amount: 0, 
        monthYear: state.monthYear || '', 
        note: '' 
      };
    },

    confirmAdjustment() {
      const state = this.$store.appState;
      const mshs = (this.adjModal.mshs || '').trim().toUpperCase();
      if (!mshs) { this.showToast('Nhập MSHS', 'error'); return; }
      const student = (state.students || []).find(s => s.mshs === mshs);
      if (!student) { this.showToast('Không tìm thấy MSHS ' + mshs, 'error'); return; }
      const type = (this.adjModal.type || 'Ghi chú thường').trim();
      const amount = parseInt(this.adjModal.amount || '0', 10) || 0;
      
      const adjMonth = (this.adjModal.monthYear || state.monthYear || '').trim();
      if (!/^\d{4}-\d{2}$/.test(adjMonth)) { this.showToast('Tháng phải dạng YYYY-MM', 'error'); return; }
      const note = (this.adjModal.note || '').trim();
      window.Storage.addFeeAdjustment({ mshs: student.mshs, studentName: student.fullName || '', type, amount, monthYear: adjMonth, note });
      this.adjModal.show = false;
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('Đã lưu điều chỉnh cho ' + student.mshs, 'success');
    },

    reassignTransaction(tx) {
      if (tx.source === 'tpb') {
        const txId = `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
        if (window.Storage.removeManualMatch) window.Storage.removeManualMatch(txId);
        if (tx.matchedKeyword) window.Storage.removeKeyword(tx.matchedKeyword);
      } else if (tx.source === 'vtb') {
        const txId = `vtb|${tx.date}|${tx.debitAccount || tx.stkDoiUng}|${tx.amount || tx.credit}`;
        if (window.Storage.removeManualMatch) window.Storage.removeManualMatch(txId);
        const stk = tx.debitAccount || tx.debitAccountName || tx.stkDoiUng;
        if (stk) window.Storage.removeSTKPhu(stk);
      }
      this.openAssignModal(tx, tx.source);
    },

    unassignTransaction(tx) {
      if (!confirm('Bạn có chắc muốn gỡ gán giao dịch này? (Hệ thống sẽ xoá Từ khoá/STK phụ/Gán tay tương ứng nếu có)')) return;
      if (tx.source === 'tpb') {
        const txId = `tpb|${tx.date || tx.transactionDate}|${tx.description || tx.explanation}|${tx.amount || tx.credit}`;
        if (window.Storage.removeManualMatch) window.Storage.removeManualMatch(txId);
        if (tx.matchedKeyword) window.Storage.removeKeyword(tx.matchedKeyword);
      } else if (tx.source === 'vtb') {
        const txId = `vtb|${tx.date}|${tx.debitAccount || tx.stkDoiUng}|${tx.amount || tx.credit}`;
        if (window.Storage.removeManualMatch) window.Storage.removeManualMatch(txId);
        const stk = tx.debitAccount || tx.debitAccountName || tx.stkDoiUng;
        if (stk) window.Storage.removeSTKPhu(stk);
      }
      this.showToast('Đã gỡ gán thành công. Giao dịch sẽ quay về Chưa xác định.', 'success');
      this.loadSettingsUI();
      this.runMatching();
    },
    deleteAdjustment(adjId) {
      if (!confirm('Xóa điều chỉnh này?')) return;
      window.Storage.removeFeeAdjustment(adjId);
      this.loadSettingsUI();
      this.runMatching();
      this.showToast('🗑️ Đã xóa điều chỉnh', 'success');
    },

    // Giới thiệu bạn mới: mở form modal 1 lần (bỏ prompt hỏi dồn 4 lần)
    addReferralUI() {
      const state = this.$store.appState;
      if (!(state.students || []).length) { this.showToast('⚠️ Chưa có DS học sinh. Import DS HS trước đã nhé.', 'warning'); return; }
      this.referralForm = { mshs: '', referredMSHS: '', startMonth: state.monthYear || '', amount: '-400000' };
      this.showReferralModal = true;
    },

    confirmReferralAdd() {
      const state = this.$store.appState;
      const students = state.students || [];
      const mshs = (this.referralForm.mshs || '').trim().toUpperCase();
      const referred = (this.referralForm.referredMSHS || '').trim().toUpperCase();
      if (!mshs) { this.showToast('⚠️ Nhập MSHS của PH giới thiệu', 'error'); return; }
      if (!referred) { this.showToast('⚠️ Nhập MSHS của HS mới', 'error'); return; }
      const ph = students.find(s => s.mshs === mshs);
      if (!ph) { this.showToast(`⚠️ Không tìm thấy MSHS ${mshs} trong DS học sinh`, 'error'); return; }
      const hs = students.find(s => s.mshs === referred);
      if (!hs) { this.showToast(`⚠️ Không tìm thấy MSHS ${referred} trong DS học sinh`, 'error'); return; }
      if (ph.mshs === hs.mshs) { this.showToast('⚠️ MSHS giới thiệu và HS mới phải khác nhau', 'error'); return; }
      const startMonth = (this.referralForm.startMonth || state.monthYear || '').trim();
      if (!/^\d{4}-\d{2}$/.test(startMonth)) { this.showToast('⚠️ Tháng phải dạng YYYY-MM', 'error'); return; }
      const amount = parseInt(this.referralForm.amount || '-400000', 10) || -400000;
      const [sy, sm] = startMonth.split('-').map(Number);
      const applyD = new Date(sy, sm - 1 + 3);
      const applyMonth = `${applyD.getFullYear()}-${String(applyD.getMonth() + 1).padStart(2, '0')}`;
      const result = window.Storage.addReferral({ mshs: ph.mshs, referredMSHS: hs.mshs, startMonth, applyMonth, amount, note: `Giới thiệu ${hs.mshs} bắt đầu ${startMonth}` });
      if (result && result.error) { this.showToast(result.error, 'error'); return; }
      window.Storage.addHistory && window.Storage.addHistory({ action: 'Thêm giới thiệu bạn mới', detail: `${ph.mshs} (${ph.fullName || ''}) giới thiệu ${hs.mshs} (${hs.fullName || ''}) bắt đầu ${startMonth}, giảm từ ${applyMonth}` });
      this.showReferralModal = false;
      this.loadSettingsUI();
      this.showToast(`✅ Đã thêm: ${ph.mshs} giới thiệu ${hs.mshs}. Giảm từ ${applyMonth}`, 'success');
    },

    confirmReferral(refId) {
      const state = this.$store.appState;
      const ref = (window.Storage.loadReferrals() || []).find(r => r.id === refId);
      if (!ref) return;
      const ph = (state.students || []).find(s => s.mshs === ref.mshs);
      if (!confirm(`Đã báo ${ph?.fullName || ref.mshs} về việc giảm ${this.$formatCurrency(ref.amount)} tháng ${ref.applyMonth}?\n\nXác nhận xong hệ thống tự trừ HP.`)) return;
      window.Storage.addFeeAdjustment({ mshs: ref.mshs, studentName: ph?.fullName || '', type: 'Giới thiệu bạn mới', amount: ref.amount, monthYear: ref.applyMonth, note: `Giới thiệu ${ref.referredMSHS}` });
      window.Storage.confirmReferral(refId);
      window.Storage.addHistory && window.Storage.addHistory({ action: 'Xác nhận giới thiệu bạn mới', detail: `${ref.mshs}: giảm ${this.$formatCurrency(ref.amount)} tháng ${ref.applyMonth}` });
      this.loadSettingsUI();
      this.runMatching();
      this.showToast(`✅ Đã xác nhận! ${ref.mshs} được giảm tháng ${ref.applyMonth}`, 'success');
    },

    deleteReferral(refId) {
      if (!confirm('Xóa giới thiệu này?')) return;
      window.Storage.removeReferral(refId);
      this.loadSettingsUI();
      this.showToast('🗑️ Đã xóa giới thiệu', 'success');
    },

    checkPendingReferrals() {
      try {
        const state = this.$store ? this.$store.appState : null;
        const monthYear = state ? state.monthYear : '';
        if (!monthYear || !window.Storage.getPendingReferrals) { this.referralAlerts = []; return; }
        const pending = window.Storage.getPendingReferrals(monthYear) || [];
        this.referralAlerts = pending;
        if (pending.length && !this._referralToastShown) {
          this._referralToastShown = true;
          const lines = pending.map(r => `• ${r.mshs} giới thiệu ${r.referredMSHS}: trừ ${this.$formatCurrency ? this.$formatCurrency(r.amount) : r.amount}`).join('\n');
          setTimeout(() => this.showToast(`🎁 Đủ 3 tháng, cần trừ tiền:\n${lines}`, 'warning'), 800);
        }
      } catch (e) { console.error('referral alert error:', e); }
    },

    // HS tạm ngưng tháng này: nạp bảng, thêm thủ công, thêm từ DS chưa đóng, bỏ ngưng
    loadSuspendedUI() {
      const state = this.$store.appState;
      this.suspendedData = window.Storage.getSuspendedForMonth ? (window.Storage.getSuspendedForMonth(state.monthYear) || []) : [];
    },

    suspendStudentUI() {
      const state = this.$store.appState;
      if (!(state.students || []).length) { this.showToast('⚠️ Chưa có DS học sinh. Import DS HS trước đã nhé.', 'warning'); return; }
      this.suspendForm = { mshs: '', className: '', note: '' };
      this.showSuspendModal = true;
    },

    confirmSuspend() {
      const state = this.$store.appState;
      const mshs = (this.suspendForm.mshs || '').trim().toUpperCase();
      if (!mshs) { this.showToast('⚠️ Nhập MSHS của HS cần tạm ngưng', 'error'); return; }
      const student = (state.students || []).find(s => s.mshs === mshs);
      if (!student) { this.showToast(`⚠️ Không tìm thấy MSHS ${mshs} trong DS học sinh`, 'error'); return; }
      const className = (this.suspendForm.className || '').trim();
      if (!className) { this.showToast('⚠️ Chọn lớp cần tạm ngưng', 'error'); return; }
      const note = (this.suspendForm.note || '').trim();
      const result = window.Storage.addSuspended({ mshs: student.mshs, studentName: student.fullName || '', className, monthYear: state.monthYear, note });
      if (result && result.error) { this.showToast(result.error, 'error'); return; }
      window.Storage.addHistory && window.Storage.addHistory({ action: 'Tạm ngưng HS', detail: `${student.mshs} (${student.fullName || ''}) - lớp ${className} tháng ${state.monthYear}` });
      this.showSuspendModal = false;
      this.loadSuspendedUI();
      this.runMatching();
      this.showToast(`⏸️ Đã tạm ngưng ${student.mshs} - lớp ${className}`, 'success');
    },

    suspendUnpaidStudents() {
      const state = this.$store.appState;
      const suspended = window.Storage.getSuspendedForMonth ? (window.Storage.getSuspendedForMonth(state.monthYear) || []) : [];
      const susSet = new Set(suspended.map(s => `${s.mshs}_${s.className}`));
      const unpaid = (state.reportRows || []).filter(r => {
        if (r.trangThai !== 'Chưa đóng') return false;
        const classes = (r.className || '').split(',').map(c => c.trim()).filter(Boolean);
        return classes.some(c => !susSet.has(`${r.mshs}_${c}`));
      });
      if (!unpaid.length) { this.showToast('Không có HS "Chưa đóng" nào cần tạm ngưng', 'info'); return; }
      const list = unpaid.map(r => `${r.mshs} (${r.fullName})`).join('\n');
      if (!confirm(`Tạm ngưng ${unpaid.length} HS chưa đóng tháng ${state.monthYear}?\n\n${list.slice(0, 800)}${list.length > 800 ? '\n...' : ''}`)) return;
      let count = 0;
      unpaid.forEach(r => {
        const classes = (r.className || '').split(',').map(c => c.trim()).filter(Boolean);
        classes.forEach(c => {
          if (susSet.has(`${r.mshs}_${c}`)) return;
          const res = window.Storage.addSuspended({ mshs: r.mshs, studentName: r.fullName || '', className: c, monthYear: state.monthYear, note: `Chưa đóng HP — tháng ${state.monthYear}` });
          if (res && !res.error) { count++; susSet.add(`${r.mshs}_${c}`); }
        });
      });
      this.loadSuspendedUI();
      this.runMatching();
      this.showToast(`⏸️ Đã tạm ngưng ${count} lượt lớp`, 'success');
    },

    unsuspendStudent(susId) {
      window.Storage.removeSuspended(susId);
      this.loadSuspendedUI();
      this.runMatching();
      this.showToast('▶️ Đã bỏ tạm ngưng', 'success');
    },

    quickSuspend(mshs, fullName) {
      this.rowMenuOpen = '';
      const state = this.$store.appState;
      const student = (state.students || []).find(s => s.mshs === mshs);
      const classes = ((student && student.className) || '').split(',').map(c => c.trim()).filter(Boolean);
      const suspended = window.Storage.getSuspendedForMonth ? (window.Storage.getSuspendedForMonth(state.monthYear) || []) : [];
      const susSet = new Set(suspended.filter(s => s.mshs === mshs).map(s => s.className));
      const available = classes.filter(c => !susSet.has(c));
      if (!available.length) { this.showToast(`${fullName} đã tạm ngưng tất cả lớp tháng này`, 'warning'); return; }
      const className = available.length > 1 ? (prompt(`Tạm ngưng lớp nào của ${fullName}? (${available.join(' / ')})`, available[0]) || '').trim() : available[0];
      if (!className) return;
      const note = prompt('Lý do (bỏ trống nếu không có):') || '';
      const result = window.Storage.addSuspended({ mshs, studentName: fullName || '', className, monthYear: state.monthYear, note: note.trim() });
      if (result && result.error) { this.showToast(result.error, 'error'); return; }
      this.loadSuspendedUI();
      this.runMatching();
      this.showToast(`⏸️ Đã tạm ngưng ${fullName} - lớp ${className}`, 'success');
    },

    addFamilyGroupForStudent(mshs, fullName) {
      this.rowMenuOpen = '';
      this.familyForm = { groupName: `Nhà ${fullName}`, membersRaw: mshs + ', ', tenPH: '', stk: '' };
      this.familyEditingId = null;
      this.showFamilyModal = true;
    },
    // Accounting Actions
    copyToAccTab7(tabNum) {
      const state = this.$store.appState;
      const sourceData = state.accountingData[`tab${tabNum}`];
      if(!sourceData) return;
      const tagName = ['DS HĐ', 'DS CK VTB', 'Còn học/Quên CK', 'Stop', 'Tăng mới', 'CK sai', 'Tổng hợp'][tabNum - 1];

      // Tổng HP theo MSHS (bạn học 2 lớp → cộng dồn) để copy Tab 6 đúng số
      const currMapTotalHP = new Map();
      (state.students || []).forEach(s => {
        const key = (s.mshs || '').toUpperCase();
        if (!key) return;
        currMapTotalHP.set(key, (currMapTotalHP.get(key) || 0) + (Number(s.hocPhi) || 0));
      });
      const allClassesOf = (key) => [...new Set(
        (state.students || []).filter(x => (x.mshs || '').toUpperCase() === key).map(x => x.className).filter(Boolean)
      )].join(', ');

      let added = 0;
      const pushOne = (baseRow, mshsOne, fullNameOne, classOne, hpOne, noteOne) => {
        if (state.accountingData.tab7.some(existing => existing.mshs === mshsOne)) return;
        const classes = (classOne || '').split(',').map(c => c.trim()).filter(Boolean);
        const selectedClass = classes.length === 1 ? classes[0] : '';
        if (!state.accTab7FilterTags.includes(tagName)) {
          state.accTab7FilterTags.push(tagName);
        }
        const newRow = {
          ...baseRow,
          mshs: mshsOne,
          fullName: fullNameOne,
          className: classOne,
          hocPhi: hpOne,
          sourceTab: tagName,
          classes: classes,
          selectedClass: selectedClass,
          selected: true
        };
        newRow.ghiChu = noteOne || '';
        state.accountingData.tab7.push(newRow);
        added++;
      };
      sourceData.forEach(row => {
        if (!state.accountingData.tab7) state.accountingData.tab7 = [];
        // Tab 6 "Chuyển tiền sai": 1 dòng = cả nhà → tách mỗi bạn 1 dòng ở Tổng hợp
        // Học phí lấy TỔNG 2 lớp (currMap đã cộng dồn) — không lấy số mặc định
        if (tabNum === 6 && row.memberDetails && row.memberDetails.length > 1) {
          row.memberDetails.forEach(m => {
            const key = (m.mshs || '').toUpperCase();
            const s = ((state.students || []).find(x => (x.mshs || '').toUpperCase() === key)) || {};
            const hp = (currMapTotalHP && currMapTotalHP.get(key)) || Number(state.defaultFee) || 0;
            pushOne(row, m.mshs, m.fullName || s.fullName || m.mshs, allClassesOf(key) || s.className || '',
              hp,
              `Nhà ${(row.memberDetails || []).map(x => x.mshs).join(', ')} — được cấp ${Utils.formatCurrency(m.allocated || 0)}`);
          });
          return;
        }
        pushOne(row, row.mshs, row.fullName, row.className, row.hocPhi, row.ghiChu || '');
      });
      // Force Alpine reactivity for arrays
      state.accountingData.tab7 = [...state.accountingData.tab7];
      state.accTab7FilterTags = [...state.accTab7FilterTags];

      if (state.accountingData.tab7) {
        // Sort theo MSHS — 2 lớp cùng MSHS nằm cạnh nhau
        state.accountingData.tab7.sort((a, b) => (a.mshs || '').localeCompare(b.mshs || ''));
      }

      this.saveAccTab7();
      this.activeAccTab = 'acc-tab7';
      this.showToast(`✅ Đã copy ${added} dòng mới sang Tổng hợp`, 'success');
    },

    lookupStudentInfo(mshs) {
      if (!mshs) return { fullName: '', className: '' };
      const s = (this.$store.appState.students || []).find(x => x.mshs === mshs) || (this.$store.appState.prevInvoiceStudents || []).find(x => x.mshs === mshs);
      return s ? { fullName: s.fullName, className: s.className } : { fullName: '', className: '' };
    },
    
    getTab7UniqueTags() {
      const state = this.$store.appState;
      const defaultTags = ['DS HĐ', 'DS CK VTB', 'Còn học/Quên CK', 'Stop', 'Tăng mới', 'CK sai', 'Tổng hợp'];
      const tags = new Set(defaultTags);
      if (state.accountingData.tab7) {
        state.accountingData.tab7.forEach(r => {
          if (r.sourceTab) tags.add(r.sourceTab);
        });
      }
      return Array.from(tags);
    },

    saveAccTab7() {
      const state = this.$store.appState;
      window.Storage._set('joy_acc_tab7_rows', state.accountingData.tab7 || []);
      window.Storage._set('joy_acc_tab7_filter_tags', state.accTab7FilterTags);
    },

    exportAccTab(tabNum) {
      const state = this.$store.appState;
      const data = state.accountingData[`tab${tabNum}`];
      const titles = ['DS HĐ Tháng trước', 'DS CK VTB Tháng này', 'Còn học/Quên CK', 'Stop - nghỉ học', 'Tăng mới', 'Chuyển tiền sai', 'Tổng hợp'];
      window.Exporter.exportAccTabSingle(tabNum, data, titles[tabNum - 1], state.monthYear, tabNum === 7 ? state.accTab7FilterTags : null);
    },

    exportAllAccountingTabs() {
      const state = this.$store.appState;
      window.Exporter.exportAccTabAll(state.accountingData, state.monthYear, state.accTab7FilterTags);
    },

    // P1-3: xóa 1 dòng / xóa hết Tab7 (có lưu ngay)
    removeAccTab7Row(idx) {
      const state = this.$store.appState;
      state.accountingData.tab7.splice(idx, 1);
      window.Storage._set('joy_acc_tab7_rows', state.accountingData.tab7);
      this.showToast('✅ Đã xóa dòng', 'success');
    },
    clearAccTab7() {
      if (!confirm('Xóa hết Tab Tổng hợp?')) return;
      this.$store.appState.accountingData.tab7 = [];
      window.Storage._set('joy_acc_tab7_rows', []);
      this.showToast('✅ Đã xóa hết Tab Tổng hợp', 'success');
    },

    // P1-2: xuất DS nhắc PH + DS STK phụ
    exportNhacPH() {
      const state = this.$store.appState;
      const list = window.Accounting.generateNhacPH(state.reportRows || []);
      if (!list.length) { this.showToast('Không có ai cần nhắc', 'info'); return; }
      window.Exporter.exportNhacPH(list, state.monthYear);
      this.showToast(`✅ Đã xuất ${list.length} PH cần nhắc`, 'success');
    },
    exportSTKPhu() {
      window.Exporter.exportSTKPhu(window.Storage.loadSTKPhu(), this.$store.appState.students);
      this.showToast('✅ Đã xuất DS STK phụ', 'success');
    },
    
    // Tab 4 (Stop) specific
    get canConfirmStop() {
      const data = this.$store.appState.accountingData.tab4 || [];
      if(data.length === 0) return false;
      return Object.keys(this.tab4Choice).length === data.length;
    },
    setAllTab4(val) {
      const state = this.$store.appState;
      (state.accountingData.tab4 || []).forEach(r => {
        this.tab4Choice[r.mshs] = val;
      });
    },

    confirmTab4Split() {
      const state = this.$store.appState;
      const nghiRows = (state.accountingData.tab4 || []).filter(r => this.tab4Choice[r.mshs] === 'stop' || this.tab4Choice[r.mshs] === 'nghi');
      const vanhocRows = (state.accountingData.tab4 || []).filter(r => this.tab4Choice[r.mshs] === 'continue' || this.tab4Choice[r.mshs] === 'vanhoc');
      // HS chọn "Vẫn học" → chuyển sang Tab 3 Giảm bớt để nhắc nợ
      if (vanhocRows.length) {
        const existing = new Set((state.accountingData.tab3 || []).map(r => r.mshs));
        vanhocRows.forEach(r => { if (!existing.has(r.mshs)) { state.accountingData.tab3.push({ ...r }); existing.add(r.mshs); } });
        state.accountingData.tab3.sort((a, b) => String(a.mshs).localeCompare(String(b.mshs)));
      }
      // Tab 4 chỉ giữ HS "Nghỉ"
      const moved = new Set(vanhocRows.map(r => r.mshs));
      state.accountingData.tab4 = (state.accountingData.tab4 || []).filter(r => !moved.has(r.mshs));
      vanhocRows.forEach(r => { delete this.tab4Choice[r.mshs]; });
      this.showToast(`✅ Đã phân loại: ${nghiRows.length} nghỉ, ${vanhocRows.length} chuyển sang Giảm bớt`, 'success');
    },

    // Settings
    exportMapping() {
      const mapping = {
        joy_stk_phu: window.Storage.loadSTKPhu(),
        joy_keywords: window.Storage.loadKeywords(),
        joy_family_groups: window.Storage.loadFamilyGroups(),
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(mapping, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `joy_mappings_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      this.showToast('✅ Đã xuất mapping', 'success');
    },

    exportBackup() {
      // Backup TẤT CẢ dữ liệu quan trọng — quét sạch mọi key joy_* trong localStorage
      // → sau này thêm key mới cũng tự vào backup, không bao giờ sót
      const backup = {
        version: 2,
        exportDate: new Date().toISOString(),
        keys: {}
      };
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('joy_')) {
            try { backup.keys[k] = JSON.parse(localStorage.getItem(k)); }
            catch (e) { backup.keys[k] = localStorage.getItem(k); }
          }
        }
      } catch (e) { console.error('Backup scan error:', e); }
      // Giữ field phẳng cho file backup cũ vẫn đọc được
      const K = backup.keys;
      backup.joy_stk_phu = K.joy_stk_phu || [];
      backup.joy_keywords = K.joy_keywords || [];
      backup.joy_family_groups = K.joy_family_groups || [];
      backup.joy_ignored_tx = K.joy_ignored_tx || [];
      backup.joy_packages = K.joy_packages || [];
      backup.joy_suspended = K.joy_suspended || [];
      backup.joy_fee_adjustments = K.joy_fee_adjustments || [];
      backup.joy_referrals = K.joy_referrals || [];
      backup.joy_manual_notes = K.joy_manual_notes || [];
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `joy_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      const nKeys = Object.keys(backup.keys).length;
      this.showToast(`✅ Đã tải backup (${nKeys} nhóm dữ liệu: mapping + Bỏ qua + gia đình + gói...)`, 'success');
    },

    exportBackupExcel() {
      // Backup đọc được bằng Excel: 1 file nhiều sheet (STK Phụ / Từ khóa / Gia đình / Bỏ qua / Gói...)
      // → để mở coi, in, lưu Drive. Không khôi phục ngược (muốn khôi phục dùng file JSON).
      try {
        const wb = XLSX.utils.book_new();
        const fdate = (v) => { try { return window.Utils ? window.Utils.formatDate(v) : v; } catch (e) { return v; } };
        // Sheet 1: STK Phụ
        const stk = window.Storage.loadSTKPhu() || [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stk.map(s => ({
          'MSHS': s.mshs || '', 'STK': s.stk || '', 'Tên TK': s.tenTK || '', 'Ngày gán': fdate(s.addedDate)
        }))), 'STK Phu');
        // Sheet 2: Từ khóa TPBank
        const kw = window.Storage.loadKeywords() || [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kw.map(s => ({
          'Từ khóa': s.keyword || '', 'MSHS': s.mshs || '', 'Tên HS': s.tenHS || s.studentName || '', 'Ngày gán': fdate(s.addedDate)
        }))), 'Tu khoa TPB');
        // Sheet 3: Nhóm gia đình
        const fam = window.Storage.loadFamilyGroups() || [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fam.map(g => ({
          'Tên nhóm': g.name || g.groupName || '', 'MSHS thành viên': (g.members || []).join(', '),
          'STK đại diện': g.stk || g.stkDaiDien || '', 'PH đại diện': g.parentName || g.tenPH || '', 'Ngày tạo': fdate(g.addedDate)
        }))), 'Nhom Gia dinh');
        // Sheet 4: Bỏ qua (ngoại lệ đã xử lý: lãi, trùng, sai...)
        const ig = window.Storage._get('joy_ignored_tx', []) || [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ig.length ? ig.map(k => ({ 'Mã GD đã bỏ qua': k })) : [{ 'Mã GD đã bỏ qua': '(trống)' }]), 'Bo qua');
        // Sheet 5: Gói (đóng trước nhiều tháng) — cột gọn dễ đọc
        const pkg = window.Storage.loadPackages ? (window.Storage.loadPackages() || []) : (window.Storage._get('joy_packages', []) || []);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((pkg.length ? pkg : []).map(p => ({
          'Tên gói': p.packageName || p.groupName || '', 'MSHS thành viên': (p.members || []).join(', '),
          'Số tháng': p.months || '', 'Giảm %': p.discountPercent ?? '', 'Từ tháng': p.startMonth || '', 'Đến tháng': p.endMonth || '', 'Ngày tạo': fdate(p.addedDate)
        }))), 'Dong goi');
        // Sheet 6: Tạm ngưng (MSHS, tên, lớp, lý do, tháng)
        const sus = window.Storage.loadSuspended ? (window.Storage.loadSuspended() || []) : (window.Storage._get('joy_suspended', []) || []);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((sus.length ? sus : []).map(s => ({
          'MSHS': s.mshs || '', 'Tên HS': s.studentName || s.tenHS || '', 'Lớp tạm ngưng': s.className || '',
          'Tháng': s.monthYear || '', 'Lý do': s.note || s.reason || '', 'Ngày tạo': fdate(s.createdDate || s.addedDate)
        }))), 'Tam ngung');
        // Sheet 7: Điều chỉnh HP (ưu đãi / giảm giá / tạm ngưng...)
        const adj = window.Storage.loadFeeAdjustments ? (window.Storage.loadFeeAdjustments() || []) : [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((adj.length ? adj : []).map(a => ({
          'MSHS': a.mshs || '', 'Tên HS': a.studentName || '', 'Loại': a.type || '',
          'Số tiền': a.amount ?? '', 'Tháng áp dụng': a.monthYear || '', 'Ghi chú': a.note || ''
        }))), 'Dieu chinh HP');
        // Sheet 8: Giới thiệu bạn mới
        const ref = window.Storage.loadReferrals ? (window.Storage.loadReferrals() || []) : [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((ref.length ? ref : []).map(r => ({
          'PH được giảm': r.mshs || '', 'HS mới': r.referredMSHS || '', 'Bắt đầu': r.startMonth || '',
          'Giảm từ': r.applyMonth || '', 'Số tiền': r.amount ?? '', 'Trạng thái': r.confirmed ? 'Đã xác nhận' : 'Chờ đủ 3 tháng'
        }))), 'Gioi thieu');
        // Các sheet còn lại: vét sạch mọi key joy_* khác chưa lên sheet
        try {
          const done = new Set(['joy_stk_phu', 'joy_keywords', 'joy_family_groups', 'joy_ignored_tx', 'joy_packages', 'joy_suspended', 'joy_fee_adjustments', 'joy_referrals', 'joy_manual_notes']);
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('joy_') && !done.has(k)) {
              let v = null;
              try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { v = localStorage.getItem(k); }
              const rows = Array.isArray(v) ? v : [{ 'Giá trị': typeof v === 'object' ? JSON.stringify(v) : String(v ?? '') }];
              if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), k.replace('joy_', '').slice(0, 28) || 'Khac');
            }
          }
        } catch (e) { console.error('Excel backup extra keys:', e); }
        XLSX.writeFile(wb, `joy_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.showToast('✅ Đã tải backup Excel (để coi/in/lưu trữ)', 'success');
      } catch (err) { this.showToast('❌ Lỗi xuất Excel: ' + err.message, 'error'); }
    },

    // Nạp mapping thống nhất (STK + từ khóa + gia đình + gói + nợ) — mất local thả 1 file là sống lại
    importUnifiedMapping(event) {
      const file = event.target ? event.target.files[0] : null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          let c1 = 0, c2 = 0, c3 = 0;
          if (data.joy_stk_phu && data.joy_stk_phu.length) c1 = window.Storage.mergeSTKPhu(data.joy_stk_phu);
          if (data.joy_keywords && data.joy_keywords.length) c2 = window.Storage.mergeKeywords(data.joy_keywords);
          if (data.joy_family_groups && data.joy_family_groups.length) c3 = window.Storage.mergeFamilyGroups(data.joy_family_groups);
          if (data.joy_packages && data.joy_packages.length) {
            const cur = window.Storage.loadPackages();
            const ids = new Set(cur.map(x => x && x.packageId));
            let added = 0;
            data.joy_packages.forEach(x => { if (x && !ids.has(x.packageId)) { cur.push(x); added++; } });
            if (added) window.Storage.savePackages(cur);
          }
          if (data.joy_prior_debt && data.joy_prior_debt.rows) {
            window.Storage.savePriorDebt(data.joy_prior_debt.forMonth || data.joy_prior_debt.monthYear || '', data.joy_prior_debt.rows);
          }
          if (data.joy_closing_debt && typeof data.joy_closing_debt === 'object') {
            Object.keys(data.joy_closing_debt).forEach(m => window.Storage.saveClosingDebt(m, data.joy_closing_debt[m].rows || []));
          }
          this.loadSettingsUI();
          this.runMatching();
          this.showToast(`✅ Đã nạp mapping: +${c1} STK, +${c2} từ khóa, +${c3} gia đình (+ gói, nợ)`, 'success');
        } catch (err) { this.showToast('❌ File lỗi: ' + err.message, 'error'); }
      };
      reader.readAsText(file);
      event.target.value = null;
    },

    importBackup(event) {
      const file = event.target ? event.target.files[0] : null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // File mới (v2): khôi phục TẤT CẢ key joy_* đã quét lúc backup → không sót loại nào
          if (data.keys && typeof data.keys === 'object') {
            Object.keys(data.keys).forEach(k => {
              if (k === 'joy_stk_phu') window.Storage.mergeSTKPhu(data.keys[k]);
              else if (k === 'joy_keywords') window.Storage.mergeKeywords(data.keys[k]);
              else if (k === 'joy_family_groups') window.Storage.mergeFamilyGroups(data.keys[k]);
              else if (k.startsWith('joy_')) window.Storage._set(k, data.keys[k]);
            });
            this.ignoredKeys = window.Storage._get('joy_ignored_tx', []);
            this.loadSettingsUI();
            this.runMatching();
            const nKeys = Object.keys(data.keys).length;
            this.showToast(`✅ Đã khôi phục backup (${nKeys} nhóm dữ liệu, giữ nguyên dữ liệu tháng này nếu trùng)`, 'success');
            return;
          }
          // File cũ (v1): GỘP (merge) thay vì ghi đè → không mất dữ liệu mới nhập tháng này
          let c1 = 0, c2 = 0, c3 = 0;
          const flat = data.joy_mappings || data.mappings || null;
          const stkList = data.joy_stk_phu || (flat && flat.joy_stk_phu) || [];
          const kwList = data.joy_keywords || (flat && flat.joy_keywords) || [];
          const famList = data.joy_family_groups || (flat && flat.joy_family_groups) || [];
          if (stkList.length) c1 = window.Storage.mergeSTKPhu(stkList);
          if (kwList.length) c2 = window.Storage.mergeKeywords(kwList);
          if (famList.length) c3 = window.Storage.mergeFamilyGroups(famList);
          // Bỏ qua: gộp 2 danh sách, loại trùng
          const oldIgnored = window.Storage._get('joy_ignored_tx', []);
          const fileIgnored = data.joy_ignored_tx || [];
          const mergedIgnored = [...new Set([...oldIgnored, ...fileIgnored])];
          window.Storage._set('joy_ignored_tx', mergedIgnored);
          this.ignoredKeys = mergedIgnored;
          // Các loại khác: gộp theo id, giữ cả cũ + mới
          const mergeById = (key, arr, idField) => {
            if (!Array.isArray(arr) || !arr.length) return 0;
            const cur = window.Storage._get(key, []);
            const ids = new Set(cur.map(x => x && x[idField]));
            let added = 0;
            arr.forEach(x => { if (x && !ids.has(x[idField])) { cur.push(x); added++; } });
            if (added) window.Storage._set(key, cur);
            return added;
          };
          mergeById('joy_packages', data.joy_packages, 'packageId');
          mergeById('joy_suspended', data.joy_suspended, 'id');
          mergeById('joy_fee_adjustments', data.joy_fee_adjustments, 'id');
          mergeById('joy_referrals', data.joy_referrals, 'id');
          mergeById('joy_manual_notes', data.joy_manual_notes, 'id');
          const addedIgnored = mergedIgnored.length - oldIgnored.length;
          this.loadSettingsUI();
          this.runMatching();
          this.showToast(`✅ Đã gộp backup: +${c1} STK, +${c2} từ khóa, +${c3} gia đình, +${addedIgnored} bỏ qua (giữ nguyên dữ liệu tháng này)`, 'success');
        } catch (err) {
          this.showToast('❌ File backup lỗi: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = null;
    }
  };
}




















