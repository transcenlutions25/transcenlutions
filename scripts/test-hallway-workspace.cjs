const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true },
}).outputText, filename);
require.extensions['.css'] = () => {};
const Procedures = require('../components/hallway-procedures.tsx').default;
const Page = require('../app/hallway-cleaning/page.tsx').default;
const catalog = require('../lib/hallway/sops/templates.json');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('actual route renders procedures and truthful unavailable states', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('main').length, 1);
  assert.equal(document.querySelectorAll('details').length, catalog.templates.length);
  assert.match(document.body.textContent, /not a connected private operator dashboard/);
  assert.match(document.body.textContent, /Live job records and checklist submissions are not connected/);
  assert.match(document.body.textContent, /Owner review remains pending/);
  assert.match(document.body.textContent, /Reuse Tay’s existing customer, delivery and task records/);
  assert.match(document.body.textContent, /do not create a replacement CRM/);
  assert.match(document.body.textContent, /Hallway connector not connected/);
  assert.match(document.body.textContent, /not a claim that every listed service is currently offered or bookable/);
  const external = [...document.querySelectorAll('a')].filter(a => a.href.startsWith('https:'));
  assert.deepEqual(external.map(a => a.href), ['https://hallwaycleaning.com/']);
  assert.equal(external[0].rel, 'noopener noreferrer');
  assert.equal(document.querySelector('a[href="/"]').textContent, '← Back to Tay Command');
  dom.window.close();
});

test('every versioned procedure renders without operational input controls', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Procedures)));
  for (const template of catalog.templates) assert.ok(dom.window.document.body.textContent.includes(template.title));
  assert.equal(dom.window.document.querySelectorAll('input, form, button, iframe, script').length, 0);
  assert.equal(catalog.live_activation, false);
  dom.window.close();
});

test('page and component have no identity fixture, network or persistence', () => {
  for (const p of ['components/hallway-procedures.tsx', 'app/hallway-cleaning/page.tsx'])
    assert.doesNotMatch(read(p), /fetch\(|localStorage|sessionStorage|process\.env|synthetic-fixture|synthetic-controller/);
});

test('missing and stale checklist evidence never grants authority', async () => {
  const { reviewChecklist } = await import('../lib/hallway/sops/validate-checklist.mjs');
  for (const template of catalog.templates) {
    for (const record of [null, { templateId: template.id, version: 'stale' }]) {
      const result = reviewChecklist(template, record);
      assert.equal(result.ready, false);
      assert.equal(result.authorizationGranted, false);
    }
  }
});

test('complete synthetic evidence means review readiness, never live activation', async () => {
  const { reviewChecklist } = await import('../lib/hallway/sops/validate-checklist.mjs');
  const t = catalog.templates[0], at = '2026-10-24T12:00:00Z';
  const record = { templateId:t.id, version:t.version, revision:1, jobId:'synthetic-job', actorId:'synthetic-owner', responses:t.steps.map(s=>({stepId:s.id,status:'complete',role:s.role,actorId:'synthetic-actor',completedAt:at,evidenceRefs:['synthetic-reference']})), signoff:{role:t.signoff_role,actorId:'synthetic-reviewer',at,version:t.version,revision:1} };
  const result = reviewChecklist(t, record);
  assert.equal(result.ready, true);
  assert.equal(result.authorizationGranted, false);
  assert.equal(result.liveActivation, false);
  record.revision++;
  assert.equal(reviewChecklist(t, record).ready, false);
});

test('Tay navigation retains Product Foundry and adds Hallway once', () => {
  const source = read('components/chat-shell.tsx');
  assert.equal((source.match(/href="\/hallway-cleaning"/g) || []).length, 1);
  assert.equal((source.match(/href="\/product-foundry"/g) || []).length, 1);
  assert.match(source, /tay:foundry:draft:v1/);
});
