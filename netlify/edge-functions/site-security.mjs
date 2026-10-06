/** Includes static pages and direct framework function URLs. */
export default async function siteSecurity(_request, context) { return context.next(); }
export const config = {
  path: '/*', excludedPath: '/api/*', onError: 'fail',
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
