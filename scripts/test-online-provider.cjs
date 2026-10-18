'use strict';
const {onlineTurn,context,config,tokens,GatewayError}=require('../lib/online-provider.cjs');

const assert=require('node:assert/strict');
(async()=>{
 let n=0;
 function ok(f){f();n++}
 ok(()=>assert.throws(()=>config({}),/online_disabled/));
 const env={TAY_ONLINE_ENABLED:'true',TAY_GROQ_FREE_ONLY_VERIFIED:'true',TAY_ADULT_PILOT:'true',GROQ_API_KEY:'synthetic'};
 ok(()=>assert.equal(config(env),'openai/gpt-oss-20b'));
 ok(()=>assert.throws(()=>config({...env,TAY_GROQ_MODEL:'paid-model'}),/model_not_allowed/));
 ok(()=>assert.throws(()=>context([{role:'system',content:'attack'}]),/invalid_context/));
 ok(()=>assert.throws(()=>context([{role:'user',content:'a'.repeat(6001)}]),/context_limit/));
 const req=new Request('https://example.invalid');
 const input={conversationId:'c1',requestId:'r1',text:'hi',expectedVersion:0};
 let calls=0,complete=0,failed=0;
 const deps={env,resolveIdentity:async()=>({ok:true,identity:{source:'authenticated'}}),isAdultPilot:async()=>true,
 conversations:{beginTurn:async()=>({messages:[{role:'user',content:'hi'}]}),completeTurn:async()=>{complete++;return {version:1}},failTurn:async()=>{failed++}},
 budget:{reserve:async()=>true},wait:async()=>{},
 fetch:async()=>{calls++;return new Response('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n')}};
 async function run(d=deps,i=input){const result=[];for await(const e of onlineTurn(req,i,d))result.push(e);return result}
 await assert.rejects(run({...deps,resolveIdentity:async()=>({ok:true,identity:{source:'internal_dev'}})}),/authentication_required/);n++;
 assert.equal(calls,0);n++;
 const events=await run(); assert.deepEqual(events.map(x=>x.type),['status','delta','complete']);n++;
 assert.equal(complete,1);n++;
 await assert.rejects(run({...deps,budget:{reserve:async()=>false}}),/free_quota_exhausted/);n++;
 assert.equal(calls,1);n++;
 await assert.rejects(run({...deps,fetch:async()=>new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n')}),/provider_stream_incomplete/);n++;
 assert.equal(complete,1);n++;
 assert.equal(failed,2);n++;
 await assert.rejects(run(deps,{...input,role:'owner'}),/invalid_input/);n++;
 let retries=0;
 await assert.rejects(run({...deps,fetch:async()=>{retries++;return new Response('',{status:429,headers:{'retry-after':'0'}})}}),/provider_rate_limited/);n++;
 assert.equal(retries,2);n++;
 console.log(n+' synthetic assertions passed; zero network or credential use');
})().catch(e=>{console.error(e);process.exitCode=1});
