/* Deterministic lifecycle regressions using the exact contract with synthetic server identity.
 * No browser, provider, database or production authentication is implied by this suite. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { emptySyncClient, enqueueSyncMutation, acknowledgeSyncMutation, receiveSyncPage, resolveSyncConflict } = require('../lib/platform-sync-client.ts');
const { emptySyncState, evaluateSyncMutation, evaluateSyncPull } = require('../lib/platform-sync-contract.ts');
const { restoreSyncClient } = require('../lib/platform-sync-persistence.ts');
const { PersistentSyncSession } = require('../lib/platform-sync-session.ts');
const { SyncTransportError } = require('../lib/platform-sync-transport.ts');
const account = { tenantId: 'tenant-test', userId: 'user-test' };
const other = { tenantId: 'tenant-other', userId: 'user-other' };
const mutation = (id, operation, baseVersion = 0, conversationId = 'conversation-1') => ({
  protocol: 1, account, mutationId: id, conversationId, baseVersion, operation,
});
const create = id => mutation(id, { kind: 'conversation.create', agentId: 'tay', title: 'Conversation' });
const draft = (id, text, baseVersion = 0) => mutation(id, { kind: 'draft.replace', text }, baseVersion);
const wait = async predicate => { for (let i=0; !predicate(); i++) { if(i>100) throw Error('fixture did not settle'); await new Promise(r=>setTimeout(r,1)); } };
function storeFixture() {
  let state = emptySyncClient(account);
  const update = (fn, current = () => true) => { if (!current()) throw new SyncTransportError('cancelled'); state = restoreSyncClient(fn(state), account); return structuredClone(state); };
  const check = a => assert.deepEqual(a, account);
  return {
    read: async a => { check(a); return structuredClone(state); },
    enqueue: async (m,current) => update(s=>enqueueSyncMutation(s,m),current),
    acknowledge: async (a,m,r,current) => { check(a); return update(s=>acknowledgeSyncMutation(s,a,m,r),current); },
    receive: async (a,p,current) => { check(a); return update(s=>receiveSyncPage(s,p),current); },
    resolveConflict: async (a,r,current) => { check(a); return update(s=>resolveSyncConflict(s,a,r),current); },
  };
}
async function fixture() {
  let server = emptySyncState(account), active = true;
  const store = storeFixture(), calls = { push: 0, pull: 0 };
  const identity = { ...account, role: 'member', sessionId: 'session-fixture', source: 'authenticated' };
  const authority = { resolve: async () => active ? { account, sessionId: identity.sessionId, deviceId: 'fixture-device', expiresAt: Date.now()+60000, sessionActive: true, deviceActive: true, membershipActive: true, canSyncOwnWorkspace: true } : null };
  async function remote(m) { const result = await evaluateSyncMutation(server,null,m,authority,Date.now()); server=result.state; return result.receipt; }
  const transport = {
    identity: async () => { if (!active) throw new SyncTransportError('unauthenticated'); return identity; },
    push: async (_,m) => { calls.push++; try { return await remote(m); } catch(e) { throw new SyncTransportError(e.code === 'unauthenticated' ? 'unauthenticated' : 'protocol'); } },
    pull: async (_,sequence) => { calls.pull++; return evaluateSyncPull(server,null,{account,sequence},authority,Date.now()); },
  };
  const session = new PersistentSyncSession(store,transport);
  await session.connect(); await wait(()=>session.getStatus().phase==='synced');
  return { store, calls, transport, session, remote, server:()=>server, revoke:()=>active=false };
}
async function conflicted() {
  const f=await fixture();
  await f.session.enqueue(create('create')); await f.session.synchronize();
  await f.remote(draft('other-device','Remote branch'));
  await f.session.enqueue(draft('offline','Exact offline branch'));
  await f.session.synchronize();
  assert.equal((await f.store.read(account)).outbox[0].state,'conflict');
  return f;
}

test('archived-conversation rejection cannot starve authenticated catch-up on repeated retries', async () => {
  const f=await fixture();
  await f.session.enqueue(create('create')); await f.session.synchronize();
  await f.remote(mutation('archive',{kind:'conversation.archive'},1));
  await f.session.enqueue(draft('offline-after-archive','Never discard this exact draft'));
  const before=f.calls.pull;
  await assert.rejects(()=>f.session.synchronize(),e=>e.code==='protocol');
  let state=await f.store.read(account);
  assert.equal(state.appliedThrough,f.server().sequence);
  assert.equal(state.events.at(-1).mutation.operation.kind,'conversation.archive');
  assert.equal(state.outbox[0].mutation.operation.text,'Never discard this exact draft');
  const otherConversation=mutation('new-conversation',{kind:'conversation.create',agentId:'tay',title:'Remote later'},0,'conversation-2');
  await f.remote(otherConversation);
  await assert.rejects(()=>f.session.synchronize(),e=>e.code==='protocol');
  state=await f.store.read(account);
  assert.equal(state.appliedThrough,f.server().sequence);
  assert.equal(state.events.at(-1).mutation.mutationId,'new-conversation');
  assert.equal(state.outbox.length,1); assert.equal(f.calls.pull-before,2);
  assert.equal(f.session.getStatus().phase,'unsynced');
  assert.throws(()=>resolveSyncConflict(state,account,{mutationId:'offline-after-archive',choice:'keep-current'}));
  f.session.disconnect();
});

test('accepted merged draft stays unsynced until explicit exact conflict resolution; every branch survives', async () => {
  const f=await conflicted();
  await f.session.enqueue(draft('merged','Remote branch plus exact offline branch',1));
  await f.session.synchronize();
  assert.equal(f.server().conversations[0].draft.version,2);
  assert.equal(f.session.getStatus().phase,'unsynced');
  const before=await f.store.read(account),calls={...f.calls};
  const resolved=await f.session.resolveConflict({mutationId:'offline',choice:'use-accepted-replacement',replacementMutationId:'merged'});
  assert.deepEqual(resolved.events,before.events); assert.deepEqual(resolved.acknowledged,before.acknowledged);
  assert.equal(resolved.outbox.length,0); assert.deepEqual(f.calls,calls,'resolution never transmits');
  assert.equal(resolved.acknowledged.find(x=>x.mutation.mutationId==='offline').mutation.operation.text,'Exact offline branch');
  assert.equal(f.session.getStatus().reason,'conflict-reviewed-awaiting-sync');
  assert.deepEqual(restoreSyncClient(resolved,account),resolved,'cache reopen retains reviewed ledger');
  assert.equal((await f.session.synchronize()).complete,true);
  assert.equal(f.session.getStatus().phase,'synced');
  f.session.disconnect();
});

test('explicit keep-current retains original conflict, remote branch, receipts and unrelated pending writing', async () => {
  const f=await conflicted(); await f.session.enqueue(draft('another','Another pending edit',1));
  const before=await f.store.read(account);
  const result=await f.session.resolveConflict({mutationId:'offline',choice:'keep-current'});
  assert.deepEqual(result.events,before.events); assert.deepEqual(result.acknowledged,before.acknowledged);
  assert.deepEqual(result.outbox.map(x=>x.mutation.mutationId),['another']);
  assert.deepEqual(restoreSyncClient(result,account),result);
  assert.equal(f.session.getStatus().phase,'unsynced'); f.session.disconnect();
});

test('repeat review and replayed conflict page cannot resurrect or rewrite resolved writing', async () => {
  const f=await conflicted(),choice={mutationId:'offline',choice:'keep-current'};
  const first=await f.session.resolveConflict(choice),second=await f.session.resolveConflict(choice);
  assert.deepEqual(second,first);
  const page=await f.transport.pull(null,0);
  const replay=receiveSyncPage(second,page);
  assert.deepEqual(replay,second);
  assert.deepEqual(enqueueSyncMutation(replay,draft('offline','Exact offline branch')),replay);
  f.session.disconnect();
});

test('wrong-account, pending, absent, unknown-choice and extra-field resolutions fail without mutation', async () => {
  const f=await conflicted(); await f.session.enqueue(draft('pending','Pending'));
  const before=await f.store.read(account);
  for (const resolution of [{mutationId:'pending',choice:'keep-current'},{mutationId:'missing',choice:'keep-current'},
    {mutationId:'offline',choice:'auto-merge'},{mutationId:'offline',choice:'keep-current',approved:true},
    {mutationId:'offline',choice:'use-accepted-replacement',replacementMutationId:'missing'}]) {
    assert.throws(()=>resolveSyncConflict(before,account,resolution));
  }
  assert.throws(()=>resolveSyncConflict(before,other,{mutationId:'offline',choice:'keep-current'}),e=>e.code==='scope');
  assert.deepEqual(await f.store.read(account),before); f.session.disconnect();
});

test('replacement must be a later accepted caught-up event for the same conversation and field', async () => {
  const f=await conflicted();
  await f.remote(mutation('other-conversation',{kind:'conversation.create',agentId:'tay',title:'Other'},0,'conversation-2'));
  await f.remote(mutation('wrong-conversation',{kind:'draft.replace',text:'Unrelated'},0,'conversation-2'));
  await f.remote(mutation('wrong-field',{kind:'conversation.select-agent',agentId:'dawn'},1));
  await f.session.enqueue(draft('second-conflict','Still conflict')); await f.session.synchronize();
  const before=await f.store.read(account);
  for(const id of ['other-device','offline','wrong-conversation','wrong-field','second-conflict'])
    assert.throws(()=>resolveSyncConflict(before,account,{mutationId:'offline',choice:'use-accepted-replacement',replacementMutationId:id}));
  const ack=await f.remote(draft('accepted-not-pulled','Merged',1));
  const acknowledged=acknowledgeSyncMutation(before,account,draft('accepted-not-pulled','Merged',1),ack);
  assert.throws(()=>resolveSyncConflict(acknowledged,account,{mutationId:'offline',choice:'use-accepted-replacement',replacementMutationId:'accepted-not-pulled'}));
  f.session.disconnect();
});

test('acknowledgement-only conflict is not reviewable before its event is caught up', async () => {
  const f=await fixture();await f.remote(create('create'));await f.remote(draft('remote','Remote'));
  const m=draft('offline','Keep me'),receipt=await f.remote(m);
  const state=acknowledgeSyncMutation(enqueueSyncMutation(emptySyncClient(account),m),account,m,receipt);
  assert.throws(()=>resolveSyncConflict(state,account,{mutationId:'offline',choice:'keep-current'}));
  f.session.disconnect();
});

test('resolution cannot match another task draft under the same conversation', async () => {
  const f=await fixture();await f.session.enqueue(create('create'));await f.session.synchronize();
  await f.remote(mutation('task-first',{kind:'task.save-draft',taskId:'task-a',text:'Remote'}));
  await f.session.enqueue(mutation('task-conflict',{kind:'task.save-draft',taskId:'task-a',text:'Offline'}));await f.session.synchronize();
  await f.remote(mutation('task-other',{kind:'task.save-draft',taskId:'task-b',text:'Different'}));await f.session.synchronize();
  await assert.rejects(()=>f.session.resolveConflict({mutationId:'task-conflict',choice:'use-accepted-replacement',replacementMutationId:'task-other'}));
  assert.equal((await f.store.read(account)).outbox.length,1);f.session.disconnect();
});

test('logout fences queued resolution and never returns old-account content', async () => {
  const f=await conflicted(),before=await f.store.read(account),original=f.store.resolveConflict;
  let release;const held=new Promise(r=>release=r);f.store.resolveConflict=async(...args)=>{await held;return original(...args);};
  const pending=f.session.resolveConflict({mutationId:'offline',choice:'keep-current'});
  f.session.disconnect();release();await assert.rejects(()=>pending,e=>e.code==='cancelled');
  assert.deepEqual(await f.store.read(account),before);assert.equal(f.session.getStatus().phase,'signed-out');
  await assert.rejects(()=>f.session.resolveConflict({mutationId:'offline',choice:'keep-current'}),e=>e.code==='unauthenticated');
});

test('logout after resolution commits still suppresses a late old-account return', async () => {
  const f=await conflicted(),original=f.store.resolveConflict;
  let release,committed=false;const held=new Promise(r=>release=r);
  f.store.resolveConflict=async(...args)=>{const result=await original(...args);committed=true;await held;return result;};
  const pending=f.session.resolveConflict({mutationId:'offline',choice:'keep-current'});
  await wait(()=>committed);f.session.disconnect();release();await assert.rejects(()=>pending,e=>e.code==='cancelled');
  const state=await f.store.read(account);assert.equal(state.outbox.length,0);assert.equal(state.acknowledged.find(x=>x.mutation.mutationId==='offline').mutation.operation.text,'Exact offline branch');
  assert.equal(f.session.getStatus().phase,'signed-out');
});

test('revoked identity blocks catch-up and push before any request effects', async () => {
  const f=await fixture();await f.session.enqueue(create('create'));const calls={...f.calls};f.revoke();
  await assert.rejects(()=>f.session.synchronize(),e=>e.code==='unauthenticated');
  assert.deepEqual(f.calls,calls);assert.equal((await f.store.read(account)).outbox.length,1);assert.equal(f.session.getStatus().phase,'signed-out');
});

test('lost acknowledgement catches up exact committed ID before any retry push', async () => {
  const f=await fixture();await f.session.enqueue(create('once'));
  const original=f.transport.push;f.transport.push=async(...args)=>{await original(...args);throw new SyncTransportError('network');};
  await assert.rejects(()=>f.session.synchronize(),e=>e.code==='network');assert.equal((await f.store.read(account)).outbox.length,1);
  f.transport.push=original;const calls=f.calls.push;assert.equal((await f.session.synchronize()).complete,true);
  assert.equal(f.calls.push,calls);assert.equal(f.server().sequence,1);f.session.disconnect();
});

test('writing during initial pull is preserved for a later pass, without a false synced claim', async () => {
  const f=await fixture();await f.session.enqueue(create('first'));const original=f.transport.pull;
  let release;const held=new Promise(r=>release=r);f.transport.pull=async(...args)=>{await held;return original(...args);};
  const pending=f.session.synchronize();await new Promise(r=>setTimeout(r,1));await f.session.enqueue(draft('during-pull','New local writing'));release();
  assert.equal((await pending).complete,false);assert.deepEqual((await f.store.read(account)).outbox.map(x=>x.mutation.mutationId),['during-pull']);
  assert.equal(f.server().sequence,1);f.session.disconnect();
});

test('total pagination cap stays 20 and cannot authorize pushes from an incomplete catch-up', async () => {
  const f=await fixture();await f.session.enqueue(create('pending'));let pages=0;
  f.transport.pull=async()=>{pages++;const m=mutation('remote-'+pages,{kind:'conversation.create',agentId:'tay',title:'Remote'},0,'remote-'+pages);const receipt={mutationId:m.mutationId,outcome:'accepted',sequence:pages,entityVersion:1};return {account,events:[{sequence:pages,mutation:m,receipt}],cursor:{account,sequence:pages},hasMore:true};};
  const pushes=f.calls.push;assert.equal((await f.session.synchronize()).complete,false);
  assert.equal(pages,20);assert.equal(f.calls.push,pushes);assert.equal(f.session.getStatus().reason,'catch-up-limit');
  assert.equal((await f.store.read(account)).outbox.length,1);f.session.disconnect();
});

test('exhausted pre-pull budget and late committed acknowledgement never return old-account data after logout', async () => {
  const f=await fixture();await f.session.enqueue(create('pending'));let pages=0;
  f.transport.pull=async()=>{pages++;const m=mutation('remote-'+pages,{kind:'conversation.create',agentId:'tay',title:'Remote'},0,'remote-'+pages);const receipt={mutationId:m.mutationId,outcome:'accepted',sequence:pages,entityVersion:1};return {account,events:[{sequence:pages,mutation:m,receipt}],cursor:{account,sequence:pages},hasMore:pages<20};};
  f.transport.push=async(_,m)=>({mutationId:m.mutationId,outcome:'accepted',sequence:21,entityVersion:1});
  let release,committed=false;const held=new Promise(r=>release=r),acknowledge=f.store.acknowledge;
  f.store.acknowledge=async(...args)=>{const state=await acknowledge(...args);committed=true;await held;return state;};
  const pending=f.session.synchronize();await wait(()=>committed);f.session.disconnect();release();
  await assert.rejects(()=>pending,e=>e.code==='cancelled');assert.equal(f.session.getStatus().phase,'signed-out');
  const state=await f.store.read(account);assert.equal(state.events.length,20);assert.equal(state.acknowledged.at(-1).mutation.mutationId,'pending');
});
