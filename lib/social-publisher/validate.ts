import { RequestError } from "../request-security";
import {
  SOCIAL_NETWORKS,
  type SocialMediaType,
  type SocialNetwork,
  type SocialPublishCommand,
  type SocialPublishMode,
  type SocialTarget,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  if (Object.keys(record).some(key => !allowed.includes(key))) {
    throw new RequestError(400, `Unknown ${label} field.`);
  }
}

function cleanString(value: unknown, field: string, max: number, required = true): string | undefined {
  if (value == null && !required) return undefined;
  if (typeof value !== "string") throw new RequestError(400, `${field} must be a string.`);
  const cleaned = value.trim();
  if (!cleaned && required) throw new RequestError(400, `${field} is required.`);
  if (!cleaned) return undefined;
  if (cleaned.length > max) throw new RequestError(400, `${field} is too long.`);
  return cleaned;
}

function cleanBoolean(value: unknown, field: string, fallback = false): boolean {
  if (value == null) return fallback;
  if (typeof value !== "boolean") throw new RequestError(400, `${field} must be boolean.`);
  return value;
}

function requireHttpsUrl(value: unknown, field: string, required = true): string | undefined {
  const raw = cleanString(value, field, 2048, required);
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RequestError(400, `${field} must be a valid URL.`);
  }
  if (url.protocol !== "https:") throw new RequestError(400, `${field} must use https.`);
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new RequestError(400, `${field} must be publicly reachable.`);
  }
  return url.toString();
}

function parseTarget(value: unknown): SocialTarget {
  if (!isRecord(value)) throw new RequestError(400, "Each target must be an object.");
  onlyKeys(
    value,
    ["network", "privacy", "boardId", "disableComment", "disableDuet", "disableStitch", "brandOrganic"],
    "target",
  );
  const network = cleanString(value.network, "target.network", 32) as SocialNetwork;
  if (!SOCIAL_NETWORKS.includes(network)) throw new RequestError(400, "Unsupported social network.");
  return {
    network,
    privacy: cleanString(value.privacy, "target.privacy", 64, false),
    boardId: cleanString(value.boardId, "target.boardId", 160, false),
    disableComment: value.disableComment == null ? undefined : cleanBoolean(value.disableComment, "target.disableComment"),
    disableDuet: value.disableDuet == null ? undefined : cleanBoolean(value.disableDuet, "target.disableDuet"),
    disableStitch: value.disableStitch == null ? undefined : cleanBoolean(value.disableStitch, "target.disableStitch"),
    brandOrganic: value.brandOrganic == null ? undefined : cleanBoolean(value.brandOrganic, "target.brandOrganic"),
  };
}

export function parseSocialPublishCommand(body: Record<string, unknown>): SocialPublishCommand {
  onlyKeys(
    body,
    [
      "mode",
      "approved",
      "requestId",
      "campaignId",
      "productId",
      "mediaUrl",
      "mediaType",
      "caption",
      "title",
      "linkUrl",
      "coverImageUrl",
      "aiGenerated",
      "targets",
    ],
    "request",
  );

  const mode = cleanString(body.mode, "mode", 16) as SocialPublishMode;
  if (mode !== "validate" && mode !== "publish") throw new RequestError(400, "mode must be validate or publish.");
  const mediaType = cleanString(body.mediaType, "mediaType", 16) as SocialMediaType;
  if (mediaType !== "video" && mediaType !== "image") throw new RequestError(400, "mediaType must be video or image.");
  if (!Array.isArray(body.targets) || body.targets.length < 1 || body.targets.length > SOCIAL_NETWORKS.length) {
    throw new RequestError(400, "targets must contain 1 to 7 networks.");
  }
  const targets = body.targets.map(parseTarget);
  if (new Set(targets.map(target => target.network)).size !== targets.length) {
    throw new RequestError(400, "Each social network may appear only once.");
  }

  const command: SocialPublishCommand = {
    mode,
    approved: cleanBoolean(body.approved, "approved"),
    requestId: cleanString(body.requestId, "requestId", 128)!,
    campaignId: cleanString(body.campaignId, "campaignId", 128)!,
    productId: cleanString(body.productId, "productId", 128)!,
    mediaUrl: requireHttpsUrl(body.mediaUrl, "mediaUrl")!,
    mediaType,
    caption: cleanString(body.caption, "caption", 2200)!,
    title: cleanString(body.title, "title", 160, false),
    linkUrl: requireHttpsUrl(body.linkUrl, "linkUrl", false),
    coverImageUrl: requireHttpsUrl(body.coverImageUrl, "coverImageUrl", false),
    aiGenerated: cleanBoolean(body.aiGenerated, "aiGenerated"),
    targets,
  };

  if (mode === "publish" && !command.approved) {
    throw new RequestError(403, "Explicit owner approval is required before publishing.");
  }
  if (targets.some(target => target.network === "youtube") && !command.title) {
    throw new RequestError(400, "title is required for YouTube.");
  }
  if (targets.some(target => target.network === "tiktok")) {
    if (mediaType !== "video") throw new RequestError(400, "TikTok native publishing currently supports video only.");
    const target = targets.find(item => item.network === "tiktok")!;
    if (!target.privacy) throw new RequestError(400, "TikTok privacy must be selected explicitly.");
  }
  return command;
}
