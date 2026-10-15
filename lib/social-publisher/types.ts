export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
  "pinterest",
  "linkedin",
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type SocialMediaType = "video" | "image";
export type SocialPublishMode = "validate" | "publish";

export interface SocialTarget {
  network: SocialNetwork;
  privacy?: string;
  boardId?: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandOrganic?: boolean;
}

export interface SocialPublishCommand {
  mode: SocialPublishMode;
  approved: boolean;
  requestId: string;
  campaignId: string;
  productId: string;
  mediaUrl: string;
  mediaType: SocialMediaType;
  caption: string;
  title?: string;
  linkUrl?: string;
  coverImageUrl?: string;
  aiGenerated: boolean;
  targets: SocialTarget[];
}

export interface SocialPublishResult {
  network: SocialNetwork;
  ok: boolean;
  status: "validated" | "accepted" | "published" | "failed";
  externalId?: string;
  url?: string;
  error?: string;
}

export interface SocialPublisherStatus {
  liveEnabled: boolean;
  configured: Record<SocialNetwork, boolean>;
  missing: Record<SocialNetwork, string[]>;
}
