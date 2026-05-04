"use client";

import { useState } from "react";
import {
  ArrowRight,
  Crown,
  Mic,
  Send,
  ShieldCheck,
  Slack,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { SLACK_CTA_LABEL, SLACK_INVITE_URL } from "@/lib/community";
import { FOUNDER } from "@/lib/founder";

const QUICK_CHIPS = [
  "Make money now",
  "Create content",
  "Fix my plan",
  "What should I do next",
  "Run morning brief",
];

export function Hero() {
  const [draft, setDraft] = useState("");

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-white/5"
      data-testid="hero"
    >
      <BackdropArt />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-20 sm:pt-16">
        <div
          className="mx-auto max-w-3xl text-center"
          data-testid="hero-command"
        >
          <div className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-[11px] uppercase tracking-widest text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-gold" />
            <span>Founder console · v0 public preview</span>
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
            Build Your{" "}
            <span className="shimmer">Income System</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/70 text-balance">
            Make money. Protect money. Grow money. Tay routes your moves to
            Rory and Dawn so you ship one deliberate step at a time — turn what
            you have into a working money plan in minutes.
          </p>

          <CommandSurface
            draft={draft}
            setDraft={setDraft}
            onSubmit={(t) => {
              if (!t.trim()) return;
              const target = document.getElementById("founder");
              target?.scrollIntoView({ behavior: "smooth" });
              setDraft("");
            }}
          />

          <div
            className="mt-3 flex flex-wrap justify-center gap-2"
            data-testid="hero-chips"
          >
            {QUICK_CHIPS.map((c) => (
              <a
                key={c}
                href="#founder"
                className="text-xs px-3 py-1.5 rounded-full hairline hover:bg-white/5 text-white/75 transition"
                data-testid="hero-chip"
              >
                {c}
              </a>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#founder"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 transition"
              data-testid="hero-cta-primary"
            >
              Open the founder console <ArrowRight size={16} />
            </a>
            <a
              href="#agents"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md hairline hover:bg-white/5 transition"
              data-testid="hero-cta-agents"
            >
              Meet Tay, Rory & Dawn
            </a>
            <a
              href={SLACK_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md hairline hover:bg-white/5 transition"
              data-testid="hero-cta-slack"
              aria-label={SLACK_CTA_LABEL}
            >
              <Slack size={16} className="text-gold" />
              Join Slack
            </a>
          </div>

          <div
            className="mt-6 inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-[11px] text-white/60"
            data-testid="hero-founder-strip"
          >
            <Crown size={12} className="text-gold" />
            <span>
              Signed in as{" "}
              <span className="text-white/85">{FOUNDER.name}</span> ·{" "}
              <span className="text-white/65">{FOUNDER.email}</span>
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3 max-w-4xl mx-auto">
          <Pillar
            icon={<TrendingUp size={14} className="text-accent-green" />}
            label="Make"
            body="Offers, content, and pipelines that ship revenue. Routed to Rory."
          />
          <Pillar
            icon={<ShieldCheck size={14} className="text-accent-blue" />}
            label="Protect"
            body="Audits, alerts, and morning briefs before money leaks. Routed to Dawn."
          />
          <Pillar
            icon={<Sparkles size={14} className="text-gold" />}
            label="Grow"
            body="Forecasts, copilots, and the next move every day. Run by Tay."
          />
        </div>
      </div>
    </section>
  );
}

function BackdropArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-0"
      data-testid="hero-backdrop"
    >
      <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_50%_-10%,rgba(212,175,55,0.18),transparent_60%),radial-gradient(900px_500px_at_15%_30%,rgba(96,165,250,0.12),transparent_60%),radial-gradient(900px_500px_at_85%_30%,rgba(167,139,250,0.10),transparent_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
      <svg
        className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-25"
        viewBox="0 0 640 640"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="320"
          cy="320"
          r="120"
          stroke="rgba(212,175,55,0.45)"
          strokeWidth="0.6"
        />
        <circle
          cx="320"
          cy="320"
          r="200"
          stroke="rgba(212,175,55,0.30)"
          strokeWidth="0.6"
        />
        <circle
          cx="320"
          cy="320"
          r="280"
          stroke="rgba(96,165,250,0.25)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="320"
          x2="640"
          y2="320"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
        <line
          x1="320"
          y1="0"
          x2="320"
          y2="640"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}

function CommandSurface({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: string;
  setDraft: (s: string) => void;
  onSubmit: (s: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
      className="mt-8 mx-auto max-w-2xl"
      data-testid="hero-command-form"
    >
      <div className="glass gold-border rounded-2xl p-3 shadow-glow">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full gold-border bg-gold/10 flex items-center justify-center">
            <Sparkles size={14} className="text-gold" />
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Tay — upgrade, update, fix, or plan the platform…"
            aria-label="Ask Tay"
            data-testid="hero-prompt-input"
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/45"
          />
          <button
            type="button"
            aria-label="Voice input (coming soon)"
            title="Voice input — coming soon"
            className="h-9 w-9 rounded-md hairline text-white/55 hover:bg-white/5 inline-flex items-center justify-center transition"
            data-testid="hero-prompt-mic"
          >
            <Mic size={14} />
          </button>
          <button
            type="submit"
            aria-label="Send to Tay"
            data-testid="hero-prompt-send"
            className="h-9 px-3 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 inline-flex items-center gap-1.5 transition"
          >
            <Send size={14} />
            <span className="text-xs">Send</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Pillar({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-xl hairline px-3 py-3 text-left">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/60">
        {icon} {label}
      </div>
      <p className="mt-1.5 text-sm text-white/80">{body}</p>
    </div>
  );
}
