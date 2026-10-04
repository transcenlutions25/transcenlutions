'use strict';
const {createHmac,timingSafeEqual}=require('node:crypto');
const LIVE_PRICE='price_1U3FTOPLMwl8qmZP4vwkUOi8';
const LIVE_LINK='plink_1U3FTTPLMwl8qmZPn4DQzrKE';
function config(env=process.env){
 const mode=env.APEX_STRIPE_MODE;
 return {key:env.APEX_STRIPE_RESTRICTED_KEY,webhook:env.APEX_STRIPE_WEBHOOK_SECRET,mode,
   live:mode==='live',price:mode==='live'?LIVE_PRICE:env.APEX_STRIPE_TEST_PRICE_ID,
   link:mode==='live'?LIVE_LINK:env.APEX_STRIPE_TEST_PAYMENT_LINK_ID,
   enabled:env.APEX_CHECKLIST_SALES_ENABLED==='true'};
}
function ready(c){return !!(c.enabled&&c.key&&c.webhook&&c.price&&c.link&&['live','test'].includes(c.mode));}
function entitled(s,c){
 const items=s?.line_items?.data;
 const charge=s?.payment_intent?.latest_charge;
 return s?.status==='complete'&&s.payment_status==='paid'&&s.mode==='payment'&&s.livemode===c.live&&s.payment_link===c.link&&s.currency==='usd'&&
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
async function stripeRequest(c,path,body){
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+c.key,'Stripe-Version':'2026-08-26.dahlia',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:new URLSearchParams(body)}:{})});
 if(!response.ok)throw Error('Stripe request unavailable');return response.json();
}
async function loadSession(c,id){
 if(typeof id!=='string'||!/^cs_(live|test)_[A-Za-z0-9]{10,240}$/.test(id))return null;
 const expected=c.live?'cs_live_':'cs_test_';if(!id.startsWith(expected))return null;
 return stripeRequest(c,'checkout/sessions/'+encodeURIComponent(id)+'?expand%5B%5D=line_items&expand%5B%5D=payment_intent.latest_charge');
}
async function markReady(c,s){
 if(s.metadata?.apex_checklist_ready==='v1')return;
 // Durable, repeatable access-ready marker; this does NOT assert an email or file was delivered.
 await stripeRequest(c,'checkout/sessions/'+encodeURIComponent(s.id),{'metadata[apex_checklist_ready]':'v1'});
}
module.exports={config,ready,entitled,validSignature,loadSession,markReady};
