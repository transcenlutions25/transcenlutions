/**
 * Action-based execution progress, ported from the React Native TayWorks engine.
 * Progress reflects completed actions, not elapsed time.
 */

export interface Milestones {
  postCreated?: boolean;
  leadAdded?: boolean;
  conversationLogged?: boolean;
  dealClosed?: boolean;
  totalPosts?: number;
  totalLeads?: number;
  totalConversations?: number;
  totalDeals?: number;
}

export interface NextAction {
  key:
    | "post_created"
    | "lead_added"
    | "conversation_logged"
    | "deal_closed";
  label: string;
  shortLabel: string;
  description: string;
}

const PATH_LABELS: Record<string, string> = {
  service_arbitrage: "Service Arbitrage Launch",
  lead_generation: "Lead Generation Pipeline",
  outbound_campaign: "Outbound Campaign System",
  affiliate: "Affiliate Revenue Engine",
  micro_saas: "Micro SaaS Builder",
  content_marketing: "Content Pipeline Engine",
  money_protection: "Money Protection Audit",
};

export function getPlaybookLabel(pathKey: string): string {
  return PATH_LABELS[pathKey] || "Wealth System Launch";
}

export function calculateRealProgress(milestones: Milestones): number {
  let progress = 0;
  if (milestones?.postCreated) progress += 20;
  if (milestones?.leadAdded) progress += 20;
  if (milestones?.conversationLogged) progress += 20;
  if (milestones?.dealClosed) progress += 40;
  return progress;
}

export function getNextExecutionAction(
  milestones: Milestones,
): NextAction | null {
  if (!milestones?.postCreated) {
    return {
      key: "post_created",
      label: "Post your offer",
      shortLabel: "Post it.",
      description: "Copy your offer. Open one channel. Paste. Post.",
    };
  }
  if (!milestones?.leadAdded) {
    return {
      key: "lead_added",
      label: "Add your first lead",
      shortLabel: "Add the lead.",
      description: "Someone responded? Capture their name and contact.",
    };
  }
  if (!milestones?.conversationLogged) {
    return {
      key: "conversation_logged",
      label: "Log a conversation",
      shortLabel: "Log the call.",
      description: "Talk to a lead. Log what they said when you're done.",
    };
  }
  if (!milestones?.dealClosed) {
    return {
      key: "deal_closed",
      label: "Close your first deal",
      shortLabel: "Close it.",
      description: "Confirm the sale. Enter the revenue.",
    };
  }
  return null;
}

export function getExecutionMessage(
  progress: number,
  hesitating: boolean,
): string {
  if (hesitating) {
    const urgent = [
      "Stop reading. Start doing.",
      "One action. Now.",
      "Post. Lead. Call. Close.",
      "Revenue comes from doing.",
      "Move.",
    ];
    return urgent[Math.floor(Math.random() * urgent.length)];
  }

  if (progress === 0) return "Post your offer. That's the only move.";
  if (progress <= 20) return "Posted. Now get a lead.";
  if (progress <= 40) return "Lead in. Talk to them.";
  if (progress <= 60) return "Conversation done. Close the deal.";
  if (progress < 100) return "Almost there. Close it.";
  return "System live. Scale or repeat.";
}
