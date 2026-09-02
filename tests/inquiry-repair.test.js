const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { handler } = require('../netlify/functions/inquiries');
const admin = require('../netlify/functions/admin-inquiries');
const { createSessionCookie } = require('../netlify/functions/admin-session');
const store = require('../netlify/functions/crm-store');
const event = (body, path = '/api/public/inquiries') => ({httpMethod:'POST',path,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const real = {name:'Local unit test', country:'Algeria', market:'Algeria', vehicle:'Example model', whatsapp:'+34 612 345 678'};

test('ordinary server validation preserves customer market independent of phone country, and rejects invalid numbers before saving', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ok:true,status:200}); // no external calls from tests
  try {
    const before = (await store.readLeads()).items.length;
    for (const whatsapp of ['123','abc','+99912345678']) assert.equal((await handler(event({...real,whatsapp}))).statusCode,400);
    assert.equal((await store.readLeads()).items.length,before);
    for(const [whatsapp,expected,region] of [['+34 612 345 678','34612345678','ES'],['+1 213 373 4253','12133734253','US']]) {
      const response = await handler(event({...real,whatsapp}));
      assert.equal(response.statusCode,200);
      const data = JSON.parse(response.body);
      assert.equal(data.lead.whatsapp,expected);
      assert.equal(data.lead.country,'Algeria');
      assert.equal(data.lead.market,'Algeria');
      assert.equal(data.lead.phoneCountry,region);
      assert.equal(data.results.netlifyFormFallback,false);
    }
  } finally {global.fetch=originalFetch;}
});

test('ordinary retry token prevents a second saved lead and webhook', async () => {
  const originalFetch=global.fetch, hook=process.env.ZHONGGU_LEAD_WEBHOOK_URL;
  let calls=0;global.fetch=async()=>{calls++;return {ok:true,status:200};};
  process.env.ZHONGGU_LEAD_WEBHOOK_URL='https://example.invalid/unit-test';
  try {
    const request={...real,submissionId:'7a74a098-064c-43aa-a251-182390445613'};
    const first=JSON.parse((await handler(event(request))).body);
    const second=JSON.parse((await handler(event(request))).body);
    assert.equal(second.id,first.id);assert.equal(second.results.duplicate,true);assert.equal(calls,1);
  }finally{global.fetch=originalFetch;if(hook)process.env.ZHONGGU_LEAD_WEBHOOK_URL=hook;else delete process.env.ZHONGGU_LEAD_WEBHOOK_URL;}
});

test('test-marked ordinary form and WhatsApp click are rejected without writes', async () => {
  const before=(await store.readLeads()).items.length;
  for(const path of ['/api/public/inquiries','/api/public/whatsapp-lead','/api/whatsapp-clicks']){
    const response=await handler(event({...real,sourceUrl:'https://zhongguauto.com/?daily_test_id=INVALID'},path));
    assert.equal(response.statusCode,403);
  }
  assert.equal((await store.readLeads()).items.length,before);
});

test('conflicting synthetic flag aliases cannot bypass authentication', async()=>{
  const before=(await store.readLeads()).items.length;
  for(const flags of [{is_test:false,isTest:true},{is_test:'false',isTest:'true'},{is_test:'true',isTest:false},{is_test:' TRUE '},{isTest:' true '}]){
    assert.equal((await handler(event({...real,...flags}))).statusCode,403);
  }
  assert.equal((await store.readLeads()).items.length,before);
});

test('synthetic records are opt-in read-only, excluded from default listing and exports; all mutation routes fail closed', async () => {
  process.env.ZHONGGU_ADMIN_PASSWORD='test-only-admin-secret';
  const testId='AUTO-TEST-20990101-HOME';
  await store.createLead({name:'[AUTO TEST]',country:'Automation Test',whatsapp:'0000000000',vehicle:'[AUTO TEST]',is_test:true,test_type:'daily_morning_check',test_id:testId});
  const cookie=createSessionCookie().split(';',1)[0];
  const items=(await store.readLeads()).items;
  assert.equal(store.filterLeads(items).some(x=>x.is_test),false);
  assert.equal(store.filterLeads(items,new URLSearchParams('is_test=true&test_id='+testId)).length,1);
  for(const action of ['contact-whatsapp','assign','status','note','']){
    const response=await admin.handler({...event({assignedTo:'admin_chen',status:'contacted',note:'must not save'},'/api/admin/inquiries/'+testId+(action?'/'+action:'')),headers:{cookie}});
    assert.equal(response.statusCode,403,action);
  }
  const patch=await admin.handler({httpMethod:'PATCH',path:'/api/admin/inquiries',headers:{cookie},body:JSON.stringify({id:testId,status:'won'})});
  assert.equal(patch.statusCode,403);
  const after=(await store.readLeads()).items.find(x=>x.test_id===testId);
  assert.equal(after.assignedTo,'');assert.equal(after.status,'new');assert.equal(after.notes.length,0);
  const csv=await admin.handler({httpMethod:'GET',path:'/api/admin/inquiries/export.csv',rawUrl:'https://zhongguauto.com/api/admin/inquiries/export.csv?is_test=true',headers:{cookie}});
  assert.equal(csv.body.includes(testId),false);
});

test('shared form successful submit makes only one CRM POST and goes to thank you', async () => {
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
  const block=source.slice(source.indexOf('const bindInquiryForms ='),source.indexOf('const year = document.getElementById'));
  let listener; const calls=[]; const navigations=[];
  const button={textContent:'Quote'};
  const form={dataset:{},reportValidity:()=>true,querySelector:()=>button,addEventListener:(_,fn)=>{listener=fn;}};
  const context=vm.createContext({document:{querySelectorAll:()=>[form],documentElement:{lang:'en'}},window:{location:{assign:url=>navigations.push(url)},alert:message=>{throw Error(message);}},FormData:class{set(){}},applyInquiryFieldMappings:()=>{},buildInquiryPayload:()=>({...real}),prepareDailyTestPayload:async p=>p,submitInquiryToCrm:async p=>{calls.push(p);return {stored:true};},crypto:{randomUUID:()=> '88169063-ced1-4b03-9a28-c8b0438e5fc3'},console});
  vm.runInContext(block+'\nbindInquiryForms();',context);
  await listener({preventDefault(){}});
  assert.equal(calls.length,1);assert.deepEqual(navigations,['/thank-you.html']);
  await listener({preventDefault(){}});assert.equal(calls.length,1);
});

test('daily browser lookup fails closed and skips an exact existing record without POST', async () => {
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
  const block=source.slice(source.indexOf('const submitInquiryToCrm ='),source.indexOf('const ensureHiddenField ='));
  const marker='AUTO-TEST-20990101-HOME';
  for(const sample of [
    {status:200,data:{items:[{is_test:true,test_id:marker,id:marker}]},skip:true},
    {status:401,data:{},error:true},
    {status:503,data:{},error:true},
    {status:200,data:{items:[{is_test:false,test_id:marker}]},error:true},
    {status:200,data:{items:[{is_test:true,test_id:marker},{is_test:true,test_id:marker}]},error:true},
    {status:200,data:{},error:true},
    {status:200,data:{items:[]},post:true}
  ]) {
    const requests=[];
    const context=vm.createContext({URLSearchParams,INQUIRY_API:'/api/public/inquiries',console,window:{location:{href:'https://example.invalid/'}},fetch:async(url,options={})=>{
      requests.push({url,method:options.method||'GET'});
      return options.method==='POST'?{ok:true,status:200,text:async()=>JSON.stringify({stored:true,ok:true,results:{externalActionsSuppressed:true}})}:{ok:sample.status===200,status:sample.status,json:async()=>sample.data};
    }});
    const submit=vm.runInContext(block+'\nsubmitInquiryToCrm;',context);
    if(sample.error)await assert.rejects(()=>submit({is_test:true,test_id:marker}));
    else {const result=await submit({is_test:true,test_id:marker});assert.equal(result.stored,true);if(sample.skip)assert.equal(result.results.duplicate,true);}
    assert.equal(requests.filter(r=>r.method==='POST').length,sample.post?1:0);
  }
});

test('ordinary CRM failure does not fall back to a second endpoint and leaves retry available', async()=>{
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
  const block=source.slice(source.indexOf('const bindInquiryForms ='),source.indexOf('const year = document.getElementById'));
  const handlers={};const button={textContent:'Quote'};const form={dataset:{},reportValidity:()=>true,querySelector:()=>button,addEventListener:(name,fn)=>handlers[name]=fn};
  let calls=0,alerts=0;const context=vm.createContext({document:{querySelectorAll:()=>[form],documentElement:{lang:'en'}},window:{location:{assign:()=>assert.fail('must not navigate on failure')},alert:()=>alerts++},FormData:class{set(){}},applyInquiryFieldMappings:()=>{},buildInquiryPayload:()=>({...real}),prepareDailyTestPayload:async p=>p,submitInquiryToCrm:async()=>{calls++;throw Error('Unavailable');},crypto:{randomUUID:()=> '88169063-ced1-4b03-9a28-c8b0438e5fc3'},console:{error(){}}});
  vm.runInContext(block+'\nbindInquiryForms();',context);await handlers.submit({preventDefault(){}});
  assert.equal(calls,1);assert.equal(alerts,1);assert.equal(form.dataset.submitting,'false');assert.equal(button.disabled,false);
});

test('both WhatsApp trackers and lead-session creation are silent on any marked test URL',()=>{
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
  const modal=fs.readFileSync(require.resolve('../assets/js/whatsapp-lead-modal.js'),'utf8');
  const common=source.slice(source.indexOf('const trackWhatsappClickToCrm ='),source.indexOf('const bindWhatsappButtons ='));
  const tracker=modal.slice(modal.indexOf('  const track ='),modal.indexOf('  const hasSpecificVehicle ='));
  const session=modal.slice(modal.indexOf('  const getLeadSessionId ='),modal.indexOf('  const ensureStyle ='));
  for(const search of ['?daily_test_id=AUTO-TEST-20990101-HOME','?daily_test_id=INVALID','?daily_test_id=']){
    const context={URLSearchParams,window:{location:{search}},location:{search}};
    // Any unguarded network/storage/DOM access is undefined and would fail.
    vm.runInNewContext(common+'\ntrackWhatsappClickToCrm({});',context);
    vm.runInNewContext(tracker+'\ntrack("whatsapp_form_open",{});',context);
    assert.equal(vm.runInNewContext(session+'\ngetLeadSessionId();',context),'');
  }
});

test('only the fixed morning-test identity is exempt from client number validation, and only in valid marked mode',()=>{
  const source=fs.readFileSync(require.resolve('../script.js'),'utf8');
  const block=source.slice(source.indexOf('const ensureWhatsappPhoneFields ='),source.indexOf('const insertInquiryField ='));
  const rules=require('../scripts/lib/phone');
  for(const [marker,value,accepted] of [['AUTO-TEST-20990101-HOME','0000000000',true],['','0000000000',false],['AUTO-TEST-20990101-HOME','123',false]]){
    const listeners={};const phone={value,addEventListener:(name,fn)=>listeners[name]=fn,setCustomValidity:message=>phone.error=message};
    const form={querySelector:selector=>selector.includes('select')?null:selector.includes('phone_number')?phone:{},addEventListener(){}};
    const context=vm.createContext({window:{ZhongguPhone:rules},document:{documentElement:{lang:'en'}},ensureHiddenField:()=>({}),dailyTestId:()=>marker});
    const ensure=vm.runInContext(block+'\nensureWhatsappPhoneFields;',context);
    ensure(form,{});assert.equal(phone.error==='',accepted,marker+':'+value);
  }
});
