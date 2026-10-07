'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {readFileSync} = require('node:fs');
const {runProbe, APPROVAL_WINDOW_MS} = require('./apex-provider-probe.cjs');
const {config} = require('../lib/apex-payments.cjs');
const NOW = Date.parse('2026-10-07T23:30:00.000Z');
const COMMIT = 'a'.repeat(40);
const fixture = () => ({NETLIFY: 'true', CONTEXT: 'production', PULL_REQUEST: 'false',
  URL: 'https://tay-command.netlify.app', APEX_SITE_ORIGIN: 'https://tay-command.netlify.app',
  COMMIT_REF: COMMIT, APEX_PROVIDER_PROBE_APPROVED_COMMIT: COMMIT,
  APEX_PROVIDER_PROBE_ENABLED: 'true', APEX_PROVIDER_PROBE_STAGING_APPROVAL: 'locked-unpublished-production',
  APEX_PROVIDER_PROBE_APPROVED_AT: new Date(NOW).toISOString(),
  APEX_STRIPE_MODE: 'live', APEX_STRIPE_RESTRICTED_KEY: ['rk', 'live', 'syntheticOnly'].join('_'),
  APEX_RESEND_API_KEY: 'synthetic-email-key', APEX_DELIVERY_FROM: 'receipts@updates.transcenlutions.com',
  APEX_SUPPORT_EMAIL: 'transcenlutions@gmail.com', APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED: 'false'});
const price = () => ({object: 'price', id: config({APEX_STRIPE_MODE: 'live'}).price,
  product: 'prod_V3MBNEBCG09Rzj', active: true, livemode: true, currency: 'usd', unit_amount: 2700, type: 'one_time'});
const empty = () => ({object: 'list', has_more: false, data: []});
function fakeProvider(overrides = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({url, options});
    if (overrides.fetch) return overrides.fetch(url, options);
    if (url.startsWith('https://api.resend.com/')) return Response.json(overrides.email || {id: 'synthetic-provider-id'});
    return Response.json(url.includes('/prices/') ? (overrides.price || price()) : (overrides.list || empty()));
  };
  return {calls, fetch, now: () => NOW};
}
const noProvider = {now: () => NOW, fetch: () => { throw Error('No provider request allowed'); }};

test('default-off and every required approval/build gate independently prevent all calls', async () => {
  assert.equal((await runProbe({}, noProvider)).reason, 'disabled');
  for (const name of ['NETLIFY', 'CONTEXT', 'PULL_REQUEST', 'URL', 'APEX_SITE_ORIGIN', 'COMMIT_REF',
    'APEX_PROVIDER_PROBE_APPROVED_COMMIT', 'APEX_PROVIDER_PROBE_ENABLED', 'APEX_PROVIDER_PROBE_STAGING_APPROVAL',
    'APEX_PROVIDER_PROBE_APPROVED_AT', 'APEX_STRIPE_MODE', 'APEX_STRIPE_RESTRICTED_KEY']) {
    for (const value of [undefined, '', 'invalid']) {
      const deps = fakeProvider();
      const result = await runProbe({...fixture(), [name]: value}, deps);
      assert.equal(result.status, 'blocked', name);
      assert.equal(deps.calls.length, 0, name);
    }
  }
});

test('previews, PRs, local context, wrong commit and test/full keys fail closed', async () => {
  for (const patch of [{CONTEXT: 'deploy-preview'}, {CONTEXT: 'branch-deploy'}, {CONTEXT: 'dev'},
    {PULL_REQUEST: 'true'}, {NETLIFY_PREVIEW_SERVER: 'true'}, {COMMIT_REF: 'b'.repeat(40)},
    {URL: 'https://elsewhere.example'}, {APEX_SITE_ORIGIN: 'https://tay-command.netlify.app/'},
    {APEX_PROVIDER_PROBE_STAGING_APPROVAL: 'true'}, {APEX_STRIPE_MODE: 'test'},
    {APEX_STRIPE_RESTRICTED_KEY: ['rk', 'test', 'syntheticOnly'].join('_')}, {APEX_STRIPE_RESTRICTED_KEY: ['sk', 'live', 'syntheticOnly'].join('_')},
    {APEX_PROVIDER_PROBE_ENABLED: 'TRUE'}, {APEX_PROVIDER_PROBE_STAGING_APPROVAL: true}]) {
    const deps = fakeProvider(); assert.equal((await runProbe({...fixture(), ...patch}, deps)).status, 'blocked');
    assert.equal(deps.calls.length, 0);
  }
});

test('future, malformed and expired approval windows stop before any provider use', async () => {
  for (const at of ['invalid', new Date(NOW + 1).toISOString(), new Date(NOW - APPROVAL_WINDOW_MS).toISOString()]) {
    const deps = fakeProvider();
    assert.equal((await runProbe({...fixture(), APEX_PROVIDER_PROBE_APPROVED_AT: at}, deps)).reason, 'approval_window_closed');
    assert.equal(deps.calls.length, 0);
  }
});

test('read-only probe uses exact pinned price and fixed future-created filters without mutations', async () => {
  const deps = fakeProvider(), result = await runProbe(fixture(), deps);
  assert.equal(result.status, 'read_checks_passed');
  assert.equal(result.email, 'not_requested');
  assert.equal(deps.calls.length, 4);
  assert.equal(deps.calls[0].url, 'https://api.stripe.com/v1/prices/' + config({APEX_STRIPE_MODE: 'live'}).price);
  const paths = ['/v1/checkout/sessions', '/v1/payment_intents', '/v1/charges'];
  for (const [index, call] of deps.calls.entries()) {
    assert.equal(call.options.method, 'GET'); assert.equal(call.options.body, undefined);
    assert.equal(call.options.redirect, 'error'); assert.equal(call.options.cache, 'no-store');
    assert.equal(call.options.headers['Stripe-Version'], '2026-08-26.dahlia');
    if (index) {
      const url = new URL(call.url); assert.equal(url.pathname, paths[index - 1]);
      assert.equal(url.searchParams.get('limit'), '1'); assert.equal(url.searchParams.get('created[gte]'), '4102444800');
      assert.deepEqual([...url.searchParams.keys()], ['limit', 'created[gte]']);
    }
  }
  for (const name of ['metadataWritesVerified', 'sessionExpansionsVerified', 'webhookSecretVerified', 'inboxDeliveryVerified'])
    assert.equal(result[name], false);
});

test('unexpected price or nonempty lists never count as successful evidence and suppress email', async () => {
  const env = {...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'};
  for (const patch of [{livemode: false}, {id: 'wrong'}, {product: 'wrong'}, {active: false},
    {currency: 'eur'}, {unit_amount: 2701}, {type: 'recurring'}]) {
    const deps = fakeProvider({price: {...price(), ...patch}});
    assert.equal((await runProbe(env, deps)).price, 'unexpected_response');
    assert.equal(deps.calls.length, 1);
  }
  for (const list of [{object: 'list', has_more: false, data: [{email: 'private@example.com'}]},
    {object: 'list', has_more: true, data: []}, {object: 'wrong', has_more: false, data: []}, {}]) {
    const deps = fakeProvider({list}), result = await runProbe(env, deps);
    assert.equal(result.checkoutRead, 'unexpected_response'); assert.equal(deps.calls.length, 2);
    assert.doesNotMatch(JSON.stringify(result), /private@example/);
  }
});

test('provider errors and malformed or oversized responses return fixed codes without details or retries', async () => {
  for (const mode of ['network', 'json', 'oversized', 401, 403, 404, 429, 500]) {
    const deps = fakeProvider({fetch: async () => {
      if (mode === 'network') throw Error('sensitive-error-body-and-key');
      if (mode === 'json') return new Response('sensitive-error-body', {headers: {'Content-Type': 'application/json'}});
      if (mode === 'oversized') return Response.json({text: 'sensitive'.repeat(10000)});
      return new Response('sensitive-error-body-and-key', {status: mode});
    }});
    const result = await runProbe({...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'}, deps);
    assert.equal(result.status, 'failed'); assert.equal(deps.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(result), /sensitive|rk_live|synthetic-email-key/);
  }
});

test('separate email permission and exact sender/support are required, with no recipient override', async () => {
  for (const flag of [undefined, 'false', 'TRUE', true]) {
    const deps = fakeProvider();
    assert.equal((await runProbe({...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: flag}, deps)).email, 'not_requested');
    assert.equal(deps.calls.length, 4);
  }
  for (const patch of [{APEX_DELIVERY_FROM: 'other@example.com'}, {APEX_SUPPORT_EMAIL: 'other@example.com'}, {APEX_RESEND_API_KEY: ''}]) {
    const deps = fakeProvider();
    const result = await runProbe({...fixture(), ...patch, APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'}, deps);
    assert.equal(result.reason, 'approved_email_configuration_required'); assert.equal(deps.calls.length, 0);
  }
  const deps = fakeProvider();
  const result = await runProbe({...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true', APEX_PROVIDER_PROBE_RECIPIENT: 'other@example.com'}, deps);
  assert.equal(result.status, 'email_accepted'); assert.equal(result.email, 'provider_accepted');
  assert.equal(result.inboxDeliveryVerified, false); assert.equal(deps.calls.length, 5);
  const call = deps.calls[4], body = JSON.parse(call.options.body);
  assert.equal(call.url, 'https://api.resend.com/emails'); assert.equal(call.options.method, 'POST');
  assert.equal(body.from, 'receipts@updates.transcenlutions.com');
  assert.deepEqual(body.to, ['transcenlutions@gmail.com']); assert.equal(body.reply_to, 'transcenlutions@gmail.com');
  assert.match(body.subject, /^TEST:/); assert.match(body.text, /No purchase was made/);
  assert.doesNotMatch(body.text, /https?:|cs_live_|cs_test_/);
  assert.deepEqual(Object.keys(body).sort(), ['from', 'reply_to', 'subject', 'text', 'to']);
});

test('same approval retries and concurrent runs use identical payload and idempotency key', async () => {
  const deps = fakeProvider(), env = {...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'};
  await Promise.all([runProbe(env, deps), runProbe({...env, BUILD_ID: 'a-different-build'}, deps)]);
  const emails = deps.calls.filter(call => call.options.method === 'POST');
  assert.equal(emails.length, 2); // One attempt per command; provider key deduplicates delivery.
  assert.equal(emails[0].options.headers['Idempotency-Key'], emails[1].options.headers['Idempotency-Key']);
  assert.equal(emails[0].options.body, emails[1].options.body);
  const late = fakeProvider(); late.now = () => NOW + APPROVAL_WINDOW_MS;
  assert.equal((await runProbe(env, late)).reason, 'approval_window_closed'); assert.equal(late.calls.length, 0);
});

test('expired approval during Stripe reads prevents the next call or email', async () => {
  const deps = fakeProvider(); let time = 0;
  deps.now = () => ++time > 4 ? NOW + APPROVAL_WINDOW_MS : NOW;
  const result = await runProbe({...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'}, deps);
  assert.equal(result.reason, 'approval_window_closed'); assert.equal(deps.calls.length, 3);
  assert.equal(deps.calls.some(call => call.options.method === 'POST'), false);
});

test('ambiguous, rejected and malformed email acceptance is not retried or logged as delivery', async () => {
  for (const mode of ['timeout', 'malformed', 403, 409, 429, 500]) {
    const deps = fakeProvider({fetch: async (url) => {
      if (!url.includes('resend.com')) return Response.json(url.includes('/prices/') ? price() : empty());
      if (mode === 'timeout') throw Error('private-provider-error');
      if (mode === 'malformed') return Response.json({unexpected: 'private-provider-value'});
      return new Response('private-provider-error', {status: mode});
    }});
    const result = await runProbe({...fixture(), APEX_PROVIDER_PROBE_EMAIL_ENABLED: 'true'}, deps);
    assert.equal(result.status, 'failed'); assert.equal(result.reason, 'email_acceptance_unconfirmed');
    assert.equal(result.inboxDeliveryVerified, false);
    assert.equal(deps.calls.filter(call => call.options.method === 'POST').length, 1);
    assert.doesNotMatch(JSON.stringify(result), /private-provider|synthetic-provider-id|rk_live|synthetic-email-key/);
  }
});

test('command output is fixed/redacted and npm build has no probe lifecycle hook', () => {
  const output = spawnSync(process.execPath, ['scripts/apex-provider-probe.cjs'], {
    cwd: process.cwd(), env: {PATH: process.env.PATH, APEX_STRIPE_RESTRICTED_KEY: 'do-not-log-this'}, encoding: 'utf8'});
  assert.equal(output.status, 1); assert.equal(output.stderr, '');
  assert.equal(JSON.parse(output.stdout).reason, 'disabled'); assert.doesNotMatch(output.stdout, /do-not-log-this/);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const name of ['build', 'prebuild', 'postbuild', 'dev', 'start']) assert.doesNotMatch(pkg.scripts[name] || '', /provider-probe/);
});


test('locked-candidate approval permits validating the same checkout-enabled build without publishing it', async () => {
  const deps = fakeProvider();
  const env = {...fixture(), APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED: 'true'};
  assert.equal((await runProbe(env, deps)).status, 'read_checks_passed');
  const blocked = fakeProvider();
  assert.equal((await runProbe({...env, APEX_PROVIDER_PROBE_STAGING_APPROVAL: ''}, blocked)).status, 'blocked');
  assert.equal(blocked.calls.length, 0);
});


test('Netlify conditionally invokes the probe only after a successful build and exact opt-in', () => {
  const command = readFileSync('netlify.toml', 'utf8').match(/^  command = '([^\n]+)'$/m)?.[1];
  assert.ok(command, 'Expected a literal, reviewable Netlify build command');
  assert.equal(command, 'npm run build && if [ "${APEX_PROVIDER_PROBE_ENABLED:-false}" = "true" ]; then npm run probe:apex-providers; fi');
  const fakeNpm = 'npm() { printf "%s\\n" "$2"; if [ "$2" = "build" ]; then return "$BUILD_EXIT"; fi; return "$PROBE_EXIT"; }; ';
  for (const flag of [undefined, '', 'false', 'TRUE', '1']) {
    const env = {PATH: process.env.PATH, BUILD_EXIT: '0', PROBE_EXIT: '0'};
    if (flag !== undefined) env.APEX_PROVIDER_PROBE_ENABLED = flag;
    const run = spawnSync('bash', ['-c', fakeNpm + command], {env, encoding: 'utf8'});
    assert.equal(run.status, 0); assert.equal(run.stdout, 'build\n'); assert.equal(run.stderr, '');
  }
  for (const [buildExit, probeExit, expectedExit, expectedOutput] of [
    ['0', '0', 0, 'build\nprobe:apex-providers\n'],
    ['17', '0', 17, 'build\n'],
    ['0', '1', 1, 'build\nprobe:apex-providers\n'],
  ]) {
    const run = spawnSync('bash', ['-c', fakeNpm + command], {encoding: 'utf8', env: {
      PATH: process.env.PATH, BUILD_EXIT: buildExit, PROBE_EXIT: probeExit, APEX_PROVIDER_PROBE_ENABLED: 'true',
    }});
    assert.equal(run.status, expectedExit); assert.equal(run.stdout, expectedOutput); assert.equal(run.stderr, '');
  }
});


test('opaque key suffixes reach the provider unchanged; local checks do not authenticate them', async () => {
  for (const suffix of ['synthetic_suffix', 'synthetic-suffix', 'synthetic_suffix-with-hyphen']) {
    const key = ['rk', 'live', suffix].join('_');
    const env = {...fixture(), APEX_STRIPE_RESTRICTED_KEY: key}, deps = fakeProvider();
    assert.equal((await runProbe(env, deps)).status, 'read_checks_passed');
    assert.equal(deps.calls.length, 4);
    for (const call of deps.calls) assert.equal(call.options.headers.Authorization, 'Bearer ' + key);
    assert.equal(env.APEX_STRIPE_RESTRICTED_KEY, key);
  }
});

test('key diagnostics distinguish missing, mode, prefix and unsafe formatting without exposing values', async () => {
  const key = fixture().APEX_STRIPE_RESTRICTED_KEY;
  const cases = [
    [{APEX_STRIPE_MODE: 'test'}, 'live_mode_required'],
    ...[undefined, null, '', 42].map(value => [{APEX_STRIPE_RESTRICTED_KEY: value}, 'restricted_key_missing']),
    ...[['rk', 'test', 'syntheticOnly'].join('_'), ['sk', 'live', 'syntheticOnly'].join('_'), 'otherPrefix']
      .map(value => [{APEX_STRIPE_RESTRICTED_KEY: value}, 'restricted_key_live_prefix_required']),
    ...['rk_live_', ' ' + key, key + ' ', key + '\n', key + '\t', key + '\u0000', key + '\u007f', key + '\u0085',
      '"' + key + '"', "'" + key + "'", '`' + key + '`', key + '"']
      .map(value => [{APEX_STRIPE_RESTRICTED_KEY: value}, 'restricted_key_format_unconfirmed']),
  ];
  for (const [patch, reason] of cases) {
    const env = {...fixture(), ...patch}, original = env.APEX_STRIPE_RESTRICTED_KEY, deps = fakeProvider();
    const result = await runProbe(env, deps);
    assert.equal(result.status, 'blocked'); assert.equal(result.reason, reason); assert.equal(deps.calls.length, 0);
    assert.equal(env.APEX_STRIPE_RESTRICTED_KEY, original);
    assert.doesNotMatch(JSON.stringify(result), /synthetic|rk_live|otherPrefix/);
  }
});
