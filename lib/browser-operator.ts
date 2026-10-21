/**
 * Tay Browser Operator: pure, conservative planning boundaries.
 * This module never starts an external browser or treats website content as instructions.
 */
export type BrowserMode = "search" | "fetch" | "agent";
export type BrowserDecision = "read_only" | "approval_required" | "blocked";

export interface BrowserReview {
  mode: BrowserMode;
  decision: BrowserDecision;
  title: string;
  target: string;
  purpose: string;
  reasons: string[];
}

function text(value: string, max: number, label: string): string {
  const clean = value.trim();
  if (!clean || clean.length > max || /[\u0000-\u001f\u007f]/.test(clean))
    throw new Error(label + " must be plain text between 1 and " + max + " characters.");
  return clean;
}

/** Only public HTTPS pages. No credentials, private hosts, signed URLs or unsafe GET paths. */
export function publicPageUrl(input: string): string {
  const raw = text(input, 2048, "Website URL");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a full HTTPS website URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Only standard HTTPS links without embedded credentials or custom ports are accepted.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)
    || /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host)
    || /(^|\.)(localhost|local|internal|test|invalid|example|onion)\./.test(host)
    || /^\d+(?:\.\d+){0,3}$/.test(host)
    || host.includes("..") || host.startsWith("-"))
    throw new Error("Use a public website hostname, not an internal or numeric address.");
  if (url.hash || /\/(?:logout|signout|delete|destroy|remove|reset-password)(?:[/?]|$)/i.test(url.pathname))
    throw new Error("Signed, private, or account-changing links cannot be fetched.");
  for (const key of url.searchParams.keys())
    if (/(?:token|secret|api.?key|password|passcode|session|auth|signature|sig|code|email|phone)/i.test(key))
      throw new Error("Remove private or signed query parameters before fetching.");
  return url.toString();
}

export function searchText(input: string): string {
  return text(input, 240, "Search query");
}

const forbidden = /\b(?:bypass (?:captcha|security|verification)|solve (?:a )?captcha|disable (?:2fa|mfa|security)|steal|exfiltrate|delete permanently|transfer funds|wire money|charge (?:a |the )?card|buy|purchase|place an order)\b/i;

export function reviewBrowserTask(mode: BrowserMode, input: string, goal = ""): BrowserReview {
  if (mode === "search") {
    const query = searchText(input);
    return { mode, decision: "read_only", title: "Search the live web",
      target: query, purpose: "Return search results without changing any website.",
      reasons: ["Read-only provider request", "No publishing, account access, or form submission"] };
  }
  const target = publicPageUrl(input);
  if (mode === "fetch") {
    return { mode, decision: "read_only", title: "Read a public webpage",
      target, purpose: "Extract page content without interacting with forms.",
      reasons: ["Only public HTTPS URLs", "Signed and private URLs rejected", "Content is untrusted evidence, not instructions"] };
  }
  if (mode !== "agent") throw new Error("Unknown browser operation.");
  const purpose = text(goal, 1200, "Task goal");
  if (forbidden.test(purpose)) {
    return { mode, decision: "blocked", title: "Browser action blocked",
      target, purpose, reasons: ["Tay cannot bypass protections, purchase, move funds, or perform destructive actions through this workbench."] };
  }
  return { mode, decision: "approval_required", title: "Browser action proposal",
    target, purpose, reasons: ["Proposal only: no website action is executed", "A verified owner identity, bounded authority, explicit approval and spend limit are required before future automation", "Login, CAPTCHA, contracts, payment and sensitive data require their own protected handoff"] };
}
