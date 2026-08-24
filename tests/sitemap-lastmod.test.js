const test = require('node:test');
const assert = require('node:assert/strict');
const { latestLastmod, resolveLastmod } = require('../scripts/lib/sitemap-lastmod');

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
