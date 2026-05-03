"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  Sprout,
  ReceiptText,
  Wallet,
  TrendingUp,
} from "lucide-react";

type Track = "make" | "protect" | "grow";

const TRACKS: Record<
  Track,
  {
    title: string;
    tone: string;
    bullets: { icon: React.ReactNode; label: string; body: string }[];
  }
> = {
  make: {
    title: "Make",
    tone: "text-accent-green",
    bullets: [
      {
        icon: <ReceiptText size={14} />,
        label: "Offer Writer",
        body: "Tighten your offer in 60 seconds — hook, value, CTA.",
      },
      {
        icon: <TrendingUp size={14} />,
        label: "Funnel Blueprint",
        body: "Five-step funnel from lead magnet to follow-up.",
      },
      {
        icon: <ArrowUpRight size={14} />,
        label: "Lead Pipeline",
        body: "Track leads, conversations, and closed deals locally.",
      },
    ],
  },
  protect: {
    title: "Protect",
    tone: "text-accent-blue",
    bullets: [
      {
        icon: <ShieldCheck size={14} />,
        label: "Money Audit",
        body: "Flags duplicate SaaS, idle ad spend, missed tax reservation.",
      },
      {
        icon: <Wallet size={14} />,
        label: "Runway Watch",
        body: "Alerts when projected runway dips under 90 days.",
      },
      {
        icon: <ArrowUpRight size={14} />,
        label: "Refund / Risk",
        body: "Watch refund rate, chargebacks, and CAC drift.",
      },
    ],
  },
  grow: {
    title: "Grow",
    tone: "text-gold",
    bullets: [
      {
        icon: <Sprout size={14} />,
        label: "Forecast",
        body: "Spend / revenue projections from your last 90 days.",
      },
      {
        icon: <TrendingUp size={14} />,
        label: "Scale Signal",
        body: "Tells you when a winner can take more budget safely.",
      },
      {
        icon: <ArrowUpRight size={14} />,
        label: "Insight Brief",
        body: "Daily what's-working / what-to-fix in plain English.",
      },
    ],
  },
};

export function MoneyOS() {
  const [track, setTrack] = useState<Track>("make");
  const t = TRACKS[track];

  return (
    <section
      id="money-os"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Money OS"
        title="A single place to make, protect, and grow your money."
        body="Three tracks, one engine. Move between them as your situation changes."
      />

      <div
        className="mt-8 grid gap-3 sm:grid-cols-3"
        data-testid="money-os-tracks"
      >
        {(Object.keys(TRACKS) as Track[]).map((k) => {
          const item = TRACKS[k];
          const active = k === track;
          return (
            <button
              key={k}
              onClick={() => setTrack(k)}
              data-testid={`money-os-track-${k}`}
              className={`rounded-xl px-4 py-3 text-left transition ${
                active
                  ? "gold-border bg-gold/10"
                  : "hairline hover:bg-white/5"
              }`}
            >
              <div
                className={`text-[10px] uppercase tracking-widest ${item.tone}`}
              >
                {item.title}
              </div>
              <div className="mt-1 text-sm text-white/85">
                {k === "make"
                  ? "Ship offers, content, and pipelines that bring in revenue."
                  : k === "protect"
                    ? "Audit recurring expenses, exposure, and tax surface area."
                    : "Forecast and scale what's already working."}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {t.bullets.map((b, i) => (
          <div key={i} className="rounded-xl hairline p-4">
            <div
              className={`flex items-center gap-2 text-[11px] uppercase tracking-widest ${t.tone}`}
            >
              {b.icon} {b.label}
            </div>
            <p className="mt-1.5 text-sm text-white/80">{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-[11px] uppercase tracking-widest text-gold">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      {body ? (
        <p className="mt-2 text-white/65 text-balance">{body}</p>
      ) : null}
    </div>
  );
}
