/** Signed Stripe retries use the site-wide allowance, not the tighter API rule. */
export default async function webhookSecurity(request, context) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 1000000)) return new Response('Payload too large', { status: 413 });
  if (request.headers.has('content-encoding')) return new Response('Unsupported encoding', { status: 415 });
  return context.next(); // No parsing, rewriting, or signature bypass at the edge.
}
export const config = {
  path: '/api/apex/stripe-webhook', onError: 'fail',
};
