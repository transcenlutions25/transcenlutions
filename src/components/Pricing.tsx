"use client";

import { useMemo, useState } from "react";
import { Check, Layers } from "lucide-react";
import { deriveTayPricing } from "@/lib/tay/pricing";
import { tayCapabilityRegistry } from "@/lib/tay/registry";
import { SectionHeader } from "./MoneyOS";

export function Pricing() {
  const allCaps = Object.entries(tayCapabilityRegistry.capabilities);
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      allCaps
        .filter(([, c]) => c.status === "finished")
        .map(([k]) => [k, true]),
    ),
  );

  const pricing = useMemo(() => {
    const filtered = {
      capabilities: Object.fromEntries(
        allCaps.map(([k, c]) => [
          k,
          { ...c, status: included[k] ? "finished" : "queued" } as typeof c,
        ]),
      ),
    };
    return deriveTayPricing(filtered);
  }, [included, allCaps]);

  return (
    <section
      id="pricing"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Pricing"
        title="Pay only for what works."
        body="The capability registry derives price from what's shipping today. As features cross the finish line, the bundle unlocks more."
      />

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl hairline p-5 bg-ink-900/40">
          <div className="text-[11px] uppercase tracking-widest text-gold flex items-center gap-2">
            <Layers size={12} /> Live capabilities
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {allCaps.map(([key, cap]) => {
              const on = !!included[key];
              const finished = cap.status === "finished";
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (!finished) return;
                    setIncluded((p) => ({ ...p, [key]: !p[key] }));
                  }}
                  disabled={!finished}
                  data-testid={`pricing-capability-${key}`}
                  className={`text-left rounded-lg px-3 py-2 transition ${
                    !finished
                      ? "hairline opacity-60 cursor-not-allowed"
                      : on
                        ? "gold-border bg-gold/10"
                        : "hairline hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white/90">
                        {cap.label}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {cap.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/45">
                        w{cap.weight}
                      </span>
                      {finished ? (
                        <span
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            on
                              ? "bg-gold/30 border-gold"
                              : "border-white/15"
                          }`}
                        >
                          {on && <Check size={12} className="text-gold" />}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest text-white/40">
                          {cap.status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl glass p-5">
          <div className="text-[11px] uppercase tracking-widest text-gold">
            Your bundle
          </div>
          <div className="mt-3 grid gap-2">
            <PriceRow label="Single use" value={pricing.single_use_price} />
            <PriceRow
              label="5-pack (35% off)"
              value={pricing.bundle_5_price}
              accent
            />
            <PriceRow label="Supporter" value={pricing.supporter_price} />
          </div>
          <p className="mt-3 text-xs text-white/55">
            Total units selected: {pricing.total_units}. Pricing is derived,
            not charged here — payments are roadmap.
          </p>
          <a
            href="#copilot"
            className="mt-4 inline-flex items-center justify-center w-full gap-2 px-3 py-2 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 text-sm transition"
            data-testid="pricing-cta"
          >
            Talk to the copilot
          </a>
        </div>
      </div>
    </section>
  );
}

function PriceRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        accent ? "gold-border bg-gold/10" : "hairline"
      }`}
    >
      <span className="text-sm text-white/85">{label}</span>
      <span className="text-base font-semibold tabular-nums">
        {value > 0 ? `$${value.toLocaleString()}` : "—"}
      </span>
    </div>
  );
}
