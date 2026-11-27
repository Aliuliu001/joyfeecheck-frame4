const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStorage() {
  const values = new Map();
  const context = { window: {}, console, localStorage: {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  }, APP_CONFIG: { STORAGE_KEYS: {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/storage.js', 'utf8'), context);
  return context.window.Storage;
}

test('manual allocation is keyed to the complete VTB transaction and selected month', () => {
  const storage = loadStorage();
  const first = { maGD: 'REF-1', date: '2026-11-10 09:00', stkDoiUng: '0900000000', credit: 800000, description: 'hoc phi thang 11' };
  const sameAccountDifferentTransfer = { ...first, maGD: 'REF-2' };
  const id = storage.vtbTransactionId(first);
  storage.addManualAllocation(first, 'HV128', '2026-11');
  assert.deepEqual(JSON.parse(JSON.stringify(storage.getManualAllocation(first, '2026-11'))), { mshs: 'HV128', monthYear: '2026-11' });
  assert.equal(storage.getManualAllocation(sameAccountDifferentTransfer, '2026-11'), null);
  assert.equal(storage.getManualAllocation(first, '2026-12'), null);
  assert.match(id, /^vtb\|REF-1\|/);
});

test('VTB assign UI stores a transaction allocation rather than an STK mapping', () => {
  const app = fs.readFileSync('js/app.js', 'utf8');
  assert.match(app, /Storage\.addManualAllocation\(tx, m, this\.\$store\.appState\.monthYear\)/);
  assert.doesNotMatch(app, /if \(this\.assignType === 'vtb'\) \{\s*\/\/[^\n]*\n\s*window\.Storage\.addSTKPhu/s);
});
