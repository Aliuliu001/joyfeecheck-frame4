/**
 * Storage - Quản lý lưu trữ local storage
 */

window.Storage = {
  // Lấy dữ liệu từ localStorage
  _get: function(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  // Lưu dữ liệu vào localStorage
  _set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
      if (window.Utils) window.Utils.showToast('Lỗi khi lưu dữ liệu. Có thể do bộ nhớ đầy.', 'error');
      return false;
    }
  },

  // STK PHỤ
  saveSTKPhu: function(data) {
    return this._set(APP_CONFIG.STORAGE_KEYS.STK_PHU, data);
  },
  loadSTKPhu: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.STK_PHU, []);
  },
  addSTKPhu: function(mapping) {
    const list = this.loadSTKPhu();
    // Xóa cái cũ nếu có cùng STK
    const filtered = list.filter(item => item.stk !== mapping.stk);
    filtered.push({
      ...mapping,
      addedDate: new Date().toISOString()
    });
    this.saveSTKPhu(filtered);
  },
  removeSTKPhu: function(stk) {
    const list = this.loadSTKPhu();
    this.saveSTKPhu(list.filter(item => item.stk !== stk));
  },
  mergeSTKPhu: function(newList) {
    if (!Array.isArray(newList)) return 0;
    const currentList = this.loadSTKPhu();
    const currentMap = new Map(currentList.map(item => [item.stk, item]));
    let count = 0;
    
    newList.forEach(newItem => {
      if (newItem.stk && !currentMap.has(newItem.stk)) {
        const entry = {
          ...newItem,
          addedDate: newItem.addedDate || new Date().toISOString()
        };
        currentList.push(entry);
        currentMap.set(newItem.stk, entry);
        count++;
      }
    });
    
    if (count > 0) {
      this.saveSTKPhu(currentList);
    }
    return count;
  },

  // TỪ KHÓA
  saveKeywords: function(data) {
    return this._set(APP_CONFIG.STORAGE_KEYS.KEYWORDS, data);
  },
    vtbTransactionId: function(tx) {
    return tx.transactionId || `vtb|${tx.maGD || tx.reference || tx.bankReference || ''}|${tx.date || ''}|${tx.debitAccount || tx.stkDoiUng || tx.account || ''}|${tx.credit || tx.amount || 0}|${tx.description || tx.explanation || ''}`;
  },
  loadManualMatches: function() {
    return this._get('joy_manual_matches') || {};
  },
  saveManualMatches: function(matches) {
    this._set('joy_manual_matches', matches);
  },
  addManualAllocation: function(tx, mshs, monthYear) {
    const matches = this.loadManualMatches();
    matches[this.vtbTransactionId(tx)] = { mshs: String(mshs || '').toUpperCase(), monthYear };
    this.saveManualMatches(matches);
  },
  getManualAllocation: function(tx, monthYear) {
    const allocation = this.loadManualMatches()[this.vtbTransactionId(tx)];
    return allocation && allocation.monthYear === monthYear ? allocation : null;
  },
  addManualMatch: function(txId, mshs) {
      const matches = this.loadManualMatches();
      matches[txId] = mshs;
      this.saveManualMatches(matches);
    },
    removeManualMatch: function(txId) {
      const matches = this.loadManualMatches();
      delete matches[txId];
      this.saveManualMatches(matches);
    },

    loadKeywords: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.KEYWORDS, []);
  },
  addKeyword: function(mapping) {
    const list = this.loadKeywords();
    const filtered = list.filter(item => item.keyword !== mapping.keyword);
    filtered.push({
      ...mapping,
      addedDate: new Date().toISOString()
    });
    this.saveKeywords(filtered);
  },
  removeKeyword: function(keyword) {
    const list = this.loadKeywords();
    this.saveKeywords(list.filter(item => item.keyword !== keyword));
  },
  mergeKeywords: function(newList) {
    if (!Array.isArray(newList)) return 0;
    const currentList = this.loadKeywords();
    const currentMap = new Map(currentList.map(item => [item.keyword, item]));
    let count = 0;
    
    newList.forEach(newItem => {
      if (newItem.keyword && !currentMap.has(newItem.keyword)) {
        const entry = {
          ...newItem,
          addedDate: newItem.addedDate || new Date().toISOString()
        };
        currentList.push(entry);
        currentMap.set(newItem.keyword, entry);
        count++;
      }
    });
    
    if (count > 0) {
      this.saveKeywords(currentList);
    }
    return count;
  },

  // NHÓM GIA ĐÌNH
  loadFamilyGroups: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.FAMILY_GROUPS, []);
  },
  saveFamilyGroups: function(data) {
    return this._set(APP_CONFIG.STORAGE_KEYS.FAMILY_GROUPS, data);
  },
  addFamilyGroup: function(group) {
    const list = this.loadFamilyGroups();
    const newGroup = {
      ...group,
      groupId: 'GD' + Date.now(),
      addedDate: new Date().toISOString()
    };
    list.push(newGroup);
    this.saveFamilyGroups(list);
    return newGroup.groupId;
  },
  removeFamilyGroup: function(groupId) {
    let list = this.loadFamilyGroups();
    list = list.filter(g => g.groupId !== groupId);
    this.saveFamilyGroups(list);
  },
  mergeFamilyGroups: function(newList) {
    if (!Array.isArray(newList)) return 0;
    const currentList = this.loadFamilyGroups();
    const currentMap = new Map(currentList.map(item => [item.groupId, item]));
    let count = 0;
    
    newList.forEach(newItem => {
      if (newItem.groupId && !currentMap.has(newItem.groupId)) {
        currentList.push(newItem);
        currentMap.set(newItem.groupId, newItem);
        count++;
      }
    });
    
    if (count > 0) {
      this.saveFamilyGroups(currentList);
    }
    return count;
  },

  // THANH TOÁN THÁNG TRƯỚC
  addPreviousMonthPayment: function(payment) {
    const list = this._get(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_PAYMENTS, []);
    list.push({
      ...payment,
      id: 'PMP' + Date.now(),
      date: new Date().toISOString()
    });
    this._set(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_PAYMENTS, list);
  },
  loadPreviousMonthPayments: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_PAYMENTS, []);
  },
  clearPreviousMonthPayments: function() {
    this._set(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_PAYMENTS, []);
  },

  // HỌC PHÍ ĐÓNG GÓI (nhiều tháng)
  savePackages: function(data) {
    return this._set(APP_CONFIG.STORAGE_KEYS.PACKAGES, data);
  },
  loadPackages: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.PACKAGES, []);
  },
  _packageMonthIndex: function(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]);
    return month >= 1 && month <= 12 ? year * 12 + month : null;
  },
  _packageMonthString: function(index) {
    const year = Math.floor((index - 1) / 12), month = ((index - 1) % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  },
  _packagePeriod: function(pkg) {
    const start = this._packageMonthIndex(pkg && pkg.startMonth);
    const months = Number(pkg && pkg.months);
    if (!start || !Number.isInteger(months) || months <= 0) return null;
    return { start, end: start + months - 1, months };
  },
  addPackage: function(pkg) {
    const period = this._packagePeriod(pkg);
    if (!period) return null;
    const list = this.loadPackages();
    const newPkg = { ...pkg, months: period.months, endMonth: this._packageMonthString(period.end), packageId: 'PKG' + Date.now(), addedDate: new Date().toISOString() };
    list.push(newPkg);
    this.savePackages(list);
    return newPkg.packageId;
  },
  removePackage: function(packageId) {
    this.savePackages(this.loadPackages().filter(p => p.packageId !== packageId));
  },
  archivePackages: function(packageIds) {
    const ids = new Set((packageIds || []).map(String));
    let count = 0;
    const list = this.loadPackages().map(pkg => {
      if (!ids.has(String(pkg.packageId)) || pkg.archived) return pkg;
      count++;
      return { ...pkg, archived: true, archivedDate: new Date().toISOString() };
    });
    if (count) this.savePackages(list);
    return count;
  },
  isPackageActive: function(mshs, monthYear) {
    const info = this.getPackageStatus(mshs, monthYear);
    return info.active ? { active: true, expiring: !!info.expiring, overlap: !!info.overlap, packageName: info.pkg.packageName || info.pkg.groupName, startMonth: info.pkg.startMonth, endMonth: info.endMonth, discountPercent: info.pkg.discountPercent || 0 } : { active: false };
  },
  getPackageStatus: function(mshs, monthYear) {
    const cur = this._packageMonthIndex(monthYear);
    if (!mshs || !cur) return { status: 'none' };
    const ms = String(mshs).toUpperCase();
    const matching = this.loadPackages().map(pkg => ({ pkg, period: this._packagePeriod(pkg) })).filter(x => x.period && (x.pkg.members || []).some(m => String(m).toUpperCase() === ms));
    const active = matching.filter(x => cur >= x.period.start && cur <= x.period.end);
    if (active.length) {
      active.sort((a, b) => b.period.start - a.period.start || b.period.end - a.period.end);
      const chosen = active[0], expiring = chosen.period.end === cur;
      return { status: active.length > 1 ? 'conflict' : (expiring ? 'expiring' : 'active'), active: true, expiring, overlap: active.length > 1, pkg: chosen.pkg, packages: active.map(x => x.pkg), endMonthIdx: chosen.period.end, endMonth: this._packageMonthString(chosen.period.end) };
    }
    const expired = matching.filter(x => x.period.end < cur).sort((a, b) => b.period.end - a.period.end)[0];
    if (expired) return { status: 'expired', active: false, justExpired: expired.period.end === cur - 1, pkg: expired.pkg, endMonthIdx: expired.period.end, endMonth: this._packageMonthString(expired.period.end) };
    const upcoming = matching.filter(x => x.period.start > cur).sort((a, b) => a.period.start - b.period.start)[0];
    if (upcoming) return { status: 'upcoming', active: false, pkg: upcoming.pkg, endMonthIdx: upcoming.period.end, endMonth: this._packageMonthString(upcoming.period.end) };
    return { status: 'none' };
  },
  getExpiredPackages: function(monthYear, students, options = {}) {
    const cur = this._packageMonthIndex(monthYear);
    if (!cur) return [];
    const studentMap = new Map((students || []).filter(s => s.mshs).map(s => [String(s.mshs).toUpperCase(), s]));
    const periods = this.loadPackages().map(pkg => ({ pkg, period: this._packagePeriod(pkg) })).filter(x => x.period);
    return periods.filter(x => x.period.end < cur && (options.includeArchived !== false || !x.pkg.archived)).map(x => {
      const members = (x.pkg.members || []).map(mshs => { const student = studentMap.get(String(mshs).toUpperCase()) || {}; return { mshs: String(mshs), fullName: student.fullName || '', className: student.className || '' }; });
      const renewed = members.some(member => periods.some(other => other.pkg.packageId !== x.pkg.packageId && (other.pkg.members || []).some(m => String(m).toUpperCase() === member.mshs.toUpperCase()) && other.period.start > x.period.end));
      return { pkg: x.pkg, startMonth: this._packageMonthString(x.period.start), endMonth: this._packageMonthString(x.period.end), members, renewed };
    }).sort((a, b) => a.endMonth.localeCompare(b.endMonth) || String(a.pkg.packageId).localeCompare(String(b.pkg.packageId)));
  },
  getExpiringPackages: function(monthYear, students) {
    const cur = this._packageMonthIndex(monthYear);
    if (!cur) return [];
    const nameMap = new Map((students || []).filter(s => s.mshs).map(s => [String(s.mshs).toUpperCase(), s.fullName || '']));
    return this.loadPackages().map(pkg => ({ pkg, period: this._packagePeriod(pkg) })).filter(x => x.period && x.period.end === cur && !x.pkg.archived).map(x => {
      const endStr = this._packageMonthString(x.period.end), nextStr = this._packageMonthString(x.period.end + 1);
      const members = (x.pkg.members || []).map(m => `${m}${nameMap.get(String(m).toUpperCase()) ? ' (' + nameMap.get(String(m).toUpperCase()) + ')' : ''}`);
      return { pkg: x.pkg, kind: 'expiring', msg: `Hết sau tháng này (${endStr}) — tháng ${nextStr} thu HP bình thường`, members };
    });
  },

  // DỮ LIỆU THÁNG TRƯỚC
  savePrevMonthDS: function(data, monthInfo) {
    this._set(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_DS, data);
    if (monthInfo) {
      this._set(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_INFO, {
        ...monthInfo,
        savedDate: new Date().toISOString()
      });
    }
  },
  loadPrevMonthDS: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_DS, []);
  },
  savePrevMonthHD: function(data) {
    this._set(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_HD, data);
  },
  loadPrevMonthHD: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_HD, []);
  },

  // THAY ĐỔI ĐỒNG BỘ
  saveSyncChanges: function(changes) {
    return this._set(APP_CONFIG.STORAGE_KEYS.SYNC_CHANGES, changes);
  },
  loadSyncChanges: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.SYNC_CHANGES, []);
  },
  addSyncChange: function(change) {
    const list = this.loadSyncChanges();
    list.push({
      ...change,
      date: new Date().toISOString(),
      synced: false
    });
    this.saveSyncChanges(list);
  },

  // LỊCH SỬ
  addHistory: function(entry) {
    const list = this.loadHistory();
    list.unshift({
      ...entry,
      date: new Date().toISOString()
    });
    // Giữ lại 100 bản ghi gần nhất
    if (list.length > 100) list.length = 100;
    this._set(APP_CONFIG.STORAGE_KEYS.HISTORY, list);
  },
  loadHistory: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.HISTORY, []);
  },

  // ========================
  // ĐIỀU CHỈNH HỌC PHÍ
  // ========================
  addFeeAdjustment: function(adj) {
    const list = this.loadFeeAdjustments();
    list.push({
      id: 'adj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      ...adj,
      createdDate: new Date().toISOString()
    });
    this._set('joy_fee_adjustments', list);
    return list;
  },
  loadFeeAdjustments: function() {
    return this._get('joy_fee_adjustments', []);
  },
  removeFeeAdjustment: function(id) {
    const list = this.loadFeeAdjustments().filter(a => a.id !== id);
    this._set('joy_fee_adjustments', list);
    return list;
  },
  // Lấy tổng số tiền điều chỉnh cho 1 MSHS trong 1 tháng
  getAdjustmentForStudent: function(mshs, monthYear) {
    const list = this.loadFeeAdjustments();
    return list.filter(a => a.mshs === mshs && a.monthYear === monthYear);
  },

  // ========================
  // GHI CHÚ TAY (chỉ chữ, không đổi tiền — import lại không mất)
  // ========================
  loadManualNotes: function() {
    return this._get('joy_manual_notes', []);
  },
  saveManualNote: function(mshs, monthYear, note) {
    const list = this.loadManualNotes();
    const key = (mshs || '').toUpperCase() + '|' + (monthYear || '');
    const idx = list.findIndex(n => ((n.mshs || '').toUpperCase() + '|' + (n.monthYear || '')) === key);
    const entry = { id: idx >= 0 ? list[idx].id : ('mn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)), mshs: (mshs || '').toUpperCase(), monthYear: monthYear || '', note: note || '', updatedDate: new Date().toISOString() };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    this._set('joy_manual_notes', list);
    return entry;
  },
  removeManualNote: function(mshs, monthYear) {
    const key = (mshs || '').toUpperCase() + '|' + (monthYear || '');
    const list = this.loadManualNotes().filter(n => ((n.mshs || '').toUpperCase() + '|' + (n.monthYear || '')) !== key);
    this._set('joy_manual_notes', list);
    return list;
  },

  // ========================
  // GIỚI THIỆU BẠN MỚI
  // ========================
  addReferral: function(ref) {
    const list = this.loadReferrals();
    // Chống trùng: HS mới đã được ai giới thiệu chưa?
    const exists = list.find(r => r.referredMSHS === ref.referredMSHS);
    if (exists) return { error: `HS ${ref.referredMSHS} đã được ${exists.mshs} giới thiệu trước đó` };
    list.push({
      id: 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      ...ref,
      confirmed: false,
      createdDate: new Date().toISOString()
    });
    this._set('joy_referrals', list);
    return { success: true };
  },
  loadReferrals: function() {
    return this._get('joy_referrals', []);
  },
  confirmReferral: function(refId) {
    const list = this.loadReferrals();
    const ref = list.find(r => r.id === refId);
    if (ref) {
      ref.confirmed = true;
      ref.confirmedDate = new Date().toISOString();
      this._set('joy_referrals', list);
    }
    return list;
  },
  removeReferral: function(refId) {
    const list = this.loadReferrals().filter(r => r.id !== refId);
    this._set('joy_referrals', list);
    return list;
  },
  // Kiểm tra referral nào đã đủ 3 tháng và chưa xác nhận
  getPendingReferrals: function(monthYear) {
    const list = this.loadReferrals();
    return list.filter(r => !r.confirmed && r.applyMonth && r.applyMonth <= monthYear);
  },

  // ========================
  // TẠM NGƯNG LỚP
  // ========================
  addSuspended: function(sus) {
    const list = this.loadSuspended();
    // Chống trùng: HS + lớp + tháng đã tạm ngưng chưa?
    const exists = list.find(s => s.mshs === sus.mshs && s.className === sus.className && s.monthYear === sus.monthYear);
    if (exists) return { error: `${sus.mshs} lớp ${sus.className} đã tạm ngưng tháng ${sus.monthYear}` };
    list.push({
      id: 'sus_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      ...sus,
      createdDate: new Date().toISOString()
    });
    this._set('joy_suspended', list);
    return { success: true };
  },
  loadSuspended: function() {
    return this._get('joy_suspended', []);
  },
  loadAccOverrides: function() {
    return this._get('joy_acc_overrides', {});
  },
  saveAccOverrides: function(data) {
    return this._set('joy_acc_overrides', data);
  },
  removeSuspended: function(susId) {
    const list = this.loadSuspended().filter(s => s.id !== susId);
    this._set('joy_suspended', list);
    return list;
  },
  getSuspendedForMonth: function(monthYear) {
    const list = this.loadSuspended();
    return list.filter(s => s.monthYear === monthYear);
  },

  // ========================
  // NỢ CŨ THÁNG TRƯỚC (Bước 1: dán 4 cột MSHS|Họ tên|Lớp|Số thiếu)
  // ========================
  // rows: [{mshs, fullName, className, amount}] — chỉ MSHS + amount bắt buộc
  // monthYear = tháng đối soát HIỆN TẠI đang dán nợ cho (VD đang làm T10 thì dán nợ T9)
  // Gộp trùng MSHS (bạn học 2 lớp → 2 dòng cùng MSHS): cộng dồn số nợ, gộp tên lớp, sort theo MSHS
  normalizeDebtRows: function(rows) {
    const map = new Map();
    for (const r of (rows || [])) {
      const mshs = (r.mshs || '').toString().trim().toUpperCase();
      const amt = Number(r.amount) || 0;
      if (!mshs || amt <= 0) continue;
      if (!map.has(mshs)) {
        map.set(mshs, { mshs, fullName: r.fullName || '', className: r.className || '', amount: amt });
      } else {
        const cur = map.get(mshs);
        cur.amount += amt;
        if (!cur.fullName && r.fullName) cur.fullName = r.fullName;
        // Gộp tên lớp (có thể 2 lớp cách nhau dấu phẩy), loại trùng
        const clsSet = new Set(
          String(cur.className || '').split(',').map(s => s.trim()).filter(Boolean)
            .concat(String(r.className || '').split(',').map(s => s.trim()).filter(Boolean))
        );
        cur.className = [...clsSet].join(', ');
      }
    }
    return [...map.values()].sort((a, b) => a.mshs.localeCompare(b.mshs));
  },
  savePriorDebt: function(monthYear, rows) {
    return this._set(APP_CONFIG.STORAGE_KEYS.PRIOR_DEBT, {
      forMonth: monthYear || '',
      rows: this.normalizeDebtRows(rows),
      savedDate: new Date().toISOString()
    });
  },
  loadPriorDebt: function() {
    const d = this._get(APP_CONFIG.STORAGE_KEYS.PRIOR_DEBT, null);
    // Tương thích bản lưu cũ dùng key monthYear
    if (d && !d.forMonth && d.monthYear) d.forMonth = d.monthYear;
    return d;
  },
  // Map MSHS -> số nợ (uppercase key)
  getPriorDebtMap: function() {
    const saved = this.loadPriorDebt();
    const map = new Map();
    for (const r of ((saved && saved.rows) || [])) {
      const mshs = (r.mshs || '').toString().trim().toUpperCase();
      const amt = Number(r.amount) || 0;
      if (mshs && amt > 0) map.set(mshs, amt);
    }
    return map;
  },
  clearPriorDebt: function() {
    return this._set(APP_CONFIG.STORAGE_KEYS.PRIOR_DEBT, null);
  },
  // Chốt nợ cuối tháng: lưu conThieu từng bạn còn trong DS tổng → làm nợ đầu kỳ tháng sau
  // closingMonth 'YYYY-MM' = tháng vừa đối soát xong (VD '2026-10')
  saveClosingDebt: function(closingMonth, rows) {
    const all = this._get(APP_CONFIG.STORAGE_KEYS.CLOSING_DEBT, {});
    all[closingMonth] = { rows: this.normalizeDebtRows(rows), closedDate: new Date().toISOString() };
    return this._set(APP_CONFIG.STORAGE_KEYS.CLOSING_DEBT, all);
  },
  loadClosingDebt: function(closingMonth) {
    const all = this._get(APP_CONFIG.STORAGE_KEYS.CLOSING_DEBT, {});
    return all ? all[closingMonth] : null;
  },
  // Tháng kế tiếp dạng YYYY-MM (VD 2026-10 → 2026-11)
  nextMonth: function(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return '';
    let y = Number(m[1]), mo = Number(m[2]) + 1;
    if (mo > 12) { mo = 1; y++; }
    return `${y}-${String(mo).padStart(2, '0')}`;
  },
  // Tháng trước đó dạng YYYY-MM (VD 2026-11 → 2026-10)
  prevMonth: function(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return '';
    let y = Number(m[1]), mo = Number(m[2]) - 1;
    if (mo < 1) { mo = 12; y--; }
    return `${y}-${String(mo).padStart(2, '0')}`;
  },

  // DANH BẠ HỌC SINH — chỉ phục vụ hiển thị tên/lớp, không dùng thay DS đang học để tính tiền
  normalizeMSHS: function(mshs) {
    return String(mshs || '').trim().toUpperCase();
  },
  saveStudentDirectory: function(students, sourceMonth) {
    const old = this._get(APP_CONFIG.STORAGE_KEYS.STUDENT_DIRECTORY, {});
    const next = { ...old };
    (students || []).forEach(student => {
      const mshs = this.normalizeMSHS(student && student.mshs);
      if (!mshs) return;
      const existing = next[mshs] || { mshs, classes: [] };
      const classes = new Set([...(existing.classes || []), ...(String(student.className || '').split(',').map(v => v.trim()).filter(Boolean))]);
      next[mshs] = {
        ...existing,
        mshs,
        fullName: student.fullName || existing.fullName || '',
        classes: [...classes],
        lastSourceMonth: sourceMonth || existing.lastSourceMonth || '',
        updatedDate: new Date().toISOString()
      };
    });
    return this._set(APP_CONFIG.STORAGE_KEYS.STUDENT_DIRECTORY, next);
  },
  loadStudentDirectory: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.STUDENT_DIRECTORY, {});
  },
  resolveStudent: function(mshs, currentStudents) {
    const code = this.normalizeMSHS(mshs);
    const current = (currentStudents || []).filter(s => this.normalizeMSHS(s.mshs) === code);
    const directory = this.loadStudentDirectory()[code];
    // Có DS tháng này thì chỉ hiện lớp của tháng này; danh bạ cũ chỉ bổ sung trường đang thiếu.
    const currentClasses = new Set(current.map(s => s.className).filter(Boolean));
    const classes = current.length ? currentClasses : new Set((directory && directory.classes) || []);
    const fullName = (current.find(s => s.fullName) || {}).fullName || (directory && directory.fullName) || '';
    return { mshs: code, fullName, className: [...classes].join(', '), found: Boolean(fullName || classes.size), source: current.length ? 'danh sách tháng này' : (directory ? 'danh bạ đã lưu' : '') };
  },

  // PHIÊN THEO THÁNG — dữ liệu nhập/matching được giữ riêng, không đè tháng khác
  sessionStateKeys: function() {
    return ['students', 'vtbTransactions', 'tpbTransactions', 'cashPayments', 'prevInvoiceStudents', 'prevThucTeStudents', 'importStatus', 'defaultFee', 'priorDebtRows'];
  },
  saveMonthSession: function(monthYear, state, extra = {}) {
    if (!monthYear) return false;
    const sessions = this._get(APP_CONFIG.STORAGE_KEYS.MONTH_SESSIONS, {});
    const snapshot = {};
    this.sessionStateKeys().forEach(key => { snapshot[key] = state[key]; });
    snapshot.monthYear = monthYear;
    snapshot.savedDate = new Date().toISOString();
    snapshot.rowCounts = {
      students: (snapshot.students || []).length,
      vtb: (snapshot.vtbTransactions || []).length,
      tpb: (snapshot.tpbTransactions || []).length,
      cash: (snapshot.cashPayments || []).length,
      prevThucTe: (snapshot.prevThucTeStudents || []).length,
      prevInvoice: (snapshot.prevInvoiceStudents || []).length
    };
    sessions[monthYear] = { ...(sessions[monthYear] || {}), ...snapshot, ...extra };
    return this._set(APP_CONFIG.STORAGE_KEYS.MONTH_SESSIONS, sessions);
  },
  loadMonthSession: function(monthYear) {
    return this._get(APP_CONFIG.STORAGE_KEYS.MONTH_SESSIONS, {})[monthYear] || null;
  },
  listMonthSessions: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.MONTH_SESSIONS, {});
  },
  markBackupDirty: function() {
    const meta = this._get(APP_CONFIG.STORAGE_KEYS.BACKUP_META, {});
    return this._set(APP_CONFIG.STORAGE_KEYS.BACKUP_META, { ...meta, dirty: true, lastChangeDate: new Date().toISOString() });
  },
  markBackupExported: function(summary) {
    return this._set(APP_CONFIG.STORAGE_KEYS.BACKUP_META, { dirty: false, lastBackupDate: new Date().toISOString(), summary: summary || {} });
  },
  loadBackupMeta: function() {
    return this._get(APP_CONFIG.STORAGE_KEYS.BACKUP_META, {});
  },

  // BACKUP & RESTORE
  exportFullBackup: function() {
    const backup = {};
    Object.values(APP_CONFIG.STORAGE_KEYS).forEach(key => {
      backup[key] = this._get(key);
    });
    backup.backupDate = new Date().toISOString();
    backup.version = APP_CONFIG.VERSION;
    return backup;
  },
  importFullBackup: function(json) {
    if (!json || typeof json !== 'object') return false;
    let success = true;
    Object.values(APP_CONFIG.STORAGE_KEYS).forEach(key => {
      if (json[key] !== undefined) {
        if (!this._set(key, json[key])) success = false;
      }
    });
    return success;
  },

  // THỐNG KÊ
  getStorageInfo: function() {
    const stkCount = this.loadSTKPhu().length;
    const kwCount = this.loadKeywords().length;
    const history = this.loadHistory();
    const prevMonthInfo = this._get(APP_CONFIG.STORAGE_KEYS.PREV_MONTH_INFO, null);
    
    return {
      stkCount,
      keywordCount: kwCount,
      lastHistoryDate: history.length > 0 ? history[0].date : null,
      prevMonthStatus: prevMonthInfo
    };
  }
};

