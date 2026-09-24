const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18744/');
 await page.locator('#commandQueue').waitFor();
 await page.waitForFunction(()=>document.querySelector('#queueConversation').options.length===1);
 const project=await page.locator('#project').inputValue();
 async function state(){const r=await page.request.post('http://127.0.0.1:18744/runtime/state',{headers:{'X-Tay-Token':'fixture-token'},data:{project}});return r.json();}
 async function send(text){await page.locator('#prompt').fill(text);await page.locator('#send').click();await page.waitForFunction(()=>document.querySelector('#prompt').value==='');}
 await send('First objective');
 await page.waitForFunction(()=>document.querySelector('.tay-queue-item-title span')?.textContent.includes('active'));
 await page.locator('#queueAgent').selectOption('kj');
 for(let i=2;i<=6;i++)await send('Objective '+i);
 assert.equal((await state()).items.length,6);
 assert.equal(await page.locator('[data-section=next] .tay-queue-item').count(),3);
 assert.match(await page.locator('[data-section=backlog] summary').textContent(),/2/);
 await page.getByRole('button',{name:'Steer',exact:true}).click();
 await send('Use the royal purple design');
 await page.locator('#prompt').fill('Keep this unsent draft');
 await page.waitForTimeout(2200);
 assert.equal(await page.locator('#prompt').inputValue(),'Keep this unsent draft');
 await page.reload();
 await page.locator('[data-section=backlog]').waitFor();
 const before=await state();
 assert.equal(before.items.length,6);
 assert.deepEqual(before.items[0].payload.steering,['Use the royal purple design']);
 const second=before.items.find(x=>x.payload.message==='Objective 2');
 await page.locator(`[data-objective="${second.id}"]`).getByRole('button',{name:'Pause',exact:true}).click();
 const bad=await page.request.post('http://127.0.0.1:18744/runtime/state',{data:{project}});assert.equal(bad.status(),403);
 const cross=await page.request.post('http://127.0.0.1:18744/runtime/state',{headers:{'X-Tay-Token':'fixture-token','Origin':'https://untrusted.test'},data:{project}});assert.equal(cross.status(),403);
 await page.request.post('http://127.0.0.1:18744/test/release',{data:{}});
 await page.waitForFunction(()=>document.querySelector('#messages')?.textContent.includes('[Test provider] First objective'),null,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('#messages')?.textContent.includes('[Test provider] Objective 6'),null,{timeout:15000});
 const after=await state();assert.equal(after.items.find(x=>x.id===second.id).status,'paused');
 assert.match(after.items[0].result.answer,/royal purple/);
 assert.equal(after.items.filter(x=>x.status==='completed').length,5);
 assert.equal(after.items[0].attempts,2);
 await page.locator('#queueAgent').selectOption('dawn');
 await send('Dawn plan for tomorrow');
 await page.waitForFunction(()=>[...document.querySelectorAll('#messages .who')].some(x=>x.textContent==='DAWN'));
 await page.screenshot({path:'/tmp/tay-queue-desktop.png',fullPage:false});
 await page.setViewportSize({width:700,height:900});
 await page.screenshot({path:'/tmp/tay-queue-narrow.png',fullPage:false});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('Browser passed: six objectives, 3-item preview/backlog, steering, reload persistence, pause, scoped agents, auth/origin rejection, draft preservation, responsive width.');
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
