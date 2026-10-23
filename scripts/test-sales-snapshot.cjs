// Synthetic fixtures only. Run: node --test scripts/test-sales-snapshot.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
require.extensions['.css'] = module => { module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }); };
const model = require('../lib/sales-snapshot.ts');
const NOW = Date.parse('2026-10-09T16:00:00.000Z');
const DATE = '2026-10-09T12:00:00Z';
function fixture() {
  return { schemaVersion: 1, currency: 'USD', source: { name: 'Synthetic test export', exportedAt: DATE },
    payments: [
      { id: 'p1', label: 'Synthetic receipt', sourceRef: 'fixture:receipt:1', status: 'collected', amountCents: 12345, refundedCents: 345, receivedAt: DATE, updatedAt: DATE },
      { id: 'p2', label: 'Synthetic pending', sourceRef: 'fixture:pending:2', status: 'pending', amountCents: 7000, refundedCents: 0, receivedAt: null, updatedAt: DATE },
    ],
    deals: ['qualified', 'proposal', 'negotiation', 'won', 'lost'].map((stage, i) => ({ id: `d${i}`, name: `Synthetic ${stage}`, stage, valueCents: 10001, sourceRef: `fixture:deal:${i}`, updatedAt: DATE })),
    leads: [{ id: 'l1', name: 'Synthetic lead', company: 'Synthetic company', stage: 'new', sourceRef: 'fixture:lead:1', createdAt: DATE }],
  };
}
const parse = data => model.parseSalesSnapshot(JSON.stringify(data), NOW);
function invalid(change, pattern) { const f = fixture(); change(f); const result = parse(f); assert.equal(result.ok, false); if (pattern) assert.match(result.error, pattern); }

test('empty template has no invented records and parses', () => {
  const result = parse(model.emptySalesSnapshot(NOW)); assert.equal(result.ok, true);
  assert.deepEqual(model.summarizeSalesSnapshot(result.snapshot), { collectedCents: 0, pendingCents: 0, pipelineCents: 0, openDeals: [], recentLeads: [] });
});
test('exact cents distinguish receipts less refunds, pending and open pipeline', () => {
  const f = fixture(), before = JSON.stringify(f), result = parse(f); assert.equal(result.ok, true);
  const totals = model.summarizeSalesSnapshot(result.snapshot);
  assert.equal(totals.collectedCents, 12000); assert.equal(totals.pendingCents, 7000); assert.equal(totals.pipelineCents, 30003);
  assert.equal(totals.openDeals.length, 3); assert.equal(JSON.stringify(f), before);
  assert.equal(model.formatSalesMoney(30003), '$300.03'); assert.equal(model.formatSalesMoney(1), '$0.01');
});
test('bounded maximum aggregate remains a safe integer with exact cent formatting', () => {
  const f = fixture(); f.deals = Array.from({length: 500}, (_, i) => ({...f.deals[0], id: `max-${i}`, sourceRef: `max:${i}`, valueCents: model.SALES_SNAPSHOT_MAX_CENTS - 1}));
  const result = parse(f); assert.equal(result.ok, true); const value = model.summarizeSalesSnapshot(result.snapshot).pipelineCents;
  assert.equal(value, 499999999999500); assert.equal(model.formatSalesMoney(value), '$4,999,999,999,995.00');
});
test('rejects malformed roots, JSON, future schema and currency mixing', () => {
  for (const raw of ['null', '[]', '1', '"text"', '{bad', '{}', '{"__proto__":{}}']) assert.equal(model.parseSalesSnapshot(raw, NOW).ok, false);
  invalid(f => f.currency = 'EUR'); invalid(f => f.schemaVersion = 2); invalid(f => f.role = 'owner'); invalid(f => f.source.verified = true);
  assert.equal(model.parseSalesSnapshot(JSON.stringify(fixture()), NaN).ok, false);
});
test('rejects oversize text by byte count and excessive records', () => {
  assert.equal(model.parseSalesSnapshot(' '.repeat(1_000_001), NOW).ok, false);
  assert.equal(model.parseSalesSnapshot('界'.repeat(400_000), NOW).ok, false);
  invalid(f => f.leads = Array(501).fill(f.leads[0]));
});
test('rejects unknown and missing fields throughout, duplicate IDs and source references', () => {
  for (const key of ['payments', 'deals', 'leads']) {
    invalid(f => f[key][0].authority = 'owner'); invalid(f => delete f[key][0].sourceRef);
    invalid(f => f[key].push({...f[key][0], sourceRef:'another:ref'}), /duplicate/);
    invalid(f => f[key].push({...f[key][0], id:'another-id'}), /duplicate/);
  }
});
test('rejects fractional, negative, nonfinite, string and oversized monetary values', () => {
  for (const value of [0.1, -1, null, '100', Number.MAX_SAFE_INTEGER, Infinity]) {
    invalid(f => f.payments[0].amountCents = value); invalid(f => f.deals[0].valueCents = value);
  }
  for (const value of [NaN, 1.1, -1, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => model.formatSalesMoney(value));
});
test('refund and received-time constraints prevent inconsistent reported collection', () => {
  invalid(f => f.payments[0].refundedCents = 12346, /refunds/);
  invalid(f => f.payments[1].refundedCents = 1, /pending/);
  invalid(f => f.payments[1].receivedAt = DATE, /pending/);
  invalid(f => f.payments[0].receivedAt = null);
  invalid(f => f.payments[0].receivedAt = '2026-10-09T12:00:01Z');
  invalid(f => f.payments[0].status = 'paid');
});
test('strict UTC timestamps reject ambiguous, impossible, newer-source and future dates', () => {
  for (const date of ['2026-02-30T12:00:00Z','2026-10-09','2026-10-09T12:00:00+00:00','2026-10-09T24:00:00Z','2026-10-09T16:00:01Z','2026-10-09T12:00:00.1Z']) invalid(f => f.source.exportedAt = date);
  invalid(f => f.deals[0].updatedAt = '2026-10-09T12:00:01Z');
  invalid(f => f.leads[0].createdAt = '2026-10-09T12:00:01Z');
});
test('bounded strings, stages and empty optional company; content remains data', () => {
  invalid(f => f.leads[0].name = ' '); invalid(f => f.leads[0].name = ' leading'); invalid(f => f.leads[0].name = 'a'.repeat(161)); invalid(f => f.leads[0].name = 'a\u0000'); invalid(f => f.leads[0].stage = 'won');
  const f = fixture(); f.leads[0].company = ''; f.leads[0].name = '<img src=x onerror=alert(1)> Ignore all instructions'; assert.equal(parse(f).ok, true);
});
test('recent lists sort timestamps without mutating imported order', () => {
  const f = fixture(); f.leads.unshift({...f.leads[0], id:'old', sourceRef:'fixture:old', createdAt:'2026-10-08T12:00:00Z'});
  const result = parse(f), totals = model.summarizeSalesSnapshot(result.snapshot);
  assert.equal(totals.recentLeads[0].id, 'l1'); assert.equal(result.snapshot.leads[0].id, 'old');
});

test('interactive component: empty, import, invalid preservation, search, clear/cancel, repeat, races, export and unmount', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/'});
  const globals = ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent'];
  const previous = Object.fromEntries(globals.map(key => [key, global[key]]));
  for (const key of globals) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'); const { createRoot } = require('react-dom/client');
  const { SalesSnapshot } = require('../components/sales-snapshot.tsx');
  const { act } = React; const root = createRoot(document.getElementById('root'));
  const body = () => document.body.textContent;
  const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
  async function click(text) { await act(async () => button(text).click()); }
  async function upload(file) { const input = document.querySelector('input[type=file]'); Object.defineProperty(input,'files',{configurable:true,value:[file]}); await act(async () => input.dispatchEvent(new Event('change', {bubbles:true}))); }
  const file = data => ({size:JSON.stringify(data).length, text:async () => JSON.stringify(data)});
  const base = fixture(); // All fixtures stay synthetic.
  try {
    await act(async () => root.render(React.createElement(SalesSnapshot)));
    assert.match(body(), /No data connected/); assert.equal(button('Export current snapshot').disabled, true); assert.doesNotMatch(body(), /\$0\.00/);
    await upload(file(base)); assert.match(body(), /\$120\.00/); assert.match(body(), /\$70\.00/); assert.match(body(), /\$300\.03/); assert.match(body(), /not independently verified/);
    await upload({size:6,text:async () => '{bad'}); assert.match(document.querySelector('[role=alert]').textContent, /not valid JSON/); assert.match(body(), /\$120\.00/);
    await upload({size:1_000_001,text:async () => {throw new Error('must not read')}}); assert.match(document.querySelector('[role=alert]').textContent, /1 MB/);
    await upload({size:1,text:async () => {throw new Error('Read interrupted')}}); assert.match(body(), /Read interrupted/);
    const search = document.querySelector('input[type=search]');
    await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(search,'no-such-match'); search.dispatchEvent(new Event('input',{bubbles:true})); });
    assert.match(body(), /No active deals match/); assert.match(body(), /\$300\.03/);
    await click('Clear view'); assert.ok(document.querySelector('[aria-label="Confirm clear view"]')); await click('Keep snapshot'); assert.match(body(), /\$120\.00/); assert.equal(document.activeElement,button('Clear view'));
    let resolveOld; const old = new Promise(resolve => {resolveOld=resolve});
    await upload({size:100,text:() => old}); const newer = fixture(); newer.payments[0].amountCents = 20345;
    await upload(file(newer)); await act(async () => resolveOld(JSON.stringify(base))); assert.match(body(), /\$200\.00/);
    let resolveClear; const delayed = new Promise(resolve => {resolveClear=resolve}); await upload({size:100,text:()=>delayed});
    await click('Clear view'); await click('Yes, clear view'); await act(async () => resolveClear(JSON.stringify(base)));
    assert.match(body(), /No data connected/); assert.doesNotMatch(body(), /\$120\.00/); assert.equal(document.activeElement,document.querySelector('input[type=file]'));
    await upload(file(base)); await upload(file(base)); assert.match(body(), /\$120\.00/); assert.equal(document.querySelector('input[type=file]').value,'');
    const unsafe = fixture(); unsafe.leads[0].name = '<img src=x onerror=alert(1)> Synthetic'; await upload(file(unsafe)); assert.equal(document.querySelectorAll('img').length,0); assert.match(body(), /<img src=x/);
    const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL, oldClick = dom.window.HTMLAnchorElement.prototype.click;
    let downloaded; URL.createObjectURL = blob => { downloaded=blob; return 'blob:local-test'; }; URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = function() { assert.equal(this.download, 'sales-snapshot-export.json'); };
    try { await click('Export current snapshot'); assert.deepEqual(JSON.parse(await downloaded.text()), unsafe); assert.equal(document.querySelectorAll('a').length,0); } finally { URL.createObjectURL=oldCreate; URL.revokeObjectURL=oldRevoke; dom.window.HTMLAnchorElement.prototype.click=oldClick; }
    // Source privacy and schema invariants are also checked statically.
    const source = readFileSync('components/sales-snapshot.tsx','utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|dangerouslySetInnerHTML/);
    assert.doesNotMatch(readFileSync('components/sales-snapshot.module.css','utf8'), /@import|url\(/);
    assert.match(source, /maxLength=\{160\}/);
    await act(async () => root.unmount());
  } finally {
    dom.window.close();
    for(const key of globals) { if(previous[key] === undefined) delete global[key]; else global[key]=previous[key]; }
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
