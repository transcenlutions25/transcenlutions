'use strict';
const {createHmac,timingSafeEqual}=require('node:crypto');
const LIVE_PRICE='price_1U3FTOPLMwl8qmZP4vwkUOi8';
const LIVE_LINK='plink_1U3FTTPLMwl8qmZPn4DQzrKE';
function config(env=process.env){
 const mode=env.APEX_STRIPE_MODE;
 return {key:env.APEX_STRIPE_RESTRICTED_KEY,webhook:env.APEX_STRIPE_WEBHOOK_SECRET,mode,
   live:mode==='live',price:mode==='live'?LIVE_PRICE:env.APEX_STRIPE_TEST_PRICE_ID,
   link:mode==='live'?LIVE_LINK:env.APEX_STRIPE_TEST_PAYMENT_LINK_ID,
   enabled:env.APEX_CHECKLIST_SALES_ENABLED==='true',
   checkoutEnabled:env.APEX_CHECKLIST_TEST_CHECKOUT_ENABLED==='true',
   emailKey:env.APEX_RESEND_API_KEY,from:env.APEX_DELIVERY_FROM,
   support:env.APEX_SUPPORT_EMAIL,origin:env.APEX_SITE_ORIGIN};
}
function emailAddress(value){return typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);}
function validOrigin(value){try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password;}catch{return false;}}
function ready(c){return !!(c.enabled&&c.key&&c.webhook&&c.price&&c.link&&['live','test'].includes(c.mode)&&c.emailKey&&emailAddress(c.from)&&emailAddress(c.support)&&validOrigin(c.origin));}
function validSessionId(id,c){return typeof id==='string'&&/^cs_(live|test)_[A-Za-z0-9]{10,240}$/.test(id)&&id.startsWith(c.live?'cs_live_':'cs_test_');}
function validCheckoutRequestId(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}
function sandboxSessionSource(s,c){
 const id=s?.metadata?.apex_checkout_request;
 return c.mode==='test'&&c.live===false&&s?.livemode===false&&s.payment_link===null&&
  s.metadata?.apex_checkout_source==='sandbox-fixed-v1'&&validCheckoutRequestId(id)&&
  s.client_reference_id==='apex-sandbox-v1:'+id&&s.amount_total===2700&&s.amount_subtotal===2700&&s.currency==='usd'&&
  s.total_details?.amount_tax===0&&s.total_details?.amount_discount===0&&s.total_details?.amount_shipping===0&&
  s.line_items?.data?.length===1&&s.line_items.has_more===false&&s.line_items.data[0].quantity===1&&
  s.line_items.data[0].price?.id===c.price&&s.line_items.data[0].price.unit_amount===2700&&s.line_items.data[0].price.currency==='usd'&&
  s.line_items.data[0].price.type==='one_time'&&!s.line_items.data[0].price.transform_quantity&&!s.line_items.data[0].price.custom_unit_amount;
}
function entitled(s,c){
 const items=s?.line_items?.data;
 const charge=s?.payment_intent?.latest_charge;
 return s?.status==='complete'&&s.payment_status==='paid'&&s.mode==='payment'&&s.livemode===c.live&&(s.payment_link===c.link||sandboxSessionSource(s,c))&&s.currency==='usd'&&
   Number.isSafeInteger(s.amount_total)&&s.amount_total>=2700&&items?.length===1&&!s.line_items.has_more&&
   items[0].price?.id===c.price&&items[0].price?.unit_amount===2700&&items[0].price?.currency==='usd'&&items[0].quantity===1&&
   charge?.paid===true&&charge.refunded===false&&charge.disputed===false&&charge.amount_refunded===0;
}
function validSignature(body,header,secret,now=Math.floor(Date.now()/1000)){
 if(!header||!secret)return false;
 const parts=header.split(',').map(s=>s.trim().split('='));const timestamps=parts.filter(p=>p[0]==='t');
 if(timestamps.length!==1||!/^\d+$/.test(timestamps[0][1]))return false;
 const t=Number(timestamps[0][1]);if(!Number.isSafeInteger(t)||Math.abs(now-t)>300)return false;
 const expected=createHmac('sha256',secret).update(t+'.'+body).digest();
 return parts.filter(p=>p[0]==='v1').some(p=>/^[a-f0-9]{64}$/i.test(p[1]||'')&&timingSafeEqual(expected,Buffer.from(p[1],'hex')));
}
async function stripeRequest(c,path,body,options={}){
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+c.key,'Stripe-Version':'2026-08-26.dahlia',...(options.idempotencyKey?{'Idempotency-Key':options.idempotencyKey}:{}),...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:new URLSearchParams(body)}:{})});
 if(!response.ok)throw Error('Stripe request unavailable');return response.json();
}
async function loadSession(c,id){
 if(!validSessionId(id,c))return null;
 return stripeRequest(c,'checkout/sessions/'+encodeURIComponent(id)+'?expand%5B%5D=line_items&expand%5B%5D=payment_intent.latest_charge');
}
async function markReady(c,s){
 if(s.metadata?.apex_checklist_ready==='v1')return;
 // Durable, repeatable access-ready marker; this does NOT assert an email or file was delivered.
 await stripeRequest(c,'checkout/sessions/'+encodeURIComponent(s.id),{'metadata[apex_checklist_ready]':'v1'});
}
module.exports={validCheckoutRequestId,sandboxSessionSource,config,ready,entitled,validSignature,loadSession,markReady,stripeRequest,emailAddress,validOrigin,validSessionId};
