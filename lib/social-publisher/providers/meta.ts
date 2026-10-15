import { requiredEnv } from "../config";
import { externalId, postForm, responseJson } from "../http";
import type { SocialPublishCommand, SocialPublishResult } from "../types";

async function waitForInstagramContainer(version: string, containerId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const data = await responseJson(response, "Instagram");
    const status = typeof data.status_code === "string" ? data.status_code : undefined;
    if (status === "FINISHED" || status === "PUBLISHED") return;
    if (status === "ERROR" || status === "EXPIRED") throw new Error("Instagram media processing failed.");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error("Instagram media is still processing; no automatic retry was performed.");
}

async function waitForThreadsContainer(version: string, containerId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(
      `https://graph.threads.net/${encodeURIComponent(version)}/${encodeURIComponent(containerId)}?fields=status,error_message&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const data = await responseJson(response, "Threads");
    const status = typeof data.status === "string" ? data.status : undefined;
    if (status === "FINISHED" || status === "PUBLISHED") return;
    if (status === "ERROR" || status === "EXPIRED") throw new Error("Threads media processing failed.");
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error("Threads media is still processing; no automatic retry was performed.");
}

export async function publishFacebook(command: SocialPublishCommand): Promise<SocialPublishResult> {
  const version = requiredEnv("META_GRAPH_API_VERSION");
  const pageId = requiredEnv("META_PAGE_ID");
  const token = requiredEnv("META_ACCESS_TOKEN");
  const endpoint = command.mediaType === "video" ? "videos" : "photos";
  const mediaField = command.mediaType === "video" ? "file_url" : "url";
  const captionField = command.mediaType === "video" ? "description" : "caption";
  const data = await postForm(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pageId)}/${endpoint}`,
    { [mediaField]: command.mediaUrl, [captionField]: command.caption, access_token: token },
    "Facebook",
  );
  return { network: "facebook", ok: true, status: "accepted", externalId: externalId(data, "id", "post_id") };
}

export async function publishInstagram(command: SocialPublishCommand): Promise<SocialPublishResult> {
  const version = requiredEnv("META_GRAPH_API_VERSION");
  const userId = requiredEnv("META_IG_USER_ID");
  const token = requiredEnv("META_ACCESS_TOKEN");
  const fields: Record<string, string> = { caption: command.caption, access_token: token };
  if (command.mediaType === "video") {
    fields.media_type = "REELS";
    fields.video_url = command.mediaUrl;
    fields.share_to_feed = "true";
  } else {
    fields.image_url = command.mediaUrl;
  }
  const created = await postForm(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(userId)}/media`,
    fields,
    "Instagram",
  );
  const containerId = externalId(created, "id");
  if (!containerId) throw new Error("Instagram did not return a media container id.");
  await waitForInstagramContainer(version, containerId, token);
  const published = await postForm(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(userId)}/media_publish`,
    { creation_id: containerId, access_token: token },
    "Instagram",
  );
  return { network: "instagram", ok: true, status: "published", externalId: externalId(published, "id") };
}

export async function publishThreads(command: SocialPublishCommand): Promise<SocialPublishResult> {
  const version = requiredEnv("THREADS_API_VERSION");
  const userId = requiredEnv("THREADS_USER_ID");
  const token = requiredEnv("THREADS_ACCESS_TOKEN");
  const fields: Record<string, string> = {
    media_type: command.mediaType === "video" ? "VIDEO" : "IMAGE",
    text: command.caption,
    access_token: token,
  };
  if (command.mediaType === "video") fields.video_url = command.mediaUrl;
  else fields.image_url = command.mediaUrl;
  const created = await postForm(
    `https://graph.threads.net/${encodeURIComponent(version)}/${encodeURIComponent(userId)}/threads`,
    fields,
    "Threads",
  );
  const containerId = externalId(created, "id");
  if (!containerId) throw new Error("Threads did not return a media container id.");
  await waitForThreadsContainer(version, containerId, token);
  const published = await postForm(
    `https://graph.threads.net/${encodeURIComponent(version)}/${encodeURIComponent(userId)}/threads_publish`,
    { creation_id: containerId, access_token: token },
    "Threads",
  );
  return { network: "threads", ok: true, status: "published", externalId: externalId(published, "id") };
}
