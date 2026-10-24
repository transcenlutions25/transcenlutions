"use client";

import { useState } from "react";
import type { ApprovalRecord, TaskStep } from "../../lib/tay/types";

const STEP_MARKER: Record<TaskStep["status"], string> = {
  pending: "○",
  active: "◐",
  done: "✓",
  blocked: "✕",
  awaiting_approval: "◆",
};

const STEP_LABEL: Record<TaskStep["status"], string> = {
  pending: "Waiting",
  active: "Running now",
  done: "Done",
  blocked: "Blocked",
  awaiting_approval: "Needs your decision",
};

/** Live progress checklist. Screen readers get the status words, not the glyphs. */
export function ProgressChecklist({ steps, title }: { steps: TaskStep[]; title: string }) {
  if (steps.length === 0) return null;
  const done = steps.filter((step) => step.status === "done").length;
  const percent = Math.round((done / steps.length) * 100);
  return (
    <section className="tl-panel tl-panel-strong" style={{ padding: "0.75rem" }} aria-label={title}>
      <div className="tl-between" style={{ marginBottom: "0.45rem" }}>
        <h3 className="tl-heading">{title}</h3>
        <span className="tl-small tl-muted">
          {done}/{steps.length} complete
        </span>
      </div>
      <div className="tl-progress" role="img" aria-label={`${percent}% of the checklist is complete`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <ol className="tl-checklist" style={{ marginTop: "0.6rem" }}>
        {steps.map((step) => (
          <li key={step.id} className="tl-step" data-status={step.status}>
            <span className="tl-step-marker" aria-hidden="true">
              {STEP_MARKER[step.status]}
            </span>
            <span>
              <strong>{step.label}</strong>
              <span className="tl-visually-hidden"> — {STEP_LABEL[step.status]}</span>
              <br />
              <span className="tl-small tl-muted">
                {STEP_LABEL[step.status]}
                {step.detail ? ` · ${step.detail}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const RISK_TONE: Record<ApprovalRecord["risk"], string> = {
  low: "ok",
  medium: "wait",
  high: "wait",
  critical: "blocked",
};

const RISK_WORD: Record<ApprovalRecord["risk"], string> = {
  low: "Low impact",
  medium: "Medium impact",
  high: "High impact",
  critical: "Blocked by policy",
};

/** A short slideshow so a human can see the proposed change before deciding. */
function ChangeSlideshow({ approval }: { approval: ApprovalRecord }) {
  const [index, setIndex] = useState(0);
  const slides = approval.slides.length
    ? approval.slides
    : [{ title: "Proposed change", caption: approval.summary, lines: [approval.explanation], tone: "neutral" as const }];
  const slide = slides[Math.min(index, slides.length - 1)]!;

  return (
    <div className="tl-slides">
      <div className="tl-slide-head">
        <div>
          <strong className="tl-small">{slide.title}</strong>
          <div className="tl-small tl-muted">{slide.caption}</div>
        </div>
        <div className="tl-row" style={{ gap: "0.3rem" }}>
          <button
            type="button"
            className="tl-button"
            data-variant="ghost"
            style={{ minHeight: "34px", padding: "0.2rem 0.5rem" }}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            aria-label="Previous preview slide"
          >
            ‹
          </button>
          <span className="tl-small tl-muted" aria-live="polite">
            {index + 1}/{slides.length}
          </span>
          <button
            type="button"
            className="tl-button"
            data-variant="ghost"
            style={{ minHeight: "34px", padding: "0.2rem 0.5rem" }}
            onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))}
            disabled={index >= slides.length - 1}
            aria-label="Next preview slide"
          >
            ›
          </button>
        </div>
      </div>
      <pre className="tl-slide-body" aria-label={`Preview: ${slide.title}`}>
        {slide.lines.map((line, lineIndex) => (
          <div key={`${lineIndex}-${line.slice(0, 12)}`} className="tl-slide-line" data-tone={slide.tone}>
            {line || " "}
          </div>
        ))}
      </pre>
      <div className="tl-row" style={{ padding: "0.4rem 0.7rem", justifyContent: "space-between" }}>
        <div className="tl-slide-dots" role="tablist" aria-label="Preview slides">
          {slides.map((entry, dotIndex) => (
            <button
              key={entry.title}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-current={dotIndex === index}
              aria-label={`Slide ${dotIndex + 1}: ${entry.title}`}
              className="tl-slide-dot"
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
        <span className="tl-small tl-muted">{approval.kind.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
}

export interface ApprovalCardProps {
  approval: ApprovalRecord;
  busy: boolean;
  onDecide: (approvalId: string, decision: "approve" | "reject" | "review_later") => void;
}

/** Approve, reject, or review later — each with an explanation and a preview. */
export function ApprovalCard({ approval, busy, onDecide }: ApprovalCardProps) {
  const decided = approval.status === "applied" || approval.status === "rejected";
  return (
    <article className="tl-approval" aria-label={`Approval: ${approval.title}`}>
      <div className="tl-between">
        <h4 style={{ margin: 0 }}>{approval.title}</h4>
        <span className="tl-chip" data-state={decisionTone(approval.status)}>
          {decisionLabel(approval.status)}
        </span>
      </div>

      <p className="tl-small" style={{ margin: 0 }}>
        {approval.explanation}
      </p>

      <div className="tl-row">
        <span className="tl-chip" data-state={RISK_TONE[approval.risk]}>
          {RISK_WORD[approval.risk]}
        </span>
        <span className="tl-small tl-muted">{approval.summary}</span>
      </div>

      <ChangeSlideshow approval={approval} />

      {approval.status === "failed" && approval.applyError ? (
        <p className="tl-notice" data-tone="error">
          The change could not be applied: {approval.applyError}
        </p>
      ) : null}

      {decided ? (
        <p className="tl-small tl-muted" style={{ margin: 0 }}>
          {approval.status === "applied"
            ? `Applied${approval.appliedAt ? ` at ${new Date(approval.appliedAt).toLocaleString()}` : ""}.`
            : "Rejected. Nothing was written."}
        </p>
      ) : (
        <div className="tl-row">
          <button type="button" className="tl-button" data-variant="gold" disabled={busy} onClick={() => onDecide(approval.id, "approve")}>
            Approve and apply
          </button>
          <button type="button" className="tl-button" data-variant="danger" disabled={busy} onClick={() => onDecide(approval.id, "reject")}>
            Reject
          </button>
          <button type="button" className="tl-button" data-variant="ghost" disabled={busy} onClick={() => onDecide(approval.id, "review_later")}>
            Review later
          </button>
        </div>
      )}
    </article>
  );
}

function decisionTone(status: ApprovalRecord["status"]) {
  if (status === "applied") return "ok";
  if (status === "rejected" || status === "failed") return "blocked";
  if (status === "approved") return "ok";
  return "wait";
}

function decisionLabel(status: ApprovalRecord["status"]) {
  switch (status) {
    case "applied":
      return "Applied";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "review_later":
      return "Review later";
    case "failed":
      return "Failed";
    default:
      return "Awaiting decision";
  }
}
