import { SOCIAL_NETWORKS, type SocialNetwork, type SocialPublisherStatus } from "./types";

const ENV_REQUIREMENTS: Record<SocialNetwork, string[]> = {
  facebook: ["META_GRAPH_API_VERSION", "META_PAGE_ID", "META_ACCESS_TOKEN"],
  instagram: ["META_GRAPH_API_VERSION", "META_IG_USER_ID", "META_ACCESS_TOKEN"],
  threads: ["THREADS_API_VERSION", "THREADS_USER_ID", "THREADS_ACCESS_TOKEN"],
  tiktok: ["TIKTOK_ACCESS_TOKEN"],
  youtube: ["YOUTUBE_ACCESS_TOKEN"],
  pinterest: ["PINTEREST_ACCESS_TOKEN"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_OWNER_URN", "LINKEDIN_VERSION"],
};

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function missingEnvironment(network: SocialNetwork): string[] {
  return ENV_REQUIREMENTS[network].filter(name => !process.env[name]?.trim());
}

export function getSocialPublisherStatus(): SocialPublisherStatus {
  const configured = {} as Record<SocialNetwork, boolean>;
  const missing = {} as Record<SocialNetwork, string[]>;
  for (const network of SOCIAL_NETWORKS) {
    missing[network] = missingEnvironment(network);
    configured[network] = missing[network].length === 0;
  }
  return {
    liveEnabled: process.env.TAY_SOCIAL_PUBLISH_LIVE_ENABLED === "true",
    configured,
    missing,
  };
}
