'use strict';
// Local browser + real Netlify handler + memory storage. No production writes or outbound requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
for(const name of Object.keys(process.env)) if (/^(NETLIFY|AWS_|ZHONGGU_LEAD_WEBHOOK)/.test(name)) delete process.env[name];
global.fetch=async()=>{throw Error('External requests disabled in local acceptance');};
const {handler}=require('../netlify/functions/inquiries');
const store=require('../netlify/functions/crm-store');
const root=path.resolve(__dirname,'..'),output=path.resolve(process.env.TRACKING_QA_OUTPUT || path.join(root,'tmp/lead-tracking-qa'));
fs.mkdirSync(output,{recursive:true});
const urls=[...new Set(['sitemap-pages-current.xml','sitemap-landing-current.xml','sitemap-vehicles-current.xml'].flatMap(file=>[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname)))];
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
const posts=[];let failNext=false;
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(req.method==='POST' && ['/api/public/inquiries','/api/public/whatsapp-lead'].includes(pathname)){
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);posts.push({pathname,body});
    if(failNext){failNext=false;res.writeHead(503,{'content-type':'application/json'});return res.end('{"stored":false,"error":"Local simulated failure"}');}
    const info=console.info;console.info=()=>{};let result;try{result=await handler({httpMethod:'POST',path:pathname,headers:{'content-type':'application/json'},body:raw});}finally{console.info=info;}
    res.writeHead(result.statusCode,result.headers);return res.end(result.body);
  }
  if(pathname.startsWith('/api/')){res.writeHead(200,{'content-type':'application/json'});return res.end('{}');}
  if(req.method!=='GET'){res.writeHead(405);return res.end();}
  let file=path.resolve(root,'.'+decodeURIComponent(pathname)+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)||pathname.startsWith('/.')){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)&&!path.extname(file))file+='.html';
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500);res.end('Local QA error');console.error(error.message);}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});const rows=[],scenarios=[];let blockedExternal=0;
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){blockedExternal++;return route.fulfill({status:204,body:''});}return route.continue();});
   await context.addInitScript(()=>{window.dataLayer=[];const push=window.dataLayer.push;window.dataLayer.push=function(...events){const logs=JSON.parse(sessionStorage.getItem('qaEvents')||'[]');logs.push(...events.map(e=>JSON.parse(JSON.stringify(e))));sessionStorage.setItem('qaEvents',JSON.stringify(logs));return push.apply(this,events);};});
   const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
   const conversionCount=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('qaEvents')||'[]').filter(e=>e.event==='lead_submit_success').length);
   const visit=async url=>{const response=await page.goto(origin+url,{waitUntil:'load'});assert.equal(response.status(),200,url);await page.waitForFunction(()=>window.ZhongguTracking && [...document.querySelectorAll('form.inquiry-form')].every(f=>f.dataset.submitBound==='true'));};
   const fill=async form=>{
    await form.locator('[name="name"]').fill('[LOCAL QA ONLY]');const country=form.locator('[name="country"]');if(await country.isVisible())await country.fill('Algeria');
    for(const field of ['model','vehicle']){const el=form.locator('[name="'+field+'"]').first();if(await el.count()&&await el.isVisible()&&!(await el.inputValue()))await el.fill('Local fixture Coolray');}
    await form.locator('[name="calling_code"]').selectOption('+1');await form.locator('[name="phone_number"]').fill('2025550123');
   };
   await visit('/landing/geely-binyue-export-algeria/?gclid=LOCAL_QA_CLICK&utm_source=google&utm_medium=cpc&utm_campaign=Algeria&utm_term=geely+coolray&utm_content=qa&gbraid=LOCAL_GB&wbraid=LOCAL_WB');
   for(const url of urls){
    const row={url,width};rows.push(row);const errorStart=errors.length;
    try{
     await visit(url);const forms=page.locator('form.inquiry-form');row.forms=await forms.count();
     assert.equal(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1),false,'horizontal overflow');
     assert.equal(await page.evaluate(()=>window.ZhongguTracking.getAttribution().first_touch.gclid),'LOCAL_QA_CLICK');
     row.tracking=true;
     if(row.forms){
      const form=forms.first();await fill(form);assert.equal(await form.evaluate(f=>f.checkValidity()),true,'valid form rejected');
      const before=await conversionCount(),requests=posts.length;
      await form.evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.waitForURL('**/thank-you.html');
      assert.equal(posts.length,requests+1,'double submit created multiple requests');assert.equal(await conversionCount(),before+1,'must convert once');
      const payload=posts.at(-1).body;assert.equal(payload.attribution.first_touch.gclid,'LOCAL_QA_CLICK');assert.equal(payload.attribution.first_touch.utm_campaign,'Algeria');
      assert.ok(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('qaEvents')).some(e=>e.event==='lead_form_open')));
      row.submission='persisted_in_memory_and_one_event';
     }
     assert.deepEqual(errors.slice(errorStart),[],'page errors');row.passed=true;
    }catch(error){row.passed=false;row.error=error.message;console.error('FAIL',width,url,error.message);}
   }
   // Failure -> retry, retaining one submission ID; the failure cannot convert.
   await visit('/contact.html');let form=page.locator('form.inquiry-form').first();await fill(form);const count=await conversionCount();failNext=true;
   await form.evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.waitForFunction(()=>document.querySelector('form.inquiry-form').dataset.submitting==='false');
   assert.equal(await conversionCount(),count);const retryId=posts.at(-1).body.submissionId;
   await form.evaluate(f=>f.requestSubmit());await page.waitForURL('**/thank-you.html');assert.equal(posts.at(-1).body.submissionId,retryId);assert.equal(await conversionCount(),count+1);
   await page.reload();await page.reload();assert.equal(await conversionCount(),count+1);scenarios.push({width,name:'failure-retry-and-thank-you-refresh',passed:true});
   // Real modal UI, unchanged entry and success view, same handler and attribution.
   await visit('/landing/geely-binyue-export-algeria/');await page.waitForFunction(()=>window.ZhongguWhatsappLeadModal);
   await page.locator('a.whatsapp-btn, [data-whatsapp-button="true"]').first().click();const modal=page.locator('.zg-wa-form');await modal.waitFor({state:'visible'});
   assert.ok(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='whatsapp_lead_open'&&e.conversion_role==='secondary')));
   const modalCount=await conversionCount();assert.equal(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='lead_submit_success')),false);
   await modal.locator('[name="name"]').fill('[LOCAL QA ONLY]');await modal.locator('[name="country"]').fill('Algeria');await modal.locator('[name="leadCountryCode"]').fill('+1');await modal.locator('[name="leadWhatsappLocal"]').fill('2025550123');
   await page.screenshot({path:path.join(output,'modal-'+width+'.png')});
   failNext=true;await modal.evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.locator('.zg-wa-status.is-error').waitFor({state:'visible'});assert.equal(await conversionCount(),modalCount);
   const modalId=posts.at(-1).body.submissionId;await modal.evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.locator('.zg-wa-success.is-open').waitFor({state:'visible'});
   assert.equal(posts.at(-1).pathname,'/api/public/whatsapp-lead');assert.equal(posts.at(-1).body.submissionId,modalId);assert.equal(posts.at(-1).body.attribution.first_touch.gclid,'LOCAL_QA_CLICK');
   assert.equal(await conversionCount(),modalCount+1);assert.equal(new URL(page.url()).pathname,'/landing/geely-binyue-export-algeria/');scenarios.push({width,name:'modal-open-failure-retry-persisted-one-event',passed:true});
   await page.keyboard.press('Escape');await visit('/geely-coolray-automatic-super-power-edition-with-sunroof.html');await page.locator('form.inquiry-form').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'ordinary-form-'+width+'.png')});
   await context.close();console.log('Completed browser width '+width+': '+rows.filter(r=>r.width===width&&r.passed).length+'/'+urls.length);
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 const leads=(await store.readLeads()).items;
 const report={checkedAt:new Date().toISOString(),pages:urls.length,checks:rows.length,passed:rows.filter(r=>r.passed).length,scenarios,blockedExternal,productionWrites:0,storage:'memory',savedLeads:leads.length,allSavedAttribution:leads.every(l=>l.attribution?.first_touch.gclid==='LOCAL_QA_CLICK'),rows};
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined},null,2));if(rows.some(r=>!r.passed))process.exitCode=1;
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
