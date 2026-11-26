const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function storage() {
  const data = new Map();
  const context = { window: {}, console, localStorage: { getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, v) } };
  context.APP_CONFIG = { STORAGE_KEYS: { STUDENT_DIRECTORY: 'joy_student_directory', MONTH_SESSIONS: 'joy_month_sessions', BACKUP_META: 'joy_backup_meta' } };
  context.window.APP_CONFIG = context.APP_CONFIG;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/storage.js', 'utf8'), context);
  return context.window.Storage;
}

test('directory resolves names and combines classes without making a current student', () => {
  const s = storage();
  s.saveStudentDirectory([{ mshs: ' hv001 ', fullName: 'An', className: 'Pineapple' }, { mshs: 'HV001', fullName: 'An', className: 'Tiramisu' }], '2026-10');
  const found = s.resolveStudent('hv001', []);
  assert.equal(found.fullName, 'An');
  assert.match(found.className, /Pineapple/);
  assert.match(found.className, /Tiramisu/);
});

test('current-month classes do not inherit old classes from the directory', () => {
  const s = storage();
  s.saveStudentDirectory([{ mshs: 'HV001', fullName: 'An', className: 'Pineapple' }, { mshs: 'HV001', fullName: 'An', className: 'Tiramisu' }], '2026-10');
  const found = s.resolveStudent('HV001', [{ mshs: 'HV001', fullName: 'An', className: 'Cashew' }]);
  assert.equal(found.className, 'Cashew');
  assert.equal(found.fullName, 'An');
});

test('month sessions remain separate and preserve row counts', () => {
  const s = storage();
  s.saveMonthSession('2026-10', { students: [{ mshs: 'HV1' }], vtbTransactions: [{ credit: 800000}], tpbTransactions: [], cashPayments: [], prevInvoiceStudents: [], prevThucTeStudents: [], importStatus: {}, defaultFee: 800000, priorDebtRows: [] });
  s.saveMonthSession('2026-11', { students: [{ mshs: 'HV2' }, { mshs: 'HV3' }], vtbTransactions: [], tpbTransactions: [], cashPayments: [], prevInvoiceStudents: [], prevThucTeStudents: [], importStatus: {}, defaultFee: 800000, priorDebtRows: [] });
  assert.equal(s.loadMonthSession('2026-10').students[0].mshs, 'HV1');
  assert.equal(s.loadMonthSession('2026-11').rowCounts.students, 2);
});
