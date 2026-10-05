'use strict';
const {createHash}=require('node:crypto');
const payments=require('./apex-payments.cjs');
const VERSION='v1';
const RETRY_WINDOW_MS=22*60*60*1000;
const hash=value=>createHash('sha256').update(value).digest('hex');
// Freeze this template version: provider retries require byte-identical payloads.
function message(c,s){
 const email=s.customer_details?.email;
 if(!payments.emailAddress(email)||!payments.validSessionId(s.id,c))throw Error('Invalid delivery recipient');
 const url=c.origin+'/apex-flow/access.html#session_id='+encodeURIComponent(s.id);
 return {from:c.from,to:[email],reply_to:c.support,
  subject:'Your Apex Flow Funnel Leak Emergency Checklist',
  text:'Your payment for the Funnel Leak Emergency Checklist is confirmed.\n\nOpen your private download link:\n'+url+
   '\n\nKeep this email to download again. Do not forward this private order link. Payment eligibility is checked on every download.\n\nSave the HTML file and open it in your browser with JavaScript enabled. It works offline. The checklist includes 20 self-assessed checks and an action plan; it does not scan your website or include coaching.\n\nNeed help? Reply to this email. Do not send passwords or card details.'};
}
async function fulfill(c,s,deps={}){
 if(!payments.entitled(s,c))return {state:'ineligible'};
 const write=deps.write||payments.stripeRequest,send=deps.fetch||fetch;
 const now=(deps.now||Date.now)(),meta=s.metadata||{};
 if(meta.apex_email_state==='accepted'&&meta.apex_email_version===VERSION&&meta.apex_email_id)return {state:'accepted'};
 const payload=JSON.stringify(message(c,s)),digest=hash(payload),started=meta.apex_email_started;
 if(started){
  const age=now-Number(started);
  // Resend deduplicates for 24h. Older ambiguous orders require reconciliation.
  if(!/^\d+$/.test(started)||!Number.isSafeInteger(Number(started))||age<0||age>RETRY_WINDOW_MS||meta.apex_email_payload!==digest||meta.apex_email_version!==VERSION)
   throw Error('Delivery reconciliation required');
 }else{
  await write(c,'checkout/sessions/'+encodeURIComponent(s.id),{
   'metadata[apex_email_started]':String(now),'metadata[apex_email_payload]':digest,
   'metadata[apex_email_version]':VERSION,'metadata[apex_email_state]':'pending'});
 }
 const response=await send('https://api.resend.com/emails',{
  method:'POST',signal:AbortSignal.timeout(10000),cache:'no-store',
  headers:{Authorization:'Bearer '+c.emailKey,'Content-Type':'application/json',
   'Idempotency-Key':'apex-checklist-'+VERSION+'-'+hash(s.id)},body:payload});
 if(!response.ok)throw Error('Email provider unavailable');
 const result=await response.json();
 if(typeof result.id!=='string'||!result.id||result.id.length>100)throw Error('Email acceptance unconfirmed');
 await write(c,'checkout/sessions/'+encodeURIComponent(s.id),{
  'metadata[apex_email_state]':'accepted','metadata[apex_email_id]':result.id,
  'metadata[apex_checklist_ready]':VERSION});
 // Provider acceptance is not proof of arrival in a buyer's inbox.
 return {state:'accepted'};
}
module.exports={fulfill,message,RETRY_WINDOW_MS};
