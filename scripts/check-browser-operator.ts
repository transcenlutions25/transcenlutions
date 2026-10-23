import assert from "node:assert/strict";
import { publicPageUrl, reviewBrowserTask, searchText } from "../lib/browser-operator";

assert.equal(searchText("  South Carolina LLC  "), "South Carolina LLC");
assert.equal(publicPageUrl("https://www.dnb.com/path"), "https://www.dnb.com/path");
for (const url of [
  "http://example.com", "https://localhost/", "https://127.0.0.1/",
  "https://169.254.169.254/", "https://server.internal/", "https://example.com:8443/",
  "https://user:pass@example.com", "https://example.com/?token=private",
  "https://example.com/logout", "https://example.com/#private"
]) assert.throws(() => publicPageUrl(url), undefined, url);
assert.throws(() => searchText("  "));
assert.throws(() => searchText("A".repeat(241)));
assert.equal(reviewBrowserTask("search", "pricing").decision, "read_only");
assert.equal(reviewBrowserTask("fetch", "https://www.dnb.com/").decision, "read_only");
assert.equal(reviewBrowserTask("agent", "https://www.dnb.com/", "Submit form").decision, "approval_required");
assert.equal(reviewBrowserTask("agent", "https://www.dnb.com/", "bypass captcha").decision, "blocked");
assert.equal(reviewBrowserTask("agent", "https://www.dnb.com/", "transfer funds").decision, "blocked");
assert.throws(() => reviewBrowserTask("agent", "https://www.dnb.com/", ""));
console.log("Tay browser operator boundaries passed.");
