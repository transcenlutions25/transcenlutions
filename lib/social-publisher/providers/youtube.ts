import { requiredEnv } from "../config";
import { externalId, responseJson } from "../http";
import { loadMedia } from "../media";
import type { SocialPublishCommand, SocialPublishResult, SocialTarget } from "../types";

export async function publishYouTube(
  command: SocialPublishCommand,
  target: SocialTarget,
): Promise<SocialPublishResult> {
  if (command.mediaType !== "video") throw new Error("YouTube native publishing currently supports video only.");
  const token = requiredEnv("YOUTUBE_ACCESS_TOKEN");
  const privacy = target.privacy;
  if (!privacy || !["public", "private", "unlisted"].includes(privacy)) {
    throw new Error("YouTube privacy must be public, private, or unlisted.");
  }

  const media = await loadMedia(command.mediaUrl);
  const metadata = {
    snippet: {
      title: command.title,
      description: command.caption,
      categoryId: process.env.YOUTUBE_CATEGORY_ID?.trim() || "22",
    },
    status: { privacyStatus: privacy },
  };

  const initiate = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-length": String(media.buffer.byteLength),
        "x-upload-content-type": media.contentType,
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!initiate.ok) await responseJson(initiate, "YouTube");
  const uploadUrl = initiate.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL.");

  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": media.contentType,
      "content-length": String(media.buffer.byteLength),
    },
    body: media.buffer,
  });
  const result = await responseJson(uploaded, "YouTube");
  const videoId = externalId(result, "id");
  return {
    network: "youtube",
    ok: true,
    status: "published",
    externalId: videoId,
    url: videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : undefined,
  };
}
