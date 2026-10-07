// Provider-free configuration and synthetic DOM tests; never create a payment.
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {JSDOM} = require('jsdom');
const {publicCheckout, createCheckoutHandler} = require('./apex-public-checkout.cjs');
const origin = 'https://checkout.example';
const checkoutUrl = 'https://buy.stripe.com/5kQdRbc7ndJM6Cr9HT6sw05';
const enabled = {enabled: true, checkoutUrl};
const disabled = {enabled: false};
const fixture = () => ({
  APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED: 'true',
  APEX_CHECKLIST_SALES_ENABLED: 'true', APEX_STRIPE_MODE: 'live',
  APEX_STRIPE_RESTRICTED_KEY: 'synthetic-config-only',
  APEX_STRIPE_WEBHOOK_SECRET: 'synthetic-config-only',
  APEX_RESEND_API_KEY: 'synthetic-config-only',
  APEX_DELIVERY_FROM: 'delivery@example.com', APEX_SUPPORT_EMAIL: 'support@example.com',
  APEX_SITE_ORIGIN: origin,
});
const request = (url = origin + '/api/apex/checkout', headers = {}, method = 'GET') => new Request(url, {headers, method});
const tick = () => new Promise(resolve => setImmediate(resolve));

test('complete, explicitly approved production config returns only the pinned live link, without provider calls', () => {
  const previous = global.fetch;
  global.fetch = () => { throw Error('Provider calls are forbidden'); };
  try {
    assert.deepEqual(publicCheckout(request(), fixture(), 'production'), enabled);
    assert.deepEqual(publicCheckout(request(undefined, {Origin: origin, 'Sec-Fetch-Site': 'same-origin'}), fixture(), 'production'), enabled);
    const env = {...fixture(), APEX_STRIPE_TEST_PRICE_ID: 'ignored', APEX_STRIPE_TEST_PAYMENT_LINK_ID: 'ignored'};
    assert.deepEqual(publicCheckout(request(), env, 'production'), enabled);
  } finally { global.fetch = previous; }
});

test('every required value is independently fail-closed, with no destination or configuration leakage', () => {
  assert.deepEqual(publicCheckout(request(), {}, 'production'), disabled);
  for (const name of Object.keys(fixture())) {
    for (const value of [undefined, '']) {
      assert.deepEqual(publicCheckout(request(), {...fixture(), [name]: value}, 'production'), disabled, name);
    }
  }
  for (const flag of ['APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED', 'APEX_CHECKLIST_SALES_ENABLED']) {
    for (const value of ['false', 'TRUE', '1', true, ' true '])
      assert.deepEqual(publicCheckout(request(), {...fixture(), [flag]: value}, 'production'), disabled, flag);
  }
});

test('preview, branch, local, test, invalid addresses and noncanonical origins never expose checkout', () => {
  for (const context of [undefined, '', 'deploy-preview', 'branch-deploy', 'dev', 'local', 'Production'])
    assert.deepEqual(publicCheckout(request(), fixture(), context), disabled);
  for (const APEX_STRIPE_MODE of ['test', 'LIVE', 'invalid'])
    assert.deepEqual(publicCheckout(request(), {...fixture(), APEX_STRIPE_MODE,
      APEX_STRIPE_TEST_PRICE_ID: 'price_fixture', APEX_STRIPE_TEST_PAYMENT_LINK_ID: 'plink_fixture'}, 'production'), disabled);
  for (const APEX_SITE_ORIGIN of [origin + '/', origin + '/path', 'http://checkout.example', origin + '?x=1', 'https://elsewhere.example'])
    assert.deepEqual(publicCheckout(request(), {...fixture(), APEX_SITE_ORIGIN}, 'production'), disabled);
  for (const name of ['APEX_DELIVERY_FROM', 'APEX_SUPPORT_EMAIL'])
    assert.deepEqual(publicCheckout(request(), {...fixture(), [name]: 'not-an-email'}, 'production'), disabled);
});

test('request origin, caller origin, and method checks cannot be overridden by caller flags or headers', () => {
  for (const url of ['https://deploy-preview-42.example/api/apex/checkout', 'http://checkout.example/api/apex/checkout'])
    assert.deepEqual(publicCheckout(request(url, {Origin: origin, 'X-Forwarded-Host': 'checkout.example'}), fixture(), 'production'), disabled);
  for (const headers of [{Origin: 'https://elsewhere.example'}, {Origin: 'null'}, {'Sec-Fetch-Site': 'cross-site'}, {'Sec-Fetch-Site': 'same-site'}])
    assert.deepEqual(publicCheckout(request(undefined, headers), fixture(), 'production'), disabled);
  for (const method of ['POST', 'PUT', 'HEAD']) assert.deepEqual(publicCheckout(request(undefined, {}, method), fixture(), 'production'), disabled);
  assert.deepEqual(publicCheckout({url: 'invalid', method: 'GET', headers: new Headers()}, fixture(), 'production'), disabled);
  assert.deepEqual(publicCheckout(request(origin + '/api/apex/checkout?APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED=true&CONTEXT=production',
    {'X-APEX-CHECKLIST-PUBLIC-CHECKOUT-ENABLED': 'true'}), {...fixture(), APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED: 'false'}, 'production'), disabled);
});

test('handler reevaluates configuration on every request and sends private no-store responses without CORS', async () => {
  let env = fixture();
  const handler = createCheckoutHandler('production', () => env);
  for (const expected of [enabled, disabled]) {
    const response = handler(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(await response.json(), expected);
    env = {...env, APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED: 'false'};
  }
});

const html = readFileSync('public/apex-flow/offer.html', 'utf8');
const script = readFileSync('public/apex-flow/checkout.js', 'utf8');
function offer(fetch, run = true) {
  const dom = new JSDOM(html, {url: origin + '/apex-flow/offer.html', runScripts: 'outside-only'});
  dom.window.AbortSignal = AbortSignal;
  dom.window.fetch = fetch;
  if (run) dom.window.eval(script);
  return dom;
}
function assertClosed(dom) {
  const d = dom.window.document;
  for (const link of d.querySelectorAll('[data-checkout-link]')) {
    assert.equal(link.hidden, true);
    assert.equal(link.hasAttribute('href'), false);
  }
  for (const node of d.querySelectorAll('[data-checkout-open]')) assert.equal(node.hidden, true);
  for (const node of d.querySelectorAll('[data-checkout-closed]')) assert.equal(node.hidden, false);
  assert.equal(d.querySelectorAll('#sample details').length, 2);
  assert.ok(d.getElementById('checklist-interest-form'));
}

test('static/no-JavaScript offer has no checkout URL or navigable Buy link and retains compatibility exceptions', () => {
  const dom = offer(undefined, false);
  assertClosed(dom);
  assert.equal(html.includes(checkoutUrl), false);
  assert.equal(dom.window.document.querySelectorAll('[data-checkout-link]').length, 2);
  assert.match(html, /Automatic registration in your Tay product library is not available yet/);
  assert.match(html, /JSON progress export or text action plan/);
  assert.match(html, /not supported in every chat/);
  dom.window.close();
});

test('approved status alone enables the two Stripe links and updates availability copy', async () => {
  let calls = 0;
  const dom = offer(async (url, options) => {
    calls++;
    assert.equal(url, '/api/apex/checkout');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'same-origin');
    return Response.json(enabled);
  });
  assertClosed(dom);
  await tick();
  assert.equal(calls, 1);
  const d = dom.window.document;
  for (const link of d.querySelectorAll('[data-checkout-link]')) {
    assert.equal(link.hidden, false);
    assert.equal(link.href, checkoutUrl);
  }
  for (const node of d.querySelectorAll('[data-checkout-closed]')) assert.equal(node.hidden, true);
  for (const node of d.querySelectorAll('[data-checkout-open]')) assert.equal(node.hidden, false);
  assert.ok(d.querySelector('a[href="#sample"]'));
  assert.ok(d.querySelector('form#checklist-interest-form'));
  dom.window.close();
});

test('HTTP, network, timeout, malformed and rejected status responses leave the offer closed', async () => {
  const responses = [
    async () => { throw Error('network/timeout'); },
    async () => new Response('Unavailable', {status: 503}),
    async () => new Response('{not JSON'),
    ...[null, {}, disabled, {enabled: 'true', checkoutUrl}, {enabled: true},
      {enabled: true, checkoutUrl: 'https://evil.example/'},
      {enabled: true, checkoutUrl: 'https://buy.stripe.com/otherStripeLink'},
      {enabled: true, checkoutUrl: 'javascript:alert(1)'},
      {enabled: true, checkoutUrl: 'https://user@buy.stripe.com/link'},
      {enabled: true, checkoutUrl: 'https://buy.stripe.com/link?redirect=evil'},
      {enabled: true, checkoutUrl: 'https://buy.stripe.com/link#fragment'},
      {enabled: true, checkoutUrl: 'http://buy.stripe.com/link'},
    ].map(body => async () => Response.json(body)),
  ];
  for (const fetch of responses) {
    const dom = offer(fetch); await tick(); assertClosed(dom); dom.window.close();
  }
});

test('returning via back/forward clears a prior link immediately and reflects disabled configuration', async () => {
  let release;
  const dom = offer(async () => Response.json(enabled));
  await tick();
  dom.window.fetch = () => new Promise(resolve => { release = resolve; });
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', {persisted: true}));
  assertClosed(dom);
  release(Response.json(disabled)); await tick(); assertClosed(dom);
  dom.window.close();
});

test('a superseded status response cannot restore checkout after a newer closed result', async () => {
  let release;
  const dom = offer(() => new Promise(resolve => { release = resolve; }));
  dom.window.fetch = async () => Response.json(disabled);
  Object.defineProperty(dom.window.document, 'visibilityState', {value: 'visible'});
  dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
  await tick(); assertClosed(dom);
  release(Response.json(enabled)); await tick(); assertClosed(dom);
  dom.window.close();
});


test('pagehide or a hidden tab clears links and invalidates pending responses until return', async () => {
  for (const event of ['pagehide', 'visibilitychange']) {
    let release;
    const dom = offer(() => new Promise(resolve => { release = resolve; }));
    const w = dom.window;
    if (event === 'pagehide') w.dispatchEvent(new w.PageTransitionEvent(event));
    else {
      Object.defineProperty(w.document, 'visibilityState', {value: 'hidden', configurable: true});
      w.document.dispatchEvent(new w.Event(event));
    }
    release(Response.json(enabled)); await tick(); assertClosed(dom);
    w.fetch = async () => Response.json(enabled);
    if (event === 'pagehide') w.dispatchEvent(new w.PageTransitionEvent('pageshow', {persisted: true}));
    else {
      Object.defineProperty(w.document, 'visibilityState', {value: 'visible', configurable: true});
      w.document.dispatchEvent(new w.Event(event));
    }
    await tick();
    assert.equal(w.document.querySelector('[data-checkout-link]').hidden, false);
    if (event === 'pagehide') w.dispatchEvent(new w.PageTransitionEvent(event));
    else {
      Object.defineProperty(w.document, 'visibilityState', {value: 'hidden', configurable: true});
      w.document.dispatchEvent(new w.Event(event));
    }
    assertClosed(dom);
    dom.window.close();
  }
});


test('runtime variables cannot promote a missing or preview build marker to production', async () => {
  const env = {...fixture(), CONTEXT: 'production', APEX_BUILD_CONTEXT: 'production'};
  assert.deepEqual(publicCheckout(request(), env), disabled);
  assert.deepEqual(publicCheckout(request(), env, 'deploy-preview'), disabled);
  assert.deepEqual(await createCheckoutHandler(undefined, () => env)(request()).json(), disabled);
});

test('Next configuration captures the Netlify build context, never an operator-supplied marker', async () => {
  const before = {...process.env};
  try {
    process.env.APEX_BUILD_CONTEXT = 'production';
    for (const context of [undefined, 'deploy-preview', 'production']) {
      if (context === undefined) delete process.env.CONTEXT;
      else process.env.CONTEXT = context;
      const {default: config} = await import('../next.config.mjs?checkout-context=' + String(context));
      assert.equal(config.env.APEX_BUILD_CONTEXT, context || '');
    }
    const route = readFileSync('app/api/apex/checkout/route.ts', 'utf8');
    assert.match(route, /createCheckoutHandler\(process\.env\.APEX_BUILD_CONTEXT\)/);
  } finally { process.env = before; }
});


test('support uses the existing checklist contact and keeps unfinished policy review explicit', () => {
  const support = readFileSync('app/support/page.tsx', 'utf8');
  assert.match(support, /transcenlutions@gmail\.com/);
  assert.doesNotMatch(support, /support@transcenlutions\.com/);
  for (const file of ['app/support/page.tsx', 'app/terms/page.tsx', 'app/refund/page.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /before public launch/);
  }
});
