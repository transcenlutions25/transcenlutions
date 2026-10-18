'use strict';
const {createHash,randomUUID}=require('node:crypto');
const error=code=>{throw Object.assign(new Error(code),{code})};
const valid=x=>typeof x==='string' && /^[a-zA-Z0-9_-]{1,128}$/.test(x);
function scope(identity){
 if(identity?.source!=='authenticated'||!valid(identity.tenantId)||!valid(identity.userId)||!valid(identity.sessionId))error('authentication_required');
 return [identity.tenantId,identity.userId];
}
function boundedHistory(rows){
 let bytes=0;const selected=[];
 for(const m of [...rows].reverse()){
  if(!['user','assistant'].includes(m.role)||typeof m.content!=='string')error('invalid_stored_message');
  const size=Buffer.byteLength(m.content);
  if(bytes+size>6000)break;bytes+=size;selected.unshift({role:m.role,content:m.content});
 }
 return selected;
}
function createConversationStore(pool){
 async function transaction(fn){
  const db=await pool.connect();
  try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result}
  catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}finally{db.release()}
 }
 async function owned(db,s,id){
  const row=(await db.query('SELECT * FROM tay_shared_conversations WHERE tenant_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[...s,id])).rows[0];
  if(!row)error('conversation_not_found');return row;
 }
 function turnScope(turn){
  if(!turn||!valid(turn.tenantId)||!valid(turn.userId)||!valid(turn.conversationId)||!valid(turn.requestId)||!valid(turn.lease))error('invalid_turn');
  return [turn.tenantId,turn.userId,turn.conversationId,turn.requestId];
 }
 async function create(identity,id){
  const s=scope(identity);if(!valid(id))error('invalid_input');
  await pool.query('INSERT INTO tay_shared_conversations(tenant_id,user_id,id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[...s,id]);
  return {conversationId:id,version:0};
 }
 async function beginTurn(identity,input){
  const s=scope(identity);
  if(!input||!valid(input.conversationId)||!valid(input.requestId)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||
   typeof input.text!=='string'||!input.text.trim()||Buffer.byteLength(input.text)>2000)error('invalid_input');
  const hash=createHash('sha256').update(JSON.stringify([input.text,input.expectedVersion])).digest('hex');
  return transaction(async db=>{
   const c=await owned(db,s,input.conversationId);
   const key=[...s,input.conversationId,input.requestId];
   const prior=(await db.query('SELECT * FROM tay_shared_turns WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND request_id=$4',key)).rows[0];
   if(prior){
    if(prior.input_hash!==hash)error('idempotency_conflict');
    if(prior.status==='complete')return {replay:true,receipt:prior.receipt};
    error(prior.status==='active'?'turn_pending':'turn_incomplete');
   }
   if(c.active_request){
    const active=await db.query("UPDATE tay_shared_turns SET status='incomplete' WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND request_id=$4 AND status='active' AND expires_at<=now() RETURNING request_id",[...s,input.conversationId,c.active_request]);
    if(!active.rows.length)error('conversation_busy');
   }
   if(Number(c.version)!==input.expectedVersion)error('version_conflict');
   const lease=randomUUID();
   await db.query("INSERT INTO tay_shared_turns(tenant_id,user_id,conversation_id,request_id,input_hash,status,lease,expires_at) VALUES($1,$2,$3,$4,$5,'active',$6,now()+interval '60 seconds')",[...key,hash,lease]);
   const version=input.expectedVersion+1;
   await db.query("INSERT INTO tay_shared_messages(tenant_id,user_id,conversation_id,seq,request_id,role,content) VALUES($1,$2,$3,$4,$5,'user',$6)",[...s,input.conversationId,version,input.requestId,input.text]);
   await db.query('UPDATE tay_shared_conversations SET version=$4,active_request=$5 WHERE tenant_id=$1 AND user_id=$2 AND id=$3',[...s,input.conversationId,version,input.requestId]);
   const rows=(await db.query('SELECT role,content FROM (SELECT seq,role,content FROM tay_shared_messages WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 ORDER BY seq DESC LIMIT 20) recent ORDER BY seq',[...s,input.conversationId])).rows;
   return {tenantId:s[0],userId:s[1],conversationId:input.conversationId,requestId:input.requestId,lease,version,messages:boundedHistory(rows)};
  });
 }
 async function completeTurn(turn,text,metadata){
  const key=turnScope(turn);
  if(typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>16384)error('invalid_output');
  return transaction(async db=>{
   const c=await owned(db,key.slice(0,2),turn.conversationId);
   const row=(await db.query('SELECT * FROM tay_shared_turns WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND request_id=$4 AND lease=$5 AND expires_at>now()',[...key,turn.lease])).rows[0];
   if(!row||row.status!=='active'||c.active_request!==turn.requestId||Number(c.version)!==turn.version)error('turn_lease_lost');
   const version=turn.version+1;
   await db.query("INSERT INTO tay_shared_messages(tenant_id,user_id,conversation_id,seq,request_id,role,content) VALUES($1,$2,$3,$4,$5,'assistant',$6)",[key[0],key[1],key[2],version,key[3],text]);
   const receipt={conversationId:turn.conversationId,requestId:turn.requestId,version};
   await db.query("UPDATE tay_shared_turns SET status='complete',receipt=$5::jsonb WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND request_id=$4",[...key,JSON.stringify(receipt)]);
   await db.query('UPDATE tay_shared_conversations SET version=$4,active_request=NULL WHERE tenant_id=$1 AND user_id=$2 AND id=$3',[key[0],key[1],key[2],version]);
   return receipt;
  });
 }
 async function failTurn(turn){
  const key=turnScope(turn);
  await transaction(async db=>{
   await owned(db,key.slice(0,2),turn.conversationId);
   const changed=await db.query("UPDATE tay_shared_turns SET status='incomplete' WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND request_id=$4 AND lease=$5 AND status='active' RETURNING request_id",[...key,turn.lease]);
   if(changed.rows.length)await db.query('UPDATE tay_shared_conversations SET active_request=NULL WHERE tenant_id=$1 AND user_id=$2 AND id=$3 AND active_request=$4',key);
  });
 }
 async function read(identity,id,after=0){
  const s=scope(identity);
  if(!valid(id)||!Number.isSafeInteger(after)||after<0)error('invalid_input');
  return transaction(async db=>{
   const c=await owned(db,s,id);
   const messages=(await db.query('SELECT seq,request_id,role,content,created_at FROM tay_shared_messages WHERE tenant_id=$1 AND user_id=$2 AND conversation_id=$3 AND seq>$4 ORDER BY seq LIMIT 100',[...s,id,after])).rows;
   return {conversationId:id,version:Number(c.version),pending:!!c.active_request,messages};
  });
 }
 return {create,beginTurn,completeTurn,failTurn,read};
}
module.exports={createConversationStore,scope,boundedHistory};
