const DEFAULT_MEDIA_LIMIT = 50 * 1024 * 1024;

function allowedMediaHosts(): Set<string> {
  return new Set(
    (process.env.SOCIAL_MEDIA_ALLOWED_HOSTS ?? "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function loadMedia(urlValue: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const url = new URL(urlValue);
  const allowed = allowedMediaHosts();
  if (allowed.size === 0 || !allowed.has(url.hostname.toLowerCase())) {
    throw new Error("Server-side media download host is not allowlisted in SOCIAL_MEDIA_ALLOWED_HOSTS.");
  }
  const response = await fetch(url, { redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error(`Media download failed with HTTP ${response.status}.`);

  const configuredLimit = Number(process.env.SOCIAL_MEDIA_MAX_BYTES ?? DEFAULT_MEDIA_LIMIT);
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : DEFAULT_MEDIA_LIMIT;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > limit) throw new Error("Media exceeds the configured publishing size limit.");

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > limit) throw new Error("Media exceeds the configured publishing size limit.");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  return { bytes: new Uint8Array(buffer), contentType };
}
