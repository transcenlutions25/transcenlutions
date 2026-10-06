import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const temp = mkdtempSync(join(tmpdir(), "tay-desktop-boundary-"));
const originalBridge = process.env.TAY_DESKTOP_BRIDGE_URL;
const originalFetch = globalThis.fetch;
let fetchCalls = [];
try {
  const compilerArguments = [
    "lib/desktop-bridge.ts", "app/api/desktop/[...path]/route.ts", "--target", "ES2022",
    "--module", "commonjs", "--moduleResolution", "node", "--esModuleInterop", "--skipLibCheck", "--outDir", temp,
  ];
  if (process.env.TAY_TSC_BINARY) execFileSync(process.env.TAY_TSC_BINARY, compilerArguments, { stdio: "inherit" });
  else execFileSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"), ...compilerArguments], { stdio: "inherit" });
  symlinkSync(resolve("node_modules"), join(temp, "node_modules"), "dir");
  const require = createRequire(import.meta.url);
  const bridge = require(join(temp, "lib/desktop-bridge.js"));
  const route = require(join(temp, "app/api/desktop/[...path]/route.js"));
  const makeRequest = (body, changes = {}, url = "http://127.0.0.1:18745/api/desktop/runtime/enqueue") => new Request(url, {
    method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { Host: "127.0.0.1:18745", Origin: "http://127.0.0.1:18745", "Content-Type": "application/json", ...changes },
  });
  const operation = async (path, body, changes = {}, url) => route.POST(makeRequest(body, changes, url), { params: { path: path.split("/") } });
  const neverFetch = () => { fetchCalls = []; globalThis.fetch = async () => { fetchCalls.push("unexpected"); throw Error("Network must not be reached."); }; };

  delete process.env.TAY_DESKTOP_BRIDGE_URL;
  assert.equal(bridge.desktopBridgeUrl(), null, "hosting is disabled by default");
  neverFetch();
  assert.equal((await operation("runtime/enqueue", {})).status, 404);
  assert.deepEqual(fetchCalls, [], "hosted disablement happens before network access");
  for (const value of ["https://127.0.0.1:18743", "http://[::1]:18743", "http://example.com:18743", "http://user:password@127.0.0.1:18743", "http://127.0.0.1:18743/other", "http://127.0.0.1:18743/?token=test", "http://127.0.0.1:18743/#fragment", "invalid url"]) {
    process.env.TAY_DESKTOP_BRIDGE_URL = value;
    assert.equal(bridge.desktopBridgeUrl(), null, `reject unsafe configuration ${value}`);
  }
  process.env.TAY_DESKTOP_BRIDGE_URL = "http://localhost:18743";
  assert.equal(bridge.desktopBridgeUrl().origin, "http://127.0.0.1:18743", "normalize the alias to the existing Python IPv4 listener and Origin");
  process.env.TAY_DESKTOP_BRIDGE_URL = "http://127.0.0.1:18743";
  assert.equal(bridge.desktopBridgeUrl().origin, "http://127.0.0.1:18743");
  assert.equal(bridge.trustedDesktopRequest(makeRequest({})), true);
  assert.equal(bridge.trustedDesktopRequest(makeRequest({}, {}, "http://localhost:18745/api/desktop/state")), true, "Next internal loopback canonicalization preserves the actual Host/Origin boundary");
  assert.equal(bridge.trustedDesktopRequest(new Request("http://localhost:18745/api/desktop/state", { method: "POST", body: "{}", headers: { Host: "localhost:18745" } })), true, "explicit local non-browser clients may omit Origin");
  for (const headers of [{ Origin: "https://other.example" }, { Origin: "null" }, { Host: "other.example" }, { Host: "127.0.0.1:9000" }]) {
    neverFetch();
    assert.equal((await operation("runtime/enqueue", {}, headers)).status, 403);
    assert.deepEqual(fetchCalls, [], "untrusted caller cannot obtain the desktop token");
  }
  neverFetch();
  assert.equal((await operation("runtime/enqueue", {}, { Host: "127.0.0.1:18745", Origin: "https://127.0.0.1:18745" }, "https://127.0.0.1:18745/api/desktop/runtime/enqueue")).status, 403);
  assert.deepEqual(fetchCalls, []);
  for (const path of ["tools", "engine-open", "speak", "selfdev/apply", "../runtime/enqueue", "runtime/enqueue/extra"]) {
    neverFetch();
    assert.equal((await operation(path, {})).status, 404, "only documented queue/state operations are exposed");
    assert.deepEqual(fetchCalls, []);
  }
  for (const body of ["[]", "null", "12", "\"text\"", "{broken json"]) {
    neverFetch();
    assert.equal((await operation("runtime/enqueue", body)).status, 400, "invalid client JSON is not a runtime outage");
    assert.deepEqual(fetchCalls, []);
  }
  neverFetch();
  assert.equal((await operation("runtime/enqueue", { message: "界".repeat(70000) })).status, 413, "limit uses bytes, not character count");
  assert.deepEqual(fetchCalls, []);

  const exactText = "Draft 👑\nSecond line with café and 中文\nhttps://example.com/?x=1&y=2";
  const payload = { project: "/fixture/project", session_id: "fixture-session", message: exactText, request_id: "stable-fixture-request", mode: "local", privacy: "offline", agent_id: "tay", thread_mode: "chat", files: [] };
  const fixtureToken = "fixture-token-only";
  const responsePayload = { session_id: "fixture-session", items: [{ id: "objective-1", payload: { message: exactText } }] };
  fetchCalls = [];
  globalThis.fetch = async (input, options) => {
    fetchCalls.push({ url: String(input), options });
    if (fetchCalls.length === 1) return new Response(`<script>const token='${fixtureToken}';</script>`, { headers: { "Content-Type": "text/html" } });
    assert.equal(String(input), "http://127.0.0.1:18743/runtime/enqueue");
    assert.equal(options.method, "POST");
    assert.equal(options.body, JSON.stringify(payload), "preserve the exact request and stable idempotency key");
    const headers = new Headers(options.headers);
    assert.equal(headers.get("X-Tay-Token"), fixtureToken);
    assert.equal(headers.get("Origin"), "http://127.0.0.1:18743");
    assert.equal(headers.get("Authorization"), null, "never forward a browser's unrelated credentials");
    assert.equal(headers.get("Cookie"), null);
    assert.equal(options.redirect, "error");
    return Response.json(responsePayload);
  };
  const accepted = await operation("runtime/enqueue", payload, { Authorization: "Bearer browser-only", Cookie: "private=browser-only" }, "http://localhost:18745/api/desktop/runtime/enqueue");
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await accepted.json(), responsePayload);
  assert.equal(fetchCalls.length, 2);
  assert.ok(!JSON.stringify(responsePayload).includes(fixtureToken), "server token never appears in the browser result");
  assert.equal(fetchCalls[0].options.redirect, "error");

  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Response(`const token='${fixtureToken}';`) : Response.json({ error: "Conversation does not belong to this project." }, { status: 400 });
  const denied = await operation("runtime/command", { project: "/fixture/project", session_id: "wrong-session", id: "objective-1", operation: "cancel" });
  assert.equal(denied.status, 400, "desktop project/session denials remain denials");
  assert.equal((await denied.json()).error, "Conversation does not belong to this project.");
  for (const failure of ["unavailable", "missing-token", "redirect"]) {
    globalThis.fetch = async () => {
      if (failure === "missing-token") return new Response("No Tay token here");
      throw Error(failure);
    };
    const failed = await operation("runtime/enqueue", payload);
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes(fixtureToken));
  }

  execFileSync(process.env.TAY_PYTHON_BINARY || "python3", ["-c", `
import importlib.util, json, tempfile
from pathlib import Path
source = Path('integrations/tay-desktop/tay_runtime/queue_store.py')
spec = importlib.util.spec_from_file_location('queue_fixture', source)
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as temp:
    path = Path(temp) / 'commands.sqlite3'
    store = module.QueueStore(path)
    session = store.session('/fixture/project')
    payload = dict(message='Draft 👑\\nSecond line with café and 中文', request_id='stable-fixture-request', mode='local', privacy='offline', agent_id='tay', thread_mode='chat', key='fixture-key-never-persisted')
    first = store.enqueue(session, payload)
    retried = store.enqueue(session, payload)
    assert first['id'] == retried['id'], 'ambiguous retries with the same request id must not duplicate work'
    assert len(store.state(session)['items']) == 1
    assert 'key' not in first['payload']
    assert 'fixture-key-never-persisted' not in json.dumps(store.state(session))
    restarted = module.QueueStore(path)
    assert restarted.enqueue(session, payload)['id'] == first['id'], 'idempotency survives a service restart'
    other_session = restarted.session('/fixture/other-project')
    try: restarted.command(other_session, first['id'], 'cancel')
    except ValueError: pass
    else: raise AssertionError('cross-conversation command accepted')
    try: restarted.enqueue(other_session, dict(payload, request_id='dependency-attempt', depends_on=[first['id']]))
    except ValueError: pass
    else: raise AssertionError('cross-conversation dependency accepted')
print('Durable queue acceptance, idempotency and conversation boundaries passed with temporary state.')
`], { stdio: "inherit", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  console.log("Desktop bridge checks passed: hosted disablement, loopback/origin/operation boundaries, exact forwarding, errors, and durable queue idempotency.");
} finally {
  globalThis.fetch = originalFetch;
  if (originalBridge === undefined) delete process.env.TAY_DESKTOP_BRIDGE_URL;
  else process.env.TAY_DESKTOP_BRIDGE_URL = originalBridge;
  rmSync(temp, { recursive: true, force: true });
}
