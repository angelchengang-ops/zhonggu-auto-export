const test=require('node:test'),assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/inquiries');const store=require('../netlify/functions/crm-store');
const request=body=>({httpMethod:'POST',path:'/api/public/inquiries',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const base={name:'Isolated QA',country:'Algeria',vehicle:'QA model',replyChannel:'email',email:'qa-a@example.invalid',language:'fr',quantity:'2',fobOrCif:'CIF'};
test('email-only persists without phone, rejects invalid channel/contact, and keeps email identities separate',async()=>{
 const fetch=global.fetch;global.fetch=async()=>{throw Error('No external requests allowed');};
 try {
  for(const change of [{email:''},{email:'bad'},{replyChannel:'sms'},{replyChannel:'whatsapp',email:''}])assert.equal((await handler(request({...base,...change}))).statusCode,400);
  const token='d2214211-89db-412b-987e-110132412325';
  const a=JSON.parse((await handler(request({...base,submissionId:token}))).body);
  assert.equal(a.stored,true);assert.equal(a.lead.whatsapp,'');assert.equal(a.lead.replyChannel,'email');assert.equal(a.lead.language,'fr');assert.equal(a.lead.fobOrCif,'CIF');
  const b=JSON.parse((await handler(request({...base,email:'qa-b@example.invalid',submissionId:token}))).body);assert.notEqual(a.id,b.id);
  const retry=JSON.parse((await handler(request({...base,submissionId:token}))).body);assert.equal(retry.id,a.id);assert.equal(retry.results.duplicate,true);
  const assigned=await store.updateLead(a.id,{assignedTo:'isolated_qa_sales'}, {name:'QA'});assert.equal(assigned.assignedTo,'isolated_qa_sales');assert.equal(assigned.email,base.email);
  const wa=JSON.parse((await handler(request({...base,replyChannel:'whatsapp',email:'',whatsapp:'+34 612 345 678'}))).body);assert.equal(wa.lead.replyChannel,'whatsapp');assert.equal((await store.updateLead(wa.id,{assignedTo:'isolated_qa_sales'})).assignedTo,'isolated_qa_sales');
  const filtered=store.filterLeads((await store.readLeads()).items,new URLSearchParams('replyChannel=email'));assert.ok(filtered.some(x=>x.id===a.id));
 }finally{global.fetch=fetch;}
});
test('authorized synthetic email is retained, notification suppressed, and cannot be assigned',async()=>{
 const old=process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET;process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET='unit-only';
 try{const event=request({...base,is_test:true,test_type:'daily_morning_check',test_id:'AUTO-TEST-20990101-QA_EMAIL'});event.headers['x-zhonggu-synthetic-secret']='unit-only';
 const r=JSON.parse((await handler(event)).body);assert.equal(r.stored,true);assert.equal(r.results.externalActionsSuppressed,true);assert.equal(r.lead.whatsapp,'');
 await assert.rejects(()=>store.updateLead(r.id,{assignedTo:'isolated_qa_sales'}),/read-only/);
 }finally{if(old)process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET=old;else delete process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET;}
});
test('email notification opens its exact DingTalk detail and WhatsApp notification opens the chat',async()=>{
 const original=global.fetch,calls=[];global.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({errcode:0,task_id:123})};};
 try{const transport=require('../netlify/lib/dingtalk-inquiry');await transport.notifyInquiry({...base,id:'QA-EMAIL'},'unit-only','a'.repeat(64));await transport.notifyInquiry({id:'QA-WA',whatsapp:'12133734253'},'unit-only');
 assert.equal(calls[0].msg.action_card.single_url,'eapp://pages/detail/index?ref='+'a'.repeat(64));assert.match(calls[0].msg.action_card.markdown,/qa-a@example.invalid/);assert.equal(calls[1].msg.action_card.single_url,'https://wa.me/12133734253');
 }finally{global.fetch=original;}
});

test('sourcing inquiries stay on the website workflow and keep the listing and contact channel', async () => {
  const previousFetch = global.fetch;
  const previousWebhook = process.env.ZHONGGU_LEAD_WEBHOOK_URL;
  const calls = [];
  process.env.ZHONGGU_LEAD_WEBHOOK_URL = 'https://example.invalid/sourcing-webhook';
  global.fetch = async (url, options) => {
    assert.equal(url, process.env.ZHONGGU_LEAD_WEBHOOK_URL);
    calls.push(JSON.parse(options.body).lead);
    return {ok: true, status: 200};
  };
  try {
    const sourcing = {
      ...base, sourceEntry: 'car_sourcing', vehicle: 'Example model',
      listingUrl: 'https://www.guazi.com/example', message: 'Check service history'
    };
    for (const listingUrl of ['', 'javascript:alert(1)', 'https://name:secret@example.invalid/']) {
      assert.equal((await handler(request({...sourcing, listingUrl}))).statusCode, 400);
    }
    const email = JSON.parse((await handler(request({
      ...sourcing, submissionId: '6268be80-6713-4545-822e-7acc42276d89'
    }))).body);
    const wa = JSON.parse((await handler(request({
      ...sourcing, replyChannel: 'whatsapp', email: '', whatsapp: '+34 612 345 678'
    }))).body);
    assert.equal(email.lead.whatsapp, '');
    assert.equal(wa.lead.whatsapp, '34612345678');
    assert.equal(wa.lead.country, 'Algeria');
    assert.equal(wa.lead.phoneCountry, 'ES');
    for (const result of [email, wa]) {
      assert.equal(result.stored, true);
      assert.equal(result.lead.sourceType, 'website');
      assert.equal(result.lead.sourceDetail, 'Car Sourcing');
      assert.equal(result.lead.listingUrl, sourcing.listingUrl);
      assert.equal(result.lead.vehicle, 'Car Sourcing · Example model');
      assert.equal(result.lead.message, 'Listing: ' + sourcing.listingUrl + '\nCheck service history');
      const assigned = await store.updateLead(result.id, {assignedTo: 'isolated_qa_sales'});
      assert.equal(assigned.listingUrl, sourcing.listingUrl);
    }
    const retry = JSON.parse((await handler(request({
      ...sourcing, submissionId: '6268be80-6713-4545-822e-7acc42276d89'
    }))).body);
    assert.equal(retry.id, email.id);
    assert.equal(retry.results.duplicate, true);
    assert.deepEqual(calls.map(lead => lead.id), [email.id, wa.id]);
    const filtered = store.filterLeads((await store.readLeads()).items, new URLSearchParams('entry=car_sourcing'));
    assert.deepEqual(new Set(filtered.map(lead => lead.id)), new Set([email.id, wa.id]));
  } finally {
    global.fetch = previousFetch;
    if (previousWebhook) process.env.ZHONGGU_LEAD_WEBHOOK_URL = previousWebhook;
    else delete process.env.ZHONGGU_LEAD_WEBHOOK_URL;
  }
});
