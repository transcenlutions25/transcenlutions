const {test}=require('node:test');
const assert=require('node:assert/strict');
const checks=require('./checks.json');
const {summarize,sanitize}=require('./engine.cjs');
test('catalog promise: exactly 20 unique actionable checks, four per stage',()=>{
 assert.equal(checks.length,20);assert.equal(new Set(checks.map(c=>c.id)).size,20);
 for(const stage of ['Traffic','Offer','Capture','Follow-up','Close'])assert.equal(checks.filter(c=>c.stage===stage).length,4);
 for(const c of checks)for(const k of ['title','check','evidence','fix','action','verify'])assert.ok(c[k].length>15,`${c.id} ${k}`);
});
test('unassessed is never mistaken for verified or assessed',()=>{
 const s=summarize(checks,sanitize(checks,{}));assert.equal(s.score,0);assert.equal(s.assessed,0);assert.equal(s.priorities.length,3);
});
test('all verified and mixed answers produce the expected score and coverage',()=>{
 let a=Object.fromEntries(checks.map(c=>[c.id,{status:'yes'}]));assert.equal(summarize(checks,a).score,100);assert.equal(summarize(checks,a).priorities.length,0);
 a.T1.status='no';a.T2.status='partial';a.T3.status='unknown';const s=summarize(checks,a);assert.equal(s.score,88);assert.equal(s.assessed,19);assert.equal(s.stages[0].points,3);
 assert.deepEqual(s.priorities.map(c=>c.id),['T1','T3','T2']);
});
test('invalid imports cannot introduce new checks, inflated scores or oversized notes',()=>{
 const a=sanitize(checks,{T1:{status:999,note:'a'.repeat(1000)},T2:{status:'yes',note:42},XX:{status:'yes'}});
 assert.equal(Object.keys(a).length,20);assert.equal(a.T1.status,'unknown');assert.equal(a.T1.note.length,600);assert.equal(a.T2.note,'');assert.equal(summarize(checks,a).score,5);
});
