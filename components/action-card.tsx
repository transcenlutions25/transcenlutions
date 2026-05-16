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
  const canRequestApproval =
    response.action.permissionStatus === "requires_approval" &&
    executionStatus !== "running" &&
    executionStatus !== "failed";

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

      {canExecute ? (
        <button className="primary-button" onClick={onExecute}>
          <Play size={16} />
          Execute
        </button>
      ) : null}

      {canRequestApproval ? (
        <button className="secondary-button" onClick={onExecute}>
          <Lock size={16} />
          Request approval
        </button>
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
            <span className="icon-disc icon-disc--success">
              <CheckCircle2 size={16} />
            </span>
            <p className="eyebrow">Result</p>
          </div>
          <p>{result.result}</p>
          <p className="muted">{result.nextStep}</p>
          <button
            className="secondary-button"
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
