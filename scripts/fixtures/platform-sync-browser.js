/* Browser acceptance suite served only by the loopback harness. Synthetic data only. */
(async () => {
  const {IndexedDbSyncPersistence, restoreSyncClient} = require('platform-sync-persistence');
  const {SameOriginSyncTransport} = require('platform-sync-transport');
  const {PersistentSyncSession} = require('platform-sync-session');
  const {emptySyncClient} = require('platform-sync-client');
  const account={tenantId:'fixture-tenant',userId:'fixture-user'};
  const other={tenantId:'fixture-other',userId:'fixture-other-user'};
  const output=[];
  const assert=(value,message='assertion')=>{if(!value)throw Error(message);};
  const equal=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),JSON.stringify({actual:a,expected:b}));
  const fail=async (fn,code)=>{try{await fn();}catch(error){assert(!code||error.code===code,`expected ${code}, got ${error.code}`);return;}throw Error('expected rejection');};
  const wait=async predicate=>{const end=Date.now()+6000;while(!predicate()){if(Date.now()>end)throw Error('timeout');await new Promise(r=>setTimeout(r,10));}};
  const mutation=(id,op={kind:'conversation.create',agentId:'tay',title:'Fixture'},baseVersion=0)=>({protocol:1,account,mutationId:id,conversationId:'conversation-1',baseVersion,operation:op});
  const draft=(id,text,version=0)=>mutation(id,{kind:'draft.replace',text},version);
  const setup=async (id,extra={})=>(await fetch('/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,...extra})})).json();
  const transport=id=>new SameOriginSyncTransport((url,init)=>fetch(url,{...init,headers:{...init.headers,'X-Fixture-Scenario':id}}));
  const store=name=>new IndexedDbSyncPersistence(indexedDB,'tay-sync-test-'+name+'-'+run);
  const run=crypto.randomUUID();
  async function fixture(id,options={}) {await setup(id,options);const persistence=store(id);const session=new PersistentSyncSession(persistence,transport(id));return {persistence,session};}
  async function idle(session){await wait(()=>session.getStatus().phase!=='syncing'&&session.getStatus().reason!=='sign-in-catch-up-pending');}
  async function connected(id){const f=await fixture(id);await f.session.connect();await idle(f.session);return f;}
  const test=async(name,fn)=>{try{await fn();output.push({name,pass:true});}catch(e){output.push({name,pass:false,error:e.message});}document.querySelector('#results').textContent=JSON.stringify(output,null,2);};

  await test('IndexedDB close/reopen retains exact unsent writing; accounts partitioned',async()=>{
    const name='restart-'+run;let s=new IndexedDbSyncPersistence(indexedDB,name);
    await s.enqueue(draft('restart','Unsent exact writing.'));await s.close();s=new IndexedDbSyncPersistence(indexedDB,name);
    equal((await s.read(account)).outbox[0].mutation.operation.text,'Unsent exact writing.');equal((await s.read(other)).outbox,[]);await s.close();
  });
  await test('Concurrent independent database connections preserve all 24 enqueues',async()=>{
    const name='concurrent-'+run;const a=new IndexedDbSyncPersistence(indexedDB,name),b=new IndexedDbSyncPersistence(indexedDB,name);
    await Promise.all(Array.from({length:24},(_,i)=>(i%2?a:b).enqueue(draft('concurrent-'+i,'writing '+i))));
    equal((await a.read(account)).outbox.length,24);await a.close();await b.close();
  });
  await test('Corrupt graph is rejected without deletion or replacement',async()=>{
    const name='corrupt-'+run;const s=new IndexedDbSyncPersistence(indexedDB,name);await s.enqueue(draft('preserve','Keep me'));
    const request=indexedDB.open(name,1);const db=await new Promise((r,j)=>{request.onsuccess=()=>r(request.result);request.onerror=j;});
    const tx=db.transaction('accounts','readwrite'),get=tx.objectStore('accounts').get([account.tenantId,account.userId]);
    get.onsuccess=()=>{get.result.state.appliedThrough=900;tx.objectStore('accounts').put(get.result,[account.tenantId,account.userId]);};await new Promise((r,j)=>{tx.oncomplete=r;tx.onabort=j;});
    await fail(()=>s.read(account),'corrupt');await fail(()=>s.enqueue(draft('new','Must not replace')),'corrupt');
    const read=db.transaction('accounts').objectStore('accounts').get([account.tenantId,account.userId]);const raw=await new Promise(r=>read.onsuccess=()=>r(read.result));equal(raw.state.outbox[0].mutation.operation.text,'Keep me');db.close();await s.close();
  });
  await test('Actual production identity resolver and development 200 both stay fail-closed',async()=>{
    for(const mode of ['production-identity','dev']) {const f=await fixture(mode,{mode});await fail(()=>f.session.connect(),'unauthenticated');equal(f.session.getStatus().phase,'signed-out');equal((await setup(mode)).pushes,0);}
  });
  await test('Every verified sign-in attempts sync without blocking local use; failure visible',async()=>{
    const f=await fixture('nonblocking',{mode:'unconfigured',delay:700});const start=performance.now();await f.session.connect();assert(performance.now()-start<600,'sign-in awaited catch-up');
    await f.session.enqueue(mutation('nonblocking-create'));equal((await f.persistence.read(account)).outbox.length,1);await wait(()=>f.session.getStatus().reason==='unconfigured');equal(f.session.getStatus().phase,'unsynced');equal(f.session.getStatus().lastConfirmedAt,null);
    const first=(await setup('nonblocking')).identities;await f.session.connect();await wait(()=>f.session.getStatus().reason==='unconfigured');assert((await setup('nonblocking')).identities>first);f.session.disconnect();
  });
  await test('Real HTTP push/pull catches up and records last confirmed state',async()=>{
    const f=await connected('roundtrip');await f.session.enqueue(mutation('roundtrip-create'));await f.session.enqueue(draft('roundtrip-draft','Saved over HTTP'));
    const result=await f.session.synchronize();assert(result.complete);equal(result.state.appliedThrough,2);equal(result.state.outbox,[]);equal(f.session.getStatus().phase,'synced');assert(f.session.getStatus().lastConfirmedAt>0);equal(f.session.getStatus().lastConfirmedSequence,2);f.session.disconnect();
  });
  await test('Server commit plus lost response keeps durable ID; reconnect has one effect',async()=>{
    const f=await connected('ambiguous');await f.session.enqueue(mutation('exact-once'));await setup('ambiguous',{mode:'drop-once'});await fail(()=>f.session.synchronize(),'network');equal((await f.persistence.read(account)).outbox.length,1);
    await f.session.synchronize();equal((await setup('ambiguous')).state.sequence,1);equal((await f.persistence.read(account)).outbox,[]);f.session.disconnect();
  });
  await test('Writing during delayed HTTP acknowledgement is preserved',async()=>{
    const f=await connected('concurrent-ack');await f.session.enqueue(mutation('first'));await setup('concurrent-ack',{delay:150});const promise=f.session.synchronize();await new Promise(r=>setTimeout(r,30));await f.session.enqueue(draft('later','Typed during sync'));await promise;
    assert((await f.persistence.read(account)).outbox.some(x=>x.mutation.mutationId==='later'));equal(f.session.getStatus().phase,'unsynced');await setup('concurrent-ack',{delay:0});await f.session.synchronize();f.session.disconnect();
  });
  await test('Account switch while HTTP pending rejects old session and preserves old cache',async()=>{
    const f=await connected('switch');await f.session.enqueue(mutation('old-account'));await setup('switch',{delay:250});const pending=f.session.synchronize();await new Promise(r=>setTimeout(r,50));f.session.disconnect();await setup('switch',{switchAccount:true});await fail(()=>pending);equal((await f.persistence.read(account)).outbox.length,1);equal((await f.persistence.read(other)).outbox,[]);equal(f.session.getStatus().phase,'signed-out');
  });
  await test('Shared-session change between preflight and mutation is rejected server-side',async()=>{
    const f=await connected('server-switch');await f.session.enqueue(mutation('switch-body'));await setup('server-switch',{delay:250});const p=f.session.synchronize();await new Promise(r=>setTimeout(r,50));await setup('server-switch',{switchAccount:true});await fail(()=>p,'unauthenticated');equal((await f.persistence.read(account)).outbox.length,1);equal((await setup('server-switch')).state.sequence,0);
  });
  await test('Offline conflict keeps full branch and does not auto-retry it',async()=>{
    const f=await connected('conflict');await f.session.enqueue(mutation('conflict-create'));await f.session.enqueue(draft('draft-a','First branch'));await f.session.synchronize();await f.session.enqueue(draft('draft-b','Offline branch'));await f.session.synchronize();
    equal((await f.persistence.read(account)).outbox[0].state,'conflict');equal((await f.persistence.read(account)).outbox[0].mutation.operation.text,'Offline branch');const count=(await setup('conflict')).pushes;await f.session.synchronize();equal((await setup('conflict')).pushes,count);equal(f.session.getStatus().phase,'unsynced');f.session.disconnect();
  });
  await test('Cross-origin 307 sends zero requests to redirect target',async()=>{
    const f=await connected('redirect');await f.session.enqueue(mutation('redirect-create'));const info=await setup('redirect',{mode:'redirect'});await fetch(info.trapUrl+'/probe',{mode:'no-cors'});const baseline=(await setup('redirect')).trapRequests;assert(baseline>0);await fail(()=>f.session.synchronize());equal((await setup('redirect')).trapRequests,baseline);equal((await f.persistence.read(account)).outbox.length,1);f.session.disconnect();
  });
  await test('HTML/oversize/wrong-session responses preserve pending writing',async()=>{
    for(const mode of ['html','large','wrong-session']) {const f=await connected(mode);await f.session.enqueue(mutation(mode+'-create'));await setup(mode,{mode});await fail(()=>f.session.synchronize());equal((await f.persistence.read(account)).outbox.length,1);f.session.disconnect();}
  });
  await test('No-progress pagination reports unsynced and returns after one page',async()=>{
    const f=await connected('gap');const previous=(await setup('gap')).pulls;await setup('gap',{mode:'gap'});const result=await f.session.synchronize();assert(!result.complete);equal((await setup('gap')).pulls,previous+1);equal(f.session.getStatus().reason,'catch-up-gap');f.session.disconnect();
  });
  await test('Malformed final page event fails atomically',async()=>{
    const f=await connected('malformed');await f.session.enqueue(mutation('malformed-create'));await setup('malformed',{mode:'malformed-page'});await fail(()=>f.session.synchronize());equal((await f.persistence.read(account)).appliedThrough,0);f.session.disconnect();
  });
  await test('Cancelled transaction and forged execution never mutate the store',async()=>{
    const s=store('abort');await s.enqueue(draft('saved','Saved'));await fail(()=>s.enqueue(draft('cancelled','Not committed'),()=>false),'cancelled');equal((await s.read(account)).outbox.length,1);
    await fail(()=>s.enqueue(mutation('forged',{kind:'payment.execute',amount:1})));equal((await s.read(account)).outbox.length,1);await s.close();
  });
  const report={passed:output.filter(x=>x.pass).length,failed:output.filter(x=>!x.pass).length,tests:output,boundary:'Real IndexedDB and HTTP; synthetic server authentication and in-memory server state. No native APK, production login or PostgreSQL tested.'};
  document.querySelector('#results').textContent=JSON.stringify(report,null,2);await fetch('/results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)});
})().catch(error=>{document.querySelector('#results').textContent='HARNESS ERROR: '+error.stack;});
