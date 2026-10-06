(() => {
 'use strict';
 const status=document.getElementById('checkout-status'),link=document.getElementById('checkout-link');
 const retry=document.getElementById('checkout-retry'),start=document.getElementById('checkout-start'),reset=document.getElementById('checkout-reset');
 const storageKey='apex-test-checkout-request-v1',ttl=22*60*60*1000;
 const valid=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
 let busy=false,ready=false,requestId;
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved?.expires>Date.now()&&saved.expires<=Date.now()+ttl&&valid(saved.id))requestId=saved.id;}catch{}
 function hideLink(){link.hidden=true;link.removeAttribute('href');}
 function setBusy(value){busy=value;start.disabled=value;retry.disabled=value;reset.disabled=value;status.setAttribute('aria-busy',String(value));}
 async function check(){
  if(busy)return;setBusy(true);ready=false;start.hidden=true;hideLink();status.textContent='Checking test checkout availability…';
  try{
   const response=await fetch('/api/apex/checkout',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('unavailable');const data=await response.json();
   ready=data.state==='test'&&data.amount===2700&&data.currency==='usd';
   status.textContent=ready?'Sandbox ready: prepare a fixed $27 test checkout. No payment is submitted here. Never use a real card.':'Checkout is not open. Read the sample or request launch details below.';
  }catch{status.textContent='Test checkout availability could not be verified. Check your connection and try again, or request launch details below.';}
  finally{setBusy(false);start.hidden=!ready;retry.hidden=false;reset.hidden=!requestId;}
 }
 start.addEventListener('click',async()=>{
  if(busy||!ready)return;setBusy(true);hideLink();status.textContent='Preparing test checkout…';
  try{
   if(!requestId){requestId=crypto.randomUUID();try{sessionStorage.setItem(storageKey,JSON.stringify({id:requestId,expires:Date.now()+ttl}));}catch{}}
   const response=await fetch('/api/apex/checkout',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(25000),body:JSON.stringify({request_id:requestId})});
   if(!response.ok)throw Error('unavailable');const data=await response.json();const url=new URL(data.checkoutUrl);
   if(data.state!=='test'||url.origin!=='https://checkout.stripe.com'||!/^\/c\/pay\/cs_test_[A-Za-z0-9]{10,240}$/.test(url.pathname)||url.username||url.password||url.search)throw Error('unverified');
   link.href=url.href;link.hidden=false;start.hidden=true;
   status.textContent='Test checkout prepared. Continue to Stripe using test payment details. No payment has been submitted here.';
  }catch{status.textContent='Test checkout could not be confirmed. Retry safely with the same request. No payment has been submitted by this page.';}
  finally{setBusy(false);reset.hidden=!requestId;}
 });
 retry.addEventListener('click',check);
 reset.addEventListener('click',()=>{if(busy)return;requestId=null;try{sessionStorage.removeItem(storageKey);}catch{}hideLink();check();});
 window.addEventListener('pageshow',event=>{if(event.persisted)check();});
 check();
})();
