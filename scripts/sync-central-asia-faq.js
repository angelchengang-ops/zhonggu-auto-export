const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FAQ_PATH = path.join(ROOT, 'data', 'central-asia-faq.json');
const PAGE_PATH = path.join(ROOT, 'export-cars-from-china-to-central-asia.html');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const renderVisibleFaq = (items) => `<div class="faq-list">${items.map(({ question, answer }) => `<div class="faq-item"><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></div>`).join('')}</div>`;
const faqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer }
  }))
});

const syncCentralAsiaFaq = (html, items) => {
  const visible = renderVisibleFaq(items);
  let output = html.replace(/<div class="faq-list">[\s\S]*?<\/div><\/div><\/section>(?=<section class="seo-section search-console-quality-section")/, `${visible}</div></section>`);
  const schemaMatch = output.match(/<script type="application\/ld\+json" id="market-seo-schema">([\s\S]*?)<\/script>/);
  if (!schemaMatch) throw new Error('Central Asia market JSON-LD block was not found');
  const schema = JSON.parse(schemaMatch[1]);
  if (!Array.isArray(schema['@graph'])) throw new Error('Central Asia market JSON-LD @graph is invalid');
  const index = schema['@graph'].findIndex((item) => item['@type'] === 'FAQPage');
  if (index < 0) throw new Error('Central Asia FAQPage node was not found');
  schema['@graph'][index] = faqSchema(items);
  output = output.replace(schemaMatch[0], `<script type="application/ld+json" id="market-seo-schema">${JSON.stringify(schema)}</script>`);
  return output;
};

if (require.main === module) {
  const items = JSON.parse(fs.readFileSync(FAQ_PATH, 'utf8')).en;
  const before = fs.readFileSync(PAGE_PATH, 'utf8');
  const after = syncCentralAsiaFaq(before, items);
  if (before !== after) fs.writeFileSync(PAGE_PATH, after, 'utf8');
  console.log(`Central Asia FAQ synced: ${items.length} entries`);
}

module.exports = { faqSchema, renderVisibleFaq, syncCentralAsiaFaq };
