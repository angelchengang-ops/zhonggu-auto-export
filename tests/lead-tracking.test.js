const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { buildConfig } = require('../scripts/inject-lead-tracking');
const { normalizeAttribution } = require('../scripts/lib/lead-attribution');
const code = fs.readFileSync(require.resolve('../assets/js/lead-tracking.js'), 'utf8');
const memoryStorage = () => { const data = new Map(); return {getItem: key => data.get(key) || null, setItem: (key,value) => data.set(key,value)}; };
function browser(url='https://zhongguauto.com/', {storage=memoryStorage(), session=memoryStorage(), referrer='', config={}, layer=[], timer=setTimeout}={}) {
  const location = new URL(url), handlers={}, scripts=[];
  const document = {referrer, head:{appendChild: script=>scripts.push(script)},createElement:()=>({}),addEventListener:(name,handler)=>handlers[name]=handler};
  const window = {location,localStorage:storage,sessionStorage:session,dataLayer:layer,ZhongguTrackingConfig:config,setTimeout:timer,clearTimeout};
  vm.runInNewContext(code,{window,document,URL,URLSearchParams,Date,WeakSet,Promise,JSON});
  return {window,api:window.ZhongguTracking,layer,storage,session,handlers,scripts};
}
const receipt = (seed='saved', extra={}) => ({ok:true,success:true,stored:true,id:'INQ-local',conversion:{event:'lead_submit_success',transaction_id:'zg-'+crypto.createHash('sha256').update(seed).digest('hex').slice(0,40)},...extra});
const successes = b => b.layer.filter(x=>x.event==='lead_submit_success');

test('direct arrival stores a real first touch with empty advertising fields and no conversion',()=>{
  const b=browser(); const a=b.api.getAttribution();
  assert.equal(a.first_touch.landing_page,'https://zhongguauto.com/');assert.equal(a.first_touch.gclid,'');
  assert.equal(a.first_ad_touch,null);assert.equal(successes(b).length,0);assert.equal(b.scripts.length,0);
});
test('all campaign fields and first landing survive across pages and direct return visits',()=>{
  const utmOnly=browser('https://zhongguauto.com/contact.html?utm_source=google&utm_campaign=Algeria').api.getAttribution();assert.equal(utmOnly.first_ad_touch.utm_campaign,'Algeria');assert.equal(utmOnly.first_ad_touch.gclid,'');
  const fields={gclid:'TEST_CLICK',gbraid:'TEST_GB',wbraid:'TEST_WB',utm_source:'google',utm_medium:'cpc',utm_campaign:'Algeria',utm_term:'geely coolray',utm_content:'A'};
  const first=browser('https://zhongguauto.com/landing/geely-binyue-export-algeria/?'+new URLSearchParams(fields),{referrer:'https://www.google.com/search?q=private'});
  const next=browser('https://zhongguauto.com/contact.html',{storage:first.storage,referrer:'https://zhongguauto.com/landing/geely-binyue-export-algeria/'});
  const direct=browser('https://zhongguauto.com/contact.html',{storage:first.storage});
  for(const b of [next,direct]) { const a=b.api.getAttribution(); for(const [key,value] of Object.entries(fields)) assert.equal(a.first_touch[key],value); assert.equal(a.last_touch.gclid,'TEST_CLICK');assert.equal(a.first_touch.referrer,'https://www.google.com/search'); }
});
test('first direct visit is preserved separately from first ad and last campaign',()=>{
  const first=browser();const ad=browser('https://zhongguauto.com/contact.html?gclid=FIRST',{storage:first.storage});
  const second=browser('https://zhongguauto.com/contact.html?gclid=SECOND',{storage:first.storage});
  const a=second.api.getAttribution();assert.equal(a.first_touch.gclid,'');assert.equal(a.first_ad_touch.gclid,'FIRST');assert.equal(a.last_touch.gclid,'SECOND');
});
test('expired/corrupt storage recovers; blocked local storage falls back to session then memory',async()=>{
  for(const raw of ['{broken',JSON.stringify({schema_version:1,expires_at:1}),JSON.stringify({schema_version:1,expires_at:Date.now()+1000,first_touch:{},last_touch:{}})]){
    const storage=memoryStorage();storage.setItem('zg_attribution_v1',raw);assert.equal(browser(undefined,{storage}).api.getAttribution().first_touch.gclid,'');
  }
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const session=memoryStorage();browser('https://zhongguauto.com/?gclid=SESSION',{storage:blocked,session});
  const next=browser('https://zhongguauto.com/contact.html',{storage:blocked,session});assert.equal(next.api.getAttribution().first_touch.gclid,'SESSION');
  const b=browser(undefined,{storage:blocked,session:blocked});await b.api.success(receipt(),'inquiry_form');await b.api.success(receipt(),'inquiry_form');assert.equal(successes(b).length,1);
});
test('server sanitization keeps an allowlisted bounded JSON object, stripping URL queries and unknown keys',()=>{
  const touch={landing_page:'https://user:secret@example.com/car?email=x#secret',referrer:'https://google.com/?q=private',captured_at:new Date().toISOString(),gclid:'X'.repeat(999),utm_term:'a\u0000b',unknown:'discard'};
  const a=normalizeAttribution({schema_version:1,first_touch:touch,last_touch:touch});
  assert.equal(a.first_touch.landing_page,'https://example.com/car');assert.equal(a.first_touch.referrer,'https://google.com/');assert.equal(a.first_touch.gclid.length,256);assert.equal(a.first_touch.utm_term,'ab');assert.equal(a.first_touch.unknown,undefined);
  assert.equal(normalizeAttribution({schema_version:1,first_touch:{...touch,landing_page:'javascript:alert(1)'}}),null);
  assert.equal(normalizeAttribution('broken'),null);assert.equal(normalizeAttribution(undefined),null);
});
test('success requires an explicit persisted non-test conversion receipt; failures/clicks never convert',async()=>{
  const b=browser();
  for(const r of [{},receipt('a',{stored:false}),receipt('a',{success:false}),receipt('a',{ok:false}),receipt('a',{id:''}),receipt('a',{conversion:null}),receipt('a',{lead:{is_test:true}}),receipt('a',{results:{externalActionsSuppressed:true}})]) assert.equal(await b.api.success(r,'inquiry_form'),false);
  assert.equal(successes(b).length,0);
});
test('same saved inquiry fires once across retry, refresh, and both entry points; different inquiry still fires',async()=>{
  const b=browser();await b.api.success(receipt(),'inquiry_form');await b.api.success(receipt(),'whatsapp_modal');assert.equal(successes(b).length,1);
  const reload=browser('https://zhongguauto.com/thank-you.html',{storage:b.storage});assert.equal(successes(reload).length,0);
  await reload.api.success(receipt(),'inquiry_form');assert.equal(successes(reload).length,0);
  await reload.api.success(receipt('another'),'whatsapp_modal');assert.equal(successes(reload).length,1);
  assert.equal(successes(reload)[0].lead_channel,'whatsapp_modal');
});
test('direct and repeated thank-you loads never synthesize a success event',()=>{
  const storage=memoryStorage();for(let i=0;i<3;i++) assert.equal(successes(browser('https://zhongguauto.com/thank-you.html',{storage})).length,0);
});
test('events contain no contact values, attribution, or URL query strings',async()=>{
  const b=browser('https://zhongguauto.com/contact.html?email=private&gclid=PRIVATE_CLICK');
  await b.api.success(receipt('saved',{lead:{name:'PRIVATE_NAME',email:'PRIVATE_EMAIL',message:'PRIVATE_BODY',whatsapp:'PRIVATE_PHONE'}}),'inquiry_form');
  const json=JSON.stringify(b.layer);assert.doesNotMatch(json,/PRIVATE|email|whatsapp|gclid|\?/);assert.equal(successes(b)[0].page_path,'/contact.html');
});
test('open events are secondary, ordinary form dedupes focus, modal opens remain observations',()=>{
  const b=browser();const form={};b.api.openForm('inquiry_form',form);b.api.openForm('inquiry_form',form);b.api.openForm('whatsapp_modal');b.api.openForm('whatsapp_modal');
  assert.deepEqual(b.layer.map(e=>e.event),['lead_form_open','whatsapp_lead_open','whatsapp_lead_open']);assert.ok(b.layer.every(e=>e.conversion_role==='secondary'));assert.equal(successes(b).length,0);
});
test('marked morning-check pages do not capture attribution, load GTM, or emit conversion/open events',async()=>{
  const b=browser('https://zhongguauto.com/?daily_test_id=INVALID',{config:{enabled:true,containerId:'GTM-TEST123'}});
  b.api.openForm('inquiry_form',{});await b.api.success(receipt(),'inquiry_form');assert.equal(b.api.getAttribution(),null);assert.equal(b.layer.length,0);assert.equal(b.scripts.length,0);
});
test('GTM is opt-in, invalid placeholders fail build, preview/local origins stay disabled',()=>{
  assert.equal(buildConfig({}).enabled,false);assert.throws(()=>buildConfig({ZHONGGU_GTM_ENABLED:'true'}));assert.throws(()=>buildConfig({ZHONGGU_GTM_ENABLED:'true',ZHONGGU_GTM_CONTAINER_ID:'GTM-XXXX'}));
  assert.equal(buildConfig({ZHONGGU_GTM_ENABLED:'true',ZHONGGU_GTM_CONTAINER_ID:'GTM-TEST123',CONTEXT:'deploy-preview'}).enabled,false);
  assert.equal(browser('http://127.0.0.1/',{config:{enabled:true,containerId:'GTM-TEST123'}}).scripts.length,0);
});
test('configured GTM preserves prior dataLayer and success waits for callback with bounded timeout fallback',async()=>{
  const layer=[{existing:true}],timers=[];
  const b=browser(undefined,{layer,config:{enabled:true,containerId:'GTM-TEST123'},timer:fn=>{timers.push(fn);return 1;}});
  assert.equal(b.layer[0].existing,true);assert.equal(b.scripts.length,1);
  let settled=false;const pending=b.api.success(receipt(),'inquiry_form').then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);
  successes(b)[0].eventCallback();await pending;assert.equal(settled,true);
  const pending2=b.api.success(receipt('two'),'inquiry_form');timers[1]();await pending2;
});
test('a throwing analytics consumer does not break saved lead handling and allows retry',async()=>{
  const layer=[];layer.push=()=>{throw Error('third party failed');};const b=browser(undefined,{layer});await b.api.success(receipt(),'inquiry_form');
  layer.push=Array.prototype.push;await b.api.success(receipt(),'inquiry_form');assert.equal(successes(b).length,1);
});
test('CRM persists attribution through normalize/read/update/retry and emits stable receipts for both APIs',async()=>{
  const store=require('../netlify/functions/crm-store');const {handler}=require('../netlify/functions/inquiries');
  const originalFetch=global.fetch;global.fetch=async()=>{throw Error('No external requests allowed in unit test');};
  try{
    for(const path of ['/api/public/inquiries','/api/public/whatsapp-lead']) {
      const a=browser('https://zhongguauto.com/?gclid=LOCAL_NOT_REAL&utm_campaign=Algeria').api.getAttribution();
      const body={name:'Local fixture',country:'Algeria',vehicle:'Local fixture Coolray',whatsapp:'+1 213 373 4253',submissionId:crypto.randomUUID(),attribution:a};
      const event={httpMethod:'POST',path,headers:{'content-type':'application/json'},body:JSON.stringify(body)};
      const first=JSON.parse((await handler(event)).body);assert.equal(first.stored,true);assert.equal(first.lead.attribution.first_touch.gclid,'LOCAL_NOT_REAL');assert.equal(first.conversion.event,'lead_submit_success');
      const retry=JSON.parse((await handler(event)).body);assert.equal(retry.id,first.id);assert.equal(retry.conversion.transaction_id,first.conversion.transaction_id);assert.equal(retry.results.duplicate,true);
      const item=(await store.readLeads()).items.find(x=>x.id===first.id);assert.equal(item.attribution.first_touch.utm_campaign,'Algeria');assert.deepEqual(store.normalizeLead(item).attribution,item.attribution);
      const updated=await store.updateLead(first.id,{status:'contacted'},{name:'Local admin fixture'});assert.deepEqual(updated.attribution,item.attribution);
      const b=browser();await b.api.success(first,'inquiry_form');await b.api.success(retry,'inquiry_form');assert.equal(successes(b).length,1);
    }
    const click=JSON.parse((await handler({httpMethod:'POST',path:'/api/whatsapp-clicks',headers:{'content-type':'application/json'},body:'{"eventType":"whatsapp_form_open"}'})).body);
    assert.equal(click.conversion,null);assert.equal(store.normalizeLead({id:'LEGACY'}).attribution,null);
  }finally{global.fetch=originalFetch;}
});
test('ordinary form awaits the tracking attempt before redirect and analytics errors cannot invite a duplicate submit',async()=>{
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');const block=source.slice(source.indexOf('const bindInquiryForms ='),source.indexOf('const year = document.getElementById'));
  for(const throws of [false,true]) {
    const handlers={},order=[];const form={dataset:{},reportValidity:()=>true,querySelector:()=>({textContent:'Quote'}),addEventListener:(name,fn)=>handlers[name]=fn};
    const context={document:{querySelectorAll:()=>[form],documentElement:{lang:'en'}},window:{ZhongguTracking:{success:async(result,channel)=>{assert.equal(result.stored,true);assert.equal(channel,'inquiry_form');order.push('event');if(throws)throw Error('blocked');}},location:{assign:()=>order.push('redirect')},alert:()=>assert.fail('must not fail saved lead')},FormData:class{set(){}},applyInquiryFieldMappings(){},buildInquiryPayload:()=>({}),prepareDailyTestPayload:async p=>p,submitInquiryToCrm:async()=>{order.push('saved');return receipt();},crypto,console};
    vm.runInNewContext(block+'\nbindInquiryForms();',context);await handlers.submit({preventDefault(){}});assert.deepEqual(order,['saved','event','redirect']);
  }
});

test('tracking-only injection and cache versions do not change sitemap editorial dates',()=>{
  const {sameEditorialHtml}=require('../scripts/lib/sitemap-lastmod');
  const old='<head>\n<title>Coolray</title></head>';
  const added='<head>\n  <!-- Zhonggu lead tracking -->\n<script src="/assets/js/lead-tracking.js?v=012345678abc"></script>\n<!-- /Zhonggu lead tracking -->\n<title>Coolray</title></head>';
  assert.equal(sameEditorialHtml(old,added),true);assert.equal(sameEditorialHtml(old,added.replace('Coolray','B70')),false);
});
test('storage failure returns no success receipt',()=>{
  const {execFileSync}=require('node:child_process');
  const env={...process.env,NETLIFY:'true'};for(const key of ['NETLIFY_SITE_ID','NETLIFY_AUTH_TOKEN','NETLIFY_BLOBS_CONTEXT','ZHONGGU_LEAD_WEBHOOK_URL','ZHONGGU_LEAD_WEBHOOK_SECRET'])delete env[key];
  const result=execFileSync(process.execPath,['-e', "console.info=()=>{};console.error=()=>{};global.fetch=async()=>{throw Error('No network');};require('./netlify/functions/inquiries').handler({httpMethod:'POST',path:'/api/public/inquiries',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Local only',country:'Algeria',vehicle:'Local only',whatsapp:'+12025550123'})}).then(r=>{const b=JSON.parse(r.body);console.log(JSON.stringify({status:r.statusCode,stored:b.stored,conversion:b.conversion||null}));});"],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',env,windowsHide:true});
  assert.deepEqual(JSON.parse(result),{status:500,stored:false,conversion:null});
});

test('readable but quota-full localStorage cannot mask newer session attribution or duplicate protection',async()=>{
  const local=memoryStorage(),session=memoryStorage();browser('https://zhongguauto.com/?gclid=FIRST',{storage:local,session});
  const readonly={getItem:key=>local.getItem(key),setItem(){throw Error('Quota exceeded');}};
  const second=browser('https://zhongguauto.com/?gclid=SECOND',{storage:readonly,session});
  await second.api.success(receipt('quota'),'inquiry_form');await second.api.success(receipt('quota'),'inquiry_form');assert.equal(successes(second).length,1);
  const next=browser('https://zhongguauto.com/contact.html',{storage:readonly,session});assert.equal(next.api.getAttribution().first_touch.gclid,'FIRST');assert.equal(next.api.getAttribution().last_touch.gclid,'SECOND');
  await next.api.success(receipt('quota'),'inquiry_form');assert.equal(successes(next).length,0);
});
