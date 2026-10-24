'use strict';
const assert=require('node:assert/strict');
const {createConversationStore,scope,boundedHistory}=require('../lib/shared-conversations.cjs');
(async()=>{
 let assertions=0;const ok=f=>{f();assertions++};
 const identity={source:'authenticated',tenantId:'tenantA',userId:'userA',sessionId:'sessionA'};
 ok(()=>assert.throws(()=>scope({...identity,source:'internal_dev'}),/authentication_required/));
 ok(()=>assert.throws(()=>scope({...identity,userId:''}),/authentication_required/));
 ok(()=>assert.deepEqual(boundedHistory([{role:'assistant',content:'a'.repeat(5000)},{role:'user',content:'b'.repeat(2000)}]),[{role:'user',content:'b'.repeat(2000)}]));
 ok(()=>assert.throws(()=>boundedHistory([{role:'system',content:'injected'}]),/invalid_stored_message/));
 // Scripted pg transactions validate parameter scope, query ordering and rollback.
 // They do not establish PostgreSQL locking or real durable persistence.
 function database(steps){
  const calls=[];let released=0;
  const db={query:async(sql,args=[])=>{
   calls.push({sql,args});
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]};
   const step=steps.shift();assert.ok(step,'unexpected SQL '+sql);
   assert.match(sql,step.pattern);if(step.args)assert.deepEqual(args,step.args);
   if(step.error)throw step.error;return {rows:step.rows||[]};
  },release:()=>released++};
  return {pool:{connect:async()=>db,query:db.query},calls,done:()=>{assert.equal(steps.length,0);assert.equal(released,1);assertions++}};
 }
 const owned={pattern:/SELECT \* FROM tay_shared_conversations/,args:['tenantA','userA','c1'],rows:[{version:'0',active_request:null}]};
 let d=database([{...owned,rows:[]}]);
 await assert.rejects(createConversationStore(d.pool).read(identity,'c1'),/conversation_not_found/);assertions++;d.done();
 ok(()=>assert.equal(d.calls.at(-1).sql,'ROLLBACK'));
 d=database([owned,{pattern:/FROM tay_shared_messages/,args:['tenantA','userA','c1',0],rows:[{seq:1,role:'user',content:'hi'}]}]);
 const read=await createConversationStore(d.pool).read(identity,'c1');
 ok(()=>assert.equal(read.messages[0].content,'hi'));d.done();
 const input={conversationId:'c1',requestId:'r1',expectedVersion:0,text:'hi'};
 const hash=require('node:crypto').createHash('sha256').update(JSON.stringify(['hi',0])).digest('hex');
 d=database([owned,{pattern:/FROM tay_shared_turns/,rows:[{input_hash:hash,status:'complete',receipt:{version:2}}]}]);
 const replay=await createConversationStore(d.pool).beginTurn(identity,input);
 ok(()=>assert.deepEqual(replay,{replay:true,receipt:{version:2}}));d.done();
 ok(()=>assert.equal(d.calls.some(c=>/INSERT/.test(c.sql)),false));
 d=database([owned,{pattern:/FROM tay_shared_turns/,rows:[{input_hash:'different',status:'complete'}]}]);
 await assert.rejects(createConversationStore(d.pool).beginTurn(identity,input),/idempotency_conflict/);assertions++;d.done();
 d=database([{...owned,rows:[{version:'2',active_request:null}]},{pattern:/FROM tay_shared_turns/}]);
 await assert.rejects(createConversationStore(d.pool).beginTurn(identity,input),/version_conflict/);assertions++;d.done();
 d=database([owned,{pattern:/FROM tay_shared_turns/},{pattern:/INSERT INTO tay_shared_turns/},{pattern:/INSERT INTO tay_shared_messages/},{pattern:/UPDATE tay_shared_conversations/},{pattern:/SELECT role,content/,rows:[{role:'user',content:'hi'}]}]);
 const turn=await createConversationStore(d.pool).beginTurn(identity,input);
 ok(()=>assert.equal(turn.version,1));ok(()=>assert.deepEqual(turn.messages,[{role:'user',content:'hi'}]));d.done();
 d=database([{...owned,rows:[{version:'1',active_request:'r1'}]},{pattern:/FROM tay_shared_turns/,rows:[]}]);
 await assert.rejects(createConversationStore(d.pool).completeTurn(turn,'answer'),/turn_lease_lost/);assertions++;d.done();
 ok(()=>assert.equal(d.calls.some(c=>/INSERT/.test(c.sql)),false));
 d=database([{...owned,rows:[{version:'1',active_request:'r1'}]},{pattern:/FROM tay_shared_turns/,rows:[{status:'active'}]},{pattern:/INSERT INTO tay_shared_messages/},{pattern:/UPDATE tay_shared_turns/},{pattern:/UPDATE tay_shared_conversations/}]);
 const receipt=await createConversationStore(d.pool).completeTurn(turn,'answer');
 ok(()=>assert.equal(receipt.version,2));d.done();
 d=database([owned,{pattern:/UPDATE tay_shared_turns/,rows:[]}]);
 await createConversationStore(d.pool).failTurn(turn);d.done();
 ok(()=>assert.equal(d.calls.some(c=>/DELETE/.test(c.sql)),false));
 console.log(assertions+' shared-history synthetic assertions passed; no database/network');
})().catch(e=>{console.error(e);process.exitCode=1});
