const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadImporter() {
  const context = { window: {}, console, document: { getElementById: () => null }, APP_CONFIG: { DEFAULT_HOC_PHI: 800000 } };
  context.Utils = {
    normalizeText: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(),
    normalizeSTK: value => String(value || '').replace(/[\s.\-]/g, '').trim(),
    parseNumber: value => typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0,
    formatDate: value => String(value || '')
  };
  context.window.Utils = context.Utils;
  context.XLSX = require('../lib/xlsx.full.min.js');
  context.FileReader = class { readAsArrayBuffer(file) { this.onload({ target: { result: file.data } }); } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/import-schema.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/importer.js', 'utf8'), context);
  return context.window.Importer;
}
function file(path) { const b = fs.readFileSync(path); return { data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; }

const workbookPath = '/home/ubuntu/.hermes/cache/documents/doc_900283a37e98_DS_HOC_SINH.xlsx';

test('imports real multi-sheet student workbook from row 3 without deduplicating classes', async () => {
  const parsed = await loadImporter().parseGoogleSheets(file(workbookPath));
  assert.equal(parsed.importMeta.sheetName, 'Ds_HocSinh');
  assert.equal(parsed.importMeta.headerRow, 3);
  assert.equal(parsed.students.length, 196);
  assert.equal(parsed.importMeta.uniqueMSHS, 181);
  assert.equal(parsed.importMeta.missingLabels, 0);
  assert.equal(parsed.students.filter(s => s.stkPH).length, 111);
  assert.equal(parsed.students.filter(s => s.stkPH.startsWith('0')).length, 37);
  assert.ok(parsed.importMeta.stkWarnings.length >= 1);
});
