// Synthetic recovery links only. No email, account or real credential is used.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../web/tay/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const good='#type=recovery&access_token=mock-access&refresh_token=mock-refresh&expires_in=3600';
function page(t,fragment='',replies=[]){
 const dom=new JSDOM(html,{url:'https://tay.example.invalid/transcenlutions/'+fragment,runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window,requests=[];w.setTimeout=()=>0;
 w.fetch=async(url,options)=>{requests.push({url,options});assert.ok(replies.length,'Unexpected network call');const r=replies.shift();if(r instanceof Error)throw r;if(typeof r==='function')return r();return {ok:r.status<300&&r.status>=200,status:r.status,json:async()=>r.body};};
 w.eval(script);return {w,requests,get:id=>w.document.getElementById(id)};
}
function fill(p){p.get('newPassword').value=p.get('confirmPassword').value='FixtureOnly-42!Ab';}
test('valid implicit recovery opens new-password form and immediately removes URL credentials',t=>{
 const p=page(t,good);assert.ok(p.get('reset'));assert.equal(p.w.location.hash,'');assert.equal(p.requests.length,0);
});
test('expired/consumed email redirect gives an explicit safe recovery error',t=>{
 const p=page(t,'#error=access_denied&error_code=otp_expired&error_description=Untrusted-detail');
 assert.match(p.get('notice').textContent,/expired|already.*used/i);assert.equal(p.w.location.hash,'');
 assert.ok(!p.get('notice').textContent.includes('Untrusted-detail'));assert.equal(p.requests.length,0);
});
test('incomplete recovery does not offer a password mutation form',t=>{
 const p=page(t,'#type=recovery&access_token=mock-access');assert.equal(p.get('reset'),null);
 assert.match(p.get('notice').textContent,/incomplete/i);assert.equal(p.w.location.hash,'');assert.equal(p.requests.length,0);
});
test('query code callback is rejected explicitly rather than silently showing ordinary login',t=>{
 const p=page(t,'?code=mock-code');assert.match(p.get('notice').textContent,/reset link|recovery/i);
 assert.equal(p.w.location.search,'');assert.equal(p.requests.length,0);
});
test('valid new-password submit uses bearer-authenticated PUT and persists mock session on success',async t=>{
 const p=page(t,good,[{status:200,body:{id:'mock-user'}}]);fill(p);
 await p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.equal(p.requests.length,1);assert.match(p.requests[0].url,/\/auth\/v1\/user$/);assert.equal(p.requests[0].options.method,'PUT');
 assert.equal(p.requests[0].options.headers.authorization,'Bearer mock-access');
 assert.match(p.get('notice').textContent,/Password updated/);assert.ok(p.w.localStorage.getItem('transcenlutions_tay_cloud_session_v4'));
});
test('repeated submit while pending produces only one password update',async t=>{
 let release;const p=page(t,good,[()=>new Promise(resolve=>{release=()=>resolve({ok:true,status:200,json:async()=>({id:'mock-user'})});}),{status:200,body:{id:'mock-user'}}]);fill(p);
 const first=p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 const second=p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.equal(p.requests.length,1);release();await Promise.all([first,second]);
});
test('expired access rejection provides next action and stores no session',async t=>{
 const p=page(t,good,[{status:401,body:{code:'bad_jwt',msg:'JWT expired'}}]);fill(p);
 await p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.match(p.get('notice').textContent,/request.*new|new.*reset/i);assert.equal(p.w.localStorage.length,0);
});
test('network failure remains distinct and permits an explicit retry',async t=>{
 const p=page(t,good,[new TypeError('Failed to fetch')]);fill(p);
 await p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.match(p.get('notice').textContent,/connect|network|fetch/i);assert.equal(p.w.localStorage.length,0);
 assert.equal(p.get('reset').querySelector('[type="submit"]').disabled,false);
});
test('mock reset request points back to the current Pages path without query or fragment',async t=>{
 const p=page(t,'?view=example',[{status:200,body:{}}]);p.get('email').value='fixture@example.invalid';
 await p.get('forgot').onclick();const request=new URL(p.requests[0].url);
 assert.equal(request.searchParams.get('redirect_to'),'https://tay.example.invalid/transcenlutions/');
 assert.equal(p.requests.length,1);
});
test('recovery form offers a non-mutating return to sign in',t=>{
 const p=page(t,good);p.get('resetSignIn').click();assert.ok(p.get('login'));assert.equal(p.get('notice').textContent,'');assert.equal(p.requests.length,0);
});
