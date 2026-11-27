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

test('a newer active renewal beats an older expired package in either storage order', () => {
  for (const packages of [
    [pkg('old', '2026-09', 2), pkg('renewal', '2026-11', 2)],
    [pkg('renewal', '2026-11', 2), pkg('old', '2026-09', 2)]
  ]) {
    const status = loadStorage(packages).getPackageStatus('hv001', '2026-11');
    assert.equal(status.status, 'active');
    assert.equal(status.active, true);
    assert.equal(status.pkg.packageId, 'renewal');
  }
});

test('coverage is inclusive, derives its end from start plus months, and crosses years', () => {
  const storage = loadStorage([pkg('winter', '2026-11', '2', ['HV001'], { endMonth: '1999-01' })]);
  assert.equal(storage.getPackageStatus('HV001', '2026-11').status, 'active');
  assert.equal(storage.getPackageStatus('HV001', '2026-12').status, 'expiring');
  assert.equal(storage.getPackageStatus('HV001', '2027-01').status, 'expired');
  assert.equal(storage.getPackageStatus('HV001', '2026-12').endMonth, '2026-12');
});

test('one-month, expired-only, and future-only packages have correct statuses', () => {
  const storage = loadStorage([
    pkg('one', '2026-10', 1, ['HV001']),
    pkg('future', '2026-12', 1, ['HV002'])
  ]);
  assert.equal(storage.getPackageStatus('HV001', '2026-10').status, 'expiring');
  assert.equal(storage.getPackageStatus('HV001', '2026-11').status, 'expired');
  assert.equal(storage.getPackageStatus('HV002', '2026-11').status, 'upcoming');
});

test('overlapping active packages flag a conflict without selecting two exemptions', () => {
  const storage = loadStorage([
    pkg('first', '2026-10', 3),
    pkg('second', '2026-11', 3)
  ]);
  const status = storage.getPackageStatus('HV001', '2026-11');
  assert.equal(status.active, true);
  assert.equal(status.status, 'conflict');
  assert.equal(status.overlap, true);
  assert.equal(status.packages.length, 2);
  assert.equal(storage.isPackageActive('HV001', '2026-11').active, true);
  assert.equal(storage.isPackageActive('HV001', '2026-11').overlap, true);
});

test('invalid calendar months and non-positive or non-integer durations never cover tuition', () => {
  const storage = loadStorage([
    pkg('bad-start', '2026-13', 2),
    pkg('bad-months-zero', '2026-10', 0),
    pkg('bad-months-fraction', '2026-10', '1.5'),
    pkg('bad-months-word', '2026-10', 'two')
  ]);
  assert.equal(storage.getPackageStatus('HV001', '2026-10').status, 'none');
  assert.equal(storage.getPackageStatus('HV001', '2026-1').status, 'none');
  assert.equal(storage.addPackage(pkg('invalid-new', '2026-00', 1)), null);
  assert.ok(storage.addPackage(pkg('valid-new', '2026-10', '1')));
  assert.equal(storage.loadPackages().at(-1).months, 1);
});
