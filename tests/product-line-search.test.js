const test=require('node:test');
const assert=require('node:assert/strict');
const {comparisonWindows,metrics,buildProductLineReport,withProductLineMonitoring,renderProductLineReport}=require('../scripts/lib/product-line-search');
const config=require('../ops/daily-check/product-line-search.v1.json');
const now='2026-09-17T08:00:00Z';
const windows=comparisonWindows({now,timezone:'America/Los_Angeles',finalThrough:'2026-09-13'});
const row=(extra={})=>({query:'Geely Coolray price in China',country:'dza',page:'https://zhongguauto.com/landing/geely-coolray-exporter-china/',device:'MOBILE',searchType:'web',impressions:10,clicks:2,position:5,...extra});
const fixture=(previous,current,extras={})=>({status:'available',dataKind:'fixture',finalThrough:'2026-09-13',windows:['previous','current'].map(k=>({...windows[k],searchType:'web',complete:true,rows:k==='previous'?previous:current})),...extras});
const report=source=>buildProductLineReport({now,sources:{google:source}});
const first=source=>report(source).engines.google.results[0];
test('18 candidate terms cover six lines with no invented target markets',()=>{
  assert.equal(config.productLines.length,6);
  assert.equal(config.productLines.flatMap(l=>l.candidates).length,18);
  for(const line of config.productLines)assert.equal(line.targetCountry,null);
});
test('comparison uses adjacent non-overlapping complete 28 day windows with date lag and timezone',()=>{
  assert.deepEqual(windows,{previous:{start:'2026-07-20',end:'2026-08-16',timezone:'America/Los_Angeles'},current:{start:'2026-08-17',end:'2026-09-13',timezone:'America/Los_Angeles'}});
  const w=comparisonWindows({now:'2026-09-17T01:00:00Z',timezone:'America/Los_Angeles',finalThrough:'2026-09-17'});
  assert.equal(w.current.end,'2026-09-13'); // Sept 16 in PT, less the configured three-day lag.
  assert.throws(()=>comparisonWindows({now,timezone:'UTC',finalThrough:'2026-02-30'}));
  assert.throws(()=>comparisonWindows({now,timezone:'UTC',config:{...config,lagDays:0}}));
});
test('position is impression weighted and CTR is total clicks divided by impressions',()=>{
  const result=metrics([row({impressions:10,clicks:5,position:2,ctr:0.9}),row({impressions:90,clicks:9,position:12,ctr:0.9})]);
  assert.equal(result.averagePosition,11);
  assert.equal(result.ctr,0.14);
  assert.equal(result.impressions,100);
  assert.equal(result.lowSample,false);
});
test('missing query rows, unavailable source and zero impressions remain distinct',()=>{
  const unavailable=report().engines;
  for(const engine of ['google','yandex'])for(const term of unavailable[engine].results){
    assert.equal(term.current.dataStatus,'unavailable');
    assert.equal(term.current.metrics.impressions,null);
    assert.equal(term.current.metrics.averagePosition,null);
  }
  const absent=first(fixture([],[]));
  assert.equal(absent.current.dataStatus,'not_returned');
  assert.equal(absent.current.metrics.impressions,null);
  const zero=first(fixture([],[row({impressions:0,clicks:0,position:null})]));
  assert.equal(zero.current.dataStatus,'observed_rows');
  assert.equal(zero.current.metrics.impressions,0);
  assert.equal(zero.current.metrics.averagePosition,null);
  assert.equal(zero.current.metrics.ctr,null);
});
test('low-sample top10 never becomes stable success and missing positive-impression ranks stay null',()=>{
  assert.equal(metrics([row()]).top10,'low_sample_top10');
  assert.equal(metrics([row({impressions:100})]).top10,'window_average_top10');
  assert.equal(metrics([row({position:null})]).averagePosition,null);
  assert.equal(metrics([row(),row({position:null})]).averagePosition,null);
  assert.equal(metrics([row()],5).lowSample,false);
});
test('reports preserve actual query, page, country, device and dates without blending engines',()=>{
  const result=first(fixture([row()],[row({query:'geely coolray price in China',impressions:120,clicks:6})]));
  assert.equal(result.targetCountry,null);
  assert.equal(result.current.rows[0].actualCountry,'dza');
  assert.equal(result.current.rows[0].actualQuery,'geely coolray price in China');
  assert.equal(result.current.rows[0].device,'MOBILE');
  assert.equal(result.current.rows[0].dataEnd,'2026-09-13');
  assert.equal(result.change.impressions,110);
  assert.equal(report(fixture([],[])).engines.yandex.status,'unavailable');
});
test('incomplete, wrong timezone and wrong search-type windows cannot yield ranking evidence',()=>{
  for(const patch of [{complete:false},{timezone:'UTC'},{searchType:'image'}]){
    const source=fixture([],[row()]);
    Object.assign(source.windows[1],patch);
    assert.equal(first(source).current.dataStatus,'incomplete_window');
    assert.equal(first(source).current.metrics.averagePosition,null);
  }
});
test('invalid metrics, missing dimensions and duplicate rows fail closed',()=>{
  for(const rows of [[row({impressions:-1})],[row({clicks:11})],[row({position:0})],[row({country:null})],[row(),row()]]){
    const current=first(fixture([],rows)).current;
    assert.equal(current.dataStatus,'invalid_data');
    assert.equal(current.metrics.impressions,null);
  }
});
test('country filter is explicit, dataKind must be declared and finalThrough is required',()=>{
  const targeted=structuredClone(config);targeted.productLines[0].targetCountry='usa';
  const r=buildProductLineReport({now,config:targeted,sources:{google:fixture([],[row()])}});
  assert.equal(r.engines.google.results[0].current.dataStatus,'not_returned');
  assert.equal(first(fixture([],[row()],{dataKind:undefined})).current.dataStatus,'unavailable');
  assert.equal(first(fixture([],[row()],{finalThrough:null})).current.dataStatus,'unavailable');
});
test('additive summary extension preserves existing schema and does not mutate caller data',()=>{
  const old={date:'2026-09-17',stages:{A:{status:'success'}},google:{indexed:164},overall_status:'success_with_blocks'};
  const before=structuredClone(old),source=fixture([],[row()]),input={now,sources:{google:source}},inputBefore=structuredClone(input);
  const result=withProductLineMonitoring(old,input);
  for(const key of Object.keys(old))assert.deepEqual(result[key],old[key]);
  assert.deepEqual(old,before);
  assert.deepEqual(input,inputBefore);
  assert.equal(result.productLineMonitoring.schemaVersion,1);
  assert.match(renderProductLineReport(result.productLineMonitoring),/fixture/);
  assert.match(renderProductLineReport(report()),/未取得/);
});

test('malformed source metadata cannot prevent reporting the other engine',()=>{
  const r=buildProductLineReport({now,sources:{google:fixture([],[row()],{finalThrough:'bad-date'}),yandex:{status:'available',dataKind:'fixture',timezone:'invalid/timezone',finalThrough:'2026-09-13'}}});
  assert.equal(r.engines.google.status,'unavailable');
  assert.equal(r.engines.yandex.status,'unavailable');
  assert.ok(r.engines.google.sourceError);
  assert.equal(r.engines.google.results.length,18);
});
