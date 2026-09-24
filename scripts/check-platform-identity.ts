import { resolvePlatformIdentity, type PlatformIdentity } from "../lib/platform-identity";

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/platform/identity", { headers });
}
const previousNodeEnv = process.env.NODE_ENV;
const previousAllow = process.env.TAY_ALLOW_DEV_IDENTITY;
function setNodeEnv(value: string) {
  process.env.NODE_ENV = value;
}
function restore() {
  setNodeEnv(previousNodeEnv ?? "test");
  if (previousAllow === undefined) delete process.env.TAY_ALLOW_DEV_IDENTITY;
  else process.env.TAY_ALLOW_DEV_IDENTITY = previousAllow;
}
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
try {
  setNodeEnv("production");
  process.env.TAY_ALLOW_DEV_IDENTITY = "true";
  let result = resolvePlatformIdentity(request({
    "x-tay-dev-user": "user-1", "x-tay-dev-tenant": "tenant-1",
    "x-tay-dev-session": "session-1", "x-tay-dev-role": "owner",
  }));
  assert(!result.ok && result.identity === null, "production must fail closed");
  setNodeEnv("test");
  delete process.env.TAY_ALLOW_DEV_IDENTITY;
  result = resolvePlatformIdentity(request());
  assert(!result.ok, "dev identity must be opt-in");
  process.env.TAY_ALLOW_DEV_IDENTITY = "true";
  result = resolvePlatformIdentity(request({
    "x-tay-dev-user": "user-1", "x-tay-dev-tenant": "tenant-1",
    "x-tay-dev-session": "session-1", "x-tay-dev-role": "owner",
  }));
  assert(result.ok, "complete development identity should resolve");
  const identity = result.identity as PlatformIdentity;
  assert(identity.userId === "user-1" && identity.tenantId === "tenant-1", "identity fields should be preserved");
  result = resolvePlatformIdentity(request({
    "x-tay-dev-user": "user-1", "x-tay-dev-tenant": "tenant-1",
    "x-tay-dev-session": "session-1", "x-tay-dev-role": "superuser",
  }));
  assert(!result.ok, "unknown roles must be denied");
  console.log("platform identity contract checks passed");
} finally { restore(); }
