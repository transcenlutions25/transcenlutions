import { requiredEnv } from "../config";
import { asRecord, externalId, responseJson } from "../http";
import type { SocialPublishCommand, SocialPublishResult, SocialTarget } from "../types";

export async function publishTikTok(
  command: SocialPublishCommand,
  target: SocialTarget,
): Promise<SocialPublishResult> {
  if (command.mediaType !== "video") throw new Error("TikTok native publishing currently supports video only.");
  const token = requiredEnv("TIKTOK_ACCESS_TOKEN");

  const creatorResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
    },
    body: "{}",
  });
  const creator = await responseJson(creatorResponse, "TikTok");
  const creatorData = asRecord(creator.data);
  const privacyOptions = Array.isArray(creatorData.privacy_level_options)
    ? creatorData.privacy_level_options.filter((item): item is string => typeof item === "string")
    : [];
  if (!target.privacy || !privacyOptions.includes(target.privacy)) {
    throw new Error("TikTok privacy selection is not currently allowed for this creator.");
  }

  const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: command.caption,
        privacy_level: target.privacy,
        disable_duet: target.disableDuet ?? false,
        disable_comment: target.disableComment ?? false,
        disable_stitch: target.disableStitch ?? false,
        brand_organic_toggle: target.brandOrganic ?? true,
        is_aigc: command.aiGenerated,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: command.mediaUrl,
      },
    }),
  });
  const initialized = await responseJson(initResponse, "TikTok");
  const data = asRecord(initialized.data);
  const publishId = externalId(data, "publish_id");
  if (!publishId) throw new Error("TikTok did not return a publish id.");
  return { network: "tiktok", ok: true, status: "accepted", externalId: publishId };
}
