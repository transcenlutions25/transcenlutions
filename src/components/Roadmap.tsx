import { Check, Hourglass, Circle } from "lucide-react";
import { SectionHeader } from "./MoneyOS";

interface Step {
  title: string;
  body: string;
  status: "shipped" | "in-progress" | "queued";
}

const STEPS: Step[] = [
  {
    title: "Connection layer",
    body: "OAuth-based connectors for Google Ads, Meta Ads, Shopify, Stripe.",
    status: "in-progress",
  },
  {
    title: "Unified data layer",
    body: "Normalized KPI feed (revenue, spend, conv, refunds, audiences).",
    status: "in-progress",
  },
  {
    title: "Insight layer",
    body: "Daily briefs, anomaly alerts, channel mix, copilot routing.",
    status: "shipped",
  },
  {
    title: "Action layer",
    body: "Pause underperformers, scale winners, post drafts on schedule.",
    status: "queued",
  },
  {
    title: "Workspaces & permissions",
    body: "Multi-user workspaces, roles, audit log, billing.",
    status: "queued",
  },
  {
    title: "Mobile companion",
    body: "Briefs, alerts, and one-tap moves on iOS / Android.",
    status: "queued",
  },
];

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Roadmap"
        title="The four layers, in order."
        body="We ship in the order that compounds: connect first, unify second, insights third, automate last."
      />

      <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STEPS.map((s, i) => {
          const Icon =
            s.status === "shipped"
              ? Check
              : s.status === "in-progress"
                ? Hourglass
                : Circle;
          const tone =
            s.status === "shipped"
              ? "border-accent-green/30 bg-accent-green/5 text-accent-green"
              : s.status === "in-progress"
                ? "gold-border bg-gold/5 text-gold"
                : "hairline text-white/55";
          return (
            <li
              key={s.title}
              className={`rounded-2xl px-4 py-4 ${tone}`}
              data-testid={`roadmap-step-${i}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest opacity-80">
                  Step {i + 1}
                </span>
                <Icon size={14} />
              </div>
              <div className="mt-1.5 text-sm font-semibold text-white/90">
                {s.title}
              </div>
              <p className="mt-1 text-xs text-white/65">{s.body}</p>
              <div className="mt-2 text-[10px] uppercase tracking-widest opacity-70">
                {s.status}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
