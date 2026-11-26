const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadImporter() {
  const context = { window: {}, console, document: { getElementById: () => null }, APP_CONFIG: { DEFAULT_HOC_PHI: 800000 } };
  context.Utils = {
    normalizeText: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(),
    normalizeSTK: value => String(value || '').replace(/\D/g, ''),
    parseNumber: value => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0,
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

const vtbFile = '/home/ubuntu/.hermes/cache/documents/doc_b063c9c2fdbd_Vietinbank 29.10.xls';
const accountingFile = '/home/ubuntu/.hermes/cache/documents/doc_9f46adbd4efe_2. DS_ghi_Hoa_Don_09.2026.xlsx';

test('imports the original VietinBank .xls statement with accounting date and transaction ID', async () => {
  const rows = await loadImporter().parseSaoKeVietinBank(file(vtbFile));
  assert.equal(rows.length, 89);
  assert.equal(rows.reduce((sum, r) => sum + r.credit, 0), 137296000);
  assert.equal(rows[0].date, '27-10-2026 15:41:41');
  assert.equal(rows[0].maGD, '620D610272QYNZZX');
  assert.equal(rows[0].stkDoiUng, '0917200102');
});

test('imports the accounting file using its existing sheet names and preserves both lists', async () => {
  const parsed = await loadImporter().parsePrevInvoiceFile(file(accountingFile));
  assert.equal(parsed.prevInvoiceStudents.length, 122);
  assert.equal(parsed.prevThucTe.length, 174);
  assert.equal(parsed.prevInvoiceStudents[0].mshs, 'HV011');
  assert.equal(parsed.prevThucTe[0].mshs, 'HV314');
});
