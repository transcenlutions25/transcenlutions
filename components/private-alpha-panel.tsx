"use client";

import {
  CheckCircle2,
  CircleAlert,
  Flame,
  MessageCircle,
  MousePointer2,
  UsersRound,
} from "lucide-react";
import type {
  AlphaPathId,
  PrivateAlphaState,
} from "../lib/private-alpha";

interface PrivateAlphaPanelProps {
  alphaState: PrivateAlphaState;
  selectedPathId: AlphaPathId | null;
  onCommand: (request: string) => void;
}

const alphaCommands = [
  "Show private alpha readiness",
  "Prepare Founders Circle tester invite",
  "I have too many ideas and need help choosing what to do first.",
  "I feel overwhelmed and need one clear next step.",
];

export function PrivateAlphaPanel({
  alphaState,
  selectedPathId,
  onCommand,
}: PrivateAlphaPanelProps) {
  const selectedPath = alphaState.paths.find(
    (path) => path.id === selectedPathId,
  );

  return (
    <section className="private-alpha-command" aria-label="Private alpha readiness">
      <div className="section-header">
        <p className="eyebrow">Private Alpha Readiness</p>
        <h2>Make Tay useful for 5 humans.</h2>
        <p>{alphaState.promise}</p>
      </div>

      <div className="alpha-truth-grid">
        <article className="alpha-card alpha-card--primary">
          <div className="card-title-row">
            <span className="icon-disc">
              <Flame size={17} />
            </span>
            <p className="eyebrow">Current Stage</p>
          </div>
          <h3>{alphaState.stage}</h3>
          <dl className="alpha-metrics">
            <div>
              <dt>Readiness</dt>
              <dd>{alphaState.readinessPercent}%</dd>
            </div>
            <div>
              <dt>Tester goal</dt>
              <dd>{alphaState.testerSlots.length}</dd>
            </div>
          </dl>
        </article>

        <article className="alpha-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <MousePointer2 size={17} />
            </span>
            <p className="eyebrow">First Win</p>
          </div>
          <h3>{selectedPath?.label ?? "Choose one path"}</h3>
          <p>{selectedPath?.firstWin ?? alphaState.successDefinition}</p>
        </article>

        <article className="alpha-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <UsersRound size={17} />
            </span>
            <p className="eyebrow">Founders Circle</p>
          </div>
          <h3>First 5 testers</h3>
          <p>
            Free for {alphaState.freeMonths} months in exchange for short,
            honest feedback after real sessions.
          </p>
        </article>
      </div>

      <div className="alpha-readiness-grid">
        {alphaState.readinessItems.map((item) => (
          <article
            className={`alpha-readiness-item alpha-readiness-item--${item.status}`}
            key={item.id}
          >
            <div>
              {item.status === "ready" ? (
                <CheckCircle2 size={16} />
              ) : (
                <CircleAlert size={16} />
              )}
              <strong>{item.label}</strong>
            </div>
            <p>{item.detail}</p>
            <span>{item.status.replaceAll("_", " ")}</span>
          </article>
        ))}
      </div>

      <div className="alpha-tester-grid">
        {alphaState.testerSlots.map((slot) => (
          <article key={slot.slot}>
            <strong>{slot.label}</strong>
            <span>{slot.status.replaceAll("_", " ")}</span>
            <p>{slot.participation}</p>
          </article>
        ))}
      </div>

      <div className="alpha-feedback-reminder">
        <MessageCircle size={17} />
        <p>{alphaState.feedbackReminder}</p>
      </div>

      <div className="alpha-command-actions">
        {alphaCommands.map((command) => (
          <button
            className="secondary-button"
            key={command}
            type="button"
            onClick={() => onCommand(command)}
          >
            {command}
          </button>
        ))}
      </div>
    </section>
  );
}
