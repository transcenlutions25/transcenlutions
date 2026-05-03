"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, CheckCircle2, Sparkles } from "lucide-react";
import { SectionHeader } from "./MoneyOS";

type Platform = "x" | "linkedin" | "instagram" | "tiktok";

const PLATFORMS: { key: Platform; label: string; max: number }[] = [
  { key: "x", label: "X", max: 280 },
  { key: "linkedin", label: "LinkedIn", max: 1300 },
  { key: "instagram", label: "Instagram", max: 2200 },
  { key: "tiktok", label: "TikTok script", max: 600 },
];

function buildPost(offer: string, platform: Platform): string {
  const o = offer.trim() || "your offer";
  switch (platform) {
    case "x":
      return `Most people overcomplicate this.\n\n${o} — done in one move:\n\n• Pick the channel where your buyer reads first\n• Lead with the outcome, not the feature\n• Pin the receipt\n\nReply "GO" and I'll send the template.`;
    case "linkedin":
      return `I rebuilt my entire pipeline around one principle: clarity beats cleverness.\n\nIf you're stuck on ${o}, here's the move:\n\n1. Write the outcome in one sentence.\n2. Show the receipt — numbers, screenshots, or a name.\n3. Make the first step a 30-second action.\n\nThe rest is iteration. Comment "OS" and I'll DM the workbook.`;
    case "instagram":
      return `${o.toUpperCase()} — the no-fluff version.\n\nIf you read this and don't take the next step today, you don't actually want it.\n\nSave this. Tag the friend who keeps "researching." We start Monday.`;
    case "tiktok":
      return `[HOOK 0–3s] If you keep saying you'll start ${o}, this is the post.\n\n[BEAT 3–10s] Pull out your phone. Open Notes. Type the outcome you want in one sentence.\n\n[BEAT 10–25s] Now write the very first action. 30 seconds or less.\n\n[CTA 25–30s] Do it before this video ends. Comment "DONE."`;
  }
}

export function CreatorHub() {
  const [offer, setOffer] = useState(
    "Help local restaurants fill empty Tuesday tables.",
  );
  const [platform, setPlatform] = useState<Platform>("x");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  const post = useMemo(() => buildPost(offer, platform), [offer, platform]);

  useEffect(() => {
    if (!offer.trim()) {
      setMsg(
        "What are you selling? Enter your offer and I'll create content that converts.",
      );
    } else if (offer.trim().length < 12) {
      setMsg("Tighten the offer. One outcome, one audience, one promise.");
    } else {
      setMsg("Good offer. Pick a platform. Hit copy.");
    }
  }, [offer]);

  const platformMeta = PLATFORMS.find((p) => p.key === platform)!;
  const overLimit = post.length > platformMeta.max;

  return (
    <section
      id="creator"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="Creator & Professional Hub"
        title="One offer in. Platform-native posts out."
        body="For creators monetizing audience and professionals publishing courses, briefs, or thought leadership."
      />

      <div className="mt-8 grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl glass p-5">
          <label className="text-[11px] uppercase tracking-widest text-gold">
            Your offer
          </label>
          <textarea
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            data-testid="creator-offer-input"
            className="mt-2 w-full rounded-lg hairline bg-ink-900/60 px-3 py-2 text-sm text-white/90 outline-none focus:border-gold/40 min-h-[88px]"
            placeholder="What outcome are you selling, and to whom?"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatform(p.key)}
                data-testid={`creator-platform-${p.key}`}
                className={`text-xs px-3 py-1.5 rounded-md transition ${
                  platform === p.key
                    ? "gold-border bg-gold/10 text-gold"
                    : "hairline hover:bg-white/5 text-white/75"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg gold-border bg-gold/5 px-3 py-2">
            <Sparkles size={14} className="text-gold" />
            <span className="text-xs text-white/85">{msg}</span>
          </div>
        </div>

        <div className="rounded-2xl hairline p-5 bg-ink-900/40 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-white/55">
              Generated · {platformMeta.label}
            </div>
            <span
              className={`text-[10px] tabular-nums ${
                overLimit ? "text-accent-rose" : "text-white/45"
              }`}
            >
              {post.length} / {platformMeta.max}
            </span>
          </div>
          <pre
            className="mt-3 flex-1 whitespace-pre-wrap text-sm text-white/90 leading-relaxed"
            data-testid="creator-output"
          >
            {post}
          </pre>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(post);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard may be unavailable in some contexts */
              }
            }}
            data-testid="creator-copy-btn"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md gold-border bg-gold/10 text-gold px-3 py-2 text-sm hover:bg-gold/20 transition"
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy post"}
          </button>
        </div>
      </div>
    </section>
  );
}
