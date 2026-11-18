const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('both MG5 quotations are discoverable and retain unverified specifications',()=>{
 const cars=JSON.parse(read('cars.json'));
 const titles=[];
 for(const [id,price] of [['mg5-67900-rmb',7500],['mg5-85900-rmb',9000]]){
  const car=cars.find(c=>c.id===id),html=read(id+'.html');
  assert.equal(Number(String(car.fobNanShaUsd).replace(/[^0-9.]/g,'')),price);
  assert.equal(car.configuration,'Configuration to be confirmed');
  assert.match(html,/Model year<\/[^>]+>[\s\S]*?To be confirmed/);
  assert.match(html,/Transmission<\/[^>]+>[\s\S]*?To be confirmed/);
  assert.ok(html.includes('https://zhongguauto.com/'+id+'.html'));
  assert.ok(read('sitemap-vehicles-current.xml').includes('<loc>https://zhongguauto.com/'+id+'.html</loc>'));
  assert.match(html,/price difference alone does not establish a trim/);
  titles.push(html.match(/<title>(.*?)<\/title>/)[1]);
 }
 assert.notEqual(titles[0],titles[1]);
 const group=JSON.parse(read('grouped-cars.json')).find(c=>c.id==='mg5');
 assert.equal(group.modelYear,'');
 assert.ok(Object.values(group.title).every(t=>t==='MG5'));
 assert.deepEqual(group.trims.map(t=>t.fobPriceUsd),[7500,9000]);
 assert.ok(group.trims.every(t=>t.transmission==='To be confirmed'));
});
test('Roewe and SAIC content and FAQ schema do not inherit Geely or Algeria claims',()=>{
 for(const brand of ['roewe','saic']){
  const html=read('landing/'+brand+'-car-exporter-china/index.html');
  assert.doesNotMatch(html,/Geely|Binyue|Algeria Vehicle|name="market_country" value="Algeria"/);
  assert.match(html,/name="market_country" value="Global"/);
  assert.match(html,/name="market_region" value="Global"/);
  const scripts=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for(const [,raw] of scripts)JSON.parse(raw);
 }
});
test('audited extensionless URLs permanently redirect to existing self canonical pages',()=>{
 const lines=read('_redirects').split(/\r?\n/).map(l=>l.split(/\s+/));
 for(const slug of ['toyota-corolla-hybrid-2026-1-8l-elite-edition','bestune-k1-europe','bestune-yueyi-03-2026-445km-zhixuan-edition']){
  for(const suffix of ['', '/']){
   const rule=lines.find(r=>r[0]==='/'+slug+suffix);
   assert.deepEqual(rule,['/'+slug+suffix,'/'+slug+'.html','301!']);
  }
  assert.ok(read(slug+'.html').includes('rel="canonical" href="https://zhongguauto.com/'+slug+'.html"'));
 }
});
