'use strict';
const payments = require('./apex-payments.cjs');
const {boundedBody} = require('./apex-handlers.cjs');
const headers = {'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json = (data,status=200) => Response.json(data,{status,headers});
const enabled = c => payments.ready(c) && c.mode === 'test' && c.live === false && c.checkoutEnabled === true;
function verifiedTestPrice(price,c) {
 return price?.id === c.price && price.active === true && price.livemode === false &&
  price.type === 'one_time' && price.currency === 'usd' && price.unit_amount === 2700 &&
  !price.custom_unit_amount && !price.transform_quantity && !price.recurring;
}
function checkoutUrl(value,id) {
 try { const url=new URL(value);return url.origin === 'https://checkout.stripe.com' &&
  url.pathname === '/c/pay/'+id && !url.username && !url.password && !url.search; } catch {return false;}
}
function createCheckoutHandlers(deps={}) {
 const settings=deps.config||payments.config;
 const readPrice=deps.readPrice||(c=>payments.stripeRequest(c,'prices/'+encodeURIComponent(c.price)));
 const createSession=deps.createSession||((c,body,key)=>payments.stripeRequest(c,'checkout/sessions',body,{idempotencyKey:key}));
 return {
  async status() {
   const c=settings();
   if(!enabled(c))return json({state:'unavailable'});
   try {
    if(!verifiedTestPrice(await readPrice(c),c))return json({state:'unavailable'},503);
    return json({state:'test',amount:2700,currency:'usd'});
   }catch{return json({state:'unavailable'},503);}
  },
  async create(request) {
   const c=settings();
   if(!enabled(c))return json({error:'Test checkout is not enabled.'},503);
   if(request.headers.get('origin')!==c.origin || new URL(request.url).origin!==c.origin || request.headers.get('sec-fetch-site')==='cross-site')
    return json({error:'Invalid checkout origin.'},403);
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({error:'Expected JSON.'},415);
   let data;
   try{data=JSON.parse(await boundedBody(request,256));}catch{return json({error:'Invalid checkout request.'},400);}
   if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!payments.validCheckoutRequestId(data.request_id))
    return json({error:'Invalid checkout request.'},400);
   try {
    if(!verifiedTestPrice(await readPrice(c),c))return json({error:'The fixed test price could not be verified.'},503);
    const body={mode:'payment',currency:'usd','line_items[0][price]':c.price,'line_items[0][quantity]':'1','line_items[0][adjustable_quantity][enabled]':'false',
     'adaptive_pricing[enabled]':'false',customer_creation:'if_required',
     'payment_method_types[0]':'card',allow_promotion_codes:'false','automatic_tax[enabled]':'false',
     success_url:c.origin+'/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}',cancel_url:c.origin+'/apex-flow/offer.html#checkout',
     client_reference_id:'apex-sandbox-v1:'+data.request_id,
     'expand[0]':'line_items',
     'metadata[apex_checkout_source]':'sandbox-fixed-v1','metadata[apex_checkout_request]':data.request_id};
    const session=await createSession(c,body,'apex-sandbox-v1-'+data.request_id);
    if(!payments.validSessionId(session?.id,c)||session.livemode!==false||session.mode!=='payment'||session.metadata?.apex_checkout_request!==data.request_id||!payments.sandboxSessionSource(session,c)||!checkoutUrl(session.url,session.id))
     throw Error('Unverified session');
    return json({state:'test',checkoutUrl:session.url});
   }catch{return json({error:'Test checkout could not be confirmed. Retry with the same request; no payment has been submitted by this page.'},503);}
  }
 };
}
module.exports={verifiedTestPrice,checkoutUrl,createCheckoutHandlers};
