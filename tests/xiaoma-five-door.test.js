const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const cars = JSON.parse(read('cars.json'));
const variants = cars.filter(c=>c.id.startsWith('bestune-xiaoma-five-door-'));
const spec = (c,k)=>c.detailSpecs.find(s=>s.label===k)?.value;

test('five-door batteries and optional safety equipment stay version-specific',()=>{
  assert.equal(variants.length,4);
  for(const c of variants){
    const long=c.id.includes('328km');
    assert.equal(spec(c,'Battery capacity'),long?'27.19 kWh':'16.97 kWh');
    assert.equal(spec(c,'DC fast charging (30-80%)'),long?'35 minutes (reference)':'30 minutes (reference)');
    assert.equal(spec(c,'Dimensions (L x W x H)'),'3350 x 1540 x 1600 mm');
    assert.equal(c.modelYear,'2027');
  }
  assert.equal(spec(variants.find(c=>c.id.endsWith('kuaile')),'ESC stability control'),'Not equipped');
  assert.equal(spec(variants.find(c=>c.id.endsWith('chengyi')),'ESC stability control'),'Optional; confirm package');
  for(const suffix of ['pingan','ruyi']) assert.equal(spec(variants.find(c=>c.id.endsWith(suffix)),'ESC stability control'),'Standard');
});

test('unpriced listings never publish zero-price offers or inherit old Xiaoma prices',()=>{
  const titles=new Set();
  for(const c of variants){
    assert.equal(c.fobPriceDisplay,'Price on request');
    const html=read(c.id+'.html');
    assert.match(html,/name="sale_price" value="Price on request"/);
    assert.match(html,/name="vehicle_id" value="bestune-xiaoma-five-door-/);
    const blocks=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    // Existing SEO normalization excludes unpriced Product rich results.
    // Keep Breadcrumb/Video data; never invent an Offer to retain Product markup.
    const nodes=blocks.flatMap(b=>b['@graph']||[b]);
    assert.equal(nodes.some(x=>x['@type']==='Product'||x['@type']==='Offer'||x.offers),false);
    assert.ok(nodes.some(x=>x['@type']==='BreadcrumbList'));
    assert.ok(html.includes(spec(c,'Battery capacity')));
    assert.ok(read('sitemap-vehicles-current.xml').includes('https://zhongguauto.com/'+c.id+'.html'));
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    for(const img of c.images)assert.ok(fs.existsSync(path.join(root,img)));
  }
  assert.equal(titles.size,4);
  const old=cars.find(c=>c.id==='bestune-xiaoma-2026-222km-shanyaoma-edition');
  assert.equal(old.fobPriceDisplay,'US$4,500');
  assert.equal(old.bodyStyle,'3-door, 4-seat hatchback');
});

test('comparison and Ethiopia pages are linked and keep market separate from phone',()=>{
  const hub=read('bestune-xiaoma-five-door.html');
  for(const c of variants)assert.ok(hub.includes('/'+c.id+'.html'));
  for(const p of ['index.html','new-cars.html','bestune-car-exporter-china.html'])assert.ok(read(p).includes('/bestune-xiaoma-five-door.html'));
  const et=read('electric-cars-from-china-to-ethiopia.html');
  assert.match(et,/name="market_country" value="Ethiopia"/);
  assert.match(et,/name="calling_code"/);
  assert.match(et,/name="phone_number"/);
  assert.doesNotMatch(et,/name="market_country" value="Algeria"/);
  assert.ok(read('sitemap-pages-current.xml').includes('/electric-cars-from-china-to-ethiopia.html'));
});
