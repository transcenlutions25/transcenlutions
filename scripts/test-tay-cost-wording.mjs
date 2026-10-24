import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../web/tay/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function fixture(t){
 const dom=new JSDOM(html,{url:'https://tay.example.invalid/',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window;w.fetch=()=>{throw new Error('No network permitted in wording test')};w.eval(script+";window.renderDecision=(value)=>{signupAccountView();signup.step=6;if(value)signup.answers.decision_preferences.optimizeFor=value;renderIntake()}");
 w.renderDecision();return w;
}
test('cost choice explains value rather than simply lowest price',t=>{
 const w=fixture(t),input=w.document.querySelector('input[name="optimize"][value="cost"]'),label=input.closest('label');
 assert.equal(label.querySelector('strong').textContent,'Cost-effectiveness');
 assert.equal(label.querySelector('small').textContent,'Prefer the best value for the outcome, balancing quality, reliability, time, and total cost. Not simply the cheapest option.');
 assert.equal(input.value,'cost');
});
test('existing cost identifier remains selected, saved and restored across local steps',async t=>{
 const w=fixture(t);w.renderDecision('cost');
 assert.equal(w.document.querySelector('input[name="optimize"]:checked').value,'cost');
 await w.document.getElementById('intake').onsubmit(new w.Event('submit',{cancelable:true}));
 const saved=JSON.parse(w.localStorage.getItem('transcenlutions_tay_signup_draft_v1'));
 assert.deepEqual(saved.answers.decision_preferences,{optimizeFor:'cost'});
 w.document.getElementById('back').click();
 assert.equal(w.document.querySelector('input[name="optimize"]:checked').value,'cost');
});
