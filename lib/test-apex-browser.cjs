// DOM interaction tests with stubbed HTTP. No real buyer/order/email is created.
'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {JSDOM}=require('jsdom');
const base='public/apex-flow/',id='cs_test_fixture1234567';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function access(url='https://example.com/apex-flow/access.html#session_id='+id,options={}){
 const dom=new JSDOM(readFileSync(base+'access.html','utf8'),{url,runScripts:'outside-only'}),w=dom.window;
 w.AbortSignal=AbortSignal;w.URL.createObjectURL=()=> 'blob:synthetic';w.URL.revokeObjectURL=()=>{};
 if(options.saved)w.sessionStorage.setItem('apex-order-access-v1',JSON.stringify(options.saved));
 if(options.blockStorage)Object.defineProperty(w,'sessionStorage',{get(){throw Error('blocked');}});
 w.fetch=options.fetch||(async()=>new Response('<html>synthetic</html>',{headers:{'content-type':'text/html'}}));
 w.eval(readFileSync(base+'access.js','utf8'));return dom;
}
test('private fragment is removed, same-tab refresh recovers access, clear removes it',async()=>{
 const dom=access(),w=dom.window,d=w.document;assert.equal(w.location.hash,'');assert.equal(w.location.search,'');
 assert.match(d.getElementById('order-mode').textContent,/Sandbox order/);
 const saved=JSON.parse(w.sessionStorage.getItem('apex-order-access-v1'));assert.equal(saved.id,id);
 const refreshed=access('https://example.com/apex-flow/access.html',{saved});assert.equal(refreshed.window.document.getElementById('download').disabled,false);
 d.getElementById('download').click();await tick();assert.equal(d.getElementById('file').hidden,false);assert.match(d.getElementById('status').textContent,/Payment verified/);
 d.getElementById('forget').click();assert.equal(w.sessionStorage.getItem('apex-order-access-v1'),null);assert.equal(d.getElementById('order-mode').hidden,true);assert.equal(d.getElementById('file').hidden,true);assert.equal(d.getElementById('download').disabled,true);
 dom.window.close();refreshed.window.close();
});
test('missing, expired or invalid links cannot fall back to another saved order',()=>{
 for(const [url,saved]of [['https://example.com/apex-flow/access.html',null],['https://example.com/apex-flow/access.html',{id,expires:1}],['https://example.com/apex-flow/access.html#session_id=invalid',{id,expires:Date.now()+100000}]]){
  const dom=access(url,{saved});assert.equal(dom.window.document.getElementById('download').disabled,true);dom.window.close();
 }
});
test('storage denial still permits initial download; failed verification permits retry; double click only posts once',async()=>{
 let calls=0,release;const pending=new Promise(resolve=>release=resolve);
 const dom=access(undefined,{blockStorage:true,fetch:async()=>{calls++;await pending;return Response.json({error:'Payment pending'},{status:403});}}),d=dom.window.document;
 d.getElementById('download').click();d.getElementById('download').click();assert.equal(calls,1);release();await tick();assert.equal(d.getElementById('download').disabled,false);assert.equal(d.getElementById('file').hidden,true);assert.match(d.getElementById('status').textContent,/pending/);dom.window.close();
});
function interest(postMode='ok',registered=true){
 const dom=new JSDOM(readFileSync(base+'offer.html','utf8'),{url:'https://example.com/apex-flow/offer.html',runScripts:'outside-only'}),w=dom.window;let posts=0;
 w.AbortSignal=AbortSignal;w.fetch=async(_url,opts)=>{
  if(opts?.method==='POST'){posts++;if(postMode==='timeout')throw Error('ambiguous');return new Response('',{status:postMode==='ok'?200:503});}
  return new Response('<form name="apex-flow-intake" '+(registered?'':'data-netlify="true"')+'></form>');
 };
 w.eval(readFileSync(base+'interest.js','utf8'));return {dom,w,posts:()=>posts};
}
test('inquiry only submits with required consent; successful submission cannot double-post',async()=>{
 const f=interest();await tick();const d=f.w.document,form=d.getElementById('checklist-interest-form');
 form.elements.name.value='Synthetic Test';form.elements.email.value='synthetic@example.com';
 form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(f.posts(),0);
 form.querySelector('[type=checkbox]').checked=true;form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(f.posts(),1);assert.match(d.getElementById('interest-status').textContent,/not a purchase/);
 form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(f.posts(),1);f.dom.window.close();
});
test('unregistered inquiry form fails closed; ambiguous post locks repeat submission and shows recovery reference',async()=>{
 const missing=interest('ok',false);await tick();assert.equal(missing.w.document.getElementById('interest-send').disabled,true);missing.dom.window.close();
 const f=interest('timeout');await tick();const d=f.w.document,form=d.getElementById('checklist-interest-form');form.elements.name.value='Synthetic';form.elements.email.value='synthetic@example.com';form.querySelector('[type=checkbox]').checked=true;
 form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(d.getElementById('interest-send').disabled,true);assert.match(d.getElementById('interest-status').textContent,/reference/);
 form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));await tick();assert.equal(f.posts(),1);f.dom.window.close();
});
