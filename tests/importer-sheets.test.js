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
  vm.runInContext(fs.readFileSync('js/import-schema.js', 'utf8'), context);
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

test('keeps header row 3 and does not select hidden lookalike sheets by guess', () => {
  const { Importer, workbook } = loadImporter({
    Form: [['MSHS', 'Họ tên'], ['HV999', 'Không chọn']],
    Ds_HocSinh: [['Bảng điều khiển'], ['Col 53'], ['Teacher', 'Class', 'Full name', 'MSHS', 'STK_PH', 'GhiChu_GiaDinh'], ['Cô A', 'Pineapple', 'An', 'HV001', '0123', 'Ghi chú']]
  });
  const chosen = Importer.selectUniqueSheet(workbook, [['mshs', 'mã học sinh'], ['họ tên', 'full name']], { nameAliases: ['ds hoc sinh'] });
  assert.equal(chosen.name, 'Ds_HocSinh');
  assert.equal(chosen.headerRowIdx, 2);
});

test('reports ambiguous populated fee columns instead of silently choosing one', () => {
  const { Importer } = loadImporter({});
  const headers = ['MSHS', 'Full name', 'Học phí', 'Học Phí'];
  assert.throws(() => Importer.resolveOptionalColumn(headers, [headers, ['HV001', 'An', 800000, 900000]], 0, 'hocPhi', 'Ds_HocSinh'), /nhiều cột hocPhi/);
});
