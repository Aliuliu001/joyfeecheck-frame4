const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadMatcher(manualMatches = {}) {
  const context = { window: {}, console, APP_CONFIG: { DEFAULT_HOC_PHI: 800000 } };
  context.Utils = {
    normalizeText(value) {
      return String(value || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, ' ').trim();
    },
    normalizeSTK: value => String(value || '').replace(/\D/g, '')
  };
  context.window.Utils = context.Utils;
  context.window.Storage = { loadManualMatches: () => manualMatches };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/matcher.js', 'utf8'), context);
  return context.window.Matcher;
}

const students = [
  { mshs: 'HV127', fullName: 'Gia An', stkPH: '0900000000', hocPhi: 800000 },
  { mshs: 'HV128', fullName: 'Minh Anh', stkPH: '0900000000', hocPhi: 800000 },
  { mshs: 'HV129', fullName: 'Gia An', stkPH: '0900000000', hocPhi: 800000 }
];

function tx(description, extra = {}) {
  return { date: '2026-11-10 09:00', stkDoiUng: '0900000000', credit: 800000, description, ...extra };
}

test('VTB shared STK assigns the whole transfer to the one candidate named explicitly', () => {
  const result = loadMatcher().matchVietinBank([tx('hoc phi Minh Anh thang 11')], students.slice(0, 2), []);
  assert.equal(result.unmatched.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.matched.map(r => [r.matchedMSHS, r.credit, r.matchNote]))), [['HV128', 800000, 'vtb_shared_explicit_recipient']]);
});

test('VTB shared STK accepts an exact MSHS token but not a prefix token', () => {
  const matcher = loadMatcher();
  const exact = matcher.matchVietinBank([tx('dong hoc phi HV128')], students.slice(0, 2), []);
  assert.equal(exact.matched[0].matchedMSHS, 'HV128');
  const prefix = matcher.matchVietinBank([tx('dong hoc phi HV128')], [{ ...students[0], mshs: 'HV12' }, students[1]], []);
  assert.equal(prefix.matched.length, 1);
  assert.equal(prefix.matched[0].matchedMSHS, 'HV128');
});

test('VTB shared STK retains proportional split with no explicit recipient', () => {
  const result = loadMatcher().matchVietinBank([tx('chuyen khoan hoc phi')], students.slice(0, 2), []);
  assert.deepEqual(JSON.parse(JSON.stringify(result.matched.map(r => [r.matchedMSHS, r.credit]))), [['HV127', 400000], ['HV128', 400000]]);
});

test('VTB shared STK marks contradictory identifiers for review instead of choosing', () => {
  const result = loadMatcher().matchVietinBank([tx('hoc phi Gia An HV128')], students.slice(0, 2), []);
  assert.equal(result.matched.length, 0);
  assert.equal(result.unmatched.length, 1);
  assert.equal(result.unmatched[0].matchNote, 'kiem_tra_nguoi_nhan');
});

test('VTB shared STK does not use a duplicate full name as decisive evidence', () => {
  const result = loadMatcher().matchVietinBank([tx('hoc phi Gia An')], students, []);
  assert.equal(result.matched.length, 0);
  assert.equal(result.unmatched[0].matchNote, 'kiem_tra_nguoi_nhan');
});

test('manual VTB allocation has priority and survives family redistribution', () => {
  const raw = tx('anything', { maGD: 'VTB-REF-1' });
  const matcher = loadMatcher({ 'vtb|VTB-REF-1|2026-11-10 09:00|0900000000|800000|anything': { mshs: 'HV128', monthYear: '2026-11' } });
  const matched = matcher.matchVietinBank([raw], students.slice(0, 2), [], '2026-11').matched;
  assert.equal(matched[0].matchedMSHS, 'HV128');
  assert.equal(matched[0].allocationLocked, true);
  const aggregate = matcher.aggregateByMSHS(matched, [], []);
  matcher.distributeByFamily(aggregate, students.slice(0, 2), [{ members: ['HV127', 'HV128'] }]);
  assert.equal(aggregate.get('HV128').vtb, 800000);
  assert.equal(aggregate.get('HV127')?.vtb || 0, 0);
});
