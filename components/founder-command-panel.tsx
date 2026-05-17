"use client";

import {
  CalendarCheck,
  CircleDot,
  Flag,
  HeartHandshake,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import { founderOperatingState } from "../lib/founder-os";

interface FounderCommandPanelProps {
  onCommand: (request: string) => void;
}

const founderCommands = [
  "Show today's Box 4 priorities",
  "Run weekly founder review",
  "Prepare spouse-visible focus summary",
  "Park the dating app until Box 4 is complete",
];

export function FounderCommandPanel({ onCommand }: FounderCommandPanelProps) {
  return (
    <section className="founder-command" aria-label="Founder command layer">
      <div className="section-header">
        <p className="eyebrow">Founder Command Layer</p>
        <h2>Finish the current box before expanding the empire.</h2>
        <p>
          Tay keeps today&apos;s work, weekly review, revenue action, and
          family-visible focus in one controlled operating rhythm.
        </p>
      </div>

      <div className="founder-status-grid">
        <article className="founder-card founder-card--primary">
          <div className="card-title-row">
            <span className="icon-disc">
              <Flag size={17} />
            </span>
            <p className="eyebrow">Current Focus</p>
          </div>
          <h3>{founderOperatingState.currentFocus}</h3>
          <p>Expected finish: {founderOperatingState.expectedFinish}</p>
          <div className="founder-pill-list">
            {founderOperatingState.completed.map((item) => (
              <span key={item}>
                <ShieldCheck size={14} />
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="founder-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <CalendarCheck size={17} />
            </span>
            <p className="eyebrow">Daily Execution</p>
          </div>
          <ol>
            {founderOperatingState.dailyPriorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="founder-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <CircleDot size={17} />
            </span>
            <p className="eyebrow">Revenue Actions</p>
          </div>
          <ul>
            {founderOperatingState.revenueActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="focus-lane-grid">
        {founderOperatingState.lanes.map((lane) => (
          <article className="focus-lane" key={lane.lane}>
            <strong>{lane.lane}</strong>
            <p>{lane.purpose}</p>
            <ul>
              {lane.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="founder-review-grid">
        <article className="founder-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <PauseCircle size={17} />
            </span>
            <p className="eyebrow">Anti-Distraction</p>
          </div>
          <p>{founderOperatingState.antiDistractionPrompt}</p>
          <div className="founder-pill-list">
            {founderOperatingState.notNowBacklog.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>

        <article className="founder-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <HeartHandshake size={17} />
            </span>
            <p className="eyebrow">Family Alignment</p>
          </div>
          <dl className="family-summary">
            <div>
              <dt>Current focus</dt>
              <dd>{founderOperatingState.spouseVisibleSummary.currentFocus}</dd>
            </div>
            <div>
              <dt>Expected finish</dt>
              <dd>{founderOperatingState.spouseVisibleSummary.expectedFinish}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{founderOperatingState.spouseVisibleSummary.completed}</dd>
            </div>
            <div>
              <dt>Money readiness</dt>
              <dd>{founderOperatingState.spouseVisibleSummary.moneyReadiness}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="founder-command-actions">
        {founderCommands.map((command) => (
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
