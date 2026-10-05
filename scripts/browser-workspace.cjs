/* Optional browser integration checks. Desktop checks require the isolated fixture, never the owner runtime. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function checkHosted(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(process.env.TAY_TEST_WEB_URL || 'http://127.0.0.1:18745');
  await page.getByLabel('Message Tay', { exact: true }).fill('Create a plan for Tay governance');
  await page.locator('.tay-send-button').click();
  await page.locator('.action-card').getByRole('button', { name: 'Execute', exact: true }).waitFor();
  await page.locator('.tay-send-intent').getByRole('button', { name: 'Queue', exact: true }).click();
  for (const text of ['Plan the first launch', 'Write a buyer follow-up', 'Organize my next priorities']) {
    await page.getByLabel('Message Tay', { exact: true }).fill(text); await page.locator('.tay-send-button').click();
    await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value === '');
  }
  await page.locator('.tay-queue-strip button').click();
  await page.getByRole('heading', { name: '3 waiting', exact: true }).waitFor();
  const card = page.locator('.tay-queue-card').filter({ hasText: 'Write a buyer follow-up' });
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await card.getByLabel('Edit queued objective').fill('Write a careful buyer follow-up 👑');
  await card.getByRole('button', { name: 'Save objective' }).click();
  await page.locator('.tay-queue-card').filter({ hasText: 'Write a careful buyer follow-up 👑' }).getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload(); await page.locator('.tay-queue-strip button').click(); await page.getByRole('heading', { name: '3 waiting', exact: true }).waitFor();
  assert(await page.locator('.tay-queue-card').filter({ hasText: 'careful buyer follow-up 👑' }).getByRole('button', { name: 'Resume', exact: true }).count());
  await page.locator('.tay-sidecar-header').getByRole('button', { name: /Close/ }).click();
  await page.locator('.action-card').getByRole('button', { name: 'Execute', exact: true }).click();
  await page.locator('.result-box').waitFor();
  await page.reload(); await page.locator('.result-box').waitFor();
  assert.equal(await page.locator('.action-card').getByRole('button', { name: 'Execute', exact: true }).count(), 0, 'reload cannot execute completed work again');
  await page.locator('.tay-queue-strip button').click();
  await page.getByLabel('Workspace tool', { exact: true }).selectOption('momentum');
  await page.getByRole('checkbox', { name: 'Show my progress' }).check();
  assert((await page.locator('.tay-sidecar-content').innerText()).includes('1 completed move today'));
  for (const tool of ['launch', 'revenue', 'sales', 'fulfillment', 'founder', 'governance', 'memory', 'feedback', 'settings', 'explore', 'projects', 'assets', 'scheduled', 'plugins', 'browser', 'preview']) {
    await page.getByLabel('Workspace tool', { exact: true }).selectOption(tool); await page.waitForTimeout(50);
  }
  assert.deepEqual(failures, []);
  await context.close();
  console.log('Hosted browser checks passed: three queued objectives, editing/pause/reload, governed execution, no duplicate execution, optional progress, all retained panels.');
}

async function checkDesktop(browser) {
  if (!process.env.TAY_TEST_DESKTOP_URL || !process.env.TAY_TEST_FIXTURE_URL) return;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(process.env.TAY_TEST_DESKTOP_URL);
  let loseFirstAcceptance = true;
  await page.route('**/api/desktop/runtime/enqueue', async route => {
    if (loseFirstAcceptance) { loseFirstAcceptance = false; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByLabel('Message Tay', { exact: true }).fill('Isolated integration objective one');
  await page.locator('.tay-send-button').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('.tay-send-button').disabled);
  await page.locator('.tay-send-button').click();
  await page.waitForFunction(() => document.querySelector('.tay-notice')?.textContent.toLowerCase().includes('fetch'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value.includes('Isolated integration objective one') && !document.querySelector('.tay-send-button').disabled);
  await page.locator('.tay-send-button').click();
  await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value === '');
  assert.equal(await page.locator('.tay-message--user').count(), 1, 'lost acceptance and reload/retry cannot duplicate the objective');
  await page.waitForFunction(() => document.querySelector('.tay-queue-strip').textContent.includes('thinking'));
  for (const text of ['Isolated objective two', 'Isolated objective three', 'Isolated objective four']) {
    await page.getByLabel('Message Tay', { exact: true }).fill(text); await page.locator('.tay-send-button').click();
    await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value === '');
  }
  await page.locator('.tay-queue-strip button').click(); await page.getByRole('heading', { name: '3 waiting', exact: true }).waitFor();
  await page.locator('.tay-send-intent').getByRole('button', { name: 'Steer', exact: true }).click();
  await page.getByLabel('Message Tay', { exact: true }).fill('Use the royal brand and plain language');
  await page.locator('.tay-send-button').click(); await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value === '');
  await page.getByLabel('Message Tay', { exact: true }).fill('Unsent draft 👑\nKeep this across reload');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.tay-command-composer textarea').value.includes('Unsent draft'));
  await page.request.post(process.env.TAY_TEST_FIXTURE_URL + '/test/release', { data: {} });
  await page.waitForFunction(() => document.querySelectorAll('.tay-message--tay').length >= 4, null, { timeout: 30000 });
  assert((await page.locator('.tay-message-list').innerText()).includes('Steer: Use the royal brand and plain language'));
  assert.deepEqual(failures, []);
  await context.close();
  console.log('Desktop browser checks passed against isolated provider: serial queue with three waiting, steering checkpoint, draft reload, completed replies.');
}

(async () => {
  const executablePath = process.env.TAY_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ executablePath, headless: true });
  try { await checkHosted(browser); await checkDesktop(browser); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
