'use strict';
const {config, ready} = require('./apex-payments.cjs');

// Existing USD 27 one-time Payment Link. Never accept a destination from the caller.
const CHECKOUT_URL = 'https://buy.stripe.com/5kQdRbc7ndJM6Cr9HT6sw05';

// Configuration gate only: no provider calls or claim of verified live delivery.
// The separate public flag records operational approval after the release gates.
function publicCheckout(request, env = process.env, buildContext = '') {
  const c = config(env);
  if (env.APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED !== 'true' ||
      buildContext !== 'production' || !c.live || !ready(c)) return {enabled: false};
  try {
    const origin = new URL(request.url).origin;
    const callerOrigin = request.headers.get('origin');
    const site = request.headers.get('sec-fetch-site');
    if (request.method !== 'GET' || origin !== c.origin ||
        (callerOrigin && callerOrigin !== c.origin) ||
        (site && !['same-origin', 'none'].includes(site))) return {enabled: false};
  } catch {
    return {enabled: false};
  }
  return {enabled: true, checkoutUrl: CHECKOUT_URL};
}

function createCheckoutHandler(buildContext = '', settings = () => process.env) {
  return request => Response.json(publicCheckout(request, settings(), buildContext), {headers: {
    'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }});
}
module.exports = {publicCheckout, createCheckoutHandler};
