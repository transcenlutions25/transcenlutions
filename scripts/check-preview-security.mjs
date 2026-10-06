/** Bounded checks against this repository's Netlify preview, never production. */
import assert from 'node:assert/strict';
const base = process.env.TAY_PREVIEW_URL || '';
const commit = process.env.TAY_PREVIEW_SHA || '';
assert.match(base, /^https:\/\/deploy-preview-\d+--tay-command\.netlify\.app$/);
assert.match(commit, /^[a-f0-9]{40}$/);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const get = path => fetch(base + path, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
let ready = false;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const response = await get('/api/build-info');
    if (response.ok && (await response.json()).commit === commit) { ready = true; break; }
  } catch { /* Deployment may still be replacing the preview. */ }
  await wait(3000);
}
assert.ok(ready, 'Preview did not serve the expected commit');
async function post(path, body, expected) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, path);
  return response;
}
await post('/api/agent/policy', { agentId: 'tay', action: 'plan' }, 200);
const denied = await post('/api/agent/policy', { agentId: 'tay', action: 'payment', approved: true }, 409);
assert.equal((await denied.json()).policy.allowed, false);
await post('/api/agent/policy', null, 400);
await post('/api/agent/policy', { agentId: 'constructor', action: 'plan' }, 400);
const desktop = await post('/api/desktop/state', {}, 404);
assert.match((await desktop.json()).error, /hosted deployments/, 'Netlify edge guard must be running');
assert.equal((await get('/api/operating-graph/evidence')).status, 401);
assert.equal((await get('/api/platform/identity')).status, 401);
// Only inexpensive build-info reads. Limit scope and request count explicitly.
let limited = false;
for (let batch = 0; batch < 32 && !limited; batch++) {
  const responses = await Promise.all(Array.from({ length: 5 }, () => get('/api/build-info')));
  limited = responses.some(r => r.status === 429);
  for (const response of responses) { await response.arrayBuffer(); assert.ok([200, 429].includes(response.status)); }
}
if (!limited) {
  await wait(12000); // Native counting can lag by up to ten seconds.
  const response = await get('/api/build-info'); limited = response.status === 429;
  await response.arrayBuffer();
}
assert.ok(limited, 'Rate limit did not enforce HTTP 429 on the deployed preview; do not merge');
console.log('Expected preview commit, request/authority boundaries, edge execution and live 429 enforcement verified.');
