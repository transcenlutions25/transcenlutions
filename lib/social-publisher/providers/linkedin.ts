import { requiredEnv } from "../config";
import { responseJson } from "../http";
import type { SocialPublishCommand, SocialPublishResult } from "../types";
import { linkedInHeaders, uploadLinkedInVideo } from "./linkedin-upload";

export async function publishLinkedIn(command: SocialPublishCommand): Promise<SocialPublishResult> {
  if (command.mediaType !== "video") throw new Error("LinkedIn native publishing currently supports video only.");
  const token = requiredEnv("LINKEDIN_ACCESS_TOKEN");
  const owner = requiredEnv("LINKEDIN_OWNER_URN");
  const version = requiredEnv("LINKEDIN_VERSION");
  const videoUrn = await uploadLinkedInVideo(command.mediaUrl, owner, token, version);

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: linkedInHeaders(token, version),
    body: JSON.stringify({
      author: owner,
      commentary: command.caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: { media: { id: videoUrn } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!response.ok) await responseJson(response, "LinkedIn");
  return {
    network: "linkedin",
    ok: true,
    status: "published",
    externalId: response.headers.get("x-restli-id") || videoUrn,
  };
}
