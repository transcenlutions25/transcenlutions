import { strict as assert } from "node:assert";
import { getSocialPublisherStatus } from "../lib/social-publisher/config";
import { parseSocialPublishCommand } from "../lib/social-publisher/validate";

function base() {
  return {
    mode: "validate",
    approved: false,
    requestId: "req-1",
    campaignId: "campaign-1",
    productId: "product-1",
    mediaUrl: "https://media.example.com/video.mp4",
    mediaType: "video",
    caption: "Useful product video",
    title: "Useful product video",
    linkUrl: "https://example.com/funnel",
    coverImageUrl: "https://media.example.com/cover.jpg",
    aiGenerated: true,
    targets: [{ network: "youtube", privacy: "private" }],
  };
}

const parsed = parseSocialPublishCommand(base());
assert.equal(parsed.targets[0].network, "youtube");
assert.equal(parsed.mode, "validate");

assert.throws(
  () => parseSocialPublishCommand({ ...base(), mode: "publish", approved: false }),
  /Explicit owner approval/,
);
assert.throws(
  () => parseSocialPublishCommand({ ...base(), targets: [{ network: "tiktok" }] }),
  /TikTok privacy/,
);
assert.throws(
  () => parseSocialPublishCommand({ ...base(), mediaUrl: "http://localhost/video.mp4" }),
  /https/,
);
assert.throws(
  () => parseSocialPublishCommand({ ...base(), targets: [{ network: "youtube" }, { network: "youtube" }] }),
  /only once/,
);

const oldLive = process.env.TAY_SOCIAL_PUBLISH_LIVE_ENABLED;
process.env.TAY_SOCIAL_PUBLISH_LIVE_ENABLED = "false";
assert.equal(getSocialPublisherStatus().liveEnabled, false);
if (oldLive == null) delete process.env.TAY_SOCIAL_PUBLISH_LIVE_ENABLED;
else process.env.TAY_SOCIAL_PUBLISH_LIVE_ENABLED = oldLive;

console.log("social publisher contract checks passed");
