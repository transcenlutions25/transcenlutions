// Proposed lib/online-provider.cjs; server-only, no HTTP route installed.
'use strict';
const MODELS = new Set(['openai/gpt-oss-20b','openai/gpt-oss-120b']);
class GatewayError extends Error { constructor(code) { super(code); this.code=code; } }
const fail=code=>{throw new GatewayError(code)};
function context(messages) {
 if (!Array.isArray(messages) || !messages.length || messages.length>20) fail('invalid_context');
 let bytes=0;
 return messages.map(m=>{
  if (!m || !['user','assistant'].includes(m.role) || typeof m.content!=='string') fail('invalid_context');
  bytes+=Buffer.byteLength(m.content,'utf8');
  if(bytes>6000) fail('context_limit');
  return {role:m.role,content:m.content};
 });
}
function config(env) {
 if(env.TAY_ONLINE_ENABLED!=='true') fail('online_disabled');
 // Deployment owner attests a free-only org with no paid upgrade; API cannot verify billing.
 if(env.TAY_GROQ_FREE_ONLY_VERIFIED!=='true' || env.TAY_ADULT_PILOT!=='true') fail('pilot_not_cleared');
 if(!env.GROQ_API_KEY) fail('provider_not_connected');
 const model=env.TAY_GROQ_MODEL || 'openai/gpt-oss-20b';
 if(!MODELS.has(model)) fail('model_not_allowed');
 return model;
}
async function* tokens(body) {
 const reader=body.getReader(); const decoder=new TextDecoder(); let buffer='', bytes=0, done=false;
 try {
  while(true) {
   const chunk=await reader.read(); if(chunk.done) break;
   bytes+=chunk.value.byteLength; if(bytes>131072) fail('provider_response_limit');
   buffer+=decoder.decode(chunk.value,{stream:true});
   let end;
   while((end=buffer.indexOf('\n'))!==-1) {
    const line=buffer.slice(0,end).trim(); buffer=buffer.slice(end+1);
    if(!line.startsWith('data:')) continue;
    const data=line.slice(5).trim();
    if(data==='[DONE]'){done=true;return;}
    let packet; try{packet=JSON.parse(data)}catch{fail('provider_protocol_error')}
    if(packet.error) fail('provider_stream_error');
    const choice=packet.choices?.[0];
    if(choice?.delta?.tool_calls) fail('unexpected_tool_call');
    const value=choice?.delta?.content;
    if(typeof value==='string' && value) yield value;
   }
  }
  if(!done) fail('provider_stream_incomplete');
 } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
async function* onlineTurn(request, input, deps) {
 // resolveIdentity must be the existing server resolver, never caller headers/role fields.
 const identity=await deps.resolveIdentity(request);
 if(!identity?.ok || identity.identity?.source!=='authenticated') fail('authentication_required');
 if(!await deps.isAdultPilot(identity.identity)) fail('adult_pilot_required');
 const model=config(deps.env);
 if(!input || Object.keys(input).some(k=>!['conversationId','requestId','text','expectedVersion'].includes(k)) ||
   !/^[a-zA-Z0-9_-]{1,128}$/.test(input.conversationId||'') ||
   !/^[a-zA-Z0-9_-]{1,128}$/.test(input.requestId||'') ||
   !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<0 ||
   typeof input.text!=='string' || !input.text.trim() || Buffer.byteLength(input.text)>2000) fail('invalid_input');
 // beginTurn must transactionally authorize tenant/user, compare version, claim request ID,
 // append the user turn, and load only owned user/assistant history. No client history allowed.
 const turn=await deps.conversations.beginTurn(identity.identity,input);
 let completed=false;
 const controller=new AbortController();
 const abort=()=>controller.abort(); request.signal?.addEventListener('abort',abort,{once:true});
 if(request.signal?.aborted) controller.abort();
 const timer=setTimeout(abort,30000);
 try {
  const history=context(turn.messages);
  let response;
  for(let attempt=0;attempt<2;attempt++) {
   // Distributed durable atomic reservation, shared by ALL keys/models in this org.
   // Reserve conservatively: <=6000 UTF8 bytes plus system/framing plus 512 output.
   // Every attempt counts; no automatic refund after ambiguous provider outcomes.
   if(!await deps.budget.reserve({scope:'groq-org',requests:1,tokens:7200,
      minuteRequests:20,dayRequests:500,minuteTokens:7500,dayTokens:150000})) fail('free_quota_exhausted');
   try {
    response=await deps.fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST',redirect:'error',signal:controller.signal,
     headers:{Authorization:'Bearer '+deps.env.GROQ_API_KEY,'Content-Type':'application/json'},
     body:JSON.stringify({model,stream:true,max_completion_tokens:512,
      messages:[{role:'system',content:'You are Tay by Transcenlutions. Reply helpfully. No external tool execution is available.'},...history]})
    });
   } catch { fail(controller.signal.aborted?'cancelled':'provider_unavailable'); }
   if(response.status!==429 || attempt===1) break;
   await response.body?.cancel();
   const seconds=Number(response.headers.get('retry-after'));
   if(!Number.isFinite(seconds)||seconds<0||seconds>2) fail('provider_rate_limited');
   await deps.wait(seconds*1000,controller.signal);
  }
  if(!response.ok){await response.body?.cancel();fail(response.status===429?'provider_rate_limited':'provider_unavailable')}
  if(!response.body) fail('provider_protocol_error');
  yield {type:'status',mode:'online',provider:'groq',model};
  let text='';
  for await(const token of tokens(response.body)){
   text+=token; if(Buffer.byteLength(text)>16384) fail('output_limit');
   yield {type:'delta',text:token};
  }
  if(!text.trim()) fail('empty_response');
  // Must atomically persist assistant reply + complete request, verify turn ownership/version.
  const receipt=await deps.conversations.completeTurn(turn,text,{provider:'groq',model});
  completed=true; yield {type:'complete',receipt};
 } finally {
  clearTimeout(timer);request.signal?.removeEventListener('abort',abort);
  if(!completed) await deps.conversations.failTurn(turn,{status:'incomplete'}); // no partial reply marked complete
 }
}
module.exports={onlineTurn,context,config,tokens,GatewayError};
