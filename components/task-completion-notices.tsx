"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  appendRecentCompletions,
  unseenCompletedWork,
  type CompletedWorkNotice,
} from "../lib/task-completion-notices";

interface TaskCompletionNoticesProps {
  /** Change the component key when switching conversations or desktop sessions. */
  completed: readonly CompletedWorkNotice[];
  ready?: boolean;
  onOpenHistory?: () => void;
}

function CompletionCard({
  notice,
  onDismiss,
  onOpenHistory,
}: {
  notice: CompletedWorkNotice;
  onDismiss: () => void;
  onOpenHistory?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const timeout = window.setTimeout(() => setLeaving(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [expanded]);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(onDismiss, 240);
    return () => window.clearTimeout(timeout);
  }, [leaving, onDismiss]);

  return (
    <article className={`tay-completion-card${leaving ? " tay-completion-card--leaving" : ""}`}>
      <button
        type="button"
        className="tay-completion-toggle"
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} completion details: ${notice.title}`}
        onClick={() => { setExpanded((value) => !value); setLeaving(false); }}
      >
        <CheckCircle2 aria-hidden="true" size={22} className="tay-completion-check" />
        <span className="tay-completion-label"><strong>Completed</strong><span>{notice.title}</span></span>
        {expanded ? <ChevronUp aria-hidden="true" size={17} /> : <ChevronDown aria-hidden="true" size={17} />}
      </button>
      {expanded ? (
        <div className="tay-completion-detail">
          <p>{notice.summary}</p>
          {notice.nextStep ? <p><strong>Next step:</strong> {notice.nextStep}</p> : null}
          <div className="tay-completion-actions">
            {onOpenHistory ? <button type="button" onClick={onOpenHistory}>Open activity</button> : null}
            <button type="button" onClick={onDismiss}><X aria-hidden="true" size={15} /> Dismiss</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Only announce transitions observed in this mounted session. Previously
 * completed work is seeded into the seen set, so reloads and conversation
 * switching do not replay old notifications. Completion history is untouched.
 */
export function TaskCompletionNotices({ completed, ready = true, onOpenHistory }: TaskCompletionNoticesProps) {
  const [visible, setVisible] = useState<CompletedWorkNotice[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!seeded.current) {
      seenIds.current = new Set(completed.map((item) => item.id));
      seeded.current = true;
      return;
    }
    const incoming = unseenCompletedWork(completed, seenIds.current);
    if (incoming.length === 0) return;
    for (const item of incoming) seenIds.current.add(item.id);
    setVisible((current) => appendRecentCompletions(current, incoming));
  }, [completed, ready]);

  if (visible.length === 0) return null;

  return (
    <div className="tay-completion-list" aria-live="polite" aria-label="Recently completed tasks">
      {visible.map((notice) => (
        <CompletionCard
          key={notice.id}
          notice={notice}
          onDismiss={() => setVisible((current) => current.filter((item) => item.id !== notice.id))}
          onOpenHistory={onOpenHistory}
        />
      ))}
    </div>
  );
}

