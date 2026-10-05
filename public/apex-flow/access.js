(() => {
 'use strict';
 const key='apex-order-access-v1',ttl=24*60*60*1000;
 const statusEl=document.getElementById('status'),button=document.getElementById('download'),file=document.getElementById('file'),forget=document.getElementById('forget');
 const valid=id=>typeof id==='string'&&/^cs_(live|test)_[A-Za-z0-9]{10,240}$/.test(id);
 const query=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
 const supplied=fragment.has('session_id')||query.has('session_id');
 let session=fragment.get('session_id')||query.get('session_id'),fileUrl,sending=false;
 const clear=()=>{try{sessionStorage.removeItem(key);}catch{}};
 if(supplied){
  clear();if(valid(session)){try{sessionStorage.setItem(key,JSON.stringify({id:session,expires:Date.now()+ttl}));}catch{}}
 }else{try{const saved=JSON.parse(sessionStorage.getItem(key));if(saved&&saved.expires>Date.now()&&saved.expires<=Date.now()+ttl&&valid(saved.id))session=saved.id;else clear();}catch{clear();}}
 // Retain order access in this tab for refresh; strip it from visible URL/referrers.
 history.replaceState(null,'',location.pathname);
 if(!valid(session))statusEl.textContent='Open your private order link from your checkout or delivery email. If you already paid and need help, contact support with your receipt.';
 else{button.disabled=false;forget.hidden=false;statusEl.textContent='Verify your payment to prepare the checklist download.';}
 button.addEventListener('click',async()=>{
  if(sending||!valid(session))return;
  sending=true;button.disabled=true;forget.disabled=true;statusEl.textContent='Verifying payment…';
  try{
   const response=await fetch('/api/apex/checklist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:session}),cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok){let data;try{data=await response.json();}catch{}throw Error(data?.error||'Verification is unavailable. Please retry or contact support.');}
   if(!response.headers.get('content-type')?.startsWith('text/html'))throw Error('Download could not be confirmed. Please retry.');
   const blob=await response.blob();if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(blob);file.href=fileUrl;file.hidden=false;statusEl.textContent='Payment verified. Download your checklist below and keep a copy.';button.hidden=true;
  }catch(error){statusEl.textContent=error.name==='TimeoutError'||error.name==='AbortError'?'Verification timed out. Please retry; this cannot charge you again.':error.message||'Verification unavailable. Please retry or contact support.';button.disabled=false;}
  finally{sending=false;forget.disabled=false;}
 });
 forget.addEventListener('click',()=>{clear();session=null;if(fileUrl)URL.revokeObjectURL(fileUrl);file.removeAttribute('href');file.hidden=true;button.hidden=false;button.disabled=true;forget.hidden=true;statusEl.textContent='Order access cleared from this tab. Reopen your private delivery email link when you need it.';});
})();
