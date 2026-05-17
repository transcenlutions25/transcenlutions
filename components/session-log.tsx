import type { SessionLogEntry } from "../lib/types";
import {
  actionLabels,
  intentLabels,
  logStatusLabels,
  permissionLabels,
  riskTierLabels,
} from "../lib/public-copy";

interface SessionLogProps {
  entries: SessionLogEntry[];
}

export function SessionLog({ entries }: SessionLogProps) {
  return (
    <section className="panel session-log" aria-live="polite">
      <div className="section-heading">
        <p className="eyebrow">Activity</p>
        <span>{entries.length} entries</span>
      </div>

      {entries.length === 0 ? (
        <p className="muted">
          Tay will keep a visible record of completed, stopped, and unclear
          requests here.
        </p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <time>{entry.timestamp}</time>
                <strong>{logStatusLabels[entry.status]}</strong>
              </div>
              <p>{entry.detail}</p>
              <span>
                {intentLabels[entry.intent]} / {actionLabels[entry.actionType]}{" "}
                / {permissionLabels[entry.permissionStatus]} /{" "}
                {riskTierLabels[entry.riskTier]} {entry.riskScore}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
