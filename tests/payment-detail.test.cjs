const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('js/app.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

test('payment detail keeps the full bank description and escapes untrusted fields', () => {
  assert.doesNotMatch(app, /description\s*\|\|\s*'—'\)\.substring\(0,\s*80\)/);
  assert.match(app, /const desc = escapeHtml\(tx\.description \|\| '—'\)/);
  assert.match(app, /const stk = escapeHtml\(tx\.account \|\| '—'\)/);
  assert.match(app, /const chuTK = escapeHtml\(tx\.tenChuTK \|\| '—'\)/);
  assert.match(app, /allocationReason/);
  assert.match(app, /js-reassign-vtb/);
  assert.match(app, /vtbTransactionId\(tx\) === detail\.transactionId/);
});

test('payment detail styles wrap full multiline content in a vertically scrolling modal', () => {
  assert.match(css, /\.payment-detail-scroll\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.payment-description\s*\{[^}]*white-space:\s*pre-wrap/);
  assert.match(css, /\.payment-description\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test('payment detail renderer preserves a long Vietnamese tail and does not create markup', () => {
  const description = 'chuyen khoan hoc phi Nguyen Van A thang 11 thang 12\nquo te <img src=x onerror=alert(1)> & "quote"';
  const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const rendered = escapeHtml(description);
  assert.match(rendered, /thang 11 thang 12/);
  assert.match(rendered, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(rendered, /\nquo te/);
});
