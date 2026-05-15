import type { SessionLogEntry } from "../lib/types";

interface SessionLogProps {
  entries: SessionLogEntry[];
}

export function SessionLog({ entries }: SessionLogProps) {
  return (
    <section className="panel session-log" aria-live="polite">
      <div className="section-heading">
        <p className="eyebrow">Session Log</p>
        <span>{entries.length} entries</span>
      </div>

      {entries.length === 0 ? (
        <p className="muted">
          Failed, blocked, vague, unsupported, and executed actions appear here.
        </p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <time>{entry.timestamp}</time>
                <strong>{entry.status}</strong>
              </div>
              <p>{entry.detail}</p>
              <span>
                {entry.intent} / {entry.actionType} /{" "}
                {entry.permissionStatus}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
