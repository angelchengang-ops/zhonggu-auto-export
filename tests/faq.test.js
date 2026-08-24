const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { syncCentralAsiaFaq } = require('../scripts/sync-central-asia-faq');

test('Central Asia visible FAQ and FAQPage JSON-LD use the same data', () => {
  const root = path.join(__dirname, '..');
  const items = JSON.parse(fs.readFileSync(path.join(root, 'data/central-asia-faq.json'), 'utf8')).en;
  const html = fs.readFileSync(path.join(root, 'export-cars-from-china-to-central-asia.html'), 'utf8');
  const synced = syncCentralAsiaFaq(html, items);
  const schema = JSON.parse(synced.match(/id="market-seo-schema">([\s\S]*?)<\/script>/)[1]);
  const faq = schema['@graph'].find((item) => item['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]), items.map((item) => [item.question, item.answer]));
  for (const item of items) {
    assert.match(synced, new RegExp(item.question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(synced, new RegExp(item.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
