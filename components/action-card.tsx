import type { ActionResult, ExecutionStatus, TayResponse } from "../lib/types";
import {
  actionLabels,
  executionLabels,
  intentLabels,
  permissionLabels,
} from "../lib/public-copy";

interface ActionCardProps {
  response: TayResponse | null;
  executionStatus: ExecutionStatus;
  result: ActionResult | null;
  onExecute: () => void;
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
}: ActionCardProps) {
  if (!response) {
    return (
      <aside className="panel action-card">
        <p className="eyebrow">Next Move</p>
        <h2>Waiting for a request</h2>
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

  return (
    <aside className="panel action-card" aria-live="polite">
      <p className="eyebrow">Next Move</p>
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
          Execute
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
          <p className="eyebrow">Result</p>
          <p>{result.result}</p>
          <p className="muted">{result.nextStep}</p>
        </div>
      ) : (
        <p className="next-step">{response.nextStep}</p>
      )}
    </aside>
  );
}
