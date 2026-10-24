/**
 * Verified task completion records that can be announced without changing
 * queue history, browser state, financial evidence, or approval decisions.
 */
export interface CompletedWorkNotice {
  id: string;
  title: string;
  summary: string;
  nextStep?: string;
}

/** Deduplicate poll responses and repeated execution result renders. */
export function unseenCompletedWork(
  completed: readonly CompletedWorkNotice[],
  seen: ReadonlySet<string>,
): CompletedWorkNotice[] {
  const ids = new Set(seen);
  return completed.filter((item) => {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

/** Keep the transient announcement surface quiet; history lives elsewhere. */
export function appendRecentCompletions(
  current: readonly CompletedWorkNotice[],
  incoming: readonly CompletedWorkNotice[],
  limit = 3,
): CompletedWorkNotice[] {
  if (!Number.isFinite(limit) || Math.floor(limit) <= 0) return [];
  return [...current, ...unseenCompletedWork(incoming, new Set(current.map((item) => item.id)))]
    .slice(-Math.floor(limit));
}

