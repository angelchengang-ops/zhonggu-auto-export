const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const host = 'https://zhongguauto.com';
const pages = [
  ['export-cars-from-china-to-syria.html', 'en'],
  ['ar/export-cars-from-china-to-syria.html', 'ar'],
  ['ar/geely-coolray-syria.html', 'ar'],
  ['ar/mg5-syria.html', 'ar'],
  ['ar/chinese-cars-wholesale-syria.html', 'ar'],
  ['ar/shipping-cars-china-syria.html', 'ar']
];
const html = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const get = (source, tag) => source.match(tag)?.[1] || '';

for (const [file, lang] of pages) {
  test('Syria SEO page contract: ' + file, () => {
    const source = html(file);
    const url = host + '/' + file;
    assert.match(source, new RegExp('<html lang="' + lang + '"'));
    if (lang === 'ar') assert.match(source, /<html lang="ar" dir="rtl">/);
    assert.match(source, /<title>[^<]+<\/title>/);
    assert.match(source, /<meta name="description" content="[^"]+">/);
    assert.equal(get(source, /<link rel="canonical" href="([^"]+)">/), url);
    assert.match(source, /<meta property="og:url" content="/);
    assert.match(source, /name="market_country" value="Syria"/);
    assert.match(source, /name="country" value="Syria"/);
    assert.match(source, /class="inquiry-form"/);
    assert.match(source, /name="source_url" value="https:\/\/zhongguauto\.com\//);
    assert.match(source, /phone-input\.js/);
    assert.match(source, /whatsapp-lead-modal\.js/);
    assert.match(source, /lead-gen\.js/);
    assert.doesNotMatch(source, /name="market_country" value="Iraq"/);
    assert.doesNotMatch(source, /name="source_url" value="[^"]*iraq/);
    assert.doesNotMatch(source, /أم قصر/);
    const ld = get(source, /<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    assert.ok(ld, 'Structured data must exist');
    const graph = JSON.parse(ld)['@graph'];
    assert.ok(graph.some((entity) => entity['@type'] === 'WebPage' && entity.url === url));
    assert.ok(graph.some((entity) => entity['@type'] === 'FAQPage'));
    const localLinks = [...source.matchAll(/href="\/(?!\/)([^"#?]+?\.html)"/g)].map((m) => m[1]);
    for (const local of localLinks) assert.ok(fs.existsSync(path.join(root, local)), 'Broken internal link: /' + local);
  });
}

test('Syria country landing pages have reciprocal hreflang and x-default', () => {
  const english = html(pages[0][0]);
  const arabic = html(pages[1][0]);
  for (const source of [english, arabic]) {
    assert.match(source, /hreflang="en" href="https:\/\/zhongguauto\.com\/export-cars-from-china-to-syria\.html"/);
    assert.match(source, /hreflang="ar-SY" href="https:\/\/zhongguauto\.com\/ar\/export-cars-from-china-to-syria\.html"/);
    assert.match(source, /hreflang="x-default" href="https:\/\/zhongguauto\.com\/export-cars-from-china-to-syria\.html"/);
  }
});

test('Syria pages are included in regenerated page sitemap', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap-pages-current.xml'), 'utf8');
  for (const [file] of pages) assert.ok(sitemap.includes(host + '/' + file), 'Missing from sitemap: ' + file);
});

test('Homepage has a discoverable Syria link and aliases are 301', () => {
  const home = html('index.html');
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
  assert.match(home, /href="\/export-cars-from-china-to-syria\.html"/);
  assert.match(home, /href="\/ar\/export-cars-from-china-to-syria\.html"/);
  for (const [file] of pages) {
    const alias = '/' + file.replace(/\.html$/, '');
    assert.ok(redirects.split(/\r?\n/).includes(alias + ' ' + alias + '.html 301!'), 'Missing 301 alias: ' + alias);
  }
});
