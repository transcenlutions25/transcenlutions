import { requiredEnv } from "../config";
import { asRecord, externalId, responseJson } from "../http";
import { loadMedia } from "../media";
import type { SocialPublishCommand, SocialPublishResult, SocialTarget } from "../types";

async function waitForPinterestMedia(mediaId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(`https://api.pinterest.com/v5/media/${encodeURIComponent(mediaId)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await responseJson(response, "Pinterest");
    const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
    if (["succeeded", "success", "ready", "finished"].includes(status)) return;
    if (["failed", "error"].includes(status)) throw new Error("Pinterest media processing failed.");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("Pinterest media is still processing; no automatic retry was performed.");
}

export async function publishPinterest(
  command: SocialPublishCommand,
  target: SocialTarget,
): Promise<SocialPublishResult> {
  const token = requiredEnv("PINTEREST_ACCESS_TOKEN");
  const boardId = target.boardId || process.env.PINTEREST_BOARD_ID?.trim();
  if (!boardId) throw new Error("Pinterest board id is required.");

  let mediaSource: Record<string, unknown>;
  if (command.mediaType === "image") {
    mediaSource = { source_type: "image_url", url: command.mediaUrl };
  } else {
    if (!command.coverImageUrl) throw new Error("Pinterest video publishing requires coverImageUrl.");
    const media = await loadMedia(command.mediaUrl);
    const registeredResponse = await fetch("https://api.pinterest.com/v5/media", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ media_type: "video" }),
    });
    const registered = await responseJson(registeredResponse, "Pinterest");
    const mediaId = externalId(registered, "media_id");
    const uploadUrl = typeof registered.upload_url === "string" ? registered.upload_url : undefined;
    const uploadParameters = asRecord(registered.upload_parameters);
    if (!mediaId || !uploadUrl || Object.keys(uploadParameters).length === 0) {
      throw new Error("Pinterest did not return complete upload instructions.");
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(uploadParameters)) {
      if (typeof value === "string" || typeof value === "number") form.append(key, String(value));
    }
    form.append("file", new Blob([media.buffer], { type: media.contentType }), "video.mp4");
    const upload = await fetch(uploadUrl, { method: "POST", body: form });
    if (!upload.ok) throw new Error(`Pinterest media upload failed with HTTP ${upload.status}.`);
    await waitForPinterestMedia(mediaId, token);
    mediaSource = { source_type: "video_id", media_id: mediaId, cover_image_url: command.coverImageUrl };
  }

  const pinResponse = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      board_id: boardId,
      title: command.title || command.caption.slice(0, 100),
      description: command.caption,
      link: command.linkUrl,
      media_source: mediaSource,
    }),
  });
  const pin = await responseJson(pinResponse, "Pinterest");
  return { network: "pinterest", ok: true, status: "published", externalId: externalId(pin, "id") };
}
