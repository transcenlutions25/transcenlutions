'use strict';
const payments=require('./apex-payments.cjs');
const delivery=require('./apex-delivery.cjs');
const {readFile}=require('node:fs/promises');
const {join}=require('node:path');
const headers={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const json=(error,status)=>Response.json({error},{status,headers});
class InputError extends Error{}
async function boundedBody(request,max){
 const length=request.headers.get('content-length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>max))throw new InputError();
 if(!request.body)return '';
 const reader=request.body.getReader();let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new InputError();}chunks.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
function createHandlers(deps={}){
 const settings=deps.config||payments.config,load=deps.loadSession||payments.loadSession;
 const fulfill=deps.fulfill||delivery.fulfill;
 const read=deps.readFile||(()=>readFile(join(process.cwd(),'products/funnel-checklist/funnel-leak-emergency-checklist.html'),'utf8'));
 return {
  async download(request){
   const c=settings();if(!payments.ready(c))return json('Paid downloads are not enabled. Contact product support.',503);
   const origin=request.headers.get('origin');
   if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return json('Invalid request.',403);
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json('Expected a JSON request.',415);
   try{
    let data;try{data=JSON.parse(await boundedBody(request,1000));}catch(e){if(e instanceof InputError||e instanceof SyntaxError)return json('Invalid request.',400);throw e;}
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!payments.validSessionId(data.session_id,c))return json('Invalid order link.',400);
    const s=await load(c,data.session_id);
    if(!payments.entitled(s,c))return json('A completed payment for this checklist could not be verified. Pending payments must finish first. Contact support if needed.',403);
    const file=await read();
    // An email-provider outage must not block an already-paid buyer's download.
    return new Response(file,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Disposition':'attachment; filename="funnel-leak-emergency-checklist.html"'}});
   }catch{return json('Download verification is temporarily unavailable. Retry or contact product support.',503);}
  },
  async webhook(request){
   const c=settings();if(!payments.ready(c))return new Response('Fulfillment disabled',{status:503,headers});
   try{
    let body,event;
    try{body=await boundedBody(request,1000000);
     if(!payments.validSignature(body,request.headers.get('stripe-signature'),c.webhook))return new Response('Invalid signature',{status:400,headers});
     event=JSON.parse(body);
    }catch(e){if(e instanceof InputError||e instanceof SyntaxError)return new Response('Invalid payload',{status:400,headers});throw e;}
    if(!event||typeof event.type!=='string')return new Response('Invalid event',{status:400,headers});
    if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return new Response('Ignored',{headers});
    if(event.livemode!==c.live||!payments.validSessionId(event.data?.object?.id,c))return new Response('Invalid event',{status:400,headers});
    const s=await load(c,event.data.object.id);
    if(!s)throw Error('Session unavailable');
    if(payments.entitled(s,c))await fulfill(c,s);
    return new Response('Received',{headers});
   }catch{return new Response('Fulfillment temporarily unavailable',{status:503,headers});}
  }
 };
}
module.exports={createHandlers,boundedBody};
