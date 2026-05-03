"use client";

import { useState } from "react";
import { Database, Zap } from "lucide-react";
import { SectionHeader } from "./MoneyOS";

interface Connector {
  key: string;
  name: string;
  category: "Ads" | "Commerce" | "Analytics" | "CRM" | "Payments" | "Comms";
  state: "live" | "beta" | "queued";
  blurb: string;
}

const CONNECTORS: Connector[] = [
  {
    key: "google_ads",
    name: "Google Ads",
    category: "Ads",
    state: "beta",
    blurb: "Spend, conversions, search vs perf-max.",
  },
  {
    key: "meta_ads",
    name: "Meta Ads",
    category: "Ads",
    state: "beta",
    blurb: "Spend, ROAS, audiences, creative fatigue.",
  },
  {
    key: "tiktok_ads",
    name: "TikTok Ads",
    category: "Ads",
    state: "queued",
    blurb: "Spend, hooks, CTR, conversions.",
  },
  {
    key: "shopify",
    name: "Shopify",
    category: "Commerce",
    state: "beta",
    blurb: "Orders, refunds, products, customer LTV.",
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "Payments",
    state: "beta",
    blurb: "Revenue, MRR, churn, fees.",
  },
  {
    key: "ga4",
    name: "GA4",
    category: "Analytics",
    state: "queued",
    blurb: "Sessions, channels, events joined to revenue.",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    category: "CRM",
    state: "queued",
    blurb: "Deals, contacts, pipeline stages.",
  },
  {
    key: "slack",
    name: "Slack",
    category: "Comms",
    state: "queued",
    blurb: "Push briefs, alerts, milestones.",
  },
];

const STATE_STYLES: Record<Connector["state"], string> = {
  live: "border-accent-green/30 bg-accent-green/5 text-accent-green",
  beta: "gold-border bg-gold/5 text-gold",
  queued: "hairline text-white/50",
};

export function Connectors() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    meta_ads: true,
    stripe: true,
  });
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <section
      id="connectors"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Connection & Data Layer"
        title="Plug your stack in. We unify it."
        body="OAuth-based connectors fan out into a normalized metrics schema. Build once, dashboards and alerts inherit it."
      />

      <div className="mt-6 grid lg:grid-cols-4 gap-3">
        <div className="rounded-2xl glass p-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gold">
            <Database size={12} /> Unified metrics
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Sources" value={enabledCount.toString()} />
            <Stat label="KPIs" value={enabledCount > 0 ? "24" : "0"} />
            <Stat label="Freshness" value={enabledCount > 0 ? "10m" : "—"} />
            <Stat label="Anomalies" value={enabledCount > 0 ? "2" : "0"} />
          </div>
          <p className="mt-3 text-xs text-white/55">
            Each connector lands in the same KPI feed: revenue, spend,
            conversions, refunds, audiences. The copilot reads from there.
          </p>
        </div>

        <div className="lg:col-span-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONNECTORS.map((c) => {
            const on = !!enabled[c.key];
            return (
              <div
                key={c.key}
                className={`rounded-xl px-4 py-3 ${STATE_STYLES[c.state]}`}
                data-testid={`connector-${c.key}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white/90">
                    {c.name}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest opacity-80">
                    {c.state}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/65">{c.blurb}</p>
                <button
                  onClick={() =>
                    setEnabled((prev) => ({ ...prev, [c.key]: !prev[c.key] }))
                  }
                  disabled={c.state === "queued"}
                  data-testid={`connector-toggle-${c.key}`}
                  className={`mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md transition ${
                    c.state === "queued"
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : on
                        ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
                        : "bg-white/5 text-white/85 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <Zap size={12} />{" "}
                  {c.state === "queued"
                    ? "Coming soon"
                    : on
                      ? "Connected"
                      : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg hairline p-2">
      <div className="text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
