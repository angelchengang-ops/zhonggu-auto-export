const test = require('node:test');
const assert = require('node:assert/strict');
const recovery = require('../scripts/lib/approved-test-recovery');
const store = require('../netlify/functions/crm-store');
const endpoint = require('../netlify/functions/admin-test-recovery');
const admin = require('../netlify/functions/admin-inquiries');
const { createSessionCookie } = require('../netlify/functions/admin-session');
globalThis.__ZHONGGU_CRM_MEMORY__ ||= { leads: [], settings: null };
const memory = globalThis.__ZHONGGU_CRM_MEMORY__;
const fixtures = () => recovery.TARGETS.map(target => ({
  id: target.id, name: '[AUTO TEST] Daily Inquiry Check', country: 'Automation Test',
  rawWhatsapp: '0000000000', whatsapp: '00000000', vehicle: '[AUTO TEST]',
  createdAt: `${target.day}T02:30:00.000Z`, updatedAt: `${target.day}T02:30:00.000Z`,
  message: `Fixed automated test ${target.marker}`, sourceSubmissionId: target.submissionId,
  is_test: false, test_id: '', test_type: '', assignedTo: '', notes: []
}));
const reset = () => { memory.leads = fixtures(); delete memory.legacyTestIsolation; };
const request = (method='GET', body, extraHeaders={}) => {
  process.env.ZHONGGU_ADMIN_PASSWORD='test-only-admin-secret';
  return { httpMethod:method, path:'/.netlify/functions/admin-test-recovery',
    headers:{cookie:createSessionCookie().split(';',1)[0],origin:'https://zhongguauto.com','content-type':'application/json',...extraHeaders},
    body:body?JSON.stringify(body):'' };
};
const confirmation = plan => ({ batch:plan.batch, fingerprint:plan.fingerprint, confirm:'restore-only-approved-two' });

test('legacy recovery requires exactly both approved IDs and fixed identity; preview omits contact details', () => {
  const records=fixtures(), plan=recovery.planRecovery(records);
  assert.equal(plan.eligible,true); assert.equal(plan.complete,false);
  const preview=JSON.stringify(plan);
  for(const privateValue of ['0000000000','Daily Inquiry Check','Fixed automated test'])assert.equal(preview.includes(privateValue),false);
  for(const modify of [
    list=>list.pop(), list=>list.push({...list[0]}), list=>list[0].id='UNAPPROVED',
    list=>list[0].name='Different person', list=>list[0].country='Different market',
    list=>list[0].rawWhatsapp='1234567890', list=>list[0].vehicle='Real model',
    list=>list[0].createdAt='2026-09-03T00:00:00Z', list=>list[0].message='No marker',
    list=>list[0].sourceSubmissionId='OTHER', list=>list[0].assignedTo='sales_zheng',
    list=>Object.assign(list[0],{is_test:true,test_id:'OTHER'})
  ]) {const changed=fixtures();modify(changed);assert.equal(recovery.planRecovery(changed).eligible,false);}
});

test('recovery endpoint denies missing auth, cross-origin and caller-supplied record scope without writes', async () => {
  reset(); const before=JSON.stringify(memory);
  assert.equal((await endpoint.handler(request('GET',null,{cookie:''}))).statusCode,401);
  const plan=await store.inspectApprovedTestRecovery();
  assert.equal((await endpoint.handler(request('POST',confirmation(plan),{origin:'https://example.invalid'}))).statusCode,403);
  assert.equal((await endpoint.handler(request('POST',{...confirmation(plan),ids:['OTHER']}))).statusCode,400);
  assert.equal(JSON.stringify(memory),before);
});

test('approved recovery writes only a registry, is idempotent and excludes the two targets from business actions', async () => {
  reset();memory.leads.push({id:'UNRELATED',name:'Unit fixture',country:'Example',vehicle:'SUV',whatsapp:'example',createdAt:'2026-09-03T00:00:00Z',is_test:false,assignedTo:''});
  const original=JSON.stringify(memory.leads), originalFetch=global.fetch;let networkCalls=0;
  global.fetch=async()=>{networkCalls++;throw new Error('No external request is allowed');};
  try {
    const preview=JSON.parse((await endpoint.handler(request())).body);
    assert.equal((await endpoint.handler(request('POST',{...confirmation(preview),fingerprint:'stale'}))).statusCode,409);
    assert.equal(memory.legacyTestIsolation,undefined);
    const restored=JSON.parse((await endpoint.handler(request('POST',confirmation(preview)))).body);
    assert.equal(restored.complete,true);assert.equal(restored.changed,2);assert.equal(restored.leadCollectionWritten,false);
    assert.equal(restored.externalActionsSuppressed,true);assert.equal(JSON.stringify(memory.leads),original);
    assert.equal(JSON.parse((await endpoint.handler(request('POST',confirmation(preview)))).body).changed,0);
    const items=(await store.readLeads()).items;
    assert.equal(store.filterLeads(items).length,1);assert.equal(store.buildStats(items).total,1);
    assert.equal(store.filterLeads(items,new URLSearchParams('is_test=true')).length,2);
    for(const target of recovery.TARGETS){
      const item=items.find(item=>item.id===target.id);assert.equal(item.test_id,target.testId);assert.equal(item.is_test,true);
      assert.equal(store.toCsv(store.filterLeads(items)).includes(target.marker),false);
      const event=request('POST',{status:'contacted'});event.path='/api/admin/inquiries/'+target.id+'/contact-whatsapp';
      assert.equal((await admin.handler(event)).statusCode,403);
    }
    assert.equal(networkCalls,0);assert.equal(JSON.stringify(memory.leads),original);
  } finally {global.fetch=originalFetch;reset();}
});

test('Forms re-import reproduces the old flag overwrite but approved isolation remains effective', async () => {
  // An independent VM keeps fake Forms credentials and SDK state out of all other tests.
  // Dynamic SDK import has no VM callback, so the existing non-Netlify memory fallback is used.
  const vm=require('node:vm'), fs=require('node:fs');
  const storeFile=require.resolve('../netlify/functions/crm-store');
  const vmMemory={leads:fixtures(),settings:null};
  const originalTarget=fixtures()[0];
  const context=vm.createContext({module:{exports:{}},require:require('node:module').createRequire(storeFile),
    process:{env:{NETLIFY_AUTH_TOKEN:'unit-test-placeholder',NETLIFY_SITE_ID:'unit-test-site'}},
    __ZHONGGU_CRM_MEMORY__:vmMemory,Buffer,URLSearchParams,
    fetch:async url=>{
      if(String(url).endsWith('/forms'))return {ok:true,json:async()=>[{id:'unit-form',name:'inquiry'}]};
      if(String(url).includes('/forms/unit-form/submissions?'))return {ok:true,json:async()=>[
        {id:recovery.TARGETS[0].submissionId,created_at:originalTarget.createdAt,data:originalTarget},
        {id:'unit-unrelated-new',created_at:'2026-09-03T00:00:00Z',data:{name:'Unit fixture',country:'Example',vehicle:'SUV'}}
      ]};
      throw Error('Unexpected external request');
    }});
  vm.runInContext(fs.readFileSync(storeFile,'utf8'),context);
  const isolatedStore=context.module.exports;
    const plan=await isolatedStore.inspectApprovedTestRecovery();await isolatedStore.restoreApprovedTestIsolation(plan.fingerprint);
    // Existing legacy import merges incoming false flags; a new submission causes it to persist.
    vmMemory.leads[0]={...vmMemory.leads[0],is_test:true,test_id:recovery.TARGETS[0].testId,test_type:recovery.TARGETS[0].type};
    const result=await isolatedStore.readLeads({syncForms:true});
    assert.equal(result.formsImport.imported,1);
    assert.equal(vmMemory.leads.find(item=>item.id===originalTarget.id).is_test,false,'legacy merge overwrite reproduced');
    assert.equal(result.items.find(item=>item.id===originalTarget.id).is_test,true,'registry keeps target isolated');
    assert.equal(result.items.find(item=>item.id==='NF-unit-unrelated-new').is_test,false);
    const repeat=await isolatedStore.readLeads({syncForms:true});
    assert.equal(store.filterLeads(repeat.items).some(item=>recovery.TARGETS.some(target=>target.id===item.id)),false);
});

test('registry cannot isolate a different ID or identity and changed preview aborts recovery', async () => {
  reset();const plan=await store.inspectApprovedTestRecovery();
  memory.leads[0].message+=' changed';
  await assert.rejects(store.restoreApprovedTestIsolation(plan.fingerprint),/stale/);
  assert.equal(memory.legacyTestIsolation,undefined);
  const registry=recovery.makeRegistry(plan);
  for(const changed of [{...fixtures()[0],id:'UNAPPROVED'},{...fixtures()[0],name:'Another person'}]){
    assert.equal(recovery.applyIsolation(changed,registry).is_test,false);
  }
  reset();
});
