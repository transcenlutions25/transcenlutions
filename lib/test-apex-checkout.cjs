'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{JSDOM}=require('jsdom');
const {createCheckoutHandlers,verifiedTestPrice}=require('./apex-checkout.cjs');
const payments=require('./apex-payments.cjs'),{createHandlers}=require('./apex-handlers.cjs');
const c={enabled:true,checkoutEnabled:true,mode:'test',live:false,key:'synthetic',webhook:'synthetic',price:'price_fixture',link:'plink_fixture',emailKey:'synthetic',from:'sender@example.com',support:'support@example.com',origin:'https://example.com'};
const id='550e8400-e29b-41d4-a716-446655440000';
const price=()=>({id:c.price,active:true,livemode:false,type:'one_time',currency:'usd',unit_amount:2700});
const session=()=>({id:'cs_test_fixture1234567',url:'https://checkout.stripe.com/c/pay/cs_test_fixture1234567#synthetic',livemode:false,mode:'payment',status:'open',payment_status:'unpaid',payment_link:null,currency:'usd',amount_total:2700,amount_subtotal:2700,total_details:{amount_tax:0,amount_discount:0,amount_shipping:0},client_reference_id:'apex-sandbox-v1:'+id,metadata:{apex_checkout_source:'sandbox-fixed-v1',apex_checkout_request:id},line_items:{has_more:false,data:[{quantity:1,price:price()}]}});
const paid=()=>({...session(),status:'complete',payment_status:'paid',payment_intent:{latest_charge:{paid:true,refunded:false,disputed:false,amount_refunded:0}}});
const request=(body={request_id:id},headers={})=>new Request(c.origin+'/api/apex/checkout',{method:'POST',headers:{origin:c.origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
const handler=(overrides={})=>createCheckoutHandlers({config:()=>c,readPrice:async()=>price(),createSession:async()=>session(),...overrides});
test('test price must be exact, active, one-time and untransformed',()=>{
 assert.equal(verifiedTestPrice(price(),c),true);
 for(const patch of [{id:'other'},{active:false},{livemode:true},{type:'recurring'},{currency:'eur'},{unit_amount:0},{custom_unit_amount:{}},{transform_quantity:{divide_by:10}},{recurring:{interval:'month'}}])assert.equal(verifiedTestPrice({...price(),...patch},c),false);
});
test('disabled and live modes never contact provider or expose checkout',async()=>{
 for(const patch of [{enabled:false},{checkoutEnabled:false},{key:undefined},{mode:'live',live:true}]){
  const h=handler({config:()=>({...c,...patch}),readPrice:()=>{throw Error('must not read');},createSession:()=>{throw Error('must not create');}});
  assert.equal((await (await h.status()).json()).state,'unavailable');assert.equal((await h.create(request())).status,503);
 }
});
test('POST boundaries reject origins, forged options, oversized and malformed bodies before provider',async()=>{
 let calls=0;const h=handler({readPrice:async()=>{calls++;return price();}});
 for(const req of [request(undefined,{origin:'https://evil.example'}),request(undefined,{'sec-fetch-site':'cross-site'}),request(undefined,{'content-type':'text/plain'}),request({request_id:id,price:'other'}),request({request_id:'bad'}),request({request_id:'x'.repeat(1000)}),new Request(c.origin+'/api/apex/checkout',{method:'POST',headers:{origin:c.origin,'content-type':'application/json'},body:'{'})])assert.ok((await h.create(req)).status>=400);
 assert.equal(calls,0);
});
test('fixed server params and versioned idempotency persist on retries',async()=>{
 const calls=[];const h=handler({createSession:async(...args)=>{calls.push(args);return session();}});
 const status=await h.status();assert.deepEqual(await status.json(),{state:'test',amount:2700,currency:'usd'});assert.match(status.headers.get('cache-control'),/no-store/);
 for(let i=0;i<2;i++){const response=await h.create(request());assert.equal(response.status,200);assert.equal((await response.json()).checkoutUrl,session().url);}
 assert.deepEqual(calls[0],calls[1]);const body=calls[0][1];assert.equal(calls[0][2],'apex-sandbox-v1-'+id);
 assert.equal(body['line_items[0][price]'],c.price);assert.equal(body['line_items[0][quantity]'],'1');assert.equal(body['line_items[0][adjustable_quantity][enabled]'],'false');assert.equal(body['adaptive_pricing[enabled]'],'false');assert.equal(body.mode,'payment');assert.equal(body.currency,'usd');assert.equal(body.allow_promotion_codes,'false');assert.equal(body['automatic_tax[enabled]'],'false');assert.equal(body['payment_method_types[0]'],'card');
 assert.equal(body.success_url,c.origin+'/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}');assert.equal(body.cancel_url,c.origin+'/apex-flow/offer.html#checkout');assert.equal(body['metadata[apex_checkout_source]'],'sandbox-fixed-v1');
 assert.equal(Object.keys(body).some(k=>/optional_items|shipping|subscription/.test(k)),false);
});
test('provider price/create errors or unsafe session response fail closed without leaking secrets',async()=>{
 for(const patch of [{livemode:true},{id:'cs_live_fixture1234567'},{url:'https://evil.example/'},{url:'https://checkout.stripe.com/c/pay/cs_test_other1234567'},{amount_total:2970},{metadata:{}},{payment_link:'other'}]){
  const response=await handler({createSession:async()=>({...session(),...patch})}).create(request());assert.equal(response.status,503);assert.equal(Object.hasOwn(await response.json(),'checkoutUrl'),false);
 }
 for(const overrides of [{readPrice:async()=>({...price(),unit_amount:100})},{createSession:async()=>{throw Error('secret provider');}}]){const r=await handler(overrides).create(request());assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret/);}
});
test('direct sandbox source grants paid eligible download, never identity or live access',async()=>{
 assert.equal(payments.entitled(paid(),c),true);
 const response=await createHandlers({config:()=>c,loadSession:async()=>paid(),readFile:async()=>'<html>fixture product</html>'}).download(new Request(c.origin+'/api/apex/checklist',{method:'POST',headers:{origin:c.origin,'content-type':'application/json'},body:JSON.stringify({session_id:session().id})}));assert.equal(response.status,200);
 for(const patch of [{payment_status:'unpaid'},{status:'open'},{livemode:true},{payment_link:'other'},{amount_total:2970},{amount_subtotal:2500},{total_details:{amount_tax:1,amount_discount:0,amount_shipping:0}},{metadata:{}},{client_reference_id:'forged'}])assert.equal(payments.entitled({...paid(),...patch},c),false);
 for(const charge of [{refunded:true},{disputed:true},{amount_refunded:1},{paid:false}]){const s=paid();Object.assign(s.payment_intent.latest_charge,charge);assert.equal(payments.entitled(s,c),false);}
 assert.equal(payments.entitled({...paid(),livemode:true},{...c,mode:'live',live:true}),false);
 const legacy=paid();legacy.payment_link=c.link;legacy.metadata={};assert.equal(payments.entitled(legacy,c),true);
});
test('provider adapter sends idempotency header and fixed form using existing API version',async()=>{
 const original=global.fetch;let captured;
 global.fetch=async(url,options)=>{captured={url,options};return Response.json(session());};
 try{await payments.stripeRequest(c,'checkout/sessions',{mode:'payment'},{idempotencyKey:'apex-sandbox-v1-'+id});assert.equal(captured.options.headers['Idempotency-Key'],'apex-sandbox-v1-'+id);assert.equal(captured.options.headers['Stripe-Version'],'2026-08-26.dahlia');assert.equal(captured.options.body.get('mode'),'payment');}finally{global.fetch=original;}
});
const tick=()=>new Promise(r=>setImmediate(r));
function browser(fetcher,options={}){
 const dom=new JSDOM(readFileSync('public/apex-flow/offer.html','utf8'),{url:c.origin+'/apex-flow/offer.html',runScripts:'outside-only'});
 dom.window.AbortSignal=AbortSignal;dom.window.crypto.randomUUID=()=>id;dom.window.fetch=fetcher;
 if(options.blockStorage)Object.defineProperty(dom.window,'sessionStorage',{get(){throw Error('blocked');}});
 dom.window.eval(readFileSync('public/apex-flow/checkout.js','utf8'));return dom;
}
test('loading/retry/double clicks reuse UUID and only expose validated test session',async()=>{
 const posts=[];let release;const pending=new Promise(r=>release=r);
 const dom=browser(async(_url,options)=>{if(options.method==='POST'){posts.push(options.body);if(posts.length===1){await pending;throw Error('timeout');}return Response.json({state:'test',checkoutUrl:session().url});}return Response.json({state:'test',amount:2700,currency:'usd'});},{blockStorage:true});
 const d=dom.window.document;await tick();d.getElementById('checkout-start').click();d.getElementById('checkout-start').click();assert.equal(posts.length,1);release();await tick();assert.equal(d.getElementById('checkout-link').hidden,true);
 d.getElementById('checkout-start').click();await tick();assert.equal(posts.length,2);assert.equal(posts[0],posts[1]);assert.equal(d.getElementById('checkout-link').hidden,false);
 dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(d.getElementById('checkout-link').hidden,true);assert.equal(d.getElementById('checkout-link').hasAttribute('href'),false);dom.window.close();
});
test('browser refuses live, malformed or foreign checkout URLs',async()=>{
 for(const checkoutUrl of ['javascript:alert(1)','https://checkout.stripe.com/c/pay/cs_live_fixture1234567','https://evil.example/test','https://checkout.stripe.com/c/pay/cs_test_fixture1234567?unsafe=1']){
  const dom=browser(async(_url,options)=>Response.json(options.method==='POST'?{state:'test',checkoutUrl}:{state:'test',amount:2700,currency:'usd'}));await tick();dom.window.document.getElementById('checkout-start').click();await tick();assert.equal(dom.window.document.getElementById('checkout-link').hidden,true);dom.window.close();
 }
});

test('signed direct-session webhook reuses fulfillment after current paid provenance verification',async()=>{
 const {createHmac}=require('node:crypto');let delivered=0;
 const body=JSON.stringify({type:'checkout.session.completed',livemode:false,data:{object:{id:session().id}}});
 const t=Math.floor(Date.now()/1000),signature=createHmac('sha256',c.webhook).update(t+'.'+body).digest('hex');
 const h=createHandlers({config:()=>c,loadSession:async()=>paid(),fulfill:async()=>{delivered++;}});
 const response=await h.webhook(new Request(c.origin+'/api/apex/stripe-webhook',{method:'POST',headers:{'stripe-signature':`t=${t},v1=${signature}`},body}));
 assert.equal(response.status,200);assert.equal(delivered,1);
});

test('creation rejects a valid sandbox Session belonging to another request UUID',async()=>{
 const other='650e8400-e29b-41d4-a716-446655440000';const wrong=session();
 wrong.metadata.apex_checkout_request=other;wrong.client_reference_id='apex-sandbox-v1:'+other;
 const response=await handler({createSession:async()=>wrong}).create(request());assert.equal(response.status,503);assert.equal(Object.hasOwn(await response.json(),'checkoutUrl'),false);
});
