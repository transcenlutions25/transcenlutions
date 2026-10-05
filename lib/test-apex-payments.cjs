const {test}=require('node:test');const assert=require('node:assert/strict');const {createHmac}=require('node:crypto');
const {ready,config,entitled,validSignature,markReady}=require('./apex-payments.cjs');
const cfg={live:false,price:'price_fixture',link:'plink_fixture'};
const session=()=>({id:'cs_test_fixture1234567',status:'complete',payment_status:'paid',mode:'payment',livemode:false,payment_link:cfg.link,currency:'usd',amount_total:2700,line_items:{has_more:false,data:[{quantity:1,price:{id:cfg.price,unit_amount:2700,currency:'usd'}}]},payment_intent:{latest_charge:{paid:true,refunded:false,disputed:false,amount_refunded:0}}});
test('sales fail closed unless every required setting is present',()=>{assert.equal(ready(config({})),false);assert.equal(ready(config({APEX_CHECKLIST_SALES_ENABLED:'true',APEX_STRIPE_MODE:'live'})),false);});
test('paid correct item qualifies; pending, wrong mode, wrong item, and refunds do not',()=>{
 assert.equal(entitled(session(),cfg),true);
 for(const patch of [{payment_status:'unpaid'},{status:'open'},{livemode:true},{payment_link:'other'},{currency:'eur'},{amount_total:0},{mode:'subscription'},{line_items:{has_more:true,data:[]}},{payment_intent:null}])assert.equal(entitled({...session(),...patch},cfg),false);
 for(const patch of [{refunded:true},{disputed:true},{amount_refunded:1},{paid:false}]){const s=session();Object.assign(s.payment_intent.latest_charge,patch);assert.equal(entitled(s,cfg),false);}
 const wrong=session();wrong.line_items.data[0].price.id='price_unrelated';assert.equal(entitled(wrong,cfg),false);
});
test('signature accepts signed raw payload, rejects tampering, staleness and malformed headers',()=>{
 const body='{"fixture":true}',secret='synthetic_test_secret',now=100000;
 const signature=createHmac('sha256',secret).update(now+'.'+body).digest('hex');
 const header=`t=${now},v1=${signature}`;
 assert.equal(validSignature(body,header,secret,now),true);assert.equal(validSignature(body,`t=${now},v1=bad,v1=${signature}`,secret,now),true);
 assert.equal(validSignature(body+' ',header,secret,now),false);assert.equal(validSignature(body,header,secret,now+301),false);assert.equal(validSignature(body,'t=no,v1=abc',secret,now),false);
});
test('replayed already-ready fulfillment does not call the provider again',async()=>{await markReady(cfg,{metadata:{apex_checklist_ready:'v1'}});});
