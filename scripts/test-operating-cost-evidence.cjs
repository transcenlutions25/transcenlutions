const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const temporary = mkdtempSync(join(tmpdir(), 'tay-cost-evidence-'));
const previous = { ...process.env };
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'),
  'lib/operating-cost-evidence.ts', 'lib/operating-graph-db.ts',
  'app/api/operating-graph/evidence/route.ts',
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
  '--esModuleInterop', '--skipLibCheck', '--outDir', temporary], { stdio: 'inherit' });
mkdirSync(join(temporary, 'node_modules/pg'), { recursive: true });
writeFileSync(join(temporary, 'node_modules/pg/index.js'), `
const queries = []; let results = [];
class Pool { async query(sql, parameters) {
  queries.push({sql, parameters});
  if (!results.length) throw new Error('Unexpected database call');
  return { rows: results.shift() };
} }
module.exports = { Pool, queries, setResults(value) { results = value; queries.length = 0; } };
`);
symlinkSync(resolve('node_modules/next'), join(temporary, 'node_modules/next'), 'dir');
const { createOperatingCostEvidence } = require(join(temporary, 'lib/operating-cost-evidence.js'));
const { getOperatingGraphEvidence } = require(join(temporary, 'lib/operating-graph-db.js'));
const pg = require(join(temporary, 'node_modules/pg'));
const route = require(join(temporary, 'app/api/operating-graph/evidence/route.js'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fixture.invalid/no-network';

after(() => {
  process.env = previous;
  rmSync(temporary, { recursive: true, force: true });
});

test('positive and zero estimates are never reported as measured or billed', () => {
  for (const estimate of [12.5, 0, '0.000000', '1.234567', '123456789012345678901234567890.123456']) {
    const result = createOperatingCostEvidence(estimate);
    assert.equal(result.estimated_cost_usd, estimate);
    assert.equal(result.measured_cost_usd, null);
    assert.equal(result.billed_cost_usd, null);
    assert.equal(result.cost_evidence.estimate_status, 'available');
    assert.equal(result.cost_evidence.billed_status, 'unverified');
    assert.equal(result.cost_evidence.estimate_source, 'workflow_event_estimates');
  }
});

test('missing or invalid estimate stays unknown; it never becomes zero', () => {
  const values = [undefined, null, NaN, Infinity, -Infinity, -1, true, false, '', ' ',
    '-0.01', 'NaN', 'Infinity', '1e3', '0x20', '$12', '1.2oops', '1'.repeat(101),
    {}, [], { measured_cost_usd: 99, verified: true }, { valueOf() { throw Error('do not coerce'); } }];
  for (const value of values) {
    const result = createOperatingCostEvidence(value);
    assert.equal(result.estimated_cost_usd, null);
    assert.equal(result.measured_cost_usd, null);
    assert.equal(result.billed_cost_usd, null);
    assert.equal(result.cost_evidence.estimate_status, 'unknown');
  }
});

test('real database adapter reads legacy column under estimate alias and preserves metrics', async () => {
  pg.setResults([[{ workflows_started: '5', workflows_completed: '3', approvals: '2',
    estimated_cost_usd: '9.876543' }]]);
  const result = await getOperatingGraphEvidence('tenant-fixture');
  assert.equal(result.workflows_started, '5');
  assert.equal(result.workflows_completed, '3');
  assert.equal(result.estimated_cost_usd, '9.876543');
  assert.equal(result.measured_cost_usd, null);
  assert.equal(result.billed_cost_usd, null);
  assert.match(pg.queries[0].sql, /measured_cost_usd as estimated_cost_usd/);
  assert.deepEqual(pg.queries[0].parameters, ['tenant-fixture']);
  assert.equal(pg.queries.length, 1);
  assert.doesNotMatch(pg.queries[0].sql, /\b(?:alter|create|insert|update|delete|drop)\b/i);
});

test('no evidence row means unknown costs, while existing zero-count defaults remain', async () => {
  pg.setResults([[]]);
  const result = await getOperatingGraphEvidence('tenant-fixture');
  assert.equal(result.workflows_started, 0);
  assert.equal(result.estimated_cost_usd, null);
  assert.equal(result.measured_cost_usd, null);
  assert.equal(result.billed_cost_usd, null);
});

test('unknown legacy/provider-looking row fields cannot supply measured charges', async () => {
  pg.setResults([[{ estimated_cost_usd: '1.25', measured_cost_usd: '900', billed_cost_usd: '800',
    cost_evidence: { billed_status: 'verified' } }]]);
  const result = await getOperatingGraphEvidence('tenant-fixture');
  assert.equal(result.estimated_cost_usd, '1.25');
  assert.equal(result.measured_cost_usd, null);
  assert.equal(result.billed_cost_usd, null);
  assert.equal(result.cost_evidence.billed_status, 'unverified');
});

test('API v2 communicates correction and retains authentication without connecting providers', async () => {
  process.env.TAY_ALLOW_DEV_IDENTITY = 'true';
  process.env.TAY_INTERNAL_TENANT_SLUG = 'internal';
  const headers = { 'x-tay-dev-user': 'owner', 'x-tay-dev-tenant': 'internal',
    'x-tay-dev-role': 'owner', 'x-tay-dev-session': 'session-fixture' };
  pg.setResults([[{ id: 'tenant-fixture' }], [{ workflows_started: '1', estimated_cost_usd: '0.00' }]]);
  const response = await route.GET(new Request('http://localhost/api/operating-graph/evidence', { headers }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.evidence_contract_version, 2);
  assert.equal(body.evidence.estimated_cost_usd, '0.00');
  assert.equal(body.evidence.measured_cost_usd, null);
  assert.equal(body.evidence.billed_cost_usd, null);
  assert.match(body.warning, /estimates, not verified charges/);
  assert.equal(pg.queries.length, 2);
  process.env.NODE_ENV = 'production';
  pg.setResults([]);
  const denied = await route.GET(new Request('https://tay.example/api/operating-graph/evidence', { headers }));
  assert.equal(denied.status, 401);
  assert.equal(pg.queries.length, 0);
  process.env.NODE_ENV = 'test';
});

test('database view compatibility is documented without changing its existing expression', () => {
  const sql = readFileSync('docs/operating-graph-schema.sql', 'utf8');
  assert.match(sql, /sum\(estimated_cost_usd\) filter \(where estimated_cost_usd is not null\) as measured_cost_usd/);
  assert.match(sql, /contains estimates only, never measured charges/);
  assert.match(readFileSync('docs/operating-cost-evidence-compatibility.md', 'utf8'),
    /Clients that\s+used its previous numeric value must switch/);
});
