// Synthetic browser QA against a locally built app. Never contacts Stripe or email providers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const origin='http://127.0.0.1:3197',output='artifacts/mobile-qa';
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3197'],{stdio:'inherit',env:{...process.env,APEX_CHECKLIST_SALES_ENABLED:'false',APEX_CHECKLIST_TEST_CHECKOUT_ENABLED:'false'}});
let browser,currentPage;
const results=[];
const deadline=Date.now()+30000;
try{
 for(;;){try{const r=await fetch(origin+'/api/apex/checkout');if(r.status===200){assert.equal((await r.json()).state,'unavailable');break;}}catch{}if(Date.now()>deadline)throw Error('Local application did not start');await new Promise(r=>setTimeout(r,250));}
 const identity=await fetch(origin+'/api/platform/identity');assert.equal(identity.status,401);assert.equal((await identity.json()).authenticated,false);
 browser=await chromium.launch({headless:true});
 for(const width of [360,390]){
  const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,deviceScaleFactor:1,acceptDownloads:true});
  const page=await context.newPage();currentPage=page;page.setDefaultTimeout(10000);
  const external=[];let availability='loading',release;const pending=new Promise(r=>release=r);let posts=0,downloads=0;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin){external.push(url.origin);return route.abort();}
   if(url.pathname==='/api/apex/checkout'){
    if(route.request().method()==='POST'){
     posts++;assert.match(route.request().postDataJSON().request_id,/^[a-f0-9-]{36}$/);
     return route.fulfill({json:{state:'test',checkoutUrl:'https://checkout.stripe.com/c/pay/cs_test_synthetic1234567#synthetic'}});
    }
    if(availability==='loading')await pending;
    if(availability==='error')return route.fulfill({status:503,json:{state:'unavailable'}});
    return route.fulfill({json:availability==='ready'?{state:'test',amount:2700,currency:'usd'}:{state:'unavailable'}});
   }
   if(url.pathname==='/api/apex/checklist'){
    downloads++;
    if(downloads===1)return route.fulfill({status:503,json:{error:'Synthetic verification outage. Retry.'}});
    return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic QA checklist</title><p>Fixture only; no purchase or real customer data.</p>'});
   }
   return route.continue();
  });
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${width}px`);
  await page.goto(origin+'/apex-flow/offer.html',{waitUntil:'domcontentloaded'});
  await page.locator('#checkout-status[aria-busy="true"]').waitFor();assert.equal(await page.locator('#checkout-start').isVisible(),false);await noOverflow();
  availability='unavailable';release();await page.locator('#checkout-status').filter({hasText:'not open'}).waitFor();assert.equal(await page.locator('#checkout-link').isVisible(),false);
  availability='error';await page.locator('#checkout-retry').click();await page.locator('#checkout-status').filter({hasText:'could not be verified'}).waitFor();
  availability='ready';await page.locator('#checkout-retry').click();await page.locator('#checkout-start').waitFor({state:'visible'});
  const missingLabels=await page.evaluate(()=>[...document.querySelectorAll('button,input:not([type=hidden]),textarea')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]')&&!(el.getAttribute('aria-label')||el.labels?.length||el.textContent.trim())).map(el=>el.id));assert.deepEqual(missingLabels,[]);
  await page.locator('#checkout-start').focus();assert.equal(await page.locator('#checkout-start').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Enter');await page.locator('#checkout-link').waitFor({state:'visible'});assert.equal(posts,1);
  assert.match(await page.locator('#checkout-link').getAttribute('href'),/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/);
  await noOverflow();await page.screenshot({path:`${output}/offer-${width}-synthetic.png`,fullPage:true});
  // Do not follow the provider URL. Reset and verify its capability disappears.
  await page.locator('#checkout-reset').click();await page.locator('#checkout-start').waitFor({state:'visible'});assert.equal(await page.locator('#checkout-link').getAttribute('href'),null);
  await page.goto(origin+'/apex-flow/access.html#session_id=cs_test_synthetic1234567',{waitUntil:'domcontentloaded'});
  assert.equal(new URL(page.url()).hash,'');await page.locator('#order-mode').filter({hasText:'Sandbox order'}).waitFor();
  await page.locator('#download').click();await page.locator('#status').filter({hasText:'Synthetic verification outage'}).waitFor();assert.equal(await page.locator('#download').isEnabled(),true);assert.equal(await page.locator('#file').isVisible(),false);
  await page.locator('#download').click();await page.locator('#file').waitFor({state:'visible'});await noOverflow();
  const downloaded=page.waitForEvent('download');await page.locator('#file').click();const file=await downloaded;assert.equal(file.suggestedFilename(),'funnel-leak-emergency-checklist.html');await file.saveAs(`${output}/checklist-${width}-synthetic.html`);
  await page.screenshot({path:`${output}/access-${width}-synthetic.png`,fullPage:true});
  await page.locator('#forget').click();assert.equal(await page.locator('#download').isDisabled(),true);assert.equal(await page.locator('#file').isVisible(),false);assert.equal(await page.evaluate(()=>sessionStorage.getItem('apex-order-access-v1')),null);
  assert.deepEqual(external,[],'QA must not navigate or request an external provider');
  results.push({width,height:800,synthetic:true,offerStates:['loading','unavailable','error','ready','prepared','reset'],accessStates:['test-order','verification-error','verified-fixture','download','cleared'],horizontalOverflow:false,keyboardAndLabels:'passed',externalRequests:0});
  await context.close();currentPage=null;
 }
 await writeFile(`${output}/results.json`,JSON.stringify({commit:process.env.GITHUB_SHA||'local',physicalAndroidDevice:false,providerEndToEnd:false,identityStatus:401,results},null,2));
 console.log('Mobile Chromium QA passed at360/390px with synthetic provider responses; physical Android and provider end-to-end remain unverified.');
}catch(error){if(currentPage)await currentPage.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill('SIGTERM');}
