const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStorage(packages = []) {
  const data = new Map([['joy_packages', JSON.stringify(packages)]]);
  const context = {
    window: {}, console,
    localStorage: {
      getItem: key => data.has(key) ? data.get(key) : null,
      setItem: (key, value) => data.set(key, value)
    },
    APP_CONFIG: { STORAGE_KEYS: { PACKAGES: 'joy_packages' } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/storage.js', 'utf8'), context);
  return context.window.Storage;
}

const pkg = (id, startMonth, months, members = ['HV001'], extra = {}) => ({
  packageId: id, packageName: id, startMonth, months, members, ...extra
});

test('expired list includes every old valid package with student and derived period details', () => {
  const storage = loadStorage([
    pkg('old-a', '2026-01', 1),
    pkg('old-b', '2026-03', 2, ['HV002'])
  ]);
  const expired = storage.getExpiredPackages('2026-11', [
    { mshs: 'HV001', fullName: 'An', className: 'Lop A' },
    { mshs: 'HV002', fullName: 'Binh', className: 'Lop B' }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(expired.map(x => ({ id: x.pkg.packageId, start: x.startMonth, end: x.endMonth, members: x.members })))), [
    { id: 'old-a', start: '2026-01', end: '2026-01', members: [{ mshs: 'HV001', fullName: 'An', className: 'Lop A' }] },
    { id: 'old-b', start: '2026-03', end: '2026-04', members: [{ mshs: 'HV002', fullName: 'Binh', className: 'Lop B' }] }
  ]);
});

test('an old renewed record remains visible but is marked renewed and does not create an unpaid warning', () => {
  const storage = loadStorage([
    pkg('old', '2026-08', 2),
    pkg('renewal', '2026-11', 2)
  ]);
  const expired = storage.getExpiredPackages('2026-11', []);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].pkg.packageId, 'old');
  assert.equal(expired[0].renewed, true);
  assert.equal(storage.getExpiringPackages('2026-11', []).some(x => x.pkg.packageId === 'old'), false);
});

test('archiving individual or selected expired packages only changes presentation and preserves historical coverage', () => {
  const storage = loadStorage([
    pkg('old-a', '2026-01', 1),
    pkg('old-b', '2026-02', 1)
  ]);
  assert.equal(storage.archivePackages(['old-a']), 1);
  assert.equal(storage.loadPackages()[0].archived, true);
  assert.equal(storage.getPackageStatus('HV001', '2026-01').active, true);
  assert.deepEqual(JSON.parse(JSON.stringify(storage.getExpiredPackages('2026-11', [], { includeArchived: false }).map(x => x.pkg.packageId))), ['old-b']);
  assert.equal(storage.archivePackages(['old-b']), 1);
  assert.equal(storage.getExpiredPackages('2026-11', [], { includeArchived: false }).length, 0);
  assert.equal(storage.getExpiredPackages('2026-11', [], { includeArchived: true }).length, 2);
});

test('expiring reminders include only the final covered month and never call that package expired', () => {
  const storage = loadStorage([pkg('final-month', '2026-10', 2)]);
  const alerts = storage.getExpiringPackages('2026-11', []);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'expiring');
  assert.match(alerts[0].msg, /Hết sau tháng này/i);
  assert.equal(storage.getExpiringPackages('2026-12', []).length, 0);
});

test('package archive UI has individual/select-all choices and explicit confirmation', () => {
  const app = fs.readFileSync('js/app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(app, /archiveSelectedPackages/);
  assert.match(app, /confirm\(`Ẩn.*hết hạn/i);
  assert.match(html, /archivePackageIds/);
  assert.match(html, /toggleAllExpiredPackages/);
  assert.match(html, /Ẩn gói hết hạn khỏi danh sách đang dùng/);
});

test('matching keeps package reminders as a stable banner rather than repeating the same toast', () => {
  const app = fs.readFileSync('js/app.js', 'utf8');
  assert.match(app, /packageAlertKey/);
  assert.match(app, /alertKey !== state\.packageAlertKey/);
});
