const localSitePath = require('./local-site-path');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const cars=JSON.parse(read('cars.json')).filter(c=>c.id.startsWith('geely-coolray-'));
const base='/landing/geely-binyue-export-algeria/';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const lang of ['fr','ar'])test(`Algeria ${lang} keywords preserve prices, language, schema and canonical links`,()=>{
 const h=read(lang+base+'index.html'),url='https://zhongguauto.com/'+lang+base;
 assert.match(h,new RegExp(`<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"`));
 assert.equal((h.match(/<h1\b/g)||[]).length,1);
 assert.ok(h.includes(`rel="canonical" href="${url}"`));
 for(const code of ['en','fr','ar','x-default'])assert.ok(h.includes(`hreflang="${code}" href="https://zhongguauto.com${['en','x-default'].includes(code)?'':'/'+code}${base}"`));
 for(const id of ['prices','automatic','full-option','quote'])assert.ok(h.includes(`id="${id}"`));
 for(const c of cars){
  const number=Number(c.fobPriceDisplay.replace(/[^0-9.]/g,''));
  const row=h.match(new RegExp(`<tr><th scope="row">(?:(?!<tr>)[\\s\\S])*?href="/${c.id}\\.html"[\\s\\S]*?</tr>`))?.[0];
  assert.ok(row,c.id);assert.ok(row.includes(new Intl.NumberFormat('en-US').format(number)+' USD'),c.id);
 }
 const graph=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const visible=h.replace(/<script[\s\S]*?<\/script>/g,'');
 for(const q of graph.find(x=>x['@type']==='FAQPage').mainEntity){assert.ok(visible.includes(escape(q.name)));assert.ok(visible.includes(escape(q.acceptedAnswer.text)));}
 assert.equal(graph.find(x=>x['@type']==='ItemList').itemListElement.length,cars.length);
 assert.ok(!graph.some(x=>x['@type']==='Product'),'Comparison page does not imply a single purchasable product');
 assert.match(h,/data-market-country="Algeria"/);
 assert.match(h,/data-whatsapp-button="true"/);
 assert.ok(h.includes('/assets/js/phone-input.js'));
 for(const [,href] of h.matchAll(/href="(\/[^"#?]*)/g)){
  assert.ok(fs.existsSync(localSitePath(href)),href);
 }
 assert.doesNotMatch(h,/6,900|7,700|10,500|10,600|11,500|1,000 USD off/);
});
test('localized Coolray keyword pages have visible inbound links',()=>{
 for(const f of ['landing/geely-binyue-export-algeria/index.html','landing/geely-coolray-exporter-china/index.html','fr/export-cars-from-china-to-algeria.html','ar/export-cars-from-china-to-algeria.html']){
  const h=read(f);assert.equal((h.match(/id="algeria-coolray-languages"/g)||[]).length,1);
  for(const l of ['fr','ar'])assert.ok(h.includes(`<a href="/${l}${base}"`));
 }
});
