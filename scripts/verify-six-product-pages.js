'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'tmp/seo-validation/browser');
fs.mkdirSync(output,{recursive:true});
const {lines}=require('./lib/seo-product-lines');
const baseline=require('../ops/seo/2026-09-17-six-product-lines-baseline.json');
const requested=process.argv.slice(2);
const files=[...new Set([...lines.map(l=>l.path.endsWith('/')?l.path.slice(1)+'index.html':l.path.slice(1)),...baseline.pages.map(p=>p.file),'landing/geely-car-exporter-china/index.html'])].filter(file=>!requested.length||requested.includes(file));
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end();}
  const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)||pathname.startsWith('/.')){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const results=[];let blockedExternal=0,blockedWrites=0;
  try {
    for(const width of [1440,390]) {
      const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
      let mockMode=null;const mockRequests=[];
      await context.route('**/*',async route=>{
        const r=route.request(),u=new URL(r.url());
        if(u.origin!==origin){blockedExternal++;return route.fulfill({status:204,body:''});}
        if(r.method()==='POST' && u.pathname==='/api/public/inquiries' && mockMode){
          mockRequests.push(r.postDataJSON());await new Promise(resolve=>setTimeout(resolve,100));
          return route.fulfill({status:mockMode==='success'?200:503,contentType:'application/json',body:JSON.stringify({stored:mockMode==='success',ok:mockMode==='success',id:'LOCAL_FIXTURE_ONLY'})});
        }
        if(!['GET','HEAD'].includes(r.method())){blockedWrites++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,stored:false,error:'LOCAL_QA_NO_WRITES'})});}
        if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
        return route.continue();
      });
      const page=await context.newPage();page.setDefaultTimeout(7000);page.on('dialog',dialog=>dialog.dismiss());
      for(const file of files) {
        const errors=[],record={file,width,checks:{},errors};results.push(record);
        const pageErrors=[];const onError=e=>pageErrors.push(e.message);page.on('pageerror',onError);
        try {
          const response=await page.goto(origin+'/'+file,{waitUntil:'networkidle'});
          assert.equal(response.status(),200);
          await page.waitForFunction(()=>[...document.querySelectorAll('form.inquiry-form')].every(f=>f.dataset.submitBound==='true'));
          record.checks.formBound=true;
          record.checks.h1Count=await page.locator('h1').count();assert.equal(record.checks.h1Count,1);
          record.checks.overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1);
          assert.equal(record.checks.overflow,false,'Page overflows viewport');
          const form=page.locator('form.inquiry-form').first();
          await form.scrollIntoViewIfNeeded();
          assert.equal(await form.evaluate(f=>f.checkValidity()),false,'Blank required fields must block');
          await form.locator('[name="name"]').fill('[LOCAL BROWSER FIXTURE]');
          await form.locator('[name="country"]').fill('Algeria');
          const model=form.locator('[name="model"]');
          if(await model.count() && !(await model.inputValue())) await model.fill('Local fixture vehicle requirement');
          await form.locator('[name="calling_code"]').selectOption('+34');
          await form.locator('[name="phone_number"]').fill('123');
          await form.locator('[name="phone_number"]').blur();
          assert.equal(await form.evaluate(f=>f.checkValidity()),false,'Short number must block');
          await form.locator('[name="phone_number"]').fill('letters');
          await form.locator('[name="phone_number"]').blur();
          assert.equal(await form.evaluate(f=>f.checkValidity()),false,'Letters must block');
          await form.locator('[name="phone_number"]').fill('612345678');
          await form.locator('[name="phone_number"]').blur();
          assert.equal(await form.evaluate(f=>f.checkValidity()),true,'Cross-country valid local number must pass');
          assert.equal(await form.locator('[name="country"]').inputValue(),'Algeria');
          await form.locator('[name="calling_code"]').selectOption('+213');
          await form.locator('[name="phone_number"]').fill('+34 612345678');
          await form.locator('[name="phone_number"]').blur();
          assert.equal(await form.evaluate(f=>f.checkValidity()),true,'Full international number overrides chosen code');
          const email=form.locator('[name="email"]');
          if(await email.count()){await email.fill('invalid-email');assert.equal(await form.evaluate(f=>f.checkValidity()),false);await email.fill('');}
          for(const [code,number] of [['+20','01012345678'],['+39','02 3661 8300'],['+1','2025550123'],['+98','۰۹۱۲۱۲۳۴۵۶۷']]){
            await form.locator('[name="calling_code"]').selectOption(code);
            await form.locator('[name="phone_number"]').fill(number);
            await form.locator('[name="phone_number"]').blur();
            assert.equal(await form.evaluate(f=>f.checkValidity()),true,'Valid example '+code+' rejected');
            assert.equal(await form.locator('[name="country"]').inputValue(),'Algeria');
          }
          record.checks.prefixAndDigitExamples=true;
          record.checks.validation='required, short, letters, local, international, independent-country, email';
          record.checks.codeOptions=await form.locator('[name="calling_code"] option').count();assert.ok(record.checks.codeOptions>=245);
          await page.evaluate(()=>{for(const img of document.images)img.loading='eager';});
          await page.evaluate(()=>Promise.all([...document.images].map(img=>img.complete?null:new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,4000);}))));
          record.checks.brokenImages=await page.evaluate(()=>[...document.images].filter(img=>img.getAttribute('src')&&!img.naturalWidth).map(img=>img.getAttribute('src')));
          assert.deepEqual(record.checks.brokenImages,[]);
          const thumbs=page.locator('[data-gallery-src]');
          if(await thumbs.count()>1) {
            const main=page.locator('[data-gallery-main]'),old=await main.getAttribute('src');
            await thumbs.nth(1).click();
            assert.notEqual(await main.getAttribute('src'),old);
            record.checks.gallery=true;
          }
          const video=page.locator('video[data-lazy-video]').first();
          if(await video.count()){
            const source=video.locator('source[data-src]');
            assert.equal(await source.getAttribute('src'),null);
            await video.click();
            await page.waitForFunction(()=>document.querySelector('video[data-lazy-video] source')?.getAttribute('src'));
            await page.waitForFunction(()=>document.querySelector('video[data-lazy-video]').readyState>=2);
            record.checks.videoClickToLoad=true;
            await video.evaluate(v=>v.pause());
          }
          await page.evaluate(()=>scrollTo(0,0));
          const quote=page.locator('a.btn[href="#contact"]').first();
          if(await quote.count()){await quote.click();await page.waitForTimeout(150);record.checks.quoteEntry=await form.isVisible();}
          if(file==='used-electric-cars-from-china.html') assert.match(await form.locator('[name="message"]').inputValue(),/Maximum mileage and intended use/);
          if(width===390){
            await page.evaluate(()=>scrollTo(0,0));
            const toggle=page.locator('.menu-toggle');
            await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
            const nav=page.locator('#main-nav a').filter({hasText:'Contact Us'}).first();
            if((await nav.getAttribute('href')).startsWith('#')) {await nav.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
            else {await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
            record.checks.mobileMenu=true;
          }
          const wa=page.locator('a.whatsapp-btn').first();
          if(await wa.count()){
            await wa.click();
            const dialog=page.locator('[role="dialog"].is-open');
            await dialog.waitFor({state:'visible'});
            record.checks.modalOverflow=await dialog.evaluate(el=>el.scrollWidth>innerWidth+1);assert.equal(record.checks.modalOverflow,false);
            await page.keyboard.press('Escape');
            await dialog.waitFor({state:'hidden'});
            record.checks.whatsappOpenClose=true;
          }
          if(file==='index.html')await page.locator('.priority-vehicles-section').scrollIntoViewIfNeeded();
          else await page.evaluate(()=>scrollTo(0,0));
          const slug=file.replace(/[^a-z0-9-]/gi,'_');
          await page.screenshot({path:path.join(output,slug+'-'+width+'.png')});
          if(file==='used-electric-cars-from-china.html'){await form.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'used-bev-form-'+width+'.png')});}
          if(file==='used-electric-cars-from-china.html' && width===390){
            mockMode='failure';
            await form.evaluate(f=>{f.requestSubmit();f.requestSubmit();});
            await page.waitForFunction(()=>document.querySelector('form.inquiry-form').dataset.submitting==='false');
            assert.equal(mockRequests.length,1,'Duplicate trigger must be blocked');
            assert.ok(await form.locator('[name="name"]').inputValue(),'Failure must keep input');
            mockMode='success';
            await form.evaluate(f=>{f.requestSubmit();f.requestSubmit();});
            await page.waitForURL('**/thank-you.html');
            assert.equal(mockRequests.length,2);
            assert.equal(mockRequests[0].submissionId,mockRequests[1].submissionId,'Retry must reuse identity');
            assert.equal(mockRequests[0].country,'Algeria');
            assert.match(mockRequests[0].sourceUrl,/used-electric-cars-from-china\.html/);
            record.checks.mockedFailureRetrySuccess=true;
            record.checks.mockedSingleChannel=true;
            mockMode=null;
          }
          assert.deepEqual(pageErrors,[],'Uncaught browser error');
          record.passed=true;
        } catch(error){errors.push(error.message);record.passed=false;}
        finally{page.off('pageerror',onError);}
        console.log((record.passed?'PASS ':'FAIL ')+width+' '+file+(errors.length?' '+errors.join('; '):''));
      }
      await context.close();
    }
  } finally {
    await browser.close();server.close();
    const report={checkedAt:new Date().toISOString(),environment:'Local Microsoft Edge, headless desktop/390px emulation; no physical phone',pageCount:files.length,results,blockedExternalRequests:blockedExternal,blockedWrites,productionRequests:0};
    fs.writeFileSync(path.join(output,requested.length?'report-targeted.json':'report.json'),JSON.stringify(report,null,2)+'\n');
    if(results.some(r=>!r.passed))process.exitCode=1;
  }
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
