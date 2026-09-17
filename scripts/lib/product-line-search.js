'use strict';

const defaultConfig = require('../../ops/daily-check/product-line-search.v1.json');
const DAY = 86400000;
const normalizeQuery = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const n = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,10) === value ? value : null;
}
const shift = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0,10);
function localDate(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');
}
function validateConfig(config) {
  if (!Number.isInteger(config.windowDays) || config.windowDays < 1 || !Number.isInteger(config.lagDays) || config.lagDays < 1 || !Number.isInteger(config.minImpressions) || config.minImpressions < 1) throw new Error('Invalid monitoring thresholds');
}
function comparisonWindows({ now, timezone, finalThrough = null, config = defaultConfig }) {
  validateConfig(config);
  const cutoff = shift(localDate(now,timezone),-config.lagDays);
  if (finalThrough !== null && !dateOnly(finalThrough)) throw new Error('Invalid finalized data date');
  const end = finalThrough && finalThrough < cutoff ? finalThrough : cutoff;
  const current = {start:shift(end,1-config.windowDays),end,timezone};
  const previous = {start:shift(current.start,-config.windowDays),end:shift(current.start,-1),timezone};
  return {previous,current};
}
const missingMetrics = () => ({impressions:null,clicks:null,ctr:null,averagePosition:null,lowSample:null,top10:'not_observed'});
const nonnegative = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function metrics(rows, minImpressions = defaultConfig.minImpressions) {
  if (!rows.length) return missingMetrics();
  if (rows.some(r=>!nonnegative(r.impressions) || !nonnegative(r.clicks) || r.clicks > r.impressions || (r.position !== null && r.position !== undefined && (!Number.isFinite(r.position) || r.position < 1)))) return {...missingMetrics(),dataStatus:'invalid_data'};
  const impressions = rows.reduce((n,r)=>n+r.impressions,0), clicks=rows.reduce((n,r)=>n+r.clicks,0);
  const completePosition = rows.every(r=>r.impressions===0 || (typeof r.position==='number' && Number.isFinite(r.position) && r.position>=1));
  const averagePosition = impressions > 0 && completePosition ? rows.reduce((n,r)=>n+(r.impressions ? r.impressions*r.position : 0),0)/impressions : null;
  const lowSample = impressions < minImpressions;
  return {impressions,clicks,ctr:impressions>0?clicks/impressions:null,averagePosition,lowSample,
    top10:averagePosition===null?'not_observed':averagePosition<=10?(lowSample?'low_sample_top10':'window_average_top10'):'outside_top10'};
}

function buildProductLineReport({now, sources = {}, config = defaultConfig}) {
  validateConfig(config);
  if (!now || !Number.isFinite(Date.parse(now))) throw new Error('An explicit report timestamp is required');
  const engines={};
  for (const engine of ['google','yandex']) {
    const source=sources[engine] || {};
    // Yandex timezone must come from the adapter's actual data contract, never guessed.
    const timezone=engine==='google'?'America/Los_Angeles':source.timezone;
    let windows=null,sourceError=null;
    try { windows=timezone?comparisonWindows({now,timezone,finalThrough:source.finalThrough||null,config}):null; } catch { sourceError='Invalid source timezone or finalized data date'; }
    const sourceAvailable=!sourceError && source.status==='available' && dateOnly(source.finalThrough) && timezone && ['observed','fixture'].includes(source.dataKind);
    const results=[];
    for(const product of config.productLines) for(const candidate of product.candidates) {
      const periods={};
      for(const period of ['previous','current']) {
        const window=windows?.[period] || null;
        const supplied=window && (source.windows||[]).find(w=>w.start===window.start && w.end===window.end && w.timezone===window.timezone && w.searchType===config.searchType);
        const complete=sourceAvailable && supplied?.complete===true && Array.isArray(supplied.rows);
        const scopeRows=complete ? supplied.rows.filter(r=>normalizeQuery(r.query)===normalizeQuery(candidate.query) && (!product.targetCountry || r.country===product.targetCountry)) : [];
        // Rows are one full-window aggregate per query/country/page/device/search-type tuple.
        const dims=['query','country','page','device'];
        const invalidDimensions=scopeRows.some(r=>dims.some(k=>typeof r[k]!=='string'||!r[k].trim()) || r.searchType!==config.searchType);
        const keys=scopeRows.map(r=>JSON.stringify([...dims.map(k=>r[k]),r.searchType]));
        const duplicateRows=new Set(keys).size!==keys.length;
        const aggregate=metrics(scopeRows,config.minImpressions);
        const dataStatus=!sourceAvailable?'unavailable':!complete?'incomplete_window':invalidDimensions||duplicateRows||aggregate.dataStatus==='invalid_data'?'invalid_data':!scopeRows.length?'not_returned':'observed_rows';
        const accepted=dataStatus==='observed_rows';
        periods[period]={window,dataStatus,reason:dataStatus==='not_returned'?'No returned query rows; zero, anonymization and absence cannot be distinguished.':dataStatus==='unavailable'?'Authorized finalized query data not obtained.':dataStatus==='incomplete_window'?'A matching complete finalized window is required.':dataStatus==='invalid_data'?'Invalid metrics, dimensions or duplicate aggregates.':null,
          metrics:accepted?aggregate:missingMetrics(),
          rows:accepted?scopeRows.map(r=>({actualQuery:r.query,actualCountry:r.country,page:r.page,device:r.device,searchType:r.searchType,dataStart:window.start,dataEnd:window.end,...metrics([r],config.minImpressions)})):[]};
      }
      const a=periods.previous.metrics,b=periods.current.metrics;
      results.push({productLine:product.id,candidateQuery:candidate.query,candidateStatus:candidate.status,nameVerification:candidate.nameVerification,targetCountry:product.targetCountry,targetPage:product.targetPage,...periods,
        change:{impressions:a.impressions!==null&&b.impressions!==null?b.impressions-a.impressions:null,clicks:a.clicks!==null&&b.clicks!==null?b.clicks-a.clicks:null,averagePosition:a.averagePosition!==null&&b.averagePosition!==null?b.averagePosition-a.averagePosition:null}});
    }
    engines[engine]={sourceError,dataKind:sourceAvailable?source.dataKind:'not_obtained',status:sourceAvailable?'available':'unavailable',timezone:timezone||null,finalThrough:source.finalThrough||null,windows,coverage:'Returned exact-candidate query rows only; not all searches or site-wide rankings. Page-level impressions are summed.',results};
  }
  return {schemaVersion:1,configVersion:config.version,generatedAt:now,reportTimezone:config.reportTimezone,internalRule:{minImpressions:config.minImpressions,lagDays:config.lagDays,windowDays:config.windowDays,note:config.ruleNote},engines};
}
// Opt-in additive extension. Never rewrites historical files or calls a remote service.
function withProductLineMonitoring(summary,input) {
  return {...summary,productLineMonitoring:buildProductLineReport(input)};
}
function renderProductLineReport(report) {
  const output=['# 六类车型搜索监测','', '生成时间：'+report.generatedAt+'；报告时区：'+report.reportTimezone,
    '候选词不代表搜索量已验证。低样本门槛 '+report.internalRule.minImpressions+' 次展现为内部规则；单窗口前10不代表稳定达标。',''];
  for(const [engine,source] of Object.entries(report.engines)) {
    output.push('## '+engine,'','数据状态：'+source.status+'；来源：'+source.dataKind+'；统计时区：'+(source.timezone||'未取得'));
    for(const period of ['previous','current']) {
      const w=source.windows?.[period];
      output.push(period+'：'+(w?w.start+' 至 '+w.end:'未取得'));
    }
    output.push('','| 产品线 | 候选词 | 当前数据 | 展现 | 点击 | CTR | 平均排名 | 低样本 | 前10状态 |','|---|---|---|---:|---:|---:|---:|---|---|');
    const show=n=>n===null?'未取得':String(Math.round(n*10000)/10000);
    for(const r of source.results) {const m=r.current.metrics;output.push('| '+[r.productLine,r.candidateQuery.replace(/\|/g,'\\|'),r.current.dataStatus,show(m.impressions),show(m.clicks),show(m.ctr),show(m.averagePosition),m.lowSample===null?'未取得':m.lowSample?'是':'否',m.top10].join(' | ')+' |');}
    output.push('');
  }
  return output.join('\n').trimEnd()+'\n';
}
module.exports={comparisonWindows,metrics,buildProductLineReport,withProductLineMonitoring,renderProductLineReport};
