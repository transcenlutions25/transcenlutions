import { BrainCircuit, ShieldCheck } from "lucide-react";
import type { MemoryEntry } from "../lib/memory";
import { memoryCategoryLabels } from "../lib/memory";

interface MemoryPanelProps {
  entries: MemoryEntry[];
}

export function MemoryPanel({ entries }: MemoryPanelProps) {
  return (
    <section className="panel memory-panel" aria-live="polite">
      <div className="section-heading">
        <p className="eyebrow">Memory Snapshot</p>
        <span>Session only</span>
      </div>

      {entries.length === 0 ? (
        <div className="memory-empty">
          <BrainCircuit size={18} />
          <p>
            Tay will show remembered goals, offers, buyer signals, and
            boundaries here during this session.
          </p>
        </div>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{memoryCategoryLabels[entry.category]}</strong>
                <time>{entry.timestamp}</time>
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.detail}</p>
            </li>
          ))}
        </ol>
      )}

      <span className="memory-footnote">
        <ShieldCheck size={14} />
        Visible memory only. No database or hidden profile is active.
      </span>
    </section>
  );
}
