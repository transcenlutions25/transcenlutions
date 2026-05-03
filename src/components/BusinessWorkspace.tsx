"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Plus,
  RotateCcw,
  Target,
  Zap,
  PhoneCall,
  ListChecks,
} from "lucide-react";
import { useTayWorksStore } from "@/lib/tay/store";
import { SectionHeader } from "./MoneyOS";

const PATHS: { key: string; label: string; tag: string }[] = [
  { key: "service_arbitrage", label: "Service arbitrage", tag: "Brick & mortar" },
  { key: "lead_generation", label: "Lead generation", tag: "Digital" },
  { key: "outbound_campaign", label: "Outbound campaign", tag: "Sales" },
  { key: "affiliate", label: "Affiliate revenue", tag: "Creator" },
  { key: "micro_saas", label: "Micro SaaS", tag: "Product" },
  { key: "content_marketing", label: "Content pipeline", tag: "Creator" },
];

export function BusinessWorkspace() {
  const {
    executionState,
    workflowName,
    progress,
    milestones,
    nextAction,
    message,
    hesitating,
    startWork,
    markMilestone,
    resetWork,
    tickHesitation,
  } = useTayWorksStore();

  useEffect(() => {
    const id = setInterval(tickHesitation, 5000);
    return () => clearInterval(id);
  }, [tickHesitation]);

  const isActive = executionState !== "idle";
  const isComplete = executionState === "complete";
  const barColor = isComplete
    ? "var(--green)"
    : hesitating
      ? "var(--rose)"
      : "var(--amber)";

  return (
    <section
      id="workspace"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
      style={
        {
          ["--green" as never]: "#22C55E",
          ["--rose" as never]: "#F87171",
          ["--amber" as never]: "#EAB308",
        } as React.CSSProperties
      }
    >
      <SectionHeader
        eyebrow="Business Workspace"
        title="Pick a path. Run one move at a time. Track the receipt."
        body="A unified workspace for digital and brick-and-mortar businesses, with a CRM-lite pipeline and a single next-action push."
      />

      <div className="mt-8 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl glass p-4">
          <div className="text-[11px] uppercase tracking-widest text-gold">
            Playbooks
          </div>
          <div
            className="mt-3 grid gap-2"
            data-testid="workspace-playbooks"
          >
            {PATHS.map((p) => (
              <button
                key={p.key}
                onClick={() => startWork(p.key)}
                data-testid={`workspace-playbook-${p.key}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  workflowName ===
                  PATHS.find((x) => x.key === p.key)?.label
                    ? "gold-border bg-gold/10"
                    : "hairline hover:bg-white/5"
                }`}
              >
                <span className="truncate">{p.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/45">
                  {p.tag}
                </span>
              </button>
            ))}
          </div>
          {isActive && (
            <button
              onClick={resetWork}
              data-testid="workspace-reset"
              className="mt-3 inline-flex items-center gap-2 text-xs text-white/55 hover:text-white"
            >
              <RotateCcw size={12} /> Reset workflow
            </button>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl hairline p-5 bg-ink-900/40">
          {!isActive ? (
            <EmptyState />
          ) : (
            <>
              <div
                className="rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: `${barColor}55`,
                  backgroundColor: `${barColor}10`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: barColor }} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: barColor }}
                    >
                      {isComplete
                        ? "System live"
                        : hesitating
                          ? "Move now"
                          : "Executing"}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      {workflowName}
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: barColor }}
                    data-testid="workspace-progress"
                  >
                    {progress}%
                  </span>
                </div>
                <div className="mt-2 w-full h-2 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <Milestone
                  label="Post"
                  done={!!milestones.postCreated}
                  count={milestones.totalPosts || 0}
                />
                <Milestone
                  label="Lead"
                  done={!!milestones.leadAdded}
                  count={milestones.totalLeads || 0}
                />
                <Milestone
                  label="Convo"
                  done={!!milestones.conversationLogged}
                  count={milestones.totalConversations || 0}
                />
                <Milestone
                  label="Close"
                  done={!!milestones.dealClosed}
                  count={milestones.totalDeals || 0}
                />
              </div>

              {message && (
                <div
                  className="mt-4 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: hesitating
                      ? "rgba(248,113,113,0.3)"
                      : "rgba(212,175,55,0.25)",
                    color: hesitating ? "#F87171" : "#E8C75A",
                    backgroundColor: hesitating
                      ? "rgba(248,113,113,0.06)"
                      : "rgba(212,175,55,0.05)",
                  }}
                  data-testid="workspace-message"
                >
                  ⚡ {message}
                </div>
              )}

              {nextAction && !isComplete && (
                <div className="mt-4 rounded-xl gold-border p-4 bg-gold/5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold">
                    <Target size={12} /> Next move
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {nextAction.label}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">
                    {nextAction.description}
                  </div>
                  <ActionButtons
                    actionKey={nextAction.key}
                    onMark={() => {
                      const map = {
                        post_created: "postCreated",
                        lead_added: "leadAdded",
                        conversation_logged: "conversationLogged",
                        deal_closed: "dealClosed",
                      } as const;
                      markMilestone(map[nextAction.key]);
                    }}
                  />
                </div>
              )}

              {isComplete && (
                <div className="mt-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-4">
                  <div className="flex items-center gap-2 text-accent-green">
                    <CheckCircle2 size={14} />
                    <span className="text-sm font-semibold">
                      Revenue active. Keep scaling.
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/65">
                    Repeat the loop with a new offer or scale this one with
                    +20% spend on the winning channel.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-sm text-white/65">
      <div className="text-[11px] uppercase tracking-widest text-gold">
        Choose a path
      </div>
      <h3 className="mt-2 text-lg text-white/90">
        One workflow at a time. One next move at a time.
      </h3>
      <p className="mt-2 max-w-md text-white/65">
        Pick a playbook on the left and Tay will push you through the four
        milestones — post, lead, conversation, close. Progress comes from
        actions, not minutes elapsed.
      </p>
      <ul className="mt-4 grid sm:grid-cols-2 gap-2">
        {[
          ["Brick & mortar", "Service arbitrage, local lead gen"],
          ["Digital", "Outbound, micro-SaaS, affiliate"],
          ["Creator", "Content pipeline, paid community"],
          ["Sales", "Outbound campaign system"],
        ].map(([k, v]) => (
          <li key={k} className="rounded-lg hairline px-3 py-2 text-xs">
            <div className="text-white/50 uppercase tracking-widest text-[10px]">
              {k}
            </div>
            <div className="text-white/85 mt-0.5">{v}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Milestone({
  label,
  done,
  count,
}: {
  label: string;
  done: boolean;
  count: number;
}) {
  return (
    <div className="rounded-lg hairline p-2 text-center">
      <div
        className="w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold"
        style={{
          backgroundColor: done ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.05)",
          border: done ? "2px solid #22C55E" : "2px solid rgba(255,255,255,0.1)",
          color: done ? "#22C55E" : "rgba(255,255,255,0.45)",
        }}
      >
        {done ? "✓" : count}
      </div>
      <div
        className="mt-1 text-[10px] uppercase tracking-widest"
        style={{ color: done ? "#22C55E" : "rgba(255,255,255,0.45)" }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionButtons({
  actionKey,
  onMark,
}: {
  actionKey:
    | "post_created"
    | "lead_added"
    | "conversation_logged"
    | "deal_closed";
  onMark: () => void;
}) {
  const labels: Record<typeof actionKey, { icon: React.ReactNode; text: string }> = {
    post_created: { icon: <CheckCircle2 size={12} />, text: "Mark as posted" },
    lead_added: { icon: <Plus size={12} />, text: "Add lead" },
    conversation_logged: {
      icon: <PhoneCall size={12} />,
      text: "Log conversation",
    },
    deal_closed: { icon: <ListChecks size={12} />, text: "Confirm sale" },
  };
  const l = labels[actionKey];
  return (
    <button
      onClick={onMark}
      data-testid={`workspace-mark-${actionKey}`}
      className="mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold w-full bg-amber-400/15 text-accent-amber border border-accent-amber/30 hover:bg-amber-400/25 transition"
    >
      {l.icon} {l.text}
    </button>
  );
}
