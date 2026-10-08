'use strict';
// One-off operator command, conditionally invoked by Netlify only when enabled. No HTTP route.
const ORIGIN = 'https://tay-command.netlify.app';
const PRICE = 'price_1U3FTOPLMwl8qmZP4vwkUOi8';
const PRODUCT = 'prod_V3MBNEBCG09Rzj';
const FROM = 'receipts@updates.transcenlutions.com';
const TO = 'transcenlutions@gmail.com';
const APPROVAL_WINDOW_MS = 60 * 60 * 1000;
const FUTURE_CREATED = 4102444800; // 2100-01-01 UTC; do not retrieve buyer records.
const EMAIL = Object.freeze({from: FROM, to: [TO], reply_to: TO,
  subject: 'TEST: Apex Flow production sender verification',
  text: 'TEST ONLY: This message checks the configured Apex Flow transactional sender.\n\nNo purchase was made, no payment was confirmed, and this message contains no order or download link.\n\nProvider acceptance alone does not prove inbox delivery. The owner must confirm this test arrived and inspect its sender authentication before approving production delivery.'});

function authorization(env, now) {
  if (env.APEX_PROVIDER_PROBE_ENABLED !== 'true') return 'disabled';
  if (env.NETLIFY !== 'true' || env.CONTEXT !== 'production' || env.PULL_REQUEST !== 'false' ||
      env.NETLIFY_PREVIEW_SERVER || env.URL !== ORIGIN || env.APEX_SITE_ORIGIN !== ORIGIN)
    return 'production_build_required';
  // This is operator attestation, not an API check of Netlify's publication lock.
  if (env.APEX_PROVIDER_PROBE_STAGING_APPROVAL !== 'locked-unpublished-production') return 'locked_build_approval_required';
  if (!/^[a-f0-9]{40}$/.test(env.APEX_PROVIDER_PROBE_APPROVED_COMMIT || '') ||
      env.COMMIT_REF !== env.APEX_PROVIDER_PROBE_APPROVED_COMMIT) return 'approved_commit_required';
  const at = Date.parse(env.APEX_PROVIDER_PROBE_APPROVED_AT || '');
  if (!Number.isFinite(at) || !Number.isFinite(now) || now < at || now - at >= APPROVAL_WINDOW_MS)
    return 'approval_window_closed';
  if (env.APEX_STRIPE_MODE !== 'live') return 'live_mode_required';
  const key = env.APEX_STRIPE_RESTRICTED_KEY;
  if (typeof key !== 'string' || !key) return 'restricted_key_missing';
  // Stripe documents the live restricted prefix, not an alphanumeric suffix grammar.
  // Treat the remainder as opaque; reject paste delimiters/control characters without trimming.
  if (/[\s\x00-\x1f\x7f-\x9f"'`]/u.test(key)) return 'restricted_key_format_unconfirmed';
  if (!key.startsWith('rk_live_')) {
    // Fixed categories only: never output any token bytes, suffix, length or hash.
    // These prefix hints do not authenticate a credential or relax the restricted-key gate.
    if (key.startsWith('sk_live_')) return 'standard_live_secret_key_not_restricted';
    if (key.startsWith('rk_test_')) return 'test_restricted_key';
    if (key.startsWith('sk_test_')) return 'test_standard_secret_key';
    if (key.startsWith('sk_org_')) return 'organization_key_not_supported';
    if (key.startsWith('pk_live_') || key.startsWith('pk_test_')) return 'publishable_key';
    if (key.startsWith('whsec_')) return 'webhook_secret';
    if (key.startsWith('re_')) return 'resend_key';
    return 'unknown_key_type';
  }
  if (key.length === 'rk_live_'.length) return 'restricted_key_format_unconfirmed';
  return null;
}
function baseline() {
  return {status: 'blocked', reason: 'disabled', price: 'not_checked', checkoutRead: 'not_checked',
    paymentIntentRead: 'not_checked', chargeRead: 'not_checked', email: 'not_requested',
    metadataWritesVerified: false, sessionExpansionsVerified: false,
    webhookSecretVerified: false, inboxDeliveryVerified: false};
}
async function boundedJson(response) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw Error('invalid');
  const reader = response.body?.getReader();
  if (!reader) throw Error('invalid');
  let bytes = 0;
  const chunks = [];
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw Error('invalid'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function requestJson(send, url, options) {
  try {
    const response = await send(url, {...options, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000)});
    if (!response.ok) {
      await response.body?.cancel(); // Never parse or print provider error bodies.
      return {code: [401, 403].includes(response.status) ? 'provider_access_denied' :
        response.status === 404 ? 'provider_not_found' : response.status === 429 ? 'provider_rate_limited' : 'provider_rejected'};
    }
    return {code: 'received', data: await boundedJson(response)};
  } catch { return {code: 'provider_response_unconfirmed'}; }
}
async function runProbe(env = process.env, deps = {}) {
  const result = baseline(), now = deps.now || Date.now, send = deps.fetch || globalThis.fetch;
  let blocked = authorization(env, now());
  if (blocked) { result.reason = blocked; return result; }
  const emailRequested = env.APEX_PROVIDER_PROBE_EMAIL_ENABLED === 'true';
  if (emailRequested && (env.APEX_DELIVERY_FROM !== FROM || env.APEX_SUPPORT_EMAIL !== TO ||
      typeof env.APEX_RESEND_API_KEY !== 'string' || !env.APEX_RESEND_API_KEY.trim())) {
    result.reason = 'approved_email_configuration_required'; return result;
  }
  const stripeHeaders = {Authorization: 'Bearer ' + env.APEX_STRIPE_RESTRICTED_KEY, 'Stripe-Version': '2026-08-26.dahlia'};
  const checks = [
    ['price', 'prices/' + PRICE, data => data?.object === 'price' && data.id === PRICE && data.product === PRODUCT &&
      data.active === true && data.livemode === true && data.currency === 'usd' && data.unit_amount === 2700 && data.type === 'one_time'],
    ...[['checkoutRead', 'checkout/sessions'], ['paymentIntentRead', 'payment_intents'], ['chargeRead', 'charges']]
      .map(([name, path]) => [name, path + '?limit=1&created%5Bgte%5D=' + FUTURE_CREATED,
        data => data?.object === 'list' && data.has_more === false && Array.isArray(data.data) && data.data.length === 0]),
  ];
  for (const [name, path, validate] of checks) {
    blocked = authorization(env, now());
    if (blocked) { result.reason = blocked; return result; }
    const response = await requestJson(send, 'https://api.stripe.com/v1/' + path, {method: 'GET', headers: stripeHeaders});
    result[name] = response.code === 'received' ? (validate(response.data) ? 'verified' : 'unexpected_response') : response.code;
    if (result[name] !== 'verified') {
      result.status = 'failed'; result.reason = 'stripe_check_failed'; return result;
    }
  }
  result.status = 'read_checks_passed'; result.reason = 'read_only_scope';
  if (!emailRequested) return result;
  blocked = authorization(env, now());
  if (blocked) { result.status = 'blocked'; result.reason = blocked; return result; }
  // Stable per explicitly approved release window, not per build/run/retry.
  // One-hour window is shorter than Resend's 24-hour deduplication retention.
  const key = 'apex-provider-probe-v1-' + Date.parse(env.APEX_PROVIDER_PROBE_APPROVED_AT);
  const response = await requestJson(send, 'https://api.resend.com/emails', {method: 'POST',
    headers: {Authorization: 'Bearer ' + env.APEX_RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': key},
    body: JSON.stringify(EMAIL)});
  result.email = response.code === 'received' && typeof response.data?.id === 'string' && response.data.id.length > 0 && response.data.id.length <= 100
    ? 'provider_accepted' : response.code === 'received' ? 'provider_response_unconfirmed' : response.code;
  result.status = result.email === 'provider_accepted' ? 'email_accepted' : 'failed';
  result.reason = result.email === 'provider_accepted' ? 'inbox_confirmation_required' : 'email_acceptance_unconfirmed';
  return result;
}
async function main() {
  let result;
  try { result = await runProbe(); }
  catch { result = {...baseline(), status: 'failed', reason: 'probe_failed'}; }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = ['read_checks_passed', 'email_accepted'].includes(result.status) ? 0 : 1;
}
if (require.main === module) main();
module.exports = {authorization, runProbe, APPROVAL_WINDOW_MS};

