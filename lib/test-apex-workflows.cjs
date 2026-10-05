// Synthetic provider fixtures. These tests do not prove a live payment or email.
'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {createHandlers}=require('./apex-handlers.cjs');
const {fulfill,RETRY_WINDOW_MS}=require('./apex-delivery.cjs');
const {ready}=require('./apex-payments.cjs');
const c={enabled:true,key:'synthetic-key',webhook:'synthetic-signing-value',mode:'test',live:false,price:'price_fixture',link:'plink_fixture',emailKey:'synthetic-email-key',from:'delivery@example.com',support:'support@example.com',origin:'https://example.com'};
const session=()=>({id:'cs_test_fixture1234567',status:'complete',payment_status:'paid',mode:'payment',livemode:false,payment_link:c.link,currency:'usd',amount_total:2700,customer_details:{email:'buyer@example.com'},metadata:{},line_items:{has_more:false,data:[{quantity:1,price:{id:c.price,unit_amount:2700,currency:'usd'}}]},payment_intent:{latest_charge:{paid:true,refunded:false,disputed:false,amount_refunded:0}}});
function request(body,headers={}){return new Request('https://example.com/api/apex/checklist',{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});}
function event(s,type='checkout.session.completed',patch={}){const body=JSON.stringify({type,livemode:false,data:{object:{id:s.id}},...patch}),t=Math.floor(Date.now()/1000);return request(body,{'stripe-signature':`t=${t},v1=${createHmac('sha256',c.webhook).update(t+'.'+body).digest('hex')}`});}
test('release requires sender, support, HTTPS origin and payment configuration',()=>{
 assert.equal(ready(c),true);
 for(const k of ['emailKey','from','support','origin','key','webhook','price','link'])assert.equal(ready({...c,[k]:''}),false,k);
 for(const origin of ['http://example.com','https://example.com/path','https://example.com?x=1','https://name:pass@example.com'])assert.equal(ready({...c,origin}),false);
});
test('download returns the actual product after current paid entitlement, never emails',async()=>{
 const h=createHandlers({config:()=>c,loadSession:async()=>session(),fulfill:()=>{throw Error('must not send');}});
 const r=await h.download(request({session_id:session().id}));assert.equal(r.status,200);
 assert.match(r.headers.get('content-disposition'),/attachment/);assert.match(r.headers.get('cache-control'),/no-store/);
 const actual=require('node:fs').readFileSync('products/funnel-checklist/funnel-leak-emergency-checklist.html','utf8');assert.equal(await r.text(),actual);
});
test('request boundaries reject malformed, oversized, cross-site, wrong-mode and missing IDs before provider use',async()=>{
 const h=createHandlers({config:()=>c,loadSession:()=>{throw Error('unexpected provider access');}});
 for(const [r,status] of [[request('{'),400],[request(null),400],[request(' '.repeat(1001)),400],[request({session_id:'cs_live_fixture1234567'}),400],[request({session_id:session().id},{origin:'https://evil.example'}),403],[request({session_id:session().id},{'sec-fetch-site':'cross-site'}),403],[request('{}',{'content-type':'text/plain'}),415]])assert.equal((await h.download(r)).status,status);
});
test('missing runtime config, provider outage and missing packaged file fail closed without leaking provider errors',async()=>{
 assert.equal((await createHandlers({config:()=>({})}).download(request({}))).status,503);
 const h=createHandlers({config:()=>c,loadSession:()=>{throw Error('SENSITIVE');}});
 const r=await h.download(request({session_id:session().id}));assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/SENSITIVE/);
 const missing=createHandlers({config:()=>c,loadSession:async()=>session(),readFile:()=>{throw Error('missing');}});assert.equal((await missing.download(request({session_id:session().id}))).status,503);
});
test('pending, refunded, disputed and wrong-item payments cannot download or fulfill',async()=>{
 for(const mutation of [s=>s.payment_status='unpaid',s=>s.payment_intent.latest_charge.amount_refunded=1,s=>s.payment_intent.latest_charge.disputed=true,s=>s.line_items.data[0].price.id='other']){
  const s=session();mutation(s);let sends=0;const h=createHandlers({config:()=>c,loadSession:async()=>s,fulfill:async()=>sends++});
  assert.equal((await h.download(request({session_id:s.id}))).status,403);assert.equal((await h.webhook(event(s))).status,200);assert.equal(sends,0);
 }
});
test('signed completed and delayed-success events fulfill; invalid signatures and modes do not',async()=>{
 let sends=0;const s=session(),h=createHandlers({config:()=>c,loadSession:async()=>s,fulfill:async()=>sends++});
 for(const type of ['checkout.session.completed','checkout.session.async_payment_succeeded'])assert.equal((await h.webhook(event(s,type))).status,200);
 assert.equal(sends,2);assert.equal((await h.webhook(request('{}'))).status,400);
 assert.equal((await h.webhook(event(s,'checkout.session.completed',{livemode:true}))).status,400);
 assert.equal((await h.webhook(event(s,'customer.created'))).status,200);assert.equal(sends,2);
});
test('webhook returns retryable 503 when dispatch or provider lookup fails',async()=>{
 const s=session();for(const deps of [{loadSession:async()=>{throw Error('lookup');}},{loadSession:async()=>s,fulfill:async()=>{throw Error('dispatch');}}]){
  const h=createHandlers({config:()=>c,...deps});assert.equal((await h.webhook(event(s))).status,503);
 }
});
test('signed malformed JSON and oversized payloads are rejected; invalid body does not dispatch',async()=>{
 const h=createHandlers({config:()=>c,loadSession:()=>{throw Error('must not load');}}),t=Math.floor(Date.now()/1000),body='{';
 assert.equal((await h.webhook(request(body,{'stripe-signature':`t=${t},v1=${createHmac('sha256',c.webhook).update(t+'.'+body).digest('hex')}`}))).status,400);
 assert.equal((await h.webhook(request('x'.repeat(1000001)))).status,400);
});
test('provider adapter expands current payment evidence, enforces mode and uses the pinned API version',async t=>{
 const p=require('./apex-payments.cjs');let requests=[];
 t.mock.method(global,'fetch',async(url,options)=>{requests.push({url,options});return Response.json(session());});
 assert.equal(await p.loadSession(c,'cs_live_fixture1234567'),null);assert.equal(requests.length,0);
 await p.loadSession(c,session().id);assert.match(requests[0].url,/expand%5B%5D=payment_intent.latest_charge/);assert.equal(requests[0].options.headers['Stripe-Version'],'2026-08-26.dahlia');assert.equal(requests[0].options.cache,'no-store');
});
function deliveryFixture(){
 const s=session(),requests=[],accepted=new Map();let now=1000000000,failMark=false;
 const deps={now:()=>now,write:async(_c,_path,values)=>{if(failMark&&values['metadata[apex_email_state]']==='accepted')throw Error('metadata outage');for(const [k,v]of Object.entries(values))s.metadata[k.slice(9,-1)]=v;},fetch:async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');requests.push(options);const key=options.headers['Idempotency-Key'];if(!accepted.has(key))accepted.set(key,options.body);else assert.equal(accepted.get(key),options.body);return Response.json({id:'synthetic-email-id'});
 }};
 return {s,deps,requests,accepted,setNow:n=>now=n,setFailMark:v=>failMark=v};
}
test('dispatch uses checkout recipient only, private fragment link and durable provider-acceptance marker; replay is no-op',async()=>{
 const f=deliveryFixture();assert.equal((await fulfill(c,f.s,f.deps)).state,'accepted');
 const body=JSON.parse(f.requests[0].body);assert.deepEqual(body.to,['buyer@example.com']);assert.match(body.text,/#session_id=cs_test_/);assert.doesNotMatch(body.text,/\?session_id=/);
 assert.equal(f.s.metadata.apex_email_state,'accepted');await fulfill(c,f.s,f.deps);assert.equal(f.requests.length,1);
});
test('lost metadata response retries with the same provider key; concurrent snapshots use the same key and body',async()=>{
 const f=deliveryFixture();f.setFailMark(true);await assert.rejects(fulfill(c,f.s,f.deps));f.setFailMark(false);await fulfill(c,f.s,f.deps);assert.equal(f.requests.length,2);assert.equal(f.accepted.size,1);
 const g=deliveryFixture(),first=structuredClone(g.s),second=structuredClone(g.s);await Promise.all([fulfill(c,first,g.deps),fulfill(c,second,g.deps)]);assert.equal(g.accepted.size,1);
});
test('expired ambiguous dispatch, changed retry payload and invalid recipient require reconciliation, without another email',async()=>{
 for(const change of [(f)=>f.setNow(1000000000+RETRY_WINDOW_MS+1),(f)=>f.s.customer_details.email='changed@example.com']){
  const f=deliveryFixture();f.setFailMark(true);await assert.rejects(fulfill(c,f.s,f.deps));f.setFailMark(false);change(f);await assert.rejects(fulfill(c,f.s,f.deps),/reconciliation/);assert.equal(f.requests.length,1);
 }
 const f=deliveryFixture();f.s.customer_details.email='bad\r\nrecipient';await assert.rejects(fulfill(c,f.s,f.deps));assert.equal(f.requests.length,0);
});
test('email rejection never records successful delivery and signed webhook retries the complete flow',async()=>{
 const f=deliveryFixture();let reject=true;const real=f.deps.fetch;f.deps.fetch=async(...args)=>reject?new Response('down',{status:503}):real(...args);
 const h=createHandlers({config:()=>c,loadSession:async()=>f.s,fulfill:(cfg,s)=>fulfill(cfg,s,f.deps)});
 assert.equal((await h.webhook(event(f.s))).status,503);assert.equal(f.s.metadata.apex_email_state,'pending');
 reject=false;assert.equal((await h.webhook(event(f.s,'checkout.session.async_payment_succeeded'))).status,200);assert.equal(f.s.metadata.apex_email_state,'accepted');
});
