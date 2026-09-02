const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const cars = JSON.parse(read('cars.json'));
const { productSku } = require('../scripts/lib/product-sku');
const graph = html => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => { const data = JSON.parse(m[1]); return data['@graph'] || [data]; });
const escaped = value => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const marketFiles = ['used-bestune-b70-wholesale.html','export-cars-from-china-to-algeria.html',...['egypt','iraq'].flatMap(c=>[`export-cars-from-china-to-${c}.html`,`ar/export-cars-from-china-to-${c}.html`])];

test('B70 aliases have forced permanent redirects before catch-all rules',()=>{
  const rules=read('_redirects').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>l.split(/\s+/));
  const target='/used-bestune-b70-wholesale.html';
  for(const alias of ['/used-bestune-b70-wholesale','/used-bestune-b70-wholesale/']){
    const rule=rules.find(r=>r[0]===alias);
    assert.deepEqual(rule,[alias,target,'301!']);
    const www=rules.find(r=>r[0]===`https://www.zhongguauto.com${alias}`);
    assert.deepEqual(www,[`https://www.zhongguauto.com${alias}`,`https://zhongguauto.com${target}`,'301!']);
    assert.ok(rules.indexOf(www)<rules.findIndex(r=>r[0]==='https://www.zhongguauto.com/*'));
  }
  assert.ok(!rules.some(r=>r[0]===target&&/^30/.test(r[2])));
  assert.ok(read('used-bestune-b70-wholesale.html').includes(`rel="canonical" href="https://zhongguauto.com${target}"`));
});

test('all priced USD product SKUs agree with catalogue; unpriced listings do not invent offers',()=>{
  const skus=[];
  for(const car of cars){
    const product=graph(read(`${car.id}.html`)).find(n=>n['@type']==='Product');
    const display=car.salePriceDisplay||car.fobPriceDisplay||car.fobNanShaUsd||car.price||'';
    const hasUsd=/USD|US\$/i.test(display)&&!/[xX]/.test(display);
    if(!hasUsd){ assert.equal(product,undefined,car.id); continue; }
    assert.ok(product,car.id);
    assert.equal(product.sku,productSku(car.id));
    assert.ok(product.sku.length<=50);
    skus.push(product.sku);
  }
  assert.equal(new Set(skus).size,skus.length);
});

test('Battle reference specifications retain provenance and do not change quoted variants',()=>{
  const car=cars.find(c=>c.id==='geely-coolray-battle-edition'),html=read(`${car.id}.html`);
  assert.equal(car.specificationSource.url,'https://www.autohome.com.cn/config/spec/75683.html');
  assert.equal(car.fobPriceDisplay,'11,400 USD');
  assert.equal(car.guidePriceRmb,'97,800 RMB');
  assert.match(car.configuration,/Electric tailgate.*11,600/);
  for(const [,value] of car.detailSpecs) assert.ok(html.includes(escaped(value)),value);
  assert.equal(car.detailSpecs.length,11);
  assert.match(html,/not a guarantee for every vehicle offered for export/);
  assert.ok(html.includes(`href="${car.specificationSource.url}"`));
});

test('market pages expose matching visible FAQs, canonical, working local links and inquiry metadata',()=>{
  for(const file of marketFiles){
    const html=read(file),url=`https://zhongguauto.com/${file}`;
    assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1,file);
    assert.ok(html.includes(`rel="canonical" href="${url}"`),file);
    assert.ok(html.includes(`name="source_url" value="${url}"`),file);
    assert.match(html,/<form[^>]*data-netlify="true"/);
    for(const field of ['form-name','bot-field','name','whatsapp','model','message']) assert.ok(html.includes(`name="${field}"`),`${file}: ${field}`);
    assert.match(html,/<button[^>]*type="submit"/);
    const visible=html.replace(/<script[\s\S]*?<\/script>/g,'');
    for(const faq of graph(html).filter(n=>n['@type']==='FAQPage').flatMap(n=>n.mainEntity)){
      assert.ok(visible.includes(escaped(faq.name)),file);
      assert.ok(visible.includes(escaped(faq.acceptedAnswer.text)),file);
    }
    for(const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)){
      const target=path.join(root,m[1].endsWith('/')?`${m[1]}index.html`:m[1]);
      assert.ok(fs.existsSync(target),`${file}: ${m[1]}`);
    }
  }
});

test('Egypt and Iraq have reciprocal English/Arabic alternates and correct country attribution',()=>{
  for(const [slug,country,region] of [['egypt','Egypt','Africa'],['iraq','Iraq','Middle East']]){
    const base=`export-cars-from-china-to-${slug}.html`;
    for(const lang of ['en','ar']){
      const file=lang==='ar'?`ar/${base}`:base,html=read(file);
      assert.ok(html.includes(`<html lang="${lang}"${lang==='ar'?' dir="rtl"':''}>`));
      assert.ok(html.includes(`hreflang="en" href="https://zhongguauto.com/${base}"`));
      assert.ok(html.includes(`hreflang="ar" href="https://zhongguauto.com/ar/${base}"`));
      assert.ok(html.includes(`name="market_region" value="${region}"`));
      assert.ok(html.includes(`name="market_country" value="${country}"`));
      assert.ok(html.includes(`name="language" value="${lang}"`));
      assert.ok(html.includes('localized-market-page'), 'Prevent saved UI language from overriding static regional content');
      assert.equal(graph(html).find(n=>n['@type']==='Service').areaServed.name,country);
      assert.ok(read('sitemap-pages-current.xml').includes(`<loc>https://zhongguauto.com/${file}</loc>`));
    }
    assert.ok(read('car-importer-center.html').includes(`href="/${base}"`));
    const home = read('index.html');
    assert.ok(home.includes(`href="/${base}"`), 'Priority markets must be accessible from the homepage');
    assert.ok(home.includes(`href="/ar/${base}"`), 'Arabic buyers need a direct homepage entry');
  }
  assert.match(read('export-cars-from-china-to-egypt.html'),/Nafeza ACI/);
  assert.match(read('export-cars-from-china-to-iraq.html'),/COSQC/);
});

test('confirmed Full Option quote is USD 11500 in data, grouped catalogue and Nansha schema',()=>{
  const car=cars.find(c=>c.id==='geely-coolray-full-option');
  assert.equal(car.fobPriceDisplay,'US$11,500');
  assert.equal(car.priceConfirmedAt,'2026-09-02');
  const grouped=read('grouped-cars.json');
  assert.ok(!/11,800|11800/.test(grouped));
  const nansha=read('geely-coolray-ready-stock-nansha-port.html');
  assert.equal(graph(nansha).find(n=>n['@type']==='Product').offers.price,11500);
  for(const file of ['index.html','new-cars.html','geely-coolray-full-option.html','geely-coolray-ready-stock-nansha-port.html','export-cars-from-china-to-algeria.html','export-cars-from-china-to-ghana.html','export-cars-from-china-to-ivory-coast.html']) assert.ok(!/11,800|11800/.test(read(file)),file);
});

test('homepage and list-card prices match the same vehicle detail source',()=>{
  for(const file of ['index.html','new-cars.html','used-cars.html']){
    const html=read(file);
    const cards=[...html.matchAll(/<article[^>]*data-vehicle-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.ok(cards.length,file);
    for(const [,id,card] of cards){
      const car=cars.find(c=>c.id===id);
      const expected=car.salePriceDisplay||car.fobPriceDisplay||car.fobNanShaUsd||car.price;
      assert.equal(card.match(/class="price"[\s\S]*?<strong>([^<]+)/)?.[1],escaped(expected),`${file}: ${id}`);
      assert.ok(read(`${id}.html`).includes(`data-vehicle-price="${escaped(expected)}"`),id);
    }
  }
});
