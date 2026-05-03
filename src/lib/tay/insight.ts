/**
 * Lightweight rule-based insight generator used by the Copilot.
 * No external LLM calls — it's deterministic and explainable.
 */

export interface MetricsSnapshot {
  spend7d: number;
  revenue7d: number;
  newCustomers7d: number;
  refundRate: number;
  topChannel?: string;
  worstChannel?: string;
  cashRunwayDays?: number;
}

export interface Insight {
  id: string;
  severity: "info" | "warn" | "alert";
  title: string;
  body: string;
}

export function generateInsights(m: MetricsSnapshot): Insight[] {
  const out: Insight[] = [];

  const roas = m.spend7d > 0 ? m.revenue7d / m.spend7d : 0;
  if (m.spend7d > 0 && roas < 1.2) {
    out.push({
      id: "roas-low",
      severity: "alert",
      title: `ROAS is ${roas.toFixed(2)}× — under target`,
      body: "Spend is outpacing revenue. Pause your bottom-quartile audiences and double down on the top creative for 3 days before changing budget.",
    });
  } else if (roas >= 2.5) {
    out.push({
      id: "roas-high",
      severity: "info",
      title: `ROAS is ${roas.toFixed(2)}× — scaling room`,
      body: "Increase budget on the winning channel by 20% and watch CAC for the next 48 hours.",
    });
  }

  if (m.refundRate > 0.05) {
    out.push({
      id: "refund-rate",
      severity: "warn",
      title: `Refund rate is ${(m.refundRate * 100).toFixed(1)}%`,
      body: "Above the 5% threshold. Audit the last 20 refund reasons; product expectation gaps are usually upstream of the funnel.",
    });
  }

  if (m.newCustomers7d > 0 && m.spend7d > 0) {
    const cac = m.spend7d / m.newCustomers7d;
    out.push({
      id: "cac",
      severity: "info",
      title: `CAC is $${cac.toFixed(0)} this week`,
      body: `${m.newCustomers7d} new customers from $${m.spend7d.toLocaleString()} in spend. Track LTV:CAC weekly — target ≥ 3.`,
    });
  }

  if (m.cashRunwayDays !== undefined && m.cashRunwayDays < 60) {
    out.push({
      id: "runway",
      severity: "alert",
      title: `Runway: ${m.cashRunwayDays} days`,
      body: "Tighten payables, pull receivables forward, and freeze net-new variable spend until runway clears 90 days.",
    });
  }

  if (m.topChannel) {
    out.push({
      id: "top-channel",
      severity: "info",
      title: `Top channel: ${m.topChannel}`,
      body: `${m.topChannel} is pulling weight this week. Consider a creative refresh before fatigue sets in.`,
    });
  }

  if (m.worstChannel) {
    out.push({
      id: "worst-channel",
      severity: "warn",
      title: `Drag from ${m.worstChannel}`,
      body: `${m.worstChannel} is underperforming. Cut budget by 50% for 5 days and reallocate to the top channel.`,
    });
  }

  return out;
}

/**
 * Coarse copilot reply — deterministic and intent-based.
 * Real LLM wiring is roadmap; this gives the surface a real feel today.
 */
export function copilotReply(prompt: string, m: MetricsSnapshot): string {
  const q = prompt.trim().toLowerCase();
  if (!q) return "Ask me about revenue, spend, channels, runway, or what to do next.";

  if (/(make|earn|grow).*(money|revenue)/.test(q)) {
    return `Your top channel is ${m.topChannel ?? "n/a"} with ${m.newCustomers7d} new customers this week. Push 20% more budget there for 48h, then re-check ROAS. While that runs, ship one new offer page — the second offer almost always lifts revenue more than ad tweaks.`;
  }
  if (/(protect|risk|save|tax|expense)/.test(q)) {
    return `Run the Money Protection audit. Refund rate is ${(m.refundRate * 100).toFixed(1)}%, ${m.refundRate > 0.05 ? "above" : "under"} the 5% threshold. Top wastes I see in similar accounts: duplicate SaaS, idle ad sets, and missed quarterly tax reservation. I can draft a cut list.`;
  }
  if (/(roas|spend|ad)/.test(q)) {
    const roas = m.spend7d > 0 ? m.revenue7d / m.spend7d : 0;
    return `Last 7d ROAS is ${roas.toFixed(2)}×. ${roas < 1.2 ? "Pause bottom audiences, hold spend flat 72h, and let the top creative compound." : "You can scale. Add 20% to the winning ad set tomorrow and watch CAC."} I'll keep watching and ping you if it slips.`;
  }
  if (/(content|post|creator|caption)/.test(q)) {
    return "Drop your offer in the Creator Hub. I'll spin it into 4 platform-native posts and a hook variant. Pick the channel where your audience reads first; ship today, iterate weekly.";
  }
  if (/(start|launch|business|llc|brick)/.test(q)) {
    return "Pick a path in Business Workspace — service arbitrage, lead gen, content, micro-SaaS, or storefront. I'll generate the launch checklist, the first offer, and the lead pipeline. You execute one move at a time.";
  }
  if (/(connect|integrat|google|meta|stripe|shopify)/.test(q)) {
    return "Open Connectors. The four shipping today: Google Ads, Meta Ads, Shopify, Stripe. Plug them in and I'll normalize the data into a unified KPI feed within 10 minutes.";
  }
  return "Got it. Tell me whether this is about making money, protecting money, growing money, or shipping content — and I'll route you to the right module with a concrete next step.";
}
