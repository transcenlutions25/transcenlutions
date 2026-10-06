/** Netlify-native edge boundary; payment bodies remain byte-identical for HMAC. */
export default async function apiSecurity(request, context) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/desktop/") || url.pathname === "/api/desktop")
    return Response.json({ error: "Desktop adapters are unavailable on hosted deployments." }, { status: 404 });
  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method))
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  if (request.headers.has('content-encoding')) return Response.json({ error: "Encoded payloads are not accepted." }, { status: 415 });
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 200000))
    return Response.json({ error: "Request is too large." }, { status: 413 });
  const response = await context.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
export const config = {
  path: '/api/*', excludedPath: '/api/apex/stripe-webhook', onError: 'fail',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
