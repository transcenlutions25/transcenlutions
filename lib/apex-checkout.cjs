'use strict';
const payments = require('./apex-payments.cjs');
const headers = {'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
// This milestone exposes sandbox checkout only. Existing paid access is unchanged.
function verifiedTestLink(link, c) {
 const item = link?.line_items?.data?.[0];
 let url;
 try { url = new URL(link.url); } catch { return false; }
 return !!item && link.id === c.link && link.active === true && link.livemode === false &&
  url.origin === 'https://buy.stripe.com' && /^\/test_[A-Za-z0-9]+$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password &&
  link.line_items.data.length === 1 && link.line_items.has_more === false &&
  item.quantity === 1 && item.adjustable_quantity?.enabled !== true &&
  item.price?.id === c.price && item.price.active === true && item.price.type === 'one_time' &&
  item.price.currency === 'usd' && item.price.unit_amount === 2700 && !item.price.custom_unit_amount &&
  link.allow_promotion_codes !== true && link.automatic_tax?.enabled !== true &&
  !link.shipping_address_collection && !(link.shipping_options?.length) && Object.hasOwn(link, 'optional_items') &&
  (link.optional_items === null || (Array.isArray(link.optional_items) && link.optional_items.length === 0)) &&
  !(item.tax_rates?.length) &&
  link.after_completion?.type === 'redirect' &&
  link.after_completion.redirect?.url === c.origin + '/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}';
}
function createCheckoutHandler(deps = {}) {
 const settings = deps.config || payments.config;
 const read = deps.readLink || ((c) => payments.stripeRequest(c, 'payment_links/' + encodeURIComponent(c.link) + '?expand%5B%5D=line_items&expand%5B%5D=optional_items'));
 return async function GET() {
  const c = settings();
  if (!payments.ready(c) || c.mode !== 'test' || c.live !== false || c.checkoutEnabled !== true)
   return Response.json({state:'unavailable',message:'Checkout is not open. You can read the sample or request launch details.'},{headers});
  try {
   const link = await read(c);
   if (!verifiedTestLink(link,c)) throw Error('Unverified checkout');
   return Response.json({state:'test',checkoutUrl:link.url,amount:2700,currency:'usd',message:'Sandbox checkout only. No real payment or production account access.'},{headers});
  } catch {
   return Response.json({state:'unavailable',message:'Test checkout could not be verified. Retry shortly or request launch details.'},{status:503,headers});
  }
 };
}
module.exports = {verifiedTestLink,createCheckoutHandler};
