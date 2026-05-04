import { ArrowRight, ShieldCheck, Slack, Sparkles, TrendingUp } from "lucide-react";
import { SLACK_CTA_LABEL, SLACK_INVITE_URL } from "@/lib/community";

export function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24"
    >
      <div className="grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <div
            className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1 text-xs text-white/70"
            data-testid="hero-eyebrow"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-gold" />
            <span>v0 — public preview · Money OS for builders</span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
            Make money. Protect money.{" "}
            <span className="shimmer">Grow money.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg text-white/65 text-balance">
            Transcenlutions is the AI operating layer for businesses, creators,
            and professionals. Connect your stack, unify the data, and act on
            the insights — one deliberate move at a time.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <a
              href="#workspace"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 transition"
              data-testid="hero-cta-primary"
            >
              Open the workspace <ArrowRight size={16} />
            </a>
            <a
              href="#copilot"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md hairline hover:bg-white/5 transition"
              data-testid="hero-cta-copilot"
            >
              Talk to the copilot
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
              Join the community
            </a>
          </div>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <Pillar
              icon={<TrendingUp size={14} className="text-accent-green" />}
              label="Make"
              body="Offers, content, and pipelines that ship revenue."
            />
            <Pillar
              icon={<ShieldCheck size={14} className="text-accent-blue" />}
              label="Protect"
              body="Audits, alerts, and controls before money leaks out."
            />
            <Pillar
              icon={<Sparkles size={14} className="text-gold" />}
              label="Grow"
              body="Forecasts, copilots, and one next move every day."
            />
          </ul>
        </div>
        <HeroPanel />
      </div>
    </section>
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
    <li className="rounded-xl hairline px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/60">
        {icon} {label}
      </div>
      <p className="mt-1.5 text-sm text-white/80">{body}</p>
    </li>
  );
}

function HeroPanel() {
  return (
    <div className="lg:col-span-5">
      <div className="glass rounded-2xl p-5 shadow-glow">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest text-gold">
            Live brief
          </div>
          <div className="text-[10px] text-white/40">7d</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Revenue" value="$9,120" trend="+18%" trendUp />
          <Stat label="Spend" value="$4,280" trend="+6%" />
          <Stat label="ROAS" value="2.13×" trend="+0.21" trendUp />
        </div>
        <div className="mt-4 rounded-lg hairline p-3">
          <div className="text-[10px] uppercase tracking-widest text-gold/80">
            Next move
          </div>
          <p className="mt-1 text-sm text-white/85">
            Push +20% budget to Meta Ads (top channel). Hold spend on TikTok for
            72h until creative refreshes.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href="#money-os"
            className="text-center text-xs px-3 py-2 rounded-md hairline hover:bg-white/5"
          >
            Money OS
          </a>
          <a
            href="#copilot"
            className="text-center text-xs px-3 py-2 rounded-md gold-border text-gold hover:bg-gold/10"
          >
            Ask copilot
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-lg hairline p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      <div
        className={`text-[10px] mt-0.5 ${
          trendUp ? "text-accent-green" : "text-white/55"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}
