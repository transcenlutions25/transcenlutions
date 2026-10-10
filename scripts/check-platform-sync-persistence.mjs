/** Local-only browser harness. Synthetic identity/backend; real browser IndexedDB and HTTP fetch.
 * Run node scripts/check-platform-sync-persistence.mjs, then open the printed loopback URL.
 * No package install, real credentials, service provisioning or application route is involved. */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { emptySyncState, evaluateSyncMutation, evaluateSyncPull } = require('../lib/platform-sync-contract.ts');
const { resolvePlatformIdentity } = require('../lib/platform-identity.ts');
const modules = ['agent-foundation', 'platform-sync-contract', 'platform-sync-client', 'platform-sync-persistence', 'platform-sync-transport', 'platform-sync-session'];
const bundle = `const modules = {}, cache = {}; function require(name) { name = name.replace(/^\\.\\//,''); if (!cache[name]) { const module = {exports:{}}; cache[name] = module; modules[name](module,module.exports,require); } return cache[name].exports; }\n` + modules.map(name => `modules[${JSON.stringify(name)}] = (module,exports,require) => {\n${ts.transpileModule(readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}\n};`).join('\n');
if (process.argv.includes('--storage-only')) {
  const path = resolve('.sync-storage-tests.html');
  const tests = readFileSync(new URL('./fixtures/platform-sync-storage-browser.js',import.meta.url),'utf8');
  writeFileSync(path, '<!doctype html><meta charset="utf-8"><title>Tay IndexedDB tests</title><h1>Real browser IndexedDB acceptance tests</h1><pre id="results">Running…</pre><script>'+bundle+'</script><script>'+tests+'</script>');
  console.log(path); process.exit(0);
}
const scenarios = new Map();
let trapRequests = 0;
let results = null;
let origin;
let trapOrigin;
const trapServer=createServer((req,res)=>{trapRequests++;res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');});
const account = {tenantId:'fixture-tenant',userId:'fixture-user'};
function identity(s) {return {...s.account,role:'member',sessionId:s.sessionId,source:'authenticated'};}
const authority = {resolve: async s => s.mode === 'revoked' ? null : ({account:s.account,sessionId:s.sessionId,deviceId:'fixture-device',expiresAt:Date.now()+60000,sessionActive:true,deviceActive:true,membershipActive:true,canSyncOwnWorkspace:true})};
const json = (res,status,data) => {res.writeHead(status, {'content-type':'application/json','cache-control':'private, no-store'});res.end(JSON.stringify(data));};
async function body(req) {let text=''; for await (const chunk of req) {text += chunk;if(text.length>100000) throw Error('body');}return JSON.parse(text || '{}');}
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url, origin || 'http://127.0.0.1');
    if (url.pathname === '/') {res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end('<!doctype html><meta charset="utf-8"><title>Tay persistence acceptance tests</title><h1>Local browser persistence acceptance tests</h1><p>Synthetic identity/backend. Real IndexedDB and same-origin HTTP.</p><pre id="results">Running…</pre><script src="/bundle.js"></script><script src="/tests.js"></script>');return;}
    if (url.pathname === '/bundle.js') {res.writeHead(200,{'content-type':'text/javascript'});res.end(bundle);return;}
    if (url.pathname === '/tests.js') {res.writeHead(200,{'content-type':'text/javascript'});res.end(readFileSync(new URL('./fixtures/platform-sync-browser.js',import.meta.url)));return;}
    if (url.pathname === '/results' && req.method === 'POST') {results=await body(req);console.log(JSON.stringify(results));json(res,200,{ok:true});return;}
    if (url.pathname === '/results') {json(res,200,{results});return;}
    if (url.pathname === '/trap') {trapRequests++;json(res,200,{ok:true});return;}
    if (url.pathname === '/fixture' && req.method === 'POST') {
      const input = await body(req);
      if (!/^[a-z0-9-]{1,80}$/.test(input.id)) throw Error('fixture id');
      let s=scenarios.get(input.id);
      if (!s) {s={account:{...account},sessionId:'fixture-session',state:emptySyncState(account),mode:'active',delay:0,pushes:0,pulls:0,identities:0};scenarios.set(input.id,s);}
      if (input.mode) s.mode=input.mode;
      if (input.delay !== undefined) s.delay=input.delay;
      if (input.switchAccount) {s.account={tenantId:'fixture-other',userId:'fixture-other-user'};s.sessionId='fixture-other-session';}
      json(res,200,{ok:true,state:s.state,pushes:s.pushes,pulls:s.pulls,identities:s.identities,trapRequests,trapUrl:trapOrigin});return;
    }
    const s = scenarios.get(req.headers['x-fixture-scenario']);
    if (!s) {json(res,401,{ok:false});return;}
    if (url.pathname === '/api/platform/identity') {
      s.identities++;
      if (s.mode === 'production-identity') {const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';const result=resolvePlatformIdentity(new Request(origin+'/api/platform/identity'));process.env.NODE_ENV=previous;json(res,result.ok?200:401,{ok:result.ok,authenticated:false,identity:result.identity});return;}
      if (s.mode==='unauthenticated'||s.mode==='revoked') {json(res,401,{ok:false});return;}
      json(res,200,{ok:true,authenticated:s.mode!=='dev',identity:s.mode==='dev'?{...identity(s),source:'internal_dev'}:identity(s)});return;
    }
    if (url.pathname !== '/api/platform/sync') {json(res,404,{ok:false});return;}
    if(req.method==='POST') s.pushes++; else s.pulls++;
    if (s.delay) await new Promise(resolve=>setTimeout(resolve,s.delay));
    if (req.headers['x-tay-sync-session'] !== s.sessionId) {json(res,401,{ok:false});return;}
    if (s.mode==='unconfigured') {json(res,503,{ok:false});return;}
    if (s.mode==='revoked') {json(res,401,{ok:false});return;}
    if (s.mode==='html') {res.writeHead(200,{'content-type':'text/html'});res.end('<h1>Sign in</h1>');return;}
    if (s.mode==='redirect') {res.writeHead(307,{location:trapOrigin+'/trap'});res.end();return;}
    if (s.mode==='large') {res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,padding:'x'.repeat(8*1024*1024)}));return;}
    if(req.method==='POST') {
      const input = await body(req);
      const evaluated = await evaluateSyncMutation(s.state,s,input,authority,Date.now());s.state=evaluated.state;
      if (s.mode==='drop-once') {s.mode='active';res.destroy();return;}
      json(res,200,{ok:true,identity:s.mode==='wrong-session'?{...identity(s),sessionId:'wrong-session'}:identity(s),receipt:evaluated.receipt});return;
    }
    const cursor = {account:{tenantId:url.searchParams.get('tenantId'),userId:url.searchParams.get('userId')},sequence:Number(url.searchParams.get('sequence'))};
    const page = await evaluateSyncPull(s.state,s,cursor,authority,Date.now());
    if(s.mode==='gap') {page.events=[];page.hasMore=true;}
    if(s.mode==='malformed-page') page.events.push({sequence:999,mutation:{operation:{kind:'payment.execute'}},receipt:{}});
    json(res,200,{ok:true,identity:identity(s),page});
  } catch (error) {json(res,400,{ok:false,error:error.code || 'fixture-error'});}
});
trapServer.listen(0,'127.0.0.1',()=>{trapOrigin=`http://127.0.0.1:${trapServer.address().port}`;server.listen(0,'127.0.0.1',async()=>{
  origin=`http://127.0.0.1:${server.address().port}`;
  if(process.argv.includes('--node-check')) {
    try {
      const {checkHttp}=await import('./fixtures/platform-sync-http-node.mjs');
      const report=await checkHttp({origin,require:createRequire(new URL('./fixtures/platform-sync-http-node.mjs',import.meta.url))});
      console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
    } catch(error) {console.error(error);process.exitCode=1;}
    finally {server.closeAllConnections();server.close();trapServer.closeAllConnections();trapServer.close();}
    return;
  }
  console.log(`Open ${origin}/ in a browser. GET ${origin}/results returns the final report. Ctrl-C stops the local fixture.`);
});});
