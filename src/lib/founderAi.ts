import type { Agent } from "./agents";
import { AGENTS } from "./agents";

export type FounderIntent =
  | "upgrade-ui"
  | "update-copy"
  | "fix-issue"
  | "ship-connector"
  | "review-agents"
  | "deploy-check"
  | "status"
  | "route-rory"
  | "route-dawn"
  | "plan"
  | "general";

export interface FounderReply {
  intent: FounderIntent;
  routeTo: Agent["id"] | "tay";
  status: "drafting" | "queued" | "ready-for-review" | "answered";
  text: string;
  steps?: string[];
}

const RORY = AGENTS.find((a) => a.id === "rory")!;
const DAWN = AGENTS.find((a) => a.id === "dawn")!;

export function classifyIntent(prompt: string): FounderIntent {
  const q = prompt.trim().toLowerCase();
  if (!q) return "general";
  if (/(upgrade|redesign|polish|prettier|nicer|better)\s.*(ui|design|look|hero|landing|theme)/.test(q))
    return "upgrade-ui";
  if (/(upgrade|redesign|polish).*ui|ui.*upgrade/.test(q)) return "upgrade-ui";
  if (/(update|edit|tighten|rewrite).*(copy|wording|headline|tagline)/.test(q))
    return "update-copy";
  if (/(fix|bug|broken|issue|error|regression)/.test(q)) return "fix-issue";
  if (/(ship|build|wire|launch).*(connector|integration|stripe|shopify|meta|google|tiktok|hubspot|ga4)/.test(q))
    return "ship-connector";
  if (/(review|audit|check).*(agent|tay|rory|dawn)/.test(q)) return "review-agents";
  if (/(deploy|release|push|preview).*(check|status|gate|gating|build)/.test(q))
    return "deploy-check";
  if (/(status|health|uptime|how.*platform)/.test(q)) return "status";
  if (/(rory|revenue|offer|funnel|pipeline|content|monet)/.test(q)) return "route-rory";
  if (/(dawn|protect|risk|compliance|audit|spend leak|morning brief|runway)/.test(q))
    return "route-dawn";
  if (/(plan|roadmap|next|sprint|priorit)/.test(q)) return "plan";
  return "general";
}

export function founderReply(prompt: string): FounderReply {
  const intent = classifyIntent(prompt);
  switch (intent) {
    case "upgrade-ui":
      return {
        intent,
        routeTo: "tay",
        status: "drafting",
        text: "Drafting a UI upgrade. Targeting the live transcenlutions.com aesthetic — dark cosmic gradient, gold accent, geometric subtle backdrop, and a centered command surface. I'll preserve Money OS, Creator Hub, Workspace, Connectors, Insights, Pricing, and Roadmap.",
        steps: [
          "Tighten hero to a Tay-style command panel with prompt chips",
          "Promote Founder Console above secondary sections",
          "Layer geometric line-art behind the hero",
          "Audit accessibility and responsive breakpoints before review",
        ],
      };
    case "update-copy":
      return {
        intent,
        routeTo: "tay",
        status: "ready-for-review",
        text: "Copy edit drafted. I'll keep the Make / Protect / Grow framing and tighten the hero to one promise per line. Proposed change is ready for your review in the founder dashboard.",
        steps: [
          "Hero: keep \"Make money. Protect money. Grow money.\"",
          "Subhead: lead with what you can do in the next 60 seconds",
          "CTAs: Open the workspace · Talk to Tay · Join Slack",
        ],
      };
    case "fix-issue":
      return {
        intent,
        routeTo: "tay",
        status: "queued",
        text: "Issue logged in the fix queue. I'll triage by impact — anything blocking the founder dashboard or Tay surface jumps to the top. Send the symptom and the page; I'll reproduce, draft a fix, and post a diff for review.",
        steps: [
          "Reproduce on the affected route",
          "Draft a minimal diff",
          "Run lint + typecheck + build",
          "Post for founder review before merge",
        ],
      };
    case "ship-connector":
      return {
        intent,
        routeTo: "rory",
        status: "drafting",
        text: "Routing to Rory for revenue impact and to Tay for delivery. The connectors lane today: Google Ads, Meta Ads, Shopify, Stripe in flight; GA4, HubSpot, TikTok Ads, Slack Alerts queued. Tell me which one and I'll spin up the spec.",
        steps: [
          "OAuth + scope plan",
          "Normalized KPI mapping (spend, revenue, refunds, LTV)",
          "Wire into the unified feed",
          "Surface in Insights and the Founder Dashboard",
        ],
      };
    case "review-agents":
      return {
        intent,
        routeTo: "tay",
        status: "answered",
        text: `Agents online: ${AGENTS.map((a) => `${a.name} (${a.status})`).join(", ")}. Tay is the live founder operator. Rory and Dawn are starter v0 — personas and routing are wired; deep autonomous execution lands with the connectors and tool-use layer.`,
        steps: AGENTS.map((a) => `${a.name} — ${a.role}`),
      };
    case "deploy-check":
      return {
        intent,
        routeTo: "tay",
        status: "answered",
        text: "Deploy check: lint + typecheck + build run on every push to main. The site is the source of truth — preview the change locally, then push. I'll keep an eye on the build and surface failures here.",
        steps: [
          "npm run lint",
          "npm run typecheck",
          "npm run build",
          "Push to main",
        ],
      };
    case "status":
      return {
        intent,
        routeTo: "tay",
        status: "answered",
        text: "Platform: operational. Deployments: live. Agents: ready (Tay live, Rory + Dawn starter v0). Last shipped: Slack invite CTA across header, hero, and footer.",
      };
    case "route-rory":
      return {
        intent,
        routeTo: "rory",
        status: "answered",
        text: `Routed to Rory. ${RORY.tagline} I can pull a 7-day revenue sprint, audit the pipeline, or spin one offer into 4 platform-native posts. Pick one and I'll draft.`,
        steps: RORY.sampleCommands,
      };
    case "route-dawn":
      return {
        intent,
        routeTo: "dawn",
        status: "answered",
        text: `Routed to Dawn. ${DAWN.tagline} I can run the morning brief, audit the last 30 days of spend, or surface anomalies in refunds and churn. Pick one and I'll draft.`,
        steps: DAWN.sampleCommands,
      };
    case "plan":
      return {
        intent,
        routeTo: "tay",
        status: "drafting",
        text: "Drafting a one-week founder plan. The shape: 1 revenue move with Rory, 1 protection move with Dawn, 1 platform upgrade with Tay. I'll keep it to three deliberate moves so we ship instead of sprawl.",
        steps: [
          "Mon — Rory: ship the next offer page",
          "Wed — Dawn: morning brief + spend audit",
          "Fri — Tay: ship the next platform upgrade",
        ],
      };
    default:
      return {
        intent,
        routeTo: "tay",
        status: "answered",
        text: "Tell me whether you want to upgrade the UI, update copy, fix an issue, ship a connector, review agents, or run a deploy check — and I'll route it to Tay, Rory, or Dawn with a concrete next step.",
      };
  }
}
