"use client";

import { useMemo } from "react";
import {
  analyzeInteraction,
  practiceScenarios,
  scorePracticeResponse,
  type ConversationIntelligenceDraft, type IntelligenceMode,
} from "../lib/conversation-intelligence";

const sampleConversation =
  "Customer: I'm frustrated because I was charged twice for the $97 plan and need this fixed today. Agent: I can help with that. Can you confirm the email on the account? Customer: jordan@example.com";

export function ConversationIntelligencePanel({ draft, onDraftChange }: {
  draft: ConversationIntelligenceDraft;
  onDraftChange: (patch: Partial<ConversationIntelligenceDraft>) => void;
}) {
  const { mode, text, scenarioId, practiceResponse, submitted } = draft;

  const analysis = useMemo(() => analyzeInteraction(text), [text]);
  const scenario = practiceScenarios.find((item) => item.id === scenarioId) ?? practiceScenarios[0];
  const score = submitted ? scorePracticeResponse(scenario, practiceResponse) : null;

  return (
    <section className="panel tay-intelligence-panel">
      <p className="eyebrow">Tay Intelligence Lab</p>
      <h2>Understand, learn, practice, integrate</h2>
      <p className="muted">
        Original Transcenlutions conversation intelligence for support, sales, and operator coaching.
        Analysis runs locally in this browser and does not claim a connected external AI service.
      </p>

      <p className="tay-intelligence-retention" role="note">Drafts stay with this conversation in this open workspace. They are not synced to an account or another device. Use Export workspace in Settings before reloading or closing this workspace.</p>

      <div className="tay-mode-switch" role="group" aria-label="Intelligence lab mode">
        {(["analyze", "learn", "practice", "integrate"] as IntelligenceMode[]).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={mode === item}
            onClick={() => onDraftChange({ mode: item })}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {mode === "analyze" ? (
        <>
          {!text ? <button type="button" onClick={() => onDraftChange({ text: sampleConversation })}>Load example interaction</button> : null}
          <label>
            Conversation or customer message
            <textarea
              rows={8}
              value={text}
              onChange={(event) => onDraftChange({ text: event.target.value })}
              placeholder="Paste a support, sales, or customer interaction..."
            />
          </label>
          <div className="tay-intelligence-grid">
            <article className="tay-registry-card">
              <strong>Interaction summary</strong>
              <p>{analysis.summary}</p>
            </article>
            <article className="tay-registry-card">
              <strong>Signal</strong>
              <p>
                {analysis.sentiment.label} sentiment · {analysis.intent} · {analysis.urgency} urgency
              </p>
              <p>Sentiment score: {analysis.sentiment.score}</p>
            </article>
            <article className="tay-registry-card">
              <strong>Key phrases</strong>
              <p>{analysis.keyPhrases.length ? analysis.keyPhrases.join(" · ") : "No strong phrases yet."}</p>
            </article>
            <article className="tay-registry-card">
              <strong>Entities</strong>
              <p>
                {analysis.entities.length
                  ? analysis.entities.map((entity) => entity.type + ": " + entity.value).join(" · ")
                  : "No email, phone, URL, or money entities detected."}
              </p>
            </article>
          </div>
          <article className="tay-queue-card">
            <strong>Recommended next action</strong>
            <p>{analysis.recommendedNextAction}</p>
            <span>{analysis.coachingTip}</span>
          </article>
        </>
      ) : null}

      {mode === "learn" ? (
        <div className="tay-intelligence-lessons">
          <article className="tay-registry-card">
            <strong>1 · Read the signal</strong>
            <p>Separate the customer&apos;s goal from emotion, urgency, and commercial intent.</p>
          </article>
          <article className="tay-registry-card">
            <strong>2 · Reduce friction</strong>
            <p>Answer the clearest question first, then offer one next move instead of a wall of options.</p>
          </article>
          <article className="tay-registry-card">
            <strong>3 · Protect trust</strong>
            <p>Do not pressure, fabricate certainty, hide cancellation paths, or promise outcomes that are not verified.</p>
          </article>
          <article className="tay-registry-card">
            <strong>4 · Improve from evidence</strong>
            <p>Use summaries, key phrases, entities, sentiment, and outcomes as coaching signals—not as proof of a person&apos;s character or intent.</p>
          </article>
        </div>
      ) : null}

      {mode === "practice" ? (
        <>
          <label>
            Practice scenario
            <select
              value={scenarioId}
              onChange={(event) => {
                onDraftChange({ scenarioId: event.target.value, practiceResponse: "", submitted: false });
              }}
            >
              {practiceScenarios.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <article className="tay-queue-card">
            <strong>{scenario.title}</strong>
            <p>{scenario.customerMessage}</p>
            <span>Goal: {scenario.goal}</span>
          </article>
          <label>
            Your response
            <textarea
              rows={7}
              value={practiceResponse}
              onChange={(event) => {
                onDraftChange({ practiceResponse: event.target.value, submitted: false });
              }}
              placeholder="Write the response you would send..."
            />
          </label>
          <button type="button" onClick={() => onDraftChange({ submitted: true })} disabled={!practiceResponse.trim()}>
            Score practice
          </button>
          {score ? (
            <article className="tay-registry-card" aria-live="polite">
              <strong>{score.score}/100 · {score.passed ? "Ready" : "Keep practicing"}</strong>
              {score.strengths.map((item) => <p key={item}>✓ {item}</p>)}
              {score.improvements.map((item) => <p key={item}>→ {item}</p>)}
            </article>
          ) : null}
        </>
      ) : null}

      {mode === "integrate" ? (
        <>
          <article className="tay-registry-card">
            <strong>Integration contract</strong>
            <p>
              Pass conversation text into analyzeInteraction() and store the returned summary,
              intent, urgency, sentiment, key phrases, entities, and recommended action with the interaction record.
            </p>
          </article>
          <article className="tay-registry-card">
            <strong>Where it fits</strong>
            <p>
              Tay chat, customer-support inboxes, sales qualification, QA review, training, CRM notes, and workflow routing.
            </p>
          </article>
          <article className="tay-registry-card">
            <strong>Monetizable packaging</strong>
            <p>
              Starter: single-interaction analysis and practice. Pro: saved history, coaching trends, exports, and advanced workflow rules.
              Team: shared QA views, role-scoped integrations, and account-level analytics. Live billing remains gated by existing Transcenlutions payment and entitlement rules.
            </p>
          </article>
        </>
      ) : null}
    </section>
  );
}
