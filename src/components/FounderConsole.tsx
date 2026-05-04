"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Cpu,
  Crown,
  GaugeCircle,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { FOUNDER } from "@/lib/founder";
import { AGENTS, AGENT_HONEST_NOTE, type Agent } from "@/lib/agents";
import { founderReply, type FounderReply } from "@/lib/founderAi";

type Tab = "overview" | "controls" | "ai" | "agents";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <GaugeCircle size={14} /> },
  { id: "controls", label: "Controls", icon: <Wrench size={14} /> },
  { id: "ai", label: "Founder AI", icon: <Sparkles size={14} /> },
  { id: "agents", label: "Agents", icon: <Cpu size={14} /> },
];

export function FounderConsole() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <section
      id="founder"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
      data-testid="founder-console"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-gold">
            Founder Console
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
            Run the platform from one surface.
          </h2>
          <p className="mt-2 text-white/65 max-w-2xl text-balance">
            Owner profile, live status, deploy controls, and a Founder AI you
            can talk to. Tay routes work to Rory and Dawn so you ship
            deliberate moves, not busywork.
          </p>
        </div>
        <FounderBadge />
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Founder console tabs"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={active}
              data-testid={`founder-tab-${t.id}`}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition ${
                active
                  ? "gold-border bg-gold/15 text-gold"
                  : "hairline text-white/70 hover:bg-white/5"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewPanel />}
        {tab === "controls" && <ControlsPanel />}
        {tab === "ai" && <FounderAiPanel />}
        {tab === "agents" && <AgentsPanel />}
      </div>
    </section>
  );
}

function FounderBadge() {
  return (
    <div
      className="glass rounded-xl p-3.5 flex items-center gap-3 min-w-[260px]"
      data-testid="founder-badge"
    >
      <div className="h-10 w-10 rounded-full gold-border bg-gradient-to-br from-gold/40 to-transparent flex items-center justify-center">
        <Crown size={16} className="text-gold" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold" data-testid="founder-name">
          {FOUNDER.name}
        </div>
        <div className="text-[11px] text-white/55" data-testid="founder-email">
          {FOUNDER.email}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-gold">
          {FOUNDER.role.split("·")[0]?.trim()}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel() {
  return (
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest text-gold">
            Owner profile
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent-green"
            data-testid="founder-status-platform"
          >
            <CircleDot size={10} />
            {FOUNDER.status.platform}
          </span>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Field label="Name" value={FOUNDER.name} />
          <Field label="Handle" value={FOUNDER.handle} />
          <Field label="Email" value={FOUNDER.email} testId="overview-email" />
          <Field label="Workspace" value={FOUNDER.workspace} />
          <Field label="Region" value={FOUNDER.region} />
          <Field label="Joined" value={FOUNDER.joinedAt} />
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-white/55">
            Permissions
          </div>
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            data-testid="founder-permissions"
          >
            {FOUNDER.permissions.map((p) => (
              <span
                key={p}
                className="text-[10px] uppercase tracking-widest gold-border bg-gold/10 text-gold rounded-full px-2 py-0.5"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-[11px] uppercase tracking-widest text-gold">
          Platform status
        </div>
        <div className="mt-4 grid gap-3">
          <StatusRow
            icon={<Activity size={14} className="text-accent-green" />}
            label="Platform"
            value={FOUNDER.status.platform}
            testId="status-platform"
          />
          <StatusRow
            icon={<TrendingUp size={14} className="text-gold" />}
            label="Deployments"
            value={FOUNDER.status.deployments}
            testId="status-deploy"
          />
          <StatusRow
            icon={<Cpu size={14} className="text-accent-blue" />}
            label="Agents"
            value={FOUNDER.status.agents}
            testId="status-agents"
          />
          <div className="rounded-lg hairline p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/55">
              Last shipped
            </div>
            <div
              className="mt-1 text-sm text-white/85"
              data-testid="status-last-shipped"
            >
              {FOUNDER.status.lastShipped}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="rounded-lg hairline p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/55">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/90" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg hairline px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-white/85">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className="text-[10px] uppercase tracking-widest text-white/65"
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

interface ControlItem {
  id: string;
  label: string;
  body: string;
  toneDot: string;
  cta: string;
}

const CONTROLS: ControlItem[] = [
  {
    id: "upgrade-ui",
    label: "Upgrade UI",
    body: "Refine the live surface — hero, founder console, agents, money OS — toward the production transcenlutions.com look.",
    toneDot: "bg-gold",
    cta: "Queue upgrade",
  },
  {
    id: "update-copy",
    label: "Update platform copy",
    body: "Tighten headlines, subheads, and CTAs across hero, dashboard, and pricing for one-shot clarity.",
    toneDot: "bg-accent-blue",
    cta: "Draft copy edit",
  },
  {
    id: "fix-issue",
    label: "Fix issue",
    body: "Log a bug or regression. Tay reproduces, drafts a minimal diff, runs lint + typecheck + build, then posts for review.",
    toneDot: "bg-accent-rose",
    cta: "Open fix lane",
  },
  {
    id: "ship-connector",
    label: "Ship connector",
    body: "Pick a connector — Stripe, Shopify, Meta Ads, Google Ads, GA4, HubSpot, TikTok Ads, Slack — and Tay drafts the spec.",
    toneDot: "bg-accent-green",
    cta: "Pick connector",
  },
  {
    id: "review-agents",
    label: "Review agents",
    body: "Audit Tay, Rory, and Dawn — capabilities, status, what's wired vs scoped, and the next move per agent.",
    toneDot: "bg-accent-violet",
    cta: "Open agent audit",
  },
  {
    id: "deploy-check",
    label: "Deploy check",
    body: "Run the standard deploy gate — lint, typecheck, build — and confirm the main branch is green before push.",
    toneDot: "bg-gold",
    cta: "Run deploy gate",
  },
];

function ControlsPanel() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string | null>(null);

  const toggle = (id: string) => {
    setDone((d) => ({ ...d, [id]: !d[id] }));
    setActive(id);
  };

  const queuedCount = Object.values(done).filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/85">
          <ShieldCheck size={14} className="text-gold" />
          <span>Founder controls — interactive on the client.</span>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest text-gold"
          data-testid="controls-queued-count"
        >
          {queuedCount} queued
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3" data-testid="controls-grid">
        {CONTROLS.map((c) => {
          const isDone = !!done[c.id];
          const isActive = active === c.id;
          return (
            <div
              key={c.id}
              className={`rounded-2xl p-4 transition ${
                isDone
                  ? "gold-border bg-gold/5"
                  : isActive
                    ? "hairline bg-white/[0.03]"
                    : "hairline"
              }`}
              data-testid={`control-${c.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/65">
                  <span className={`h-1.5 w-1.5 rounded-full ${c.toneDot}`} />
                  {c.label}
                </div>
                <button
                  onClick={() => toggle(c.id)}
                  data-testid={`control-${c.id}-toggle`}
                  aria-pressed={isDone}
                  className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 transition ${
                    isDone
                      ? "bg-gold/20 text-gold gold-border"
                      : "hairline text-white/65 hover:bg-white/5"
                  }`}
                >
                  {isDone ? "queued" : c.cta}
                </button>
              </div>
              <p className="mt-2 text-sm text-white/80">{c.body}</p>
              {isDone && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent-green">
                  <CheckCircle2 size={10} /> Sent to Tay for drafting
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AiMessage {
  role: "founder" | "tay";
  text: string;
  reply?: FounderReply;
}

const AI_STARTERS = [
  "Upgrade the UI to feel like the live site",
  "Update the hero copy",
  "Fix the connector status badge",
  "Ship the Stripe connector next",
  "Review all agents",
  "Run a deploy check",
];

function FounderAiPanel() {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: "tay",
      text: "Founder AI online. I'm Tay — say what you want to upgrade, update, fix, or plan, and I'll draft, queue, or route it to Rory or Dawn. I won't promise autonomous deployment I can't deliver yet — I'll show you status as `drafting`, `queued`, `ready for review`, or `answered`.",
    },
  ]);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const reply = founderReply(t);
    setMessages((m) => [
      ...m,
      { role: "founder", text: t },
      { role: "tay", text: reply.text, reply },
    ]);
    setDraft("");
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5" data-testid="founder-ai">
      <div
        className="grid gap-3 max-h-[460px] overflow-auto pr-1"
        data-testid="founder-ai-thread"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              m.role === "founder" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "tay" && (
              <div className="mt-0.5 h-8 w-8 rounded-full gold-border bg-gold/10 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-gold" />
              </div>
            )}
            <div
              className={`max-w-[88%] sm:max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "founder"
                  ? "bg-white/10 text-white/90"
                  : "gold-border bg-gold/5 text-white/90"
              }`}
            >
              {m.reply && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className="text-[10px] uppercase tracking-widest text-gold"
                    data-testid="founder-ai-status"
                  >
                    {m.reply.status}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-white/50">
                    · routed to {m.reply.routeTo}
                  </span>
                </div>
              )}
              <div>{m.text}</div>
              {m.reply?.steps && m.reply.steps.length > 0 && (
                <ul className="mt-2 grid gap-1 text-[12px] text-white/75">
                  {m.reply.steps.map((s, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CircleDot
                        size={10}
                        className="mt-1 text-gold shrink-0"
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {m.role === "founder" && (
              <div className="mt-0.5 h-8 w-8 rounded-full gold-border bg-gradient-to-br from-gold/40 to-transparent flex items-center justify-center shrink-0">
                <Crown size={14} className="text-gold" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {AI_STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            data-testid="founder-ai-starter"
            className="text-xs px-2.5 py-1.5 rounded-full hairline hover:bg-white/5 text-white/75"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <button
          type="button"
          aria-label="Voice input (coming soon)"
          title="Voice input — coming soon"
          className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-md hairline text-white/55 hover:bg-white/5 transition"
          data-testid="founder-ai-mic"
        >
          <Mic size={14} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tell Tay what to upgrade, update, fix, or plan…"
          aria-label="Founder AI prompt"
          data-testid="founder-ai-input"
          className="flex-1 rounded-md hairline bg-ink-900/60 px-3 py-2 text-sm outline-none focus:border-gold/40"
        />
        <button
          type="submit"
          data-testid="founder-ai-send"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 transition"
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}

function AgentsPanel() {
  return (
    <div className="grid gap-3">
      <div
        className="glass rounded-2xl p-4 text-sm text-white/80"
        data-testid="agents-honest-note"
      >
        <span className="text-[11px] uppercase tracking-widest text-gold mr-2">
          Honest note
        </span>
        {AGENT_HONEST_NOTE}
      </div>
      <div className="grid lg:grid-cols-3 gap-3" data-testid="agents-grid">
        {AGENTS.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}

function accentClass(accent: Agent["accent"]) {
  switch (accent) {
    case "gold":
      return "text-gold";
    case "green":
      return "text-accent-green";
    case "blue":
      return "text-accent-blue";
    case "violet":
      return "text-accent-violet";
  }
}

function statusBadge(status: Agent["status"]) {
  switch (status) {
    case "live":
      return "bg-accent-green/15 text-accent-green";
    case "starter-v0":
      return "bg-gold/15 text-gold";
    case "training":
      return "bg-accent-blue/15 text-accent-blue";
    case "queued":
      return "bg-white/10 text-white/65";
  }
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article
      className="rounded-2xl glass p-4 flex flex-col gap-3"
      data-testid={`agent-card-${agent.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-[11px] uppercase tracking-widest ${accentClass(agent.accent)}`}
          >
            {agent.tracks.join(" · ")}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {agent.name}
          </h3>
          <div className="text-[12px] text-white/60">{agent.role}</div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${statusBadge(agent.status)}`}
          data-testid={`agent-${agent.id}-status`}
        >
          {agent.status}
        </span>
      </header>
      <p className="text-sm text-white/80">{agent.tagline}</p>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55">
          Capabilities
        </div>
        <ul className="mt-1.5 grid gap-1 text-[12px] text-white/75">
          {agent.capabilities.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <CheckCircle2
                size={10}
                className={`mt-1 shrink-0 ${accentClass(agent.accent)}`}
              />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55">
          Sample commands
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {agent.sampleCommands.map((s) => (
            <span
              key={s}
              className="text-[11px] hairline rounded-full px-2 py-0.5 text-white/75"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55">
          Build next
        </div>
        <ul className="mt-1.5 grid gap-1 text-[12px] text-white/70">
          {agent.buildNext.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CircleDot size={10} className="mt-1 text-gold shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-1 text-[11px] text-white/55 border-t border-white/5 pt-2">
        {agent.disclosure}
      </p>
    </article>
  );
}
