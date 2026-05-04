export type AgentStatus = "live" | "starter-v0" | "training" | "queued";
export type MoneyTrack = "platform" | "make" | "grow" | "protect" | "operate";

export interface Agent {
  id: string;
  name: string;
  role: string;
  tagline: string;
  tracks: MoneyTrack[];
  status: AgentStatus;
  accent: "gold" | "green" | "blue" | "violet";
  capabilities: string[];
  sampleCommands: string[];
  buildNext: string[];
  /**
   * Honest disclosure shown in the UI so we don't overpromise.
   */
  disclosure: string;
}

export const AGENTS: Agent[] = [
  {
    id: "tay",
    name: "Tay",
    role: "Founder AI · Platform operator",
    tagline:
      "Runs the platform with you. Plans, drafts, ships, and routes work to the right agent.",
    tracks: ["platform"],
    status: "live",
    accent: "gold",
    capabilities: [
      "Founder command surface",
      "Money OS routing (Make · Protect · Grow)",
      "Deterministic insight briefs from sample metrics",
      "Drafts upgrade plans, copy edits, and connector specs",
      "Hands-off ship checklist for new releases",
    ],
    sampleCommands: [
      "Upgrade the hero to feel like the live site",
      "Draft a launch checklist for the Stripe connector",
      "Summarize the platform status for today",
      "Route this revenue question to Rory",
    ],
    buildNext: [
      "Wire to a real LLM with prompt cache",
      "Tool-use bridge into the founder dashboard controls",
      "Persisted memory across founder sessions",
    ],
    disclosure:
      "Tay is the existing platform copilot. Today it answers with deterministic, rule-based logic — LLM reasoning ships behind the same surface.",
  },
  {
    id: "rory",
    name: "Rory",
    role: "Revenue & growth agent",
    tagline:
      "Make money. Offers, funnels, content monetization, and the sales pipeline.",
    tracks: ["make", "grow"],
    status: "starter-v0",
    accent: "green",
    capabilities: [
      "Offer & hook generation",
      "Funnel blueprint (lead magnet → nurture → offer → follow-up)",
      "Content monetization plays (X, LinkedIn, IG, TikTok)",
      "Lead pipeline triage and next-best-action",
      "ROAS / channel scale signal",
    ],
    sampleCommands: [
      "Spin my offer into 4 platform-native posts",
      "Where is my pipeline leaking?",
      "Push 20% more budget to the top channel",
      "Draft a 7-day revenue sprint",
    ],
    buildNext: [
      "Live connector pulls from Meta, Google, TikTok",
      "Auto-pause underperformers with founder approval",
      "Offer A/B writer with deterministic scoring",
    ],
    disclosure:
      "Rory is a starter v0 agent. The persona, capability surface, and routing are live; deep autonomous execution is still scoped on the roadmap.",
  },
  {
    id: "dawn",
    name: "Dawn",
    role: "Operations & protection agent",
    tagline:
      "Protect money. Risk checks, compliance reminders, spend leaks, and the morning brief.",
    tracks: ["protect", "operate"],
    status: "starter-v0",
    accent: "blue",
    capabilities: [
      "Money protection audit (duplicate SaaS, idle ads, tax surface)",
      "Runway watch and cash exposure",
      "Refund / chargeback drift alerts",
      "Business setup checklist (LLC, EIN, banking, contracts)",
      "Daily morning brief — what's working, what to fix",
    ],
    sampleCommands: [
      "Run the morning brief",
      "Audit my last 30 days of spend",
      "What's my compliance checklist this month?",
      "Flag any anomalies in refunds or churn",
    ],
    buildNext: [
      "Stripe + bank feed normalization",
      "Calendar-aware compliance reminders",
      "Anomaly detection on the unified KPI feed",
    ],
    disclosure:
      "Dawn is a starter v0 agent. The persona and audit surfaces are scaffolded; live data integrations land with the connectors track.",
  },
];

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export const AGENT_HONEST_NOTE =
  "Tay is the existing operator copilot. Rory and Dawn are now starter v0 agents on the platform — the personas, capability surfaces, and command routing are live, but deep autonomous execution lands as the connectors and tool-use layer ship.";
