const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function load(file, response, options={}){
 const html=fs.readFileSync(path.join(__dirname,'..','admin',file),'utf8');
 const start=html.indexOf('async function requireLogin()');
 const end=html.indexOf(file==='index.html'?'    function renderHome':'    (async()=>',start);
 const redirects=[],calls=[],writes=[];
 const context={fetch:async(url,init)=>{calls.push({url,init});if(response instanceof Error)throw response;return response;},sessionStorage:{getItem(){throw Error('Tab cache must not authorize');},setItem(...a){if(options.blockedStorage)throw Error('storage blocked');writes.push(a);},removeItem(){if(options.blockedStorage)throw Error('storage blocked');}},location:{href:'',replace:p=>redirects.push(p)},document:{getElementById:()=>({textContent:''})}};
 context.window=context;vm.createContext(context);vm.runInContext(html.slice(start,end),context);return{context,calls,redirects,writes,run:()=>context.requireLogin()};
}
const response=(status,user={role:'admin',name:'Test'})=>({status,ok:status===200,json:async()=>({ok:true,user})});
for(const file of ['index.html','daily-report.html']){
 test(file+': valid server session works in fresh tab without cache',async()=>{const x=load(file,response(200));assert.ok(await x.run());assert.equal(x.calls.length,1);assert.equal(x.calls[0].url,'/api/admin/me');assert.equal(x.context.location.href,'');assert.equal(x.redirects.length,0);});
 test(file+': storage unavailable does not invalidate server session',async()=>{const x=load(file,response(200),{blockedStorage:true});assert.ok(await x.run());});
 test(file+': expired session is rejected even if tab storage throws',async()=>{const x=load(file,response(401),{blockedStorage:true});assert.ok(!await x.run());assert.ok(x.context.location.href==='/admin/login.html'||x.redirects.includes('/admin/login.html'));});
}
test('daily report rejects non-admin, malformed auth and service errors',async()=>{
 for(const r of [response(200,{role:'sales'}),response(200,null),response(403),response(500),new Error('Network unavailable')]){
  const x=load('daily-report.html',r);await assert.rejects(x.run());assert.equal(x.redirects.length,0);
 }
});
