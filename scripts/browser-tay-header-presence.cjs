/* Optional isolated Chromium check. Uses already installed Next/React/Playwright
 * and a throwaway local app; never adds a route to the real workspace. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const repo = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'tay-header-browser-'));
const screenshots = process.env.TAY_HEADER_SCREENSHOTS;
const quote = value => JSON.stringify(value);
let server;
let browser;
let serverOutput = '';

async function main() {
  fs.mkdirSync(path.join(fixture, 'app'));
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  fs.symlinkSync(path.join(repo, 'public'), path.join(fixture, 'public'), 'dir');
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ private: true, name: 'isolated-tay-header-check' }));
  fs.writeFileSync(path.join(fixture, 'next.config.mjs'), 'export default { experimental: { externalDir: true }, devIndicators: false };');
  fs.writeFileSync(path.join(fixture, 'app/layout.tsx'), `
import ${quote(path.join(repo, 'app/tay-workspace.css'))};
import ${quote(path.join(repo, 'app/mobile-chat.css'))};
import './fixture.css';
export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}`);
  fs.writeFileSync(path.join(fixture, 'app/page.tsx'), `"use client";
import { useState } from 'react';
import { TayHeaderPresence } from ${quote(path.join(repo, 'components/tay-header-presence'))};
export default function Page() {
  const [tone, setTone] = useState<'dark' | 'light'>('dark');
  const [size, setSize] = useState<'compact' | 'roomy'>('compact');
  const [agent, setAgent] = useState<'tay' | 'dawn'>('tay');
  const [opened, setOpened] = useState(false);
  return <main className="tay-app fixture" data-tone={tone}>
    <header className="tay-command-header"><div className="tay-command-title-row">
      <button className="tay-icon-button fixtureControl" aria-label="Navigation">Menu</button>
      <div className="presenceSlot"><TayHeaderPresence agentId={agent} tone={tone} size={size}
        onOpenControls={() => setOpened(value => !value)} controlsExpanded={opened} controlsId="fixture-controls" /></div>
      <button className="tay-icon-button fixtureControl" aria-label="Voice">Voice</button>
    </div></header>
    <section className="sampleConversation"><p>Isolated component check</p><h1>What’s the move?</h1>
      <p>The header stays out of this conversation and keeps its name readable.</p>
      <label>Theme <select aria-label="Theme" value={tone} onChange={e => setTone(e.target.value as 'dark' | 'light')}><option>dark</option><option>light</option></select></label>
      <label>Size <select aria-label="Size" value={size} onChange={e => setSize(e.target.value as 'compact' | 'roomy')}><option>compact</option><option>roomy</option></select></label>
      <label>Agent <select aria-label="Agent" value={agent} onChange={e => setAgent(e.target.value as 'tay' | 'dawn')}><option>tay</option><option>dawn</option></select></label>
      <div id="fixture-controls" hidden={!opened}>Existing controls callback opened.</div>
      <textarea aria-label="Message draft" placeholder="Message Tay…" />
    </section>
  </main>;
}`);
  fs.writeFileSync(path.join(fixture, 'app/fixture.css'), `
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
.tay-app.fixture { display: block; min-height: 100vh; height: auto; background: #100c17; color: #f1d49c; }
.fixture[data-tone=light] { background: #fcfbff; color: #302046; }
.fixture[data-tone=light] .tay-command-header { background: #fcfbff; }
.fixture[data-tone=dark] .tay-command-header { background: #1c1426; }
.fixture .presenceSlot { flex: 1; min-width: 0; display: flex; justify-content: center; }
.fixture .fixtureControl { flex: 0 0 44px; width: 44px; min-height: 44px; font-size: 11px; color: inherit; }
.sampleConversation { max-width: 700px; margin: auto; padding: 24px 16px; }
.sampleConversation h1 { font-size: 1.5rem; }
.sampleConversation p { line-height: 1.6; }
.sampleConversation label { display: block; margin: 12px 0; }
.sampleConversation select { margin-left: 12px; font: inherit; }
.sampleConversation textarea { display: block; max-width: 100%; width: 100%; margin-top: 24px; min-height: 90px; font: inherit; }
`);

  const port = await new Promise(resolve => {
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1', () => { const value = listener.address().port; listener.close(() => resolve(value)); });
  });
  server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', fixture, '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: fixture, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { serverOutput += data; });
  server.stderr.on('data', data => { serverOutput += data; });
  const url = `http://127.0.0.1:${port}`;
  for (let attempts = 0; ; attempts++) {
    if (server.exitCode !== null) throw new Error(`Fixture exited: ${serverOutput}`);
    try { if ((await fetch(url)).ok) break; } catch { /* local server is starting */ }
    if (attempts >= 120) throw new Error(`Fixture did not start: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ executablePath: process.env.TAY_TEST_CHROME || '/usr/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const root = page.locator('[data-tay-presence]');
  await page.waitForFunction(() => document.querySelector('[data-tay-presence]')?.getAttribute('data-motion') === 'playing');
  assert.ok(await root.locator('img').evaluate(image => image.naturalWidth > 0));
  const title = page.getByRole('button', { name: 'Conversation controls for Tay' });
  const pause = () => page.getByRole('button', { name: 'Pause Tay animation', exact: true });
  const stableBounds = await title.boundingBox();
  for (const milliseconds of [48000, 49000]) {
    await root.locator('img').evaluate((image, time) => { image.getAnimations()[0].currentTime = time; }, milliseconds);
    assert.notEqual(await root.locator('img').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).b), 0);
    assert.deepEqual(await title.boundingBox(), stableBounds, 'standing sway never moves the name or controls');
  }
  assert.equal(await root.locator('img').evaluate(image => getComputedStyle(image.parentElement).overflow), 'hidden');
  if (screenshots) {
    fs.mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, 'standing-sway-dark-1280.png') });
  }
  await root.locator('img').evaluate(image => { image.getAnimations()[0].currentTime = 0; });
  if (screenshots) { fs.mkdirSync(screenshots, { recursive: true }); await page.screenshot({ path: path.join(screenshots, 'compact-dark-1280.png') }); }
  await title.focus(); await page.keyboard.press('Tab');
  assert.equal(await pause().evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Enter');
  assert.equal(await root.getAttribute('data-motion'), 'paused');
  const pausedTime = await root.locator('img').evaluate(image => image.getAnimations()[0].currentTime);
  await page.waitForTimeout(150);
  assert.equal(await root.locator('img').evaluate(image => image.getAnimations()[0].currentTime), pausedTime);
  await page.reload();
  await page.getByRole('button', { name: 'Resume Tay animation', exact: true }).waitFor();
  assert.equal(await root.getAttribute('data-motion'), 'paused');
  await page.getByRole('button', { name: 'Resume Tay animation', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-tay-presence]')?.dataset.motion === 'reduced-motion');
  assert.equal(await root.locator('img').evaluate(image => getComputedStyle(image).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('[data-tay-presence]')?.dataset.motion === 'playing');

  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByLabel('Theme', { exact: true }).selectOption('light');
  const geometry = async () => page.evaluate(() => {
    const rect = element => { const { left, right, top, bottom, width, height } = element.getBoundingClientRect(); return { left, right, top, bottom, width, height }; };
    const identity = document.querySelector('[aria-label="Conversation controls for Tay"]');
    return { overflow: document.documentElement.scrollWidth > innerWidth,
      header: rect(document.querySelector('header')), slot: rect(document.querySelector('.presenceSlot')),
      title: rect(identity), name: rect(identity.lastElementChild), art: rect(identity.firstElementChild),
      pause: rect(document.querySelector('[aria-label="Pause Tay animation"]')),
      navigation: rect(document.querySelector('[aria-label="Navigation"]')),
      voice: rect(document.querySelector('[aria-label="Voice"]')) };
  });
  const checkBounds = bounds => {
    assert.equal(bounds.overflow, false);
    for (const key of ['title', 'name', 'art', 'pause']) {
      const item = bounds[key];
      assert.ok(item.left >= bounds.slot.left - 1 && item.right <= bounds.slot.right + 1, `${key} stays inside its slot, not merely clipped`);
      assert.ok(item.top >= bounds.header.top && item.bottom <= bounds.header.bottom, `${key} stays inside the header`);
      assert.ok(item.left >= bounds.navigation.right && item.right <= bounds.voice.left, `${key} stays clear of Menu/Voice`);
    }
    assert.ok(bounds.title.right <= bounds.pause.left || bounds.pause.right <= bounds.title.left
      || bounds.title.bottom <= bounds.pause.top || bounds.pause.bottom <= bounds.title.top, 'identity and pause never overlap');
  };
  let bounds = await geometry();
  checkBounds(bounds);
  assert.ok(bounds.header.height <= 80, 'compact header does not consume extra conversation rows');
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'compact-light-320.png') });
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  bounds = await geometry();
  checkBounds(bounds);
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'large-text-light-320.png') });
  await page.evaluate(() => document.documentElement.style.fontSize = '');

  await root.evaluate(element => element.style.marginTop = '200vh');
  await page.waitForFunction(() => document.querySelector('[data-tay-presence]')?.dataset.motion === 'not-visible');
  assert.equal(await root.locator('img').evaluate(image => getComputedStyle(image).animationPlayState), 'paused');
  await root.evaluate(element => element.style.marginTop = '');
  await page.waitForFunction(() => document.querySelector('[data-tay-presence]')?.dataset.motion === 'playing');
  await page.getByLabel('Size', { exact: true }).selectOption('roomy');
  checkBounds(await geometry());
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'roomy-light-320.png') });
  await page.getByLabel('Agent', { exact: true }).selectOption('dawn');
  assert.equal(await root.count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('Isolated Chromium checks passed: actual PNG, CSS modules, keyboard pause, reload persistence, live reduced motion, offscreen pause, 320px layout, 200% text, roomy opt-in and Tay-only rendering.');
  console.log('Scope: isolated component fixture, not production workspace integration, screen-reader QA, or real mobile-device verification.');
}

main().catch(error => { console.error(error); console.error(serverOutput.slice(-6000)); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
  fs.rmSync(fixture, { recursive: true, force: true });
});
