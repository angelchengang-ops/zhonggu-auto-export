const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const base = 'export-cars-from-china-to-iran.html';
const files = [base,`fa/${base}`];
const graph = html => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const data=JSON.parse(m[1]);return data['@graph']||[data];});

test('Iran English and Persian guides are indexable, linked, localized and carry correct attribution',()=>{
  for(const file of files){
    const html=read(file),lang=file.startsWith('fa/')?'fa':'en';
    assert.ok(html.includes(`<html lang="${lang}"${lang==='fa'?' dir="rtl"':''}>`));
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
    assert.ok(html.includes(`rel="canonical" href="https://zhongguauto.com/${file}"`));
    assert.ok(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html));
    for(const [code,target] of [['en',base],['fa',`fa/${base}`],['x-default',base]]) assert.ok(html.includes(`hreflang="${code}" href="https://zhongguauto.com/${target}"`));
    for(const [field,value] of [['market_country','Iran'],['market_region','Middle East'],['language',lang],['source_url',`https://zhongguauto.com/${file}`]]) assert.ok(html.includes(`name="${field}" value="${value}"`));
    assert.ok(read('index.html').includes(`href="/${file}"`));
    assert.ok(read('car-importer-center.html').includes(`href="/${file}"`));
    assert.ok(read('sitemap-pages-current.xml').includes(`<loc>https://zhongguauto.com/${file}</loc>`));
    assert.equal(graph(html).find(n=>n['@type']==='Service').areaServed.name,'Iran');
    for(const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)) assert.ok(fs.existsSync(path.join(root,m[1]==='/'?'index.html':m[1])),m[1]);
    assert.match(html,/US\$11,500/);
    assert.ok(!/11,800|11800/.test(html));
  }
});

test('Iran content and basic inquiry remain usable without third-party scripts or messaging apps',()=>{
  for(const file of files){
    const html=read(file);
    assert.ok(html.includes('data-lightweight-page="true"'));
    assert.ok(html.includes('localized-market-page'));
    assert.ok(!/fonts\.googleapis|fonts\.gstatic|recaptcha|<iframe|<video|<img|lead-gen\.js|whatsapp-lead-modal|https:\/\/wa\.me/.test(html));
    const remoteScripts=[...html.matchAll(/<script[^>]*src="(https?:\/\/[^" ]+)"[^>]*>/g)];
    assert.equal(remoteScripts.length,1);
    assert.match(remoteScripts[0][0],/\basync\b/);
    assert.ok(!/\bdefer\b/.test(remoteScripts[0][0]));
    assert.match(html,/<form[^>]*method="POST"[^>]*data-netlify="true"/);
    for(const field of ['form-name','bot-field','name','country','whatsapp','email','model','message']) assert.ok(html.includes(`name="${field}"`));
    assert.ok(html.includes('href="tel:+8618661888866"'));
    const visible=html.replace(/<script[\s\S]*?<\/script>/g,'');
    for(const faq of graph(html).find(n=>n['@type']==='FAQPage').mainEntity){
      assert.ok(visible.includes(faq.name)); assert.ok(visible.includes(faq.acceptedAnswer.text));
    }
  }
  assert.match(read('script.js'),/if \(!document\.body\.hasAttribute\("data-lightweight-page"\)\) \{\s*loadVehicles\(\)/);
});

test('Persian and Arabic phone digits normalize; Iranian national trunk zero is not doubled',()=>{
  const source=read('script.js');
  const valueFn=source.slice(source.indexOf('const formDataValue ='),source.indexOf('const callingCodeChoices ='));
  const helpers=source.slice(source.indexOf('const normalizeCallingCode ='),source.indexOf('const buildInquiryPayload ='));
  const context=vm.runInNewContext(`${valueFn}\n${helpers}\n({normalizePhoneNumber,buildInternationalWhatsapp});`, {window:{ZhongguPhone:require('../scripts/lib/phone')}});
  assert.equal(context.normalizePhoneNumber('۰۹۱۲ ٠٠٠ ۰۰۰۰'),'09120000000');
  assert.equal(context.buildInternationalWhatsapp(new Map([['calling_code','+98'],['phone_number','۰۹۱۲ ۰۰۰ ۰۰۰۰']])),'+989120000000');
  assert.equal(context.buildInternationalWhatsapp(new Map([['calling_code','+964'],['phone_number','7700000000']])),'+9647700000000');
});

test('changed shared scripts and CSS have content versions despite immutable caching',()=>{
  for(const file of ['index.html',...files,'export-cars-from-china-to-egypt.html','ar/export-cars-from-china-to-iraq.html']){
    const html=read(file);
    for(const asset of ['style.css','script.js']){
      const hash=createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);
      assert.ok(html.includes(`${asset}?v=${hash}`),`${file}: ${asset}`);
    }
  }
});
