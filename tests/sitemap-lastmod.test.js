const test = require('node:test');
const assert = require('node:assert/strict');
const { latestLastmod, resolveLastmod } = require('../scripts/lib/sitemap-lastmod');

test('asset cache versions and line endings do not count as editorial changes', () => {
  const { sameEditorialHtml } = require('../scripts/lib/sitemap-lastmod');
  const before = '<link href="/style.css?v=abc123">\r\n<script src="/script.js?v=123abc"></script>\r\n<h1>Used vehicles</h1>\r\n';
  const cacheOnly = '<link href="/style.css?v=def456">\n<script src="/script.js?v=456def"></script>\n<h1>Used vehicles</h1>\n';
  assert.equal(sameEditorialHtml(before, cacheOnly), true);
  assert.equal(sameEditorialHtml(before, cacheOnly.replace('Used vehicles', 'New vehicles')), false);
  assert.equal(sameEditorialHtml(before, cacheOnly.replace('/style.css', '/other.css')), false);
});

test('different sources keep independent dates and unchanged sources stay stable', () => {
  const dates = { 'a.html': '2026-08-20', 'b.html': '2026-08-23' };
  const lookup = (file) => dates[file] || '';
  assert.equal(resolveLastmod({ sourceFile: 'a.html' }, lookup), '2026-08-20');
  assert.equal(resolveLastmod({ sourceFile: 'b.html' }, lookup), '2026-08-23');
  assert.equal(resolveLastmod({ sourceFile: 'a.html' }, lookup), '2026-08-20');
});

test('content metadata updates one page and index uses the newest child date', () => {
  const lookup = () => '2026-08-20';
  const unchanged = { lastmod: resolveLastmod({ sourceFile: 'a.html' }, lookup) };
  const changed = { lastmod: resolveLastmod({ metadataDate: '2026-08-24T09:00:00Z', sourceFile: 'b.html' }, lookup) };
  assert.equal(changed.lastmod, '2026-08-24');
  assert.equal(latestLastmod([unchanged, changed]), '2026-08-24');
  assert.notEqual(unchanged.lastmod, changed.lastmod);
  assert.notEqual(changed.lastmod, '2026-07-17');
  assert.notEqual(changed.lastmod, '2026-07-20');
});
