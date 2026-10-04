'use strict';
const params=new URLSearchParams(location.search),session=params.get('session_id');
// Do not leave an order access token in the visible address or outbound referrer.
history.replaceState(null,'',location.pathname);
const statusEl=document.getElementById('status'),button=document.getElementById('download'),file=document.getElementById('file');
let fileUrl;
if(!session||!/^cs_(live|test)_[A-Za-z0-9]{10,240}$/.test(session)){statusEl.textContent='Open this page from your completed Stripe checkout. If you already paid and need access, contact product support with your receipt.';}
else{button.disabled=false;statusEl.textContent='Verify your payment to prepare the checklist download.';}
button.addEventListener('click',async()=>{
 button.disabled=true;statusEl.textContent='Verifying payment…';
 try{
  const response=await fetch('/api/apex/checklist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:session}),cache:'no-store'});
  if(!response.ok){const data=await response.json();throw Error(data.error||'Could not verify payment.');}
  const blob=await response.blob();if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(blob);file.href=fileUrl;file.hidden=false;statusEl.textContent='Payment verified. Download your checklist below and keep a copy.';button.hidden=true;
 }catch(error){statusEl.textContent=error.message||'Verification unavailable. Please retry or contact support.';button.disabled=false;}
});
