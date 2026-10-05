const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  const context = await browser.newContext({viewport:{width:1280,height:850}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const project = '/Users/transcenlutionsllc/crowne-legacy';
  // Exercise the rendered app in an isolated browser without changing real chats
  // or sending messages to a model.
  await page.route('**/state', route => route.fulfill({json:{project,projects:[project],messages:[]}}));
  await page.route('**/archives', route => route.fulfill({json:{items:[]}}));
  let submitted;
  await page.route('**/chat', async route => { submitted = route.request().postDataJSON(); await route.fulfill({json:{job:'ui-check'}}); });
  await page.route('**/job', route => route.fulfill({json:{done:true,answer:'Verified test response'}}));
  await page.goto('file://' + path.join(__dirname,'index.html'));
  await page.waitForURL('http://127.0.0.1:18743/');
  await page.locator('#settingsButton').waitFor();
  const sections = page.locator('.tay-nav-stack > details');
  assert.deepEqual(await sections.locator(':scope > summary').allTextContents(),['Pinned','Projects','Scheduled','Plugins','Explore','Recent']);
  const projects = page.locator('.tay-nav-stack > details').filter({has:page.locator('summary').filter({hasText:/^Projects$/})});
  const summary = projects.locator(':scope > summary');
  await summary.click();
  await page.locator('#project').waitFor({state:'hidden'});
  await page.waitForFunction(() => localStorage.getItem('tay.nav.projects') === 'closed');
  await page.reload();
  await page.locator('#settingsButton').waitFor();
  await page.locator('#project').waitFor({state:'hidden'});
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.locator('#project').waitFor({state:'visible'});
  const workspace = page.locator('details.nav-section').filter({has:page.locator(':scope > summary').filter({hasText:/^Workspace$/})}).last();
  await workspace.locator(':scope > summary').click();
  await page.locator('#connections').waitFor({state:'hidden'});
  await workspace.locator(':scope > summary').click();
  await page.locator('#connections').waitFor({state:'visible'});
  assert.equal(await page.locator('#mic svg').count(),1);
  assert(!/talk/i.test(await page.locator('#mic').textContent()));
  // Starting without opt-in opens settings; it never starts a recording here.
  await page.locator('#mic').click();
  await page.locator('#micSettings').waitFor({state:'visible'});
  await page.locator('#micDone').click();
  assert.equal(await page.locator('#mic svg').count(),1);

  await page.locator('#settingsButton').click();
  await page.locator('#tayAccent').selectOption('midnight');
  await page.locator('#tayDensity').selectOption('compact');
  await page.locator('#tayMotion').uncheck();
  await page.locator('#tayHighContrast').check();
  await page.locator('#tayTextSize').selectOption('18');
  await page.locator('[data-settings-category=workspace]').click();
  await page.locator('#tayWorkspaceName').fill('Royal test workspace');
  await page.locator('#tayWorkspaceName').press('Tab');
  await page.locator('#tayStartView').selectOption('recent');
  await page.locator('[data-settings-category=chat]').click();
  await page.locator('#tayThreadMode').selectOption('plan');
  await page.locator('#taySendKey').selectOption('command');
  assert(await page.locator('#tayApproval').isDisabled());
  await page.locator('#taySettingsDone').click();
  assert.equal(await page.locator('[data-thread-mode=plan]').getAttribute('aria-pressed'),'true');
  await page.reload();
  await page.locator('#settingsButton').waitFor();
  assert.equal(await page.locator('body').getAttribute('data-tay-accent'),'midnight');
  assert.match(await page.locator('body').getAttribute('class'),/tay-compact/);
  assert.match(await page.locator('body').getAttribute('class'),/tay-reduce-motion/);
  assert.match(await page.locator('body').getAttribute('class'),/tay-high-contrast/);
  assert.equal(await page.locator('aside > small').textContent(),'Royal test workspace');
  assert.equal(await page.locator('[data-thread-mode=plan]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-thread-mode=chat]').click();
  await page.locator('#settingsButton').click();
  await page.locator('[data-settings-category=chat]').click();
  assert.equal(await page.locator('#tayThreadMode').inputValue(),'plan'); // current != default
  await page.locator('#taySettingsDone').click();
  await page.locator('#prompt').fill('UI test message');
  await page.locator('#prompt').press('Enter');
  assert.equal(submitted,undefined); // Enter inserts a newline in this preference
  await page.locator('#prompt').press('Meta+Enter');
  await page.locator('#messages .msg.assistant').waitFor();
  assert.equal(submitted.thread_mode,'chat');
  assert.equal(submitted.mode,'local');
  assert.equal(submitted.privacy,'offline');
  await page.locator('#settingsButton').click();
  await page.locator('#tayResetPreferences').click();
  await page.locator('#taySettingsDone').click();
  fs.mkdirSync(path.join(__dirname,'verification'),{recursive:true});
  for (const [name,width,height] of [['desktop',1280,850],['narrow',760,850],['small',540,850]]) {
    await page.setViewportSize({width,height});
    assert(await page.locator('#mic').isVisible());
    const bounds = await page.locator('#mic').boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= width, name + ': microphone outside viewport');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow,false,name + ': horizontal overflow');
    await page.screenshot({path:path.join(__dirname,'verification',name+'.png')});
  }
  await page.setViewportSize({width:1280,height:850});
  await page.locator('#settingsButton').click();
  await page.screenshot({path:path.join(__dirname,'verification','settings.png')});
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('Passed: local-file redirect, sidebar collapse and keyboard access, reload persistence, settings, mode synchronization, microphone states, send preference, request mode, and three viewport sizes.');
})().catch(error => { console.error(error); process.exit(1); });
