"use client";

import {
  BrainCircuit,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { FeedbackInsights } from "../lib/feedback";

interface WeeklyCheckInDraft {
  score: number;
  helpedMost: string;
  frustrated: string;
  improveNext: string;
  submitted: boolean;
}

interface FeedbackInsightsPanelProps {
  insights: FeedbackInsights;
  weeklyCheckIn: WeeklyCheckInDraft;
  onWeeklyChange: (draft: WeeklyCheckInDraft) => void;
  onSubmitWeeklyCheckIn: () => void;
}

export function FeedbackInsightsPanel({
  insights,
  weeklyCheckIn,
  onWeeklyChange,
  onSubmitWeeklyCheckIn,
}: FeedbackInsightsPanelProps) {
  const insightBlocks = [
    insights.topConfusion,
    insights.mostRequested,
    insights.mostLoved,
    insights.mostFrustrating,
  ];

  return (
    <section className="panel feedback-insights" aria-label="Tay learning signals">
      <div className="section-heading">
        <p className="eyebrow">Learning Signals</p>
        <span>{insights.totalCount} captured</span>
      </div>

      <div className="feedback-count-grid" aria-label="Feedback counts">
        <article>
          <strong>{insights.ratingCounts.helped}</strong>
          <span>Helped</span>
        </article>
        <article>
          <strong>{insights.ratingCounts.kinda}</strong>
          <span>Kinda</span>
        </article>
        <article>
          <strong>{insights.ratingCounts.didntHelp}</strong>
          <span>Not helpful</span>
        </article>
        <article>
          <strong>{insights.naturalSignalCount}</strong>
          <span>Natural signals</span>
        </article>
      </div>

      <div className="feedback-signal">
        <span className="icon-disc">
          <BrainCircuit size={16} />
        </span>
        <div>
          <h2>{insights.signalLabel}</h2>
          <p>{insights.recommendation}</p>
          <span
            className={`feedback-policy feedback-policy--${insights.improvementPolicy.status}`}
          >
            {insights.improvementPolicy.label}
          </span>
        </div>
      </div>

      <div className="feedback-policy-card">
        <div>
          <ShieldCheck size={15} />
          <strong>{insights.improvementPolicy.title}</strong>
        </div>
        <p>{insights.improvementPolicy.detail}</p>
      </div>

      <div className="feedback-reason-list">
        <strong>Top reasons</strong>
        {insights.topReasons.length > 0 ? (
          <div>
            {insights.topReasons.map((reason) => (
              <span key={reason.title}>
                {reason.value} · {reason.count}
              </span>
            ))}
          </div>
        ) : (
          <p>No reasons captured yet.</p>
        )}
      </div>

      <div className="feedback-reason-list">
        <strong>Natural feedback signals</strong>
        {insights.naturalSignals.length > 0 ? (
          <div>
            {insights.naturalSignals.map((signal) => (
              <span key={signal.title}>
                {signal.value} · {signal.count}
              </span>
            ))}
          </div>
        ) : (
          <p>No natural signals captured yet.</p>
        )}
      </div>

      <div className="feedback-insight-grid">
        {insightBlocks.map((block) => (
          <article key={block.title}>
            <strong>{block.title}</strong>
            <span>{block.value}</span>
            <p>{block.detail}</p>
          </article>
        ))}
      </div>

      <div className="feedback-boundaries">
        <div>
          <LockKeyhole size={15} />
          <strong>Protected compass</strong>
        </div>
        <p>
          Feedback improves clarity, usefulness, friction, and pain points. It
          does not decide:
        </p>
        <span className="feedback-boundary-status">
          {insights.boundaryStatus}
        </span>
        <p>May influence:</p>
        <div className="feedback-boundary-list">
          {insights.allowedInfluence.map((lane) => (
            <span key={lane}>{lane}</span>
          ))}
        </div>
        <p>Protected:</p>
        <div className="feedback-boundary-list">
          {insights.protectedBoundaries.map((boundary) => (
            <span key={boundary}>{boundary}</span>
          ))}
        </div>
      </div>

      <form
        className="weekly-checkin"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitWeeklyCheckIn();
        }}
      >
        <div>
          <p className="eyebrow">Weekly Check-In</p>
          <h3>How useful has Tay been this week?</h3>
        </div>
        <label>
          <span>{weeklyCheckIn.score}/10</span>
          <input
            max="10"
            min="1"
            type="range"
            value={weeklyCheckIn.score}
            onChange={(event) =>
              onWeeklyChange({
                ...weeklyCheckIn,
                score: Number(event.target.value),
                submitted: false,
              })
            }
          />
        </label>
        <input
          aria-label="What helped most"
          placeholder="What helped most?"
          value={weeklyCheckIn.helpedMost}
          onChange={(event) =>
            onWeeklyChange({
              ...weeklyCheckIn,
              helpedMost: event.target.value,
              submitted: false,
            })
          }
        />
        <input
          aria-label="What frustrated you"
          placeholder="What frustrated you?"
          value={weeklyCheckIn.frustrated}
          onChange={(event) =>
            onWeeklyChange({
              ...weeklyCheckIn,
              frustrated: event.target.value,
              submitted: false,
            })
          }
        />
        <input
          aria-label="What should improve next"
          placeholder="What should improve next?"
          value={weeklyCheckIn.improveNext}
          onChange={(event) =>
            onWeeklyChange({
              ...weeklyCheckIn,
              improveNext: event.target.value,
              submitted: false,
            })
          }
        />
        <button className="secondary-button" type="submit">
          <Sparkles size={15} />
          Save check-in
        </button>
        {weeklyCheckIn.submitted ? (
          <p className="feedback-captured">Weekly signal captured.</p>
        ) : null}
      </form>
    </section>
  );
}

export type { WeeklyCheckInDraft };
