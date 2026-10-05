/** Server-only, explicitly configured loopback adapter. Hosted builds fail closed. */
export function desktopBridgeUrl(): URL | null {
  const value = process.env.TAY_DESKTOP_BRIDGE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    url.hostname = "127.0.0.1";
    return url;
  } catch { return null; }
}

export function trustedDesktopRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    if (!host) return false;
    const owner = new URL(`http://${host}`);
    const origin = request.headers.get("origin");
    // Next can canonicalize the internal URL to localhost. Validate the actual
    // loopback Host and its port; bind browser Origin to that exact host.
    return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)
      && ["127.0.0.1", "localhost"].includes(owner.hostname) && owner.host === host
      && url.port === owner.port && (!origin || origin === owner.origin);
  } catch { return false; }
}
