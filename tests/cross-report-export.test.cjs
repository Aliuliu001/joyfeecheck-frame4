const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const XLSX = require('../lib/xlsx.full.min.js');

const ROOT = __dirname + '/..';

function loadApp() {
  const values = new Map();
  const context = {
    window: {},
    console,
    XLSX,
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, value)
    }
  };
  context.window.XLSX = XLSX;
  vm.createContext(context);
  for (const file of ['js/datamodel.js', 'js/utils.js', 'js/storage.js']) {
    vm.runInContext(fs.readFileSync(`${ROOT}/${file}`, 'utf8'), context, { filename: file });
  }
  context.Utils = context.window.Utils;
  context.Storage = context.window.Storage;
  for (const file of ['js/matcher.js', 'js/reporter.js', 'js/accounting.js', 'js/exporter.js']) {
    vm.runInContext(fs.readFileSync(`${ROOT}/${file}`, 'utf8'), context, { filename: file });
  }
  return { context, storage: context.window.Storage };
}

function stableJson(value) {
  return JSON.stringify(value);
}

test('local fixture: explicit VTB recipient stays distinct from cash through report, accounting, and Excel', () => {
  const { context, storage } = loadApp();
  const { Matcher, Reporter, Accounting, Exporter } = context.window;
  const monthYear = '2026-11';
  const students = [
    { mshs: 'HV101', fullName: 'Nguyễn An', className: 'A1', teacher: 'Cô Lan', stkPH: '0900 000 001', hocPhi: 800000 },
    { mshs: 'HV102', fullName: 'Trần Bình', className: 'A1', teacher: 'Cô Lan', stkPH: '0900 000 001', hocPhi: 800000 }
  ];
  const vtbTransactions = [{
    maGD: 'LOCAL-REF-001', date: '2026-11-10 09:00', stkDoiUng: '0900000001', credit: 800000,
    description: 'Chuyen hoc phi HV101 thang 11'
  }];
  const cashPayments = [{ mshs: 'HV102', amount: 100000, date: '2026-11-11', note: 'Thu tien mat tai lop' }];

  // A closed prior month and a separate session must not be changed by November matching/reporting.
  storage.saveClosingDebt('2026-10', [{ mshs: 'HV101', fullName: 'Nguyễn An', className: 'A1', amount: 250000 }]);
  storage.saveMonthSession('2026-10', {
    students: [{ mshs: 'OLD01' }], vtbTransactions: [], tpbTransactions: [], cashPayments: [],
    prevInvoiceStudents: [], prevThucTeStudents: [], importStatus: {}, defaultFee: 800000, priorDebtRows: []
  });
  const closedDebtBefore = stableJson(storage.loadClosingDebt('2026-10'));
  const oldSessionBefore = stableJson(storage.loadMonthSession('2026-10'));

  const runPipeline = () => {
    const matching = Matcher.matchVietinBank(vtbTransactions, students, [], monthYear);
    const payments = Matcher.aggregateByMSHS(matching.matched, [], cashPayments);
    const report = Reporter.generateReport(students, payments, [], monthYear);
    return { matching, payments, report };
  };

  const first = runPipeline();
  const second = runPipeline();

  assert.equal(first.matching.unmatched.length, 0);
  assert.equal(first.matching.matched.length, 1);
  assert.equal(first.matching.matched[0].matchedMSHS, 'HV101');
  assert.equal(first.matching.matched[0].matchNote, 'vtb_shared_explicit_recipient');
  assert.equal(first.payments.get('HV101').vtb, 800000);
  assert.equal(first.payments.get('HV101').cash, 0);
  assert.equal(first.payments.get('HV102').vtb || 0, 0);
  assert.equal(first.payments.get('HV102').cash, 100000);
  assert.equal(first.payments.get('HV102').total, 100000);

  // Re-running on the same fixture produces the same one transfer, not a duplicate.
  assert.equal(second.matching.matched.length, 1);
  assert.equal(second.payments.get('HV101').vtb, 800000);
  assert.equal(second.payments.get('HV102').cash, 100000);
  assert.equal(stableJson(storage.loadClosingDebt('2026-10')), closedDebtBefore);
  assert.equal(stableJson(storage.loadMonthSession('2026-10')), oldSessionBefore);

  const byMSHS = new Map(first.report.map(row => [row.mshs, row]));
  assert.deepEqual(JSON.parse(JSON.stringify({
    HV101: { vtb: byMSHS.get('HV101').chuyenKhoanVTB, cash: byMSHS.get('HV101').tienMat, total: byMSHS.get('HV101').tongDaDong },
    HV102: { vtb: byMSHS.get('HV102').chuyenKhoanVTB, cash: byMSHS.get('HV102').tienMat, total: byMSHS.get('HV102').tongDaDong }
  })), {
    HV101: { vtb: 800000, cash: 0, total: 800000 },
    HV102: { vtb: 0, cash: 100000, total: 100000 }
  });

  const vtbAmountByMSHS = new Map([...first.payments].map(([mshs, payment]) => [mshs, payment.vtb]));
  const comparison = Accounting.computeInvoiceComparison(
    [{ mshs: 'HV101', fullName: 'Nguyễn An', className: 'A1', hocPhi: 800000 }, { mshs: 'HV102', fullName: 'Trần Bình', className: 'A1', hocPhi: 800000 }],
    new Set(first.matching.matched.map(tx => tx.matchedMSHS)),
    new Map(students.map(student => [student.mshs, student])),
    vtbAmountByMSHS,
    first.report,
    [],
    800000
  );
  assert.deepEqual(JSON.parse(JSON.stringify(comparison.tab2.map(row => [row.mshs, row.ckAmount]))), [['HV101', 800000]]);
  assert.deepEqual(JSON.parse(JSON.stringify(comparison.tab3.map(row => row.mshs))), ['HV102']);

  const stats = Reporter.getStatistics(first.report);
  let download;
  Exporter.triggerDownload = (workbook, filename) => { download = { workbook, filename }; };
  Exporter.exportBaoCao(first.report, stats, monthYear);
  assert.match(download.filename, /^BaoCao_DoiSoat_11\.2026\.xlsx$/);
  const sheet = download.workbook.Sheets['BÁO CÁO ĐỐI SOÁT'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  assert.deepEqual(rows[4], ['STT', 'MSHS', 'Họ tên', 'Lớp', 'GV', 'Nợ cũ', 'Tổng phải thu', 'CK VietinBank', 'Tiền mặt', 'CK TPBank', 'Tổng đã đóng', 'Còn thiếu', 'Trạng thái', 'Ghi chú']);
  const excelByMSHS = new Map(rows.slice(5).filter(row => row[1]).map(row => [row[1], row]));
  assert.deepEqual([excelByMSHS.get('HV101')[7], excelByMSHS.get('HV101')[8], excelByMSHS.get('HV101')[10]], [800000, 0, 800000]);
  assert.deepEqual([excelByMSHS.get('HV102')[7], excelByMSHS.get('HV102')[8], excelByMSHS.get('HV102')[10]], [0, 100000, 100000]);
});
