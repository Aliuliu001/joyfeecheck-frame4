const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../lib/xlsx.full.min.js');

test('public template files have standard sheets and fictional example data', () => {
  require('../scripts-create-templates.js');
  const expected = {
    '01_DS_HOC_SINH.xlsx': ['DS_HOC_SINH'],
    '02_TIEN_MAT.xlsx': ['TIEN_MAT'],
    '03_KE_TOAN_THANG_TRUOC.xlsx': ['DS_THUC_TE', 'DS_GHI_HD'],
    '04_NO_CHOT_THANG_TRUOC.xlsx': ['CHOT_NO'],
    '05_SAO_KE_VIETINBANK.xlsx': ['SAO_KE_VIETINBANK'],
    '06_SAO_KE_TPBANK.xlsx': ['SAO_KE_TPBANK']
  };
  for (const [name, sheets] of Object.entries(expected)) {
    const fullPath = `forms_mau_import/${name}`;
    assert.ok(fs.existsSync(fullPath), `${name} exists`);
    const wb = XLSX.read(fs.readFileSync(fullPath), { type: 'buffer' });
    assert.deepEqual(wb.SheetNames, sheets);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheets[0]], { header: 1, defval: '' });
    assert.ok(rows.length >= 2, `${name} has header and example row`);
    assert.match(JSON.stringify(rows), /(HV000|VI_DU|Ví dụ)/);
  }
});
