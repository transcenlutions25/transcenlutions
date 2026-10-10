import assert from 'node:assert/strict';
export async function checkHttp({origin,require}) {
  const {SameOriginSyncTransport}=require('../../lib/platform-sync-transport.ts');
  const {restoreSyncClient}=require('../../lib/platform-sync-persistence.ts');
  const {emptySyncClient,enqueueSyncMutation,acknowledgeSyncMutation,receiveSyncPage}=require('../../lib/platform-sync-client.ts');
  const {parseSyncAccount}=require('../../lib/platform-sync-contract.ts');
  const {PersistentSyncSession}=require('../../lib/platform-sync-session.ts');
  const account={tenantId:'fixture-tenant',userId:'fixture-user'};
  const signal=()=>new AbortController().signal;
  const setup=async(id,extra={})=>(await fetch(origin+'/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,...extra})})).json();
  const transport=id=>new SameOriginSyncTransport((path,init)=>fetch(new URL(path,origin),{...init,headers:{...init.headers,'X-Fixture-Scenario':id}}));
  const mutation=id=>({protocol:1,account,mutationId:id,conversationId:'conversation-1',baseVersion:0,operation:{kind:'conversation.create',agentId:'tay',title:'Fixture'}});
  const report=[];
  const test=async(name,fn)=>{try{await fn();report.push({name,pass:true});}catch(error){report.push({name,pass:false,error:error.message});}};
  for(const mode of ['production-identity','dev']) await test(`${mode} cannot pass identity gate`,async()=>{await setup(mode,{mode});await assert.rejects(()=>transport(mode).identity(signal()),e=>e.code==='unauthenticated');});
  await test('actual HTTP identity → mutation receipt → pull → strict cache reconstruction',async()=>{await setup('http');const t=transport('http'),id=await t.identity(signal()),m=mutation('http-create');let state=enqueueSyncMutation(emptySyncClient(account),m);const receipt=await t.push(id,m,signal());state=acknowledgeSyncMutation(state,account,m,receipt);const page=await t.pull(id,0,signal());state=receiveSyncPage(state,page);assert.equal(state.appliedThrough,1);assert.deepEqual(restoreSyncClient(state,account),state);assert.equal(state.outbox.length,0);});
  await test('lost HTTP response retries exact ID with one server effect',async()=>{await setup('drop',{mode:'drop-once'});const t=transport('drop'),id=await t.identity(signal()),m=mutation('drop-create');await assert.rejects(()=>t.push(id,m,signal()),e=>e.code==='network');const receipt=await t.push(id,m,signal());assert.equal(receipt.sequence,1);assert.equal((await setup('drop')).state.sequence,1);});
  for(const mode of ['html','large','wrong-session','unconfigured','revoked']) await test(`${mode} is an explicit failure`,async()=>{await setup(mode);const t=transport(mode),id=await t.identity(signal());await setup(mode,{mode});await assert.rejects(()=>t.push(id,mutation(mode+'-create'),signal()));});
  await test('cross-origin 307 never reaches redirect target',async()=>{const info=await setup('redirect',{mode:'redirect'});await fetch(info.trapUrl+'/probe');const baseline=(await setup('redirect')).trapRequests;assert.ok(baseline>0);const t=transport('redirect'),id=await t.identity(signal());await assert.rejects(()=>t.push(id,mutation('redirect-create'),signal()));assert.equal((await setup('redirect')).trapRequests,baseline);});
  await test('forged execution rejected before HTTP transmission',async()=>{await setup('command');const t=transport('command'),id=await t.identity(signal());await assert.rejects(()=>t.push(id,{...mutation('command'),operation:{kind:'payment.execute'}},signal()));assert.equal((await setup('command')).pushes,0);});
  await test('account/session changes between preflight and request reject server-side',async()=>{await setup('switch',{delay:100});const t=transport('switch'),id=await t.identity(signal());const pending=t.push(id,mutation('switch-create'),signal());await new Promise(r=>setTimeout(r,20));await setup('switch',{switchAccount:true});await assert.rejects(()=>pending,e=>e.code==='unauthenticated');assert.equal((await setup('switch')).state.sequence,0);});
  await test('malformed page tail never partially applies earlier valid events',async()=>{await setup('badpage');const t=transport('badpage'),id=await t.identity(signal());await t.push(id,mutation('badpage-create'),signal());await setup('badpage',{mode:'malformed-page'});const page=await t.pull(id,0,signal()),state=emptySyncClient(account);assert.throws(()=>receiveSyncPage(state,page));assert.equal(state.appliedThrough,0);assert.deepEqual(state.events,[]);});
  await test('cache reconstruction rejects forged cursor, extra fields and wrong account',async()=>{const state=emptySyncClient(account);assert.throws(()=>restoreSyncClient({...state,appliedThrough:1},account));assert.throws(()=>restoreSyncClient({...state,role:'owner'},account));assert.throws(()=>restoreSyncClient(state,{...account,userId:'another'}));});
  await test('request options prohibit cross-origin credentials, redirects and cached results',async()=>{let observed;const t=new SameOriginSyncTransport(async(path,init)=>{observed={path,...init};return new Response(JSON.stringify({ok:true,authenticated:true,identity:{...account,role:'member',sessionId:'session-fixture',source:'authenticated'}}),{headers:{'content-type':'application/json'}});});await t.identity(signal());assert.equal(observed.path,'/api/platform/identity');assert.equal(observed.credentials,'same-origin');assert.equal(observed.mode,'same-origin');assert.equal(observed.redirect,'error');assert.equal(observed.cache,'no-store');assert.equal(observed.headers.Authorization,undefined);});

  function strictStore() {
    let state=emptySyncClient(account);
    const check=input=>assert.deepEqual(parseSyncAccount(input),account);
    return {read:async a=>{check(a);return structuredClone(state);},enqueue:async(m,current=()=>true)=>{if(!current())throw Error('cancelled');state=restoreSyncClient(enqueueSyncMutation(state,m),account);return structuredClone(state);},acknowledge:async(a,m,r,current=()=>true)=>{check(a);if(!current())throw Error('cancelled');state=restoreSyncClient(acknowledgeSyncMutation(state,a,m,r),account);return structuredClone(state);},receive:async(a,p,current=()=>true)=>{check(a);if(!current())throw Error('cancelled');state=restoreSyncClient(receiveSyncPage(state,p),account);return structuredClone(state);}};
  }
  async function wait(check) {const until=Date.now()+4000;while(!check()){if(Date.now()>until)throw Error('timeout');await new Promise(r=>setTimeout(r,5));}}
  await test('verified sign-in projects account, attempts sync and allows local use on failure',async()=>{
    await setup('signin',{mode:'unconfigured',delay:200});const store=strictStore(),session=new PersistentSyncSession(store,transport('signin'));
    await session.connect();await session.enqueue(mutation('signin-create'));assert.equal((await store.read(account)).outbox.length,1);
    await wait(()=>session.getStatus().reason==='unconfigured');assert.equal(session.getStatus().phase,'unsynced');assert.equal(session.getStatus().lastConfirmedAt,null);
    await setup('signin',{mode:'active',delay:0});await session.synchronize();assert.equal(session.getStatus().phase,'synced');assert.equal(session.getStatus().lastConfirmedSequence,1);
    const calls=(await setup('signin')).identities;await session.connect();await wait(()=>session.getStatus().phase==='synced');assert.ok((await setup('signin')).identities>=calls+2);session.disconnect();
  });
  await test('acknowledged sequence missing from pull cannot be declared synced',async()=>{
    const store=strictStore(),identity={...account,role:'member',sessionId:'fixture-session',source:'authenticated'};
    const t={identity:async()=>identity,push:async(i,m)=>({mutationId:m.mutationId,outcome:'accepted',sequence:5,entityVersion:1}),pull:async()=>({account,events:[],cursor:{account,sequence:0},hasMore:false})};
    const session=new PersistentSyncSession(store,t);await session.connect();await wait(()=>session.getStatus().phase==='synced');await session.enqueue(mutation('missing-history'));assert.equal((await session.synchronize()).complete,false);assert.equal(session.getStatus().reason,'catch-up-gap');session.disconnect();
  });
  await test('fresh HTTP pull cannot regress requested cursor or refresh confirmed status',async()=>{
    await setup('regressed');const store=strictStore(),t=transport('regressed'),session=new PersistentSyncSession(store,t);await session.connect();await wait(()=>session.getStatus().phase==='synced');await session.enqueue(mutation('regressed-create'));await session.synchronize();const prior=session.getStatus().lastConfirmedAt;
    t.pull=async()=>({account,events:[],cursor:{account,sequence:0},hasMore:false});await assert.rejects(()=>session.synchronize(),e=>e.code==='protocol');assert.equal(session.getStatus().phase,'unsynced');assert.equal(session.getStatus().lastConfirmedAt,prior);assert.equal((await store.read(account)).appliedThrough,1);session.disconnect();
  });
  await test('duplicate acknowledged sequence with different mutations corrupts cache',async()=>{
    const state=emptySyncClient(account);state.acknowledged=['one','two'].map(id=>({mutation:mutation(id),receipt:{mutationId:id,outcome:'accepted',sequence:1,entityVersion:1}}));assert.throws(()=>restoreSyncClient(state,account),e=>e.code==='corrupt');
  });
  await test('logout fences a late transport that ignores AbortSignal',async()=>{
    const store=strictStore(),identity={...account,role:'member',sessionId:'fixture-session',source:'authenticated'};let hold=null,release;
    const t={identity:async()=>identity,push:async(i,m)=>{if(hold)await hold;return {mutationId:m.mutationId,outcome:'accepted',sequence:1,entityVersion:1};},pull:async()=>({account,events:[],cursor:{account,sequence:0},hasMore:false})};
    const session=new PersistentSyncSession(store,t);await session.connect();await wait(()=>session.getStatus().phase==='synced');await session.enqueue(mutation('late'));hold=new Promise(r=>release=r);const pending=session.synchronize();await new Promise(r=>setTimeout(r,20));session.disconnect();release();await assert.rejects(()=>pending,e=>e.code==='cancelled');assert.equal((await store.read(account)).outbox.length,1);assert.equal(session.getStatus().phase,'signed-out');
  });

  await test('late local transaction completion cannot return old-account state after logout',async()=>{
    const original=strictStore(),identity={...account,role:'member',sessionId:'fixture-session',source:'authenticated'};let release,committed=false;
    const hold=new Promise(r=>release=r),store={...original,enqueue:async(m,current)=>{const state=await original.enqueue(m,current);committed=true;await hold;return state;}};
    const transport={identity:async()=>identity,push:async()=>{throw Error('unexpected');},pull:async()=>({account,events:[],cursor:{account,sequence:0},hasMore:false})};
    const session=new PersistentSyncSession(store,transport);await session.connect();await wait(()=>session.getStatus().phase==='synced');const pending=session.enqueue(mutation('late-local'));await wait(()=>committed);session.disconnect();release();await assert.rejects(()=>pending,e=>e.code==='cancelled');assert.equal((await original.read(account)).outbox.length,1);assert.equal(session.getStatus().phase,'signed-out');
  });
  return {passed:report.filter(x=>x.pass).length,failed:report.filter(x=>!x.pass).length,tests:report,boundary:'Real Node HTTP plus synthetic server identity/state. Browser IndexedDB and native device execution are separate gates.'};
}
