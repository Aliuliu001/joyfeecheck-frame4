const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadImporter(sheets) {
  const context = {
    window: {}, console,
    Utils: {
      normalizeText: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()
    },
    XLSX: { utils: { sheet_to_json: sheet => sheet } }
  };
  context.window.Utils = context.Utils;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/importer.js', 'utf8'), context);
  return { Importer: context.window.Importer, workbook: { SheetNames: Object.keys(sheets), Sheets: sheets } };
}

test('finds student data when cover sheet comes first and headers vary', () => {
  const { Importer, workbook } = loadImporter({
    'Bìa': [['BÁO CÁO']],
    'DS_HOC_SINH': [['ghi chú'], ['Mã học sinh', 'Full name', 'Lớp'], [' hv001 ', 'An', 'Pineapple']]
  });
  const chosen = Importer.selectUniqueSheet(workbook, [['mshs', 'mã học sinh'], ['họ tên', 'full name']], { nameAliases: ['ds_hoc_sinh'] });
  assert.equal(chosen.name, 'DS_HOC_SINH');
  assert.equal(chosen.headerRowIdx, 1);
});

test('rejects ambiguous sheets instead of guessing order', () => {
  const { Importer, workbook } = loadImporter({
    A: [['MSHS', 'Họ tên'], ['HV1', 'An']],
    B: [['MSHS', 'Họ tên'], ['HV2', 'Bình']]
  });
  assert.throws(() => Importer.selectUniqueSheet(workbook, [['mshs'], ['họ tên']]), /nhiều sheet cùng phù hợp/);
});

test('rejects a sheet missing required columns', () => {
  const { Importer, workbook } = loadImporter({ 'Tiền mặt': [['Họ tên', 'Số tiền'], ['An', 800000]] });
  assert.throws(() => Importer.selectUniqueSheet(workbook, [['mshs', 'mã hs'], ['số tiền']]), /Không tìm thấy sheet/);
});
