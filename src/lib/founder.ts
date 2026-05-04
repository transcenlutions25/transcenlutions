export type Permission =
  | "owner"
  | "admin"
  | "deploy"
  | "billing"
  | "agents:write"
  | "platform:edit";

export interface FounderProfile {
  id: string;
  name: string;
  handle: string;
  email: string;
  role: string;
  workspace: string;
  region: string;
  joinedAt: string;
  permissions: Permission[];
  status: {
    platform: "operational" | "degraded" | "down";
    deployments: "live" | "queued" | "blocked";
    agents: "ready" | "training";
    lastShipped: string;
  };
}

export const FOUNDER: FounderProfile = {
  id: "founder-001",
  name: "Founder",
  handle: "@founder",
  email: "transcenlutions@gmail.com",
  role: "Owner · CEO · Platform Architect",
  workspace: "Transcenlutions HQ",
  region: "North America",
  joinedAt: "2025-09-01",
  permissions: [
    "owner",
    "admin",
    "deploy",
    "billing",
    "agents:write",
    "platform:edit",
  ],
  status: {
    platform: "operational",
    deployments: "live",
    agents: "ready",
    lastShipped: "Slack invite CTA · header, hero, footer",
  },
};
