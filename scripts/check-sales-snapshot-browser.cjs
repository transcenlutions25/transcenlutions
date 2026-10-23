/* Optional isolated browser QA. Uses installed Playwright/Chromium, not an app route or deployment.
   Run: SALES_TEST_CHROME=/usr/bin/chromium node scripts/check-sales-snapshot-browser.cjs
   Screenshots/report go to SALES_TEST_OUTPUT or an OS temporary directory. Synthetic data only. */
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const { chromium } = require('playwright');
const output = process.env.SALES_TEST_OUTPUT || mkdtempSync(join(tmpdir(), 'sales-snapshot-browser-'));
mkdirSync(output, {recursive:true});
const compile = file => ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const modules = {
  'react/jsx-runtime': readFileSync('node_modules/react/cjs/react-jsx-runtime.development.js','utf8'),
  '../lib/sales-snapshot': compile('lib/sales-snapshot.ts'),
  './sales-snapshot': compile('components/sales-snapshot.tsx'),
};
const bundle = `const modules=${JSON.stringify(modules)}; const cache={}; function require(id){if(id==='react')return React;if(id==='./sales-snapshot.module.css')return {default:new Proxy({},{get:(_,k)=>String(k)}),__esModule:true};if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;new Function('module','exports','require','process',modules[id])(m,m.exports,require,{env:{NODE_ENV:'development'}});return m.exports;} let root=ReactDOM.createRoot(document.getElementById('mount')); function mount(){root.render(React.createElement(require('./sales-snapshot').SalesSnapshot));} mount();`;
const css = ['app/globals.css','app/tay-workspace.css','app/workspace-overrides.css','components/sales-snapshot.module.css'].map(file=>readFileSync(file,'utf8')).join('\n');
const files = {
  '/': {type:'text/html',body:'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sales snapshot isolated synthetic QA</title><link rel="stylesheet" href="/test.css"><body><main class="tay-app" style="display:block;height:auto;min-height:100vh;overflow:visible;padding:16px"><div class="tay-sidecar-content" style="max-width:800px;margin:auto;overflow:visible;padding:0"><div id="mount"></div></div></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/test.js"></script></body></html>'},
  '/test.css': {type:'text/css',body:css},
  '/react.js': {type:'application/javascript',body:readFileSync('node_modules/react/umd/react.development.js')},
  '/react-dom.js': {type:'application/javascript',body:readFileSync('node_modules/react-dom/umd/react-dom.development.js')},
  '/test.js': {type:'application/javascript',body:bundle},
};
const source = '2026-10-09T12:00:00Z';
const fixture = {schemaVersion:1,currency:'USD',source:{name:'SYNTHETIC BROWSER TEST',exportedAt:source},
  payments:[{id:'receipt-1',label:'SYNTHETIC receipt',sourceRef:'fixture:receipt:1',updatedAt:source,status:'collected',amountCents:12345,refundedCents:345,receivedAt:source},{id:'pending-1',label:'SYNTHETIC pending',sourceRef:'fixture:pending:1',updatedAt:source,status:'pending',amountCents:25000,refundedCents:0,receivedAt:null}],
  deals:[{id:'deal-1',name:'SYNTHETIC website proposal',sourceRef:'fixture:deal:1',updatedAt:source,stage:'proposal',valueCents:175000}],
  leads:[{id:'lead-1',name:'SYNTHETIC recent lead',company:'Synthetic test company',sourceRef:'fixture:lead:1',createdAt:source,stage:'new'}]};
const server = http.createServer((req,res)=>{const file=files[req.url]; if(!file){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':file.type,'Cache-Control':'no-store'});res.end(file.body)});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.SALES_TEST_CHROME||'/usr/bin/chromium',headless:true});
  const report={synthetic:true,environment:'isolated component harness with actual shared CSS; not deployed/Floot integration',widths:[],externalRequests:[],pageErrors:[],output};
  try {
    for(const width of [320,360,390,768,1440]) {
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true}); const page=await context.newPage();
      await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){report.externalRequests.push(route.request().url());return route.abort();}return route.continue()});
      page.on('pageerror',error=>report.pageErrors.push(error.message));
      await page.goto(origin); await page.getByText('No data connected',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Export current snapshot'}).isDisabled(),true);
      assert.equal(await page.locator('.metric strong').first().textContent(),'—');
      await page.screenshot({path:join(output,`${width}-empty.png`),fullPage:true});
      const input=page.getByLabel('Load local JSON (up to 1 MB)',{exact:true});
      await input.setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
      await page.getByText('$120.00',{exact:true}).waitFor(); await page.getByText('$250.00',{exact:true}).waitFor();
      assert.equal(await page.locator('.metric strong').nth(2).textContent(),'$1,750.00');
      await page.getByLabel('Find deals or leads').fill('absent'); await page.getByText('No active deals match this search.').waitFor();
      assert.equal(await page.locator('.metric strong').nth(2).textContent(),'$1,750.00');
      await page.getByLabel('Find deals or leads').fill('');
      await input.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
      await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').textContent(),/current view has not changed/);
      assert.equal(await page.locator('.metric strong').first().textContent(),'$120.00');
      await input.setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
      await page.getByRole('button',{name:'Clear view',exact:true}).click(); await page.getByRole('button',{name:'Keep snapshot'}).click();
      assert.equal(await page.getByRole('button',{name:'Clear view',exact:true}).evaluate(el=>el===document.activeElement),true);
      await page.getByRole('button',{name:'Export current snapshot'}).focus();
      const downloadEvent=page.waitForEvent('download'); await page.keyboard.press('Enter'); const download=await downloadEvent;
      assert.equal(download.suggestedFilename(),'sales-snapshot-export.json'); const downloaded=await download.path(); assert.deepEqual(JSON.parse(readFileSync(downloaded,'utf8')),fixture);
      await page.locator('summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('details').evaluate(el=>el.open),true);
      const dimensions=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,root:document.querySelector('.root').scrollWidth,rootClient:document.querySelector('.root').clientWidth}));
      assert.ok(dimensions.document<=width && dimensions.body<=width && dimensions.root<=dimensions.rootClient+1,JSON.stringify(dimensions));
      const controls=await page.locator('.root button,.root input,.root summary').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,label:el.textContent||el.getAttribute('aria-label')})));
      assert.ok(controls.every(control=>control.height>=44),JSON.stringify(controls));
      await page.screenshot({path:join(output,`${width}-synthetic-loaded.png`),fullPage:true});
      await page.getByRole('button',{name:'Clear view',exact:true}).click(); await page.getByRole('button',{name:'Yes, clear view'}).click();
      await page.getByText('No data connected',{exact:true}).waitFor(); assert.equal(await input.evaluate(el=>el===document.activeElement),true);
      await input.setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))}); await page.getByText('$120.00',{exact:true}).waitFor();
      await page.reload(); await page.getByText('No data connected',{exact:true}).waitFor();
      report.widths.push({width,passed:true,dimensions,minimumControlHeight:Math.min(...controls.map(c=>c.height))});
      await context.close();
    }
    assert.deepEqual(report.externalRequests,[]); assert.deepEqual(report.pageErrors,[]);
    writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
