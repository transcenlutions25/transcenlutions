'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {JSDOM} = require('jsdom');
const {verifiedTestCatalog,createCheckoutHandler} = require('./apex-checkout.cjs');
const c={enabled:true,checkoutEnabled:true,mode:'test',live:false,key:'synthetic',webhook:'synthetic',price:'price_fixture',link:'plink_fixture',emailKey:'synthetic',from:'sender@example.com',support:'support@example.com',origin:'https://example.com'};
const fixture=()=>({id:c.link,active:true,livemode:false,optional_items:null,url:'https://buy.stripe.com/test_fixture123',allow_promotion_codes:false,automatic_tax:{enabled:false},line_items:{has_more:false,data:[{quantity:1,currency:'usd',amount_subtotal:2700,amount_total:2700,amount_tax:0,amount_discount:0,price:{id:c.price,active:true,type:'one_time',currency:'usd',unit_amount:2700}}]},after_completion:{type:'redirect',redirect:{url:c.origin+'/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}'}}});
test('only exact sandbox catalogue and verified return qualify',()=>{
 assert.equal(verifiedTestCatalog(fixture(),c),true);
 const transformed=fixture();transformed.line_items.data[0].price.transform_quantity={divide_by:10,round:'down'};assert.equal(verifiedTestCatalog(transformed,c),false);
 for(const patch of [{id:'other'},{active:false},{livemode:true},{url:'https://evil.example/test_fixture'},{url:'https://buy.stripe.com/live123'},{url:'https://buy.stripe.com/test_x?redirect=evil'},{url:'https://user@buy.stripe.com/test_x'},{allow_promotion_codes:true},{automatic_tax:{enabled:true}},{shipping_options:[{}]},{optional_items:[{}]},{after_completion:{type:'hosted_confirmation'}},{line_items:{data:[],has_more:false}}]) assert.equal(verifiedTestCatalog({...fixture(),...patch},c),false,JSON.stringify(patch));
 for(const patch of [{quantity:2},{currency:'eur'},{amount_total:2970,amount_tax:270},{amount_subtotal:0},{amount_discount:1},{price:{id:'wrong'} }]) {const f=fixture();Object.assign(f.line_items.data[0],patch);assert.equal(verifiedTestCatalog(f,c),false);}
});
test('configuration disabled or live never calls provider or exposes checkout',async()=>{
 for(const patch of [{enabled:false},{checkoutEnabled:false},{key:undefined},{origin:'http://example.com'},{mode:'live',live:true}]) {
  const handler=createCheckoutHandler({config:()=>({...c,...patch}),readLink:()=>{throw Error('must not call');}});
  const response=await handler();assert.equal(response.status,200);assert.equal((await response.json()).state,'unavailable');
 }
});
test('read-only verification exposes only public fields and fails closed on provider error',async()=>{
 const response=await createCheckoutHandler({config:()=>c,readLink:async()=>fixture()})();
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(Object.keys(await response.json()).sort(),['message','reason','state']);
 for(const readLink of [async()=>({}),async()=>{throw Error('secret provider details');}]){
  const result=await createCheckoutHandler({config:()=>c,readLink})();assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/secret/);
 }
});
const tick=()=>new Promise(r=>setImmediate(r));
function browser(fetcher){
 const dom=new JSDOM(readFileSync('public/apex-flow/offer.html','utf8'),{url:c.origin+'/apex-flow/offer.html',runScripts:'outside-only'});
 dom.window.AbortSignal=AbortSignal;dom.window.fetch=fetcher;dom.window.eval(readFileSync('public/apex-flow/checkout.js','utf8'));return dom;
}
test('checkout loading, unavailable, retry, and sandbox return are accessible',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);
 const dom=browser(async()=>{calls++;if(calls===1){await gate;throw Error('offline');}return Response.json({state:'test',amount:2700,currency:'usd',checkoutUrl:fixture().url});});
 const d=dom.window.document;
 assert.equal(d.getElementById('checkout-link').hidden,true);assert.equal(d.getElementById('checkout-status').getAttribute('aria-busy'),'true');
 release();await tick();assert.equal(d.getElementById('checkout-link').hasAttribute('href'),false);
 d.getElementById('checkout-retry').click();d.getElementById('checkout-retry').click();await tick();assert.equal(calls,2);
 assert.equal(d.getElementById('checkout-link').hidden,true);assert.equal(d.getElementById('checkout-link').hasAttribute('href'),false);assert.match(d.getElementById('checkout-status').textContent,/not open/);
 dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(calls,3);dom.window.close();
});
test('malicious or live checkout URLs never become clickable',async()=>{
 for(const checkoutUrl of ['javascript:alert(1)','https://buy.stripe.com/live','https://evil.example/test_x','https://buy.stripe.com/test_x#redirect']){
  const dom=browser(async()=>Response.json({state:'test',amount:2700,currency:'usd',checkoutUrl}));await tick();const link=dom.window.document.getElementById('checkout-link');assert.equal(link.hidden,true);assert.equal(link.hasAttribute('href'),false);dom.window.close();
 }
});

test('provider lookup expands optional items as well as line items',async()=>{
 const original=global.fetch;let requested;
 global.fetch=async(url,options)=>{requested=url;assert.equal(options.method,'GET');return Response.json(fixture());};
 try {
  const response=await createCheckoutHandler({config:()=>c})();assert.equal(response.status,200);
  const url=new URL(requested);assert.deepEqual(url.searchParams.getAll('expand[]'),['line_items','optional_items']);
 } finally {global.fetch=original;}
});

test('valid catalogue still cannot expose checkout without provider proof of fixed quantity',async()=>{
 const response=await createCheckoutHandler({config:()=>c,readLink:async()=>fixture()})();
 const body=await response.json();assert.equal(body.state,'unavailable');assert.equal(body.reason,'quantity-lock-unverified');assert.equal(Object.hasOwn(body,'checkoutUrl'),false);
});
