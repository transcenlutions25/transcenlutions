/** Web-standard request boundary, usable in Node and edge runtimes. */
export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requestError(error: unknown): Response {
  return Response.json({ ok: false, error: error instanceof RequestError ? error.message : "Invalid request." },
    { status: error instanceof RequestError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
}
export async function readJson(request: Request, max = 16384, expectedOrigin = new URL(request.url).origin): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if ((origin && origin !== expectedOrigin) || request.headers.get("sec-fetch-site") === "cross-site")
    throw new RequestError(403, "Cross-site request rejected.");
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || ""))
    throw new RequestError(415, "Expected application/json.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new RequestError(413, "Request is too large.");
  if (request.headers.has("content-encoding")) throw new RequestError(415, "Encoded request bodies are not accepted.");
  if (!request.body) throw new RequestError(400, "JSON object required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > max) { void reader.cancel(); throw new RequestError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestError(400, "Invalid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError(400, "JSON object required.");
  validateValue(value);
  return value as Record<string, unknown>;
}
function validateValue(value: unknown, depth = 0): void {
  if (depth > 12) throw new RequestError(400, "JSON nesting is too deep.");
  if (typeof value === "string" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
    throw new RequestError(400, "Invalid control characters.");
  if (typeof value === "number" && !Number.isFinite(value)) throw new RequestError(400, "Invalid number.");
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > 256) throw new RequestError(400, "Too many JSON fields.");
    for (const [key, child] of entries) {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new RequestError(400, "Reserved JSON field.");
      validateValue(child, depth + 1);
    }
  }
}
export function onlyFields(body: Record<string, unknown>, fields: readonly string[]): void {
  if (Object.keys(body).some(key => !fields.includes(key))) throw new RequestError(400, "Unknown request field.");
}
