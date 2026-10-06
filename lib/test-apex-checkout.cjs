'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {JSDOM} = require('jsdom');
const {verifiedTestLink,createCheckoutHandler} = require('./apex-checkout.cjs');
const c={enabled:true,checkoutEnabled:true,mode:'test',live:false,key:'synthetic',webhook:'synthetic',price:'price_fixture',link:'plink_fixture',emailKey:'synthetic',from:'sender@example.com',support:'support@example.com',origin:'https://example.com'};
const fixture=()=>({id:c.link,active:true,livemode:false,optional_items:null,url:'https://buy.stripe.com/test_fixture123',allow_promotion_codes:false,automatic_tax:{enabled:false},line_items:{has_more:false,data:[{quantity:1,price:{id:c.price,active:true,type:'one_time',currency:'usd',unit_amount:2700}}]},after_completion:{type:'redirect',redirect:{url:c.origin+'/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}'}}});
test('only exact sandbox catalogue and verified return qualify',()=>{
 assert.equal(verifiedTestLink(fixture(),c),true);
 for(const patch of [{id:'other'},{active:false},{livemode:true},{url:'https://evil.example/test_fixture'},{url:'https://buy.stripe.com/live123'},{url:'https://buy.stripe.com/test_x?redirect=evil'},{url:'https://user@buy.stripe.com/test_x'},{allow_promotion_codes:true},{automatic_tax:{enabled:true}},{shipping_options:[{}]},{optional_items:[{}]},{after_completion:{type:'hosted_confirmation'}},{line_items:{data:[],has_more:false}}]) assert.equal(verifiedTestLink({...fixture(),...patch},c),false,JSON.stringify(patch));
 for(const patch of [{quantity:2},{adjustable_quantity:{enabled:true}},{tax_rates:[{}]},{price:{id:'wrong'} }]) {const f=fixture();Object.assign(f.line_items.data[0],patch);assert.equal(verifiedTestLink(f,c),false);}
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
 assert.deepEqual(Object.keys(await response.json()).sort(),['amount','checkoutUrl','currency','message','state']);
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
 assert.equal(d.getElementById('checkout-link').hidden,false);assert.match(d.getElementById('checkout-status').textContent,/never a real card/);
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
