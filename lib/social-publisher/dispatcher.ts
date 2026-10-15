import { RequestError } from "../request-security";
import { getSocialPublisherStatus, missingEnvironment } from "./config";
import { publishFacebook, publishInstagram, publishThreads } from "./providers/meta";
import { publishLinkedIn } from "./providers/linkedin";
import { publishPinterest } from "./providers/pinterest";
import { publishTikTok } from "./providers/tiktok";
import { publishYouTube } from "./providers/youtube";
import type { SocialPublishCommand, SocialPublishResult, SocialTarget } from "./types";

async function publishOne(command: SocialPublishCommand, target: SocialTarget): Promise<SocialPublishResult> {
  switch (target.network) {
    case "facebook": return publishFacebook(command);
    case "instagram": return publishInstagram(command);
    case "threads": return publishThreads(command);
    case "tiktok": return publishTikTok(command, target);
    case "youtube": return publishYouTube(command, target);
    case "pinterest": return publishPinterest(command, target);
    case "linkedin": return publishLinkedIn(command);
  }
}

export async function dispatchSocialPublish(command: SocialPublishCommand): Promise<SocialPublishResult[]> {
  if (command.mode === "validate") {
    return command.targets.map(target => {
      const missing = missingEnvironment(target.network);
      return missing.length === 0
        ? { network: target.network, ok: true, status: "validated" as const }
        : { network: target.network, ok: false, status: "failed" as const, error: `Missing server configuration: ${missing.join(", ")}` };
    });
  }
  if (command.targets.length !== 1) {
    throw new RequestError(400, "Live publishing accepts one explicitly approved network per request.");
  }
  if (!getSocialPublisherStatus().liveEnabled) {
    throw new RequestError(503, "Native social publishing is installed but live execution is disabled.");
  }
  const target = command.targets[0];
  const missing = missingEnvironment(target.network);
  if (missing.length > 0) throw new RequestError(503, `Missing server configuration: ${missing.join(", ")}`);
  try {
    return [await publishOne(command, target)];
  } catch (error) {
    return [{
      network: target.network,
      ok: false,
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 800) : "Publishing failed.",
    }];
  }
}
