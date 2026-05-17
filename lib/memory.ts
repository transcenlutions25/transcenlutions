import type { ActionResult, TayResponse } from "./types";

export type MemoryCategory =
  | "goal"
  | "offer"
  | "buyer_signal"
  | "boundary"
  | "plan"
  | "note";

export interface MemoryEntry {
  id: string;
  timestamp: string;
  category: MemoryCategory;
  title: string;
  detail: string;
}

export const memoryCategoryLabels: Record<MemoryCategory, string> = {
  goal: "Goal",
  offer: "Offer",
  buyer_signal: "Buyer signal",
  boundary: "Boundary",
  plan: "Plan",
  note: "Note",
};

export function createSessionMemoryEntry(
  response: TayResponse,
  result?: ActionResult,
): MemoryEntry | null {
  if (response.intent === "clarify_request") {
    return null;
  }

  if (response.action.permissionStatus === "blocked") {
    return createMemoryEntry(
      "boundary",
      "Stopped request",
      "Tay blocked a request that crossed a safety or control boundary.",
    );
  }

  if (response.action.permissionStatus === "requires_approval" && !result) {
    return createMemoryEntry(
      "boundary",
      "Approval needed",
      "Tay paused a request before outside services, payment handling, or autonomous work.",
    );
  }

  if (response.intent === "handle_buyer_reply") {
    return createMemoryEntry(
      result?.status === "failed" ? "boundary" : "buyer_signal",
      result?.status === "failed" ? "Buyer sale stopped" : "Buyer reply routed",
      result?.nextStep ?? "Tay reviewed a buyer reply and recommended a visible follow-up.",
    );
  }

  if (response.intent === "sell_offer") {
    return createMemoryEntry(
      "offer",
      "Revenue offer prepared",
      result?.nextStep ?? "A paid offer was prepared for a careful buyer handoff.",
    );
  }

  if (response.intent === "build_feature") {
    return createMemoryEntry(
      "goal",
      "Business build request",
      result?.nextStep ?? "A business-building request was routed into Tay.",
    );
  }

  if (response.intent === "write_plan") {
    return createMemoryEntry(
      "plan",
      "Plan request",
      result?.nextStep ?? "A planning request was routed into Tay.",
    );
  }

  if (response.intent === "record_note") {
    return createMemoryEntry(
      "note",
      "Session note",
      response.userText.trim(),
    );
  }

  return null;
}

export function addSessionMemoryEntry(
  entries: MemoryEntry[],
  entry: MemoryEntry | null,
) {
  if (!entry) return entries;

  const withoutDuplicate = entries.filter(
    (current) =>
      current.category !== entry.category ||
      current.title !== entry.title ||
      current.detail !== entry.detail,
  );

  return [entry, ...withoutDuplicate].slice(0, 8);
}

function createMemoryEntry(
  category: MemoryCategory,
  title: string,
  detail: string,
): MemoryEntry {
  return {
    id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    category,
    title,
    detail,
  };
}
