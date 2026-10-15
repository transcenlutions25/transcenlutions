import { asRecord, responseJson } from "../http";
import { loadMedia } from "../media";

const CHUNK_SIZE = 4_194_303;

export function linkedInHeaders(token: string, version: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "linkedin-version": version,
    "x-restli-protocol-version": "2.0.0",
  };
}

export async function uploadLinkedInVideo(
  mediaUrl: string,
  owner: string,
  token: string,
  version: string,
): Promise<string> {
  const media = await loadMedia(mediaUrl);
  const init = await fetch("https://api.linkedin.com/rest/videos?action=initializeUpload", {
    method: "POST",
    headers: linkedInHeaders(token, version),
    body: JSON.stringify({ initializeUploadRequest: { owner, fileSizeBytes: media.buffer.byteLength } }),
  });
  const value = asRecord((await responseJson(init, "LinkedIn")).value);
  const video = typeof value.video === "string" ? value.video : "";
  const uploadToken = typeof value.uploadToken === "string" ? value.uploadToken : "";
  const instructions = Array.isArray(value.uploadInstructions)
    ? value.uploadInstructions.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    : [];
  if (!video || instructions.length === 0) throw new Error("LinkedIn did not return upload instructions.");

  const uploadedPartIds: string[] = [];
  for (let index = 0; index < instructions.length; index += 1) {
    const item = instructions[index];
    const uploadUrl = typeof item.uploadUrl === "string" ? item.uploadUrl : "";
    const first = typeof item.firstByte === "number" ? item.firstByte : index * CHUNK_SIZE;
    const last = typeof item.lastByte === "number" ? item.lastByte : Math.min(media.buffer.byteLength - 1, first + CHUNK_SIZE - 1);
    if (!uploadUrl || first < 0 || last < first || last >= media.buffer.byteLength) throw new Error("LinkedIn returned invalid upload instructions.");
    const part = media.buffer.slice(first, last + 1);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: part,
      headers: { "content-type": "application/octet-stream" },
    });
    if (!response.ok) throw new Error(`LinkedIn media upload failed with HTTP ${response.status}.`);
    const etag = response.headers.get("etag")?.replace(/^"|"$/g, "");
    if (!etag) throw new Error("LinkedIn media upload did not return an ETag.");
    uploadedPartIds.push(etag);
  }

  const finalize = await fetch("https://api.linkedin.com/rest/videos?action=finalizeUpload", {
    method: "POST",
    headers: linkedInHeaders(token, version),
    body: JSON.stringify({ finalizeUploadRequest: { video, uploadToken, uploadedPartIds } }),
  });
  await responseJson(finalize, "LinkedIn");
  return video;
}
