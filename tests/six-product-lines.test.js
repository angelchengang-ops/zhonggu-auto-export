const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {lines,isUsedBev,availableUsedBevs}=require('../scripts/lib/seo-product-lines');
const baseline=require('../ops/seo/2026-09-17-six-product-lines-baseline.json');
const cars=JSON.parse(read('cars.json'));
const priceApproval=require('../ops/seo/2026-11-18-coolray-price-adjustment.json');
const correctedPrices=require('../ops/seo/2026-11-18-coolray-price-correction.json').changes.filter(c=>c.file==='cars.json');
const correctedBaseline=cars.map(car=>{const c=correctedPrices.find(c=>c.id===car.id);if(!c)return car;assert.deepEqual(car,c.after);return c.before;});
const approvedPriceChanges=priceApproval.changes.filter(c=>c.file==='cars.json');
const fileFor=p=>p.endsWith('/')?p.slice(1)+'index.html':p.replace(/^\//,'');
const graph=h=>[...h.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j]});

test('six early homepage entries link to existing canonical buying pages without dropping catalogue',()=>{
  const home=read('index.html'),priority=home.match(/<section class="section priority-vehicles-section">[\s\S]*?<\/section>/)?.[0];
  assert.ok(priority);
  assert.equal((priority.match(/<a /g)||[]).length,6);
  assert.ok(home.indexOf(priority)<home.indexOf('<section id="new-cars"'));
  for(const line of lines){
    assert.ok(priority.includes('href="'+line.path+'"'));
    const h=read(fileFor(line.path));
    assert.ok(h.includes('rel="canonical" href="https://zhongguauto.com'+line.path+'"'),line.id);
    assert.equal((h.match(/<h1\b/g)||[]).length,1,line.id);
    assert.match(h,/class="inquiry-form"/);
    assert.match(h,/name="calling_code"/);
    assert.match(h,/name="phone_number"/);
    assert.ok(h.indexOf('/assets/js/phone-input.js')<h.indexOf('/script.js'),line.id);
  }
  for(const id of ['new-cars','used-cars','brands','contact']) assert.ok(home.includes('id="'+id+'"'));
});
test('BEV classification rejects petrol, PHEV, EREV, new cars and conflicting records',()=>{
  assert.equal(availableUsedBevs(cars).length,0);
  for(const car of cars.filter(c=>/b70|yueyi-07|xiaoma|yueyi-03/.test(c.id)))assert.equal(isUsedBev(car),false,car.id);
  assert.equal(isUsedBev({isUsed:true,energyType:'BEV'}),true);
  assert.equal(isUsedBev({category:'used',fuel:'Electric'}),true);
  for(const energyType of ['PHEV','Plug-in Hybrid','Petrol','EREV',null]) assert.equal(isUsedBev({isUsed:true,energyType}),false);
  assert.equal(isUsedBev({isUsed:true,energyType:'Electric',fuel:'Plug-in Hybrid'}),false);
  assert.equal(availableUsedBevs([{isUsed:true,energyType:'BEV',inventoryStatus:'Sold'}]).length,0);
});
test('used BEV empty state has useful sourcing form and no invented Product or Offer',()=>{
  const h=read('used-electric-cars-from-china.html');
  assert.match(h,/no verified public used BEV inventory/i);
  assert.match(h,/name="source_url" value="https:\/\/zhongguauto.com\/used-electric-cars-from-china.html"/);
  assert.match(h,/Battery health \(SOH\)/);
  assert.match(h,/Not obtained/);
  assert.match(h,/Model year \/ first registration range/);
  assert.match(h,/Maximum mileage and intended use/);
  assert.doesNotMatch(h,/class="[^"]*js-inquiry-cta[^"]*"[^>]*data-title="Used BEV sourcing request"/);
  assert.ok(graph(h).some(n=>n['@type']==='Service'));
  assert.ok(!graph(h).some(n=>['Product','Offer','Vehicle'].includes(n['@type'])));
  assert.doesNotMatch(h,/schema.org\/InStock|data-vehicle-id="[^"]+"/);
  assert.ok(read('sitemap-pages-current.xml').includes('<loc>https://zhongguauto.com/used-electric-cars-from-china.html</loc>'));
  for(const alias of ['/used-electric-cars-from-china','/used-electric-cars-from-china/']) assert.ok(read('_redirects').includes(alias+' /used-electric-cars-from-china.html 301!'));
});
test('catalogue and vehicle media preserve the baseline; approved landing placeholders use exact replacements',()=>{
  assert.equal(cars.length,baseline.vehicleCount);
  const restored=correctedBaseline.map(car=>{const change=approvedPriceChanges.find(c=>c.id===car.id);if(!change)return car;assert.deepEqual(car,change.after);return change.before;});
  assert.equal(priceApproval.originalCarsSha256,baseline.carsSha256);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(restored)).digest('hex'),priceApproval.originalNormalizedCarsSha256);
  for(const before of baseline.pages){
    const h=read(before.file);
    assert.ok(h.includes('rel="canonical" href="'+before.canonical+'"'),before.file);
    for(const lang of before.languages)assert.ok(h.includes('hreflang="'+lang+'"'),before.file+': '+lang);
    const approvedLandingPages = new Set([
      'landing/geely-coolray-exporter-china/index.html',
      'landing/geely-binyue-export-algeria/index.html'
    ]);
    const placeholderReplacements = {
      '/images/new-cars/geely-coolray-01.jpg': '/images/new-cars/geely-coolray-full-option-nansha/optimized/01-front-three-quarter-right.webp',
      '/images/cars/geely-coolray-2022-01.jpg': '/images/company/warehouse-overview.jpg'
    };
    for(const media of before.media) {
      const replacement = approvedLandingPages.has(before.file) && placeholderReplacements[media];
      const expected = replacement || media;
      assert.ok(h.includes(expected),before.file+': '+expected);
      assert.ok(fs.existsSync(path.join(root,expected.replace(/^\//,''))),expected);
      if(replacement) assert.ok(!h.includes(media),before.file+': obsolete placeholder '+media);
    }
  }
  const full=read('geely-coolray-full-option.html');
  assert.match(full,/data-src="[^"]+\.mp4"/);
  assert.match(full,/US\$9,800/);
});
test('procurement content survives generation and hub data matches actual catalogue values',()=>{
  assert.doesNotMatch(read('geely-coolray-ready-stock-nansha-port.html'),/Priority Africa Keywords|stock disponible Algerie/);
  for(const before of baseline.vehicles) {
    const h=read(before.id+'.html');
    assert.match(h,/product-buying-guide/,before.id);
    assert.ok(h.includes(correctedPrices.find(c=>c.id===before.id)?.after.fobPriceDisplay||approvedPriceChanges.find(c=>c.id===before.id)?.after.fobPriceDisplay||before.price),before.id);
  }
  for(const id of ['used-bestune-b70-2021','used-bestune-b70-2022','used-bestune-b70-2023']){
    const c=cars.find(c=>c.id===id),h=read('used-bestune-b70-wholesale.html');
    assert.ok(h.includes(c.salePriceDisplay));
    assert.ok(h.includes(c.mileage));
    assert.ok(read(id+'.html').includes('/used-bestune-b70-wholesale.html'));
  }
  assert.match(read('bestune-yueyi-03-wholesale.html'),/JoyEE.*Yueyi|Yueyi.*JoyEE/);
  assert.match(read('used-bestune-yueyi-07-phev-export.html'),/used 2025/i);
});
test('changed procurement pages have resolvable local links, reciprocal existing languages and valid metadata',()=>{
  const files=[...new Set([...lines.map(l=>fileFor(l.path)),...baseline.pages.map(p=>p.file)])];
  for(const file of files){
    const h=read(file);
    assert.equal((h.match(/rel="canonical"/g)||[]).length,1,file);
    assert.ok(h.match(/<title>([^<]+)<\/title>/)?.[1],file);
    assert.ok(h.match(/name="description" content="([^"]+)"/)?.[1],file);
    for(const [,url] of h.matchAll(/href="(\/[^"?#]*)/g)){
      if(url.startsWith('//'))continue;
      const route=read('_redirects').split(/\r?\n/).map(l=>l.trim().split(/\s+/)).find(r=>r[0]===url&&/^200!?$/.test(r[2]));
      const fileExists=fs.existsSync(path.join(root,fileFor(url))) || (route && fs.existsSync(path.join(root,fileFor(route[1]))));
      const functionExists=route?.[1].startsWith('/.netlify/functions/') && fs.existsSync(path.join(root,'netlify/functions',route[1].split('/').at(-1)+'.js'));
      assert.ok(fileExists||functionExists,file+': '+url);
    }
  }
});

test('general Coolray buying guide keeps destination attribution independent',()=>{
 const h=read('landing/geely-coolray-exporter-china/index.html');
 assert.doesNotMatch(h,/name="market_country" value="Algeria"/);
 assert.doesNotMatch(h,/Algeria Vehicle Export Support|Ask for Algeria Shipping Quote/);
 assert.ok(h.includes('/landing/geely-binyue-export-algeria/'));
});
