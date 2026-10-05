// Run with jsdom 30.1.2 installed in a separate verification directory and NODE_PATH set.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'funnel-leak-emergency-checklist.html'),'utf8');
test('actual product renders, updates scores, safely handles notes, exports and resets',()=>{
 let captured;const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://fixture.invalid/',beforeParse(w){w.confirm=()=>true;w.URL.createObjectURL=blob=>{captured=blob;return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}});
 const w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('.check').length,20);assert.equal(d.querySelectorAll('.fix').length,20);assert.equal(d.querySelectorAll('.stage-score').length,5);
 assert.equal(d.getElementById('score').textContent,'0 / 100');
 const change=(id,value,type='change')=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event(type));};
 change('answer-T1','yes');change('answer-T2','partial');change('answer-T3','no');
 assert.equal(d.getElementById('score').textContent,'8 / 100');assert.match(d.getElementById('coverage').textContent,/3 of 20/);assert.match(d.querySelector('#priorities h3').textContent,/T3/);
 change('note-T1','<img src=x onerror=alert(1)>','input');assert.equal(d.querySelectorAll('img').length,0);assert.match(d.getElementById('plan').textContent,/<img src=x/);
 d.getElementById('autosave').click();assert.equal(JSON.parse(w.localStorage.getItem('apex-funnel-checklist-v1')).answers.T1.status,'yes');
 d.getElementById('export').click();assert.ok(captured.size>500);assert.equal(captured.type,'application/json');
 d.getElementById('download-plan').click();assert.ok(captured.size>10000);
 d.getElementById('save-copy').click();assert.equal(captured.type,'text/html;charset=utf-8');
 d.getElementById('reset').click();assert.equal(w.localStorage.getItem('apex-funnel-checklist-v1'),null);assert.match(d.getElementById('coverage').textContent,/0 of 20/);assert.equal(d.getElementById('note-T1').value,'');
 dom.window.close();
});
test('progress import validates format, preserves answers on failure/cancel, and restores sanitized answers',async()=>{
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://fixture.invalid/',beforeParse(w){w.confirm=()=>true;}}),w=dom.window,d=w.document;
 const input=d.getElementById('import-file');
 async function upload(data,size=100){Object.defineProperty(input,'files',{configurable:true,value:[{size,text:async()=>typeof data==='string'?data:JSON.stringify(data)}]});input.dispatchEvent(new w.Event('change'));await new Promise(r=>setImmediate(r));}
 await upload({version:1,product:'apex-flow-funnel-checklist',project:'Client',answers:{T1:{status:'yes',note:'Evidence'},FAKE:{status:'yes'}}});
 assert.equal(d.getElementById('answer-T1').value,'yes');assert.equal(d.getElementById('project').value,'Client');assert.equal(d.querySelectorAll('.check').length,20);
 for(const invalid of ['{',{version:9,answers:{}},{version:1,product:'other',answers:{}}]){await upload(invalid);assert.equal(d.getElementById('answer-T1').value,'yes');assert.match(d.getElementById('status').textContent,/Import failed/);}
 await upload('{}',100001);assert.equal(d.getElementById('answer-T1').value,'yes');
 w.confirm=()=>false;await upload({version:1,product:'apex-flow-funnel-checklist',answers:{}});assert.equal(d.getElementById('answer-T1').value,'yes');
 d.getElementById('reset').click();assert.equal(d.getElementById('answer-T1').value,'yes');dom.window.close();
});
