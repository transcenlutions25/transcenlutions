"use client";

import { AlertTriangle, BellRing, Lightbulb } from "lucide-react";
import { generateInsights } from "@/lib/tay/insight";
import { sampleMetrics, sampleChannels } from "@/lib/data/sampleMetrics";
import { SectionHeader } from "./MoneyOS";

export function Insights() {
  const insights = generateInsights(sampleMetrics);
  const totalSpend = sampleChannels.reduce((s, c) => s + c.spend, 0) || 1;

  return (
    <section
      id="insights"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Insight & Action Layer"
        title="Daily brief, channel mix, and alerts that mean something."
        body="Plain-English insights you can act on, derived from the same KPI feed every dashboard reads."
      />

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl glass p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gold">
            <Lightbulb size={12} /> Daily brief
          </div>
          <ul className="mt-3 grid gap-2" data-testid="insight-list">
            {insights.map((i) => (
              <li
                key={i.id}
                className={`rounded-lg border px-3 py-2 ${severityClass(
                  i.severity,
                )}`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                  {i.severity === "alert" ? (
                    <AlertTriangle size={11} />
                  ) : i.severity === "warn" ? (
                    <BellRing size={11} />
                  ) : (
                    <Lightbulb size={11} />
                  )}
                  {i.severity}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{i.title}</div>
                <p className="mt-1 text-xs text-white/65">{i.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 rounded-2xl hairline p-5 bg-ink-900/40">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-gold">
              Channel mix · 7d
            </div>
            <div className="text-[10px] text-white/45">Sample data</div>
          </div>
          <div className="mt-4 grid gap-2">
            {sampleChannels.map((c) => {
              const pct = (c.spend / totalSpend) * 100;
              const roas = c.spend > 0 ? c.revenue / c.spend : 0;
              return (
                <div
                  key={c.name}
                  className="grid grid-cols-12 gap-3 items-center"
                  data-testid={`channel-row-${c.name}`}
                >
                  <div className="col-span-4 sm:col-span-3 text-sm text-white/85">
                    {c.name}
                  </div>
                  <div className="col-span-5 sm:col-span-6 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          roas >= 2
                            ? "#22C55E"
                            : roas >= 1
                              ? "#EAB308"
                              : "#F87171",
                      }}
                    />
                  </div>
                  <div className="col-span-3 text-right text-xs tabular-nums text-white/75">
                    {c.spend > 0 ? `${roas.toFixed(2)}× ROAS` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function severityClass(s: "info" | "warn" | "alert"): string {
  if (s === "alert")
    return "border-accent-rose/30 bg-accent-rose/5 text-accent-rose";
  if (s === "warn")
    return "border-amber-400/30 bg-amber-400/5 text-accent-amber";
  return "border-white/10 bg-white/5 text-white/85";
}
