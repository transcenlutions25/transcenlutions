import type { ActionResult, ExecutionStatus, TayResponse } from "../lib/types";
import {
  actionLabels,
  executionLabels,
  intentLabels,
  permissionLabels,
} from "../lib/public-copy";
import { CheckCircle2, Crown, Lock, Play, ShieldAlert } from "lucide-react";

interface ActionCardProps {
  response: TayResponse | null;
  executionStatus: ExecutionStatus;
  result: ActionResult | null;
  onExecute: () => void;
  onApprove: () => void;
  onDecline: () => void;
  onFollowNextStep: (nextStep: string) => void;
}

const permissionStyles = {
  allowed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  requires_approval: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};

export function ActionCard({
  response,
  executionStatus,
  result,
  onExecute,
  onApprove,
  onDecline,
  onFollowNextStep,
}: ActionCardProps) {
  if (!response) {
    return (
      <aside className="panel action-card">
        <div className="card-title-row">
          <span className="icon-disc">
            <Crown size={16} />
          </span>
          <p className="eyebrow">Next Move</p>
        </div>
        <h2>Tay is standing by</h2>
        <p className="muted">
          Tay will review your request, propose one clear move, and wait for
          your confirmation.
        </p>
      </aside>
    );
  }

  const canExecute =
    response.action.permissionStatus === "allowed" &&
    response.action.type !== "none" &&
    executionStatus !== "running" &&
    executionStatus !== "completed";
  const canReviewApproval =
    response.action.permissionStatus === "requires_approval" &&
    executionStatus !== "running" &&
    result === null;

  return (
    <aside className="panel action-card" aria-live="polite">
      <div className="card-title-row">
        <span className="icon-disc">
          {response.action.permissionStatus === "blocked" ? (
            <ShieldAlert size={16} />
          ) : response.action.permissionStatus === "requires_approval" ? (
            <Lock size={16} />
          ) : (
            <Crown size={16} />
          )}
        </span>
        <p className="eyebrow">Next Move</p>
      </div>
      <div className="action-card__header">
        <h2>{response.action.title}</h2>
        <span className={permissionStyles[response.action.permissionStatus]}>
          {permissionLabels[response.action.permissionStatus]}
        </span>
      </div>

      <dl className="facts">
        <div>
          <dt>Request type</dt>
          <dd>{intentLabels[response.intent]}</dd>
        </div>
        <div>
          <dt>Move</dt>
          <dd>{actionLabels[response.action.type]}</dd>
        </div>
      </dl>

      <p>{response.action.summary}</p>
      <p className="muted">{response.action.permissionReason}</p>

      <div className="action-path" aria-label="Current action flow">
        <span>Intent</span>
        <span>Review</span>
        <span>{result ? executionLabels[result.status] : "Ready"}</span>
      </div>

      {canExecute ? (
        <button className="primary-button" type="button" onClick={onExecute}>
          <Play size={16} />
          Execute
        </button>
      ) : null}

      {canReviewApproval ? (
        <div className="approval-actions">
          <button className="primary-button" type="button" onClick={onApprove}>
            <Lock size={16} />
            Approve handoff
          </button>
          <button className="secondary-button" type="button" onClick={onDecline}>
            Decline
          </button>
        </div>
      ) : null}

      {executionStatus === "running" ? (
        <div className="running-state">
          <span />
          {executionLabels[executionStatus]}...
        </div>
      ) : null}

      {result ? (
        <div className="result-box">
          <div className="card-title-row">
            <span
              className={`icon-disc ${
                result.status === "completed"
                  ? "icon-disc--success"
                  : "icon-disc--warning"
              }`}
            >
              {result.status === "completed" ? (
                <CheckCircle2 size={16} />
              ) : (
                <ShieldAlert size={16} />
              )}
            </span>
            <p className="eyebrow">Result</p>
          </div>
          <p>{result.result}</p>
          {result.artifact ? (
            <div className="artifact-preview">
              <div>
                <p className="eyebrow">Delivery Artifact</p>
                <h3>{result.artifact.title}</h3>
                <p>{result.artifact.subtitle}</p>
              </div>
              <div className="artifact-section-grid">
                {result.artifact.sections.map((section) => (
                  <section key={section.heading}>
                    <strong>{section.heading}</strong>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <p className="artifact-care">{result.artifact.careNote}</p>
            </div>
          ) : null}
          <p className="muted">{result.nextStep}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onFollowNextStep(result.nextStep)}
          >
            Use next step
          </button>
        </div>
      ) : (
        <p className="next-step">{response.nextStep}</p>
      )}
    </aside>
  );
}
