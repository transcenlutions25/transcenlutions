"use client";

import {
  CheckCircle2,
  CircleAlert,
  Compass,
  Flag,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import type { LaunchReadinessState } from "../lib/launch-readiness";

interface LaunchReadinessPanelProps {
  launchReadiness: LaunchReadinessState;
  onCommand: (request: string) => void;
}

const launchCommands = [
  "Show launch readiness",
  "Prepare Tay onboarding question",
  "Show blocked launch items",
  "Prepare first use case: AI business guidance",
];

export function LaunchReadinessPanel({
  launchReadiness,
  onCommand,
}: LaunchReadinessPanelProps) {
  return (
    <section className="launch-command" aria-label="Launch readiness layer">
      <div className="section-header">
        <p className="eyebrow">Launch Readiness</p>
        <h2>Turn the foundation into one controlled public launch.</h2>
        <p>
          Tay shows what is ready, what is blocked, which setup item matters
          most, and the first use case to prove with a real person.
        </p>
      </div>

      <div className="launch-truth-grid">
        <article className="launch-card launch-card--primary">
          <div className="card-title-row">
            <span className="icon-disc">
              <Flag size={17} />
            </span>
            <p className="eyebrow">Current Phase</p>
          </div>
          <h3>{launchReadiness.currentPhase}</h3>
          <dl className="launch-metrics">
            <div>
              <dt>Launch readiness</dt>
              <dd>{launchReadiness.launchReadinessPercent}%</dd>
            </div>
            <div>
              <dt>Revenue readiness</dt>
              <dd>{launchReadiness.revenueReadinessPercent}%</dd>
            </div>
          </dl>
        </article>

        <article className="launch-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <Compass size={17} />
            </span>
            <p className="eyebrow">Top Priority</p>
          </div>
          <h3>{launchReadiness.topPriority}</h3>
          <p>Clear this before adding more product surface.</p>
        </article>

        <article className="launch-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <Rocket size={17} />
            </span>
            <p className="eyebrow">First Use Case</p>
          </div>
          <h3>{launchReadiness.firstUseCase}</h3>
          <p>Help one user clarify an offer, plan revenue, and choose a move.</p>
        </article>
      </div>

      <div className="launch-setup-grid">
        {launchReadiness.setupItems.map((item) => (
          <article
            className={`launch-setup-item launch-setup-item--${item.status}`}
            key={item.id}
          >
            <div>
              {item.status === "configured" ? (
                <CheckCircle2 size={16} />
              ) : (
                <CircleAlert size={16} />
              )}
              <strong>{item.label}</strong>
            </div>
            <p>{item.detail}</p>
            <span>{item.status === "configured" ? "configured" : "setup required"}</span>
          </article>
        ))}
      </div>

      <div className="launch-onboarding">
        <div>
          <p className="eyebrow">Tay Onboarding</p>
          <h3>{launchReadiness.onboardingQuestion}</h3>
          <p>
            Tay routes the answer into one path and one first move before
            suggesting any wider build.
          </p>
        </div>
        <div className="launch-path-grid">
          {launchReadiness.onboardingPaths.map((path) => (
            <article key={path.id}>
              <strong>{path.label}</strong>
              <p>{path.prompt}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="launch-blockers">
        <div className="card-title-row">
          <span className="icon-disc">
            <ShieldCheck size={17} />
          </span>
          <p className="eyebrow">Blocked Items</p>
        </div>
        <div className="launch-pill-list">
          {launchReadiness.blockedItems.length > 0 ? (
            launchReadiness.blockedItems.map((item) => (
              <span key={item}>{item}</span>
            ))
          ) : (
            <span>No launch blockers detected</span>
          )}
        </div>
      </div>

      <div className="launch-command-actions">
        {launchCommands.map((command) => (
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
