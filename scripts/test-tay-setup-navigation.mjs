// Execute the actual Pages script in a DOM; every network request is intercepted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
const html=readFileSync(new URL('../web/tay/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function page(t,{url='https://tay.example.invalid/',responses=[]}={}){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'});
 t.after(()=>dom.window.close());
 const w=dom.window,requests=[];
 w.fetch=async(url,options)=>{
  requests.push({url,options});
  assert.ok(responses.length,'Unexpected request (all networking must be mocked)');
  const response=responses.shift();
  return {ok:response.status>=200&&response.status<300,status:response.status,json:async()=>response.body};
 };
 w.eval(script);
 const get=id=>w.document.getElementById(id);
 const click=id=>get(id).dispatchEvent(new w.PointerEvent('click',{bubbles:true,cancelable:true}));
 const notice=()=>get('notice').textContent;
 return {w,get,click,notice,requests};
}
test('setup click cannot render its PointerEvent as a validation error',t=>{
 const p=page(t);p.click('signup');
 assert.equal(p.get('root').querySelector('h1').textContent,'Set up your Tay');
 assert.equal(p.notice(),'');assert.equal(p.requests.length,0);
});
test('confirmation Edit setup click cannot render its PointerEvent',t=>{
 const p=page(t);p.w.confirmationView('fixture@example.invalid');p.click('edit');
 assert.equal(p.notice(),'');assert.ok(p.get('account'));assert.equal(p.requests.length,0);
});
test('repeated signup and existing-account navigation clears errors and stays local',t=>{
 const p=page(t);
 for(let i=0;i<4;i++){
  p.click('signup');assert.equal(p.notice(),'');
  p.get('email').value='fixture@example.invalid';p.click('backToLogin');
  assert.ok(p.get('login'));assert.equal(p.notice(),'');
  assert.equal(p.get('email').value,'fixture@example.invalid');
  assert.equal(p.get('password').type,'password');
 }
 assert.equal(p.requests.length,0);
});
test('legitimate signup error renders as escaped text and navigation clears it',t=>{
 const p=page(t);p.w.signupAccountView('Example <b>validation</b> error');
 assert.equal(p.notice(),'Example <b>validation</b> error');
 assert.equal(p.get('notice').querySelector('b'),null);
 p.get('password').value='FixtureOnly-42!Ab';p.get('confirm').value='different mock password';
 p.get('account').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(p.notice(),'Passwords do not match.');p.click('backToLogin');
 assert.equal(p.notice(),'');assert.equal(p.requests.length,0);
});
test('setup form advances locally and Back returns without an event message',t=>{
 const p=page(t);p.click('signup');p.get('name').value='Fixture';p.get('email').value='fixture@example.invalid';
 p.get('password').value=p.get('confirm').value='FixtureOnly-42!Ab';
 p.get('account').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));
 assert.ok(p.get('intake'));p.click('back');assert.ok(p.get('account'));assert.equal(p.notice(),'');
 assert.equal(p.requests.length,0);
 assert.ok(!p.w.localStorage.getItem('transcenlutions_tay_signup_draft_v1').includes('FixtureOnly-42!Ab'));
});
test('existing-account login displays mocked auth error without navigating to signup',async t=>{
 const p=page(t,{responses:[{status:400,body:{code:'invalid_credentials',msg:'Invalid login credentials'}}]});
 p.get('email').value='fixture@example.invalid';p.get('password').value='mock login password';
 await p.get('login').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.equal(p.notice(),'Invalid login credentials');assert.ok(p.get('login'));
 assert.equal(p.requests.length,1);assert.match(p.requests[0].url,/token\?grant_type=password$/);
 assert.equal(p.w.localStorage.length,0);
});
test('reset entry with blank email is repeatable, stays on signin and sends nothing',async t=>{
 const p=page(t);p.click('signup');p.click('backToLogin');
 for(let i=0;i<3;i++){await p.get('forgot').onclick();assert.equal(p.notice(),'Enter your email first.');assert.ok(p.get('login'));}
 assert.equal(p.requests.length,0);
});
test('recovery-link entry shows reset form and mismatched values make no request',async t=>{
 const p=page(t,{url:'https://tay.example.invalid/#type=recovery&access_token=mock-recovery&refresh_token=mock-refresh'});
 assert.ok(p.get('reset'));assert.equal(p.notice(),'');
 p.get('newPassword').value='FixtureOnly-42!Ab';p.get('confirmPassword').value='different mock password';
 await p.get('reset').onsubmit(new p.w.Event('submit',{cancelable:true}));
 assert.equal(p.notice(),'Passwords do not match.');assert.equal(p.requests.length,0);
});
const recoveryUrl='https://tay.example.invalid/#type=recovery&access_token=mock-recovery&refresh_token=mock-refresh';
function passwordPage(t,recovery){
 const p=page(t,recovery?{url:recoveryUrl}:{});if(!recovery)p.click('signup');
 p.password=p.get(recovery?'newPassword':'password');p.confirm=p.get(recovery?'confirmPassword':'confirm');
 p.form=p.get(recovery?'reset':'account');
 p.type=(input,value)=>{input.value=value;input.dispatchEvent(new p.w.Event('input',{bubbles:true}));};
 return p;
}
for(const recovery of [false,true]){
 const screen=recovery?'recovery':'signup';
 for(const [rule,value,label] of [
  ['length','Aa1!','At least 12 characters'],
  ['upper','lowercase123!','One uppercase letter'],
  ['lower','UPPERCASE123!','One lowercase letter'],
  ['number','NoNumbersHere!','One number'],
  ['symbol','NoSymbolsHere42','One special symbol'],
 ]){
  test(`${screen}: missing ${rule} stays unchecked and blocks submission with specific feedback`,async t=>{
   const p=passwordPage(t,recovery);p.type(p.password,value);p.type(p.confirm,value);
   assert.equal(p.get('rule-'+rule).dataset.met,'false');
   assert.match(p.get('rule-'+rule).textContent,/○ Required/);
   await p.form.onsubmit(new p.w.Event('submit',{cancelable:true}));
   assert.ok(p.notice().includes(label));assert.equal(p.requests.length,0);
   assert.equal(p.password.validity.customError,true);
  });
 }
 test(`${screen}: length boundary changes from 11 to 12 characters`,t=>{
  const p=passwordPage(t,recovery);
  p.type(p.password,'Aa1!aaaaaaa');assert.equal(p.get('rule-length').dataset.met,'false');
  p.type(p.password,'Aa1!aaaaaaaa');assert.equal(p.get('rule-length').dataset.met,'true');
  assert.equal(p.get('passwordStatus').textContent,'5 of 5 password requirements met.');
  p.type(p.password,'Aa1!aaaaaaa');assert.equal(p.get('rule-length').dataset.met,'false');
  assert.equal(p.requests.length,0);
 });
 test(`${screen}: live checklist and separate confirmation status update accessibly without content disclosure`,t=>{
  const p=passwordPage(t,recovery),accepted='FixtureOnly-42!Ab';
  assert.equal(p.get('passwordStatus').getAttribute('role'),'status');
  assert.equal(p.get('passwordStatus').getAttribute('aria-live'),'polite');
  assert.equal(p.password.getAttribute('aria-describedby'),'passwordRequirements');
  assert.equal(p.confirm.getAttribute('aria-describedby'),'passwordMatch');
  p.type(p.password,accepted);
  assert.equal(p.get('passwordStatus').textContent,'5 of 5 password requirements met.');
  for(const row of p.get('passwordRequirements').children){assert.equal(row.dataset.met,'true');assert.match(row.textContent,/✓ Met/);}
  p.type(p.confirm,'different fixture');assert.match(p.get('passwordMatch').textContent,/do not match/);
  p.type(p.confirm,accepted);assert.equal(p.get('passwordMatch').textContent,'✓ Passwords match.');
  assert.equal(p.password.validity.customError,false);assert.equal(p.confirm.validity.customError,false);
  const feedback=p.get('passwordRequirements').textContent+p.get('passwordStatus').textContent+p.get('passwordMatch').textContent+p.notice();
  assert.ok(!feedback.includes(accepted));assert.equal(p.password.type,'password');assert.equal(p.requests.length,0);
  p.type(p.password,'');assert.equal(p.get('passwordStatus').textContent,'0 of 5 password requirements met.');
 });
 test(`${screen}: valid new password still blocks mismatched confirmation separately`,async t=>{
  const p=passwordPage(t,recovery);p.type(p.password,'FixtureOnly-42!Ab');p.type(p.confirm,'DifferentOnly-42!Ab');
  await p.form.onsubmit(new p.w.Event('submit',{cancelable:true}));
  assert.equal(p.notice(),'Passwords do not match.');assert.equal(p.requests.length,0);
 });
}
test('existing-account sign-in keeps its existing requirements and has no new checklist',t=>{
 const p=page(t);assert.equal(p.get('password').minLength,6);assert.equal(p.get('passwordRequirements'),null);
 p.click('signup');p.click('backToLogin');assert.equal(p.get('password').minLength,6);
 assert.equal(p.get('passwordRequirements'),null);assert.equal(p.get('password').validity.customError,false);
 assert.equal(p.requests.length,0);
});

test('spaces do not satisfy special symbol and Show control leaves checklist intact',t=>{
 const p=passwordPage(t,false);p.type(p.password,'UpperLower42 ');
 assert.equal(p.get('rule-symbol').dataset.met,'false');
 p.type(p.password,'UpperLower42!');p.click('eye');
 assert.equal(p.password.type,'text');assert.equal(p.get('rule-symbol').dataset.met,'true');
 p.click('eye');assert.equal(p.password.type,'password');assert.equal(p.requests.length,0);
});
