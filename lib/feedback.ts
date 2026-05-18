import type { ActionResult, TayResponse } from "./types";

export type FeedbackSource = "one_tap" | "natural_chat" | "weekly_check_in";
export type FeedbackSentiment = "positive" | "neutral" | "negative";
export type FeedbackRating = "helped" | "kinda" | "didnt_help";
export type FeedbackSignalStrength = "none" | "low" | "emerging" | "high";
export type FeedbackImprovementStatus =
  | "auto_allowed"
  | "approval_required"
  | "blocked_protected";

export type FeedbackCategory =
  | "bug"
  | "confusion"
  | "ux_friction"
  | "wrong_answer"
  | "too_long"
  | "didnt_solve"
  | "missing_feature"
  | "new_idea"
  | "safety_concern"
  | "revenue_opportunity"
  | "praise"
  | "high_value_request"
  | "emotional_frustration"
  | "other";

export interface FeedbackEntry {
  id: string;
  source: FeedbackSource;
  sentiment: FeedbackSentiment;
  category: FeedbackCategory;
  label: string;
  detail: string;
  note?: string;
  score?: number;
  relatedActionId?: string;
  relatedActionTitle?: string;
  createdAt: string;
}

export interface FeedbackDraft {
  relatedActionId: string;
  rating?: FeedbackRating;
  category?: FeedbackCategory;
  note: string;
}

export interface FeedbackInsightBlock {
  title: string;
  value: string;
  detail: string;
  count: number;
}

export interface FeedbackRatingCounts {
  helped: number;
  kinda: number;
  didntHelp: number;
}

export interface FeedbackImprovementPolicy {
  status: FeedbackImprovementStatus;
  label: "auto-allowed" | "approval-required" | "blocked/protected";
  title: string;
  detail: string;
}

export interface FeedbackInsights {
  totalCount: number;
  ratingCounts: FeedbackRatingCounts;
  naturalSignalCount: number;
  signalStrength: FeedbackSignalStrength;
  signalLabel: string;
  topReasons: FeedbackInsightBlock[];
  naturalSignals: FeedbackInsightBlock[];
  topConfusion: FeedbackInsightBlock;
  mostRequested: FeedbackInsightBlock;
  mostLoved: FeedbackInsightBlock;
  mostFrustrating: FeedbackInsightBlock;
  recommendation: string;
  improvementPolicy: FeedbackImprovementPolicy;
  boundaryStatus: string;
  allowedInfluence: string[];
  protectedBoundaries: string[];
}

export const feedbackRatingChoices: Array<{
  rating: FeedbackRating;
  label: string;
  detail: string;
}> = [
  {
    rating: "helped",
    label: "Helped",
    detail: "This response moved the work forward.",
  },
  {
    rating: "kinda",
    label: "Kinda",
    detail: "Some value, but something was off.",
  },
  {
    rating: "didnt_help",
    label: "Didn't help",
    detail: "The response did not solve the problem.",
  },
];

export const frictionReasonChoices: Array<{
  category: FeedbackCategory;
  label: string;
}> = [
  { category: "confusion", label: "Confusing" },
  { category: "wrong_answer", label: "Wrong" },
  { category: "too_long", label: "Too long" },
  { category: "didnt_solve", label: "Didn't solve problem" },
  { category: "missing_feature", label: "Missing feature" },
  { category: "bug", label: "Bug" },
  { category: "other", label: "Other" },
];

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  bug: "Bug",
  confusion: "Confusion",
  ux_friction: "UX friction",
  wrong_answer: "Wrong answer",
  too_long: "Too long",
  didnt_solve: "Didn't solve",
  missing_feature: "Missing feature",
  new_idea: "New idea",
  safety_concern: "Safety concern",
  revenue_opportunity: "Revenue opportunity",
  praise: "Praise",
  high_value_request: "High-value request",
  emotional_frustration: "Emotional frustration",
  other: "Other",
};

const protectedBoundaries = [
  "mission",
  "values",
  "product direction",
  "governance",
  "payments",
  "privacy",
  "security",
  "legal copy",
  "user data handling",
  "memory architecture",
];

const allowedInfluence = [
  "wording",
  "clarity",
  "onboarding",
  "help text",
  "UX friction",
  "minor layout improvements",
];

const naturalSignals: Array<{
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  label: string;
  detail: string;
  terms: string[];
}> = [
  {
    category: "bug",
    sentiment: "negative",
    label: "Bug",
    detail: "A user described something as broken or not working.",
    terms: ["bug", "broken", "not working", "error", "glitch"],
  },
  {
    category: "wrong_answer",
    sentiment: "negative",
    label: "Wrong answer",
    detail: "A user said Tay's answer missed or contradicted the need.",
    terms: ["wrong answer", "this is wrong", "wrong", "incorrect", "not what i asked"],
  },
  {
    category: "confusion",
    sentiment: "negative",
    label: "Confusion",
    detail: "A user showed confusion or trouble understanding the response.",
    terms: [
      "confused",
      "confusing",
      "i don't get it",
      "i dont get it",
      "i don't understand",
      "i dont understand",
      "lost",
    ],
  },
  {
    category: "too_long",
    sentiment: "negative",
    label: "Too long",
    detail: "A user signaled that the response felt too long or heavy.",
    terms: ["too long", "too much text", "overwhelming"],
  },
  {
    category: "didnt_solve",
    sentiment: "negative",
    label: "Didn't solve",
    detail: "A user said the response did not solve the problem.",
    terms: ["didn't solve", "didnt solve", "not helpful", "didn't help"],
  },
  {
    category: "emotional_frustration",
    sentiment: "negative",
    label: "Frustration",
    detail: "A user showed frustration, discouragement, or fatigue.",
    terms: ["frustrated", "annoying", "stuck", "discouraged", "tired"],
  },
  {
    category: "missing_feature",
    sentiment: "neutral",
    label: "Missing feature",
    detail: "A user asked for a capability Tay does not clearly have yet.",
    terms: ["i wish it", "i wish it did", "missing feature", "feature request", "wish tay"],
  },
  {
    category: "safety_concern",
    sentiment: "negative",
    label: "Safety concern",
    detail: "A user mentioned a protected area such as payment, privacy, security, legal, data, memory, mission, values, or governance.",
    terms: [
      "payment handling",
      "payments",
      "stripe",
      "privacy",
      "security",
      "legal",
      "user data",
      "memory architecture",
      "mission",
      "values",
      "governance",
    ],
  },
  {
    category: "new_idea",
    sentiment: "neutral",
    label: "New idea",
    detail: "A user suggested a possible future improvement.",
    terms: ["should add", "new idea", "could tay", "can tay also"],
  },
  {
    category: "revenue_opportunity",
    sentiment: "positive",
    label: "Revenue opportunity",
    detail: "A user connected the experience to willingness to pay or sell.",
    terms: ["would pay", "charge for", "sell this", "paid version"],
  },
  {
    category: "praise",
    sentiment: "positive",
    label: "Praise",
    detail: "A user said Tay helped or created value.",
    terms: ["helpful", "helped me", "this helped", "great", "love this"],
  },
];

const feedbackOnlyBlockers = [
  "build",
  "create",
  "prepare",
  "show",
  "send",
  "log",
  "run",
  "delete",
  "charge",
  "checkout",
  "offer",
  "plan",
  "feature",
];

export function createFeedbackDraft(relatedActionId: string): FeedbackDraft {
  return {
    relatedActionId,
    note: "",
  };
}

export function createOneTapFeedbackEntry({
  response,
  result,
  rating,
  category,
  note,
}: {
  response: TayResponse;
  result: ActionResult;
  rating: FeedbackRating;
  category?: FeedbackCategory;
  note?: string;
}): FeedbackEntry {
  const defaultCategory = getDefaultCategoryForRating(rating);

  return {
    id: `feedback-${response.id}`,
    source: "one_tap",
    sentiment: getSentimentForRating(rating),
    category: category ?? defaultCategory,
    label: feedbackCategoryLabels[category ?? defaultCategory],
    detail: `User rated Tay's result as ${rating.replace("_", " ")}.`,
    note: note?.trim() || undefined,
    relatedActionId: response.id,
    relatedActionTitle: response.action.title,
    createdAt: new Date().toISOString(),
  };
}

export function createNaturalFeedbackEntry(input: string): FeedbackEntry | null {
  const signal = detectNaturalFeedback(input);
  if (!signal) return null;

  return {
    id: `feedback-natural-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    source: "natural_chat",
    sentiment: signal.sentiment,
    category: signal.category,
    label: signal.label,
    detail: signal.detail,
    note: input.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function createWeeklyCheckInEntry({
  score,
  helpedMost,
  frustrated,
  improveNext,
}: {
  score: number;
  helpedMost: string;
  frustrated: string;
  improveNext: string;
}): FeedbackEntry {
  const cleanedScore = Math.min(10, Math.max(1, Math.round(score)));
  const category = cleanedScore >= 8 ? "praise" : cleanedScore >= 5 ? "ux_friction" : "didnt_solve";

  return {
    id: `feedback-weekly-${Date.now()}`,
    source: "weekly_check_in",
    sentiment: cleanedScore >= 8 ? "positive" : cleanedScore >= 5 ? "neutral" : "negative",
    category,
    label: "Weekly check-in",
    detail: `Weekly usefulness score: ${cleanedScore}/10.`,
    note: [
      helpedMost.trim() ? `Helped most: ${helpedMost.trim()}` : "",
      frustrated.trim() ? `Frustrated: ${frustrated.trim()}` : "",
      improveNext.trim() ? `Improve next: ${improveNext.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    score: cleanedScore,
    createdAt: new Date().toISOString(),
  };
}

export function upsertFeedbackEntry(
  entries: FeedbackEntry[],
  entry: FeedbackEntry,
) {
  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex === -1) return [entry, ...entries];

  return entries.map((item, index) => (index === existingIndex ? entry : item));
}

export function detectNaturalFeedback(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  return (
    naturalSignals.find((signal) =>
      signal.terms.some((term) => normalized.includes(term)),
    ) ?? null
  );
}

export function isFeedbackOnlyInput(input: string) {
  const normalized = input.trim().toLowerCase();
  const signal = detectNaturalFeedback(normalized);
  if (!signal) return false;

  return !feedbackOnlyBlockers.some((term) => normalized.includes(term));
}

export function createFeedbackInsights(
  entries: FeedbackEntry[],
): FeedbackInsights {
  const totalCount = entries.length;
  const topPattern = getTopPattern(entries);
  const signalStrength = getSignalStrength(topPattern.count);
  const topReasons = getTopReasonBlocks(entries);
  const naturalSignals = getTopReasonBlocks(
    entries.filter((entry) => entry.source === "natural_chat"),
  );
  const recommendation = createRecommendation(topPattern, signalStrength);
  const improvementPolicy = classifyFeedbackImprovement(topPattern.category);

  return {
    totalCount,
    ratingCounts: getRatingCounts(entries),
    naturalSignalCount: entries.filter((entry) => entry.source === "natural_chat")
      .length,
    signalStrength,
    signalLabel: getSignalLabel(signalStrength),
    topReasons,
    naturalSignals,
    topConfusion: createBlock(
      "Top confusion",
      entries,
      ["confusion", "wrong_answer"],
    ),
    mostRequested: createBlock(
      "Most requested",
      entries,
      ["missing_feature", "new_idea", "high_value_request"],
    ),
    mostLoved: createBlock("Most loved", entries, ["praise"]),
    mostFrustrating: createBlock(
      "Most frustrating",
      entries,
      ["ux_friction", "too_long", "didnt_solve", "emotional_frustration", "bug"],
    ),
    recommendation,
    improvementPolicy,
    boundaryStatus:
      improvementPolicy.status === "blocked_protected"
        ? "Protected boundary active"
        : "Mission and governance protected",
    allowedInfluence,
    protectedBoundaries,
  };
}

export function classifyFeedbackImprovement(
  categoryOrText: FeedbackCategory | string,
): FeedbackImprovementPolicy {
  const normalized = categoryOrText.toLowerCase();

  if (containsProtectedBoundary(normalized)) {
    return {
      status: "blocked_protected",
      label: "blocked/protected",
      title: "Protected product boundary",
      detail:
        "Feedback cannot directly change mission, values, governance, payments, privacy, security, legal copy, user data handling, or memory architecture.",
    };
  }

  if (
    [
      "missing_feature",
      "new_idea",
      "high_value_request",
      "revenue_opportunity",
      "bug",
    ].includes(normalized) ||
    [
      "feature",
      "workflow",
      "pricing",
      "automation",
      "redesign",
      "agent",
      "checkout",
      "database",
    ].some((term) => normalized.includes(term))
  ) {
    return {
      status: "approval_required",
      label: "approval-required",
      title: "Founder review required",
      detail:
        "This signal may be useful, but it needs approval before it becomes a new feature, workflow, price, or automation change.",
    };
  }

  return {
    status: "auto_allowed",
    label: "auto-allowed",
    title: "Safe improvement lane",
    detail:
      "This feedback may improve wording, clarity, onboarding, help text, UX friction, or minor layout polish.",
  };
}

function getDefaultCategoryForRating(rating: FeedbackRating): FeedbackCategory {
  if (rating === "helped") return "praise";
  if (rating === "kinda") return "ux_friction";
  return "didnt_solve";
}

function getSentimentForRating(rating: FeedbackRating): FeedbackSentiment {
  if (rating === "helped") return "positive";
  if (rating === "kinda") return "neutral";
  return "negative";
}

function getRatingCounts(entries: FeedbackEntry[]): FeedbackRatingCounts {
  return {
    helped: entries.filter(
      (entry) => entry.source === "one_tap" && entry.sentiment === "positive",
    ).length,
    kinda: entries.filter(
      (entry) => entry.source === "one_tap" && entry.sentiment === "neutral",
    ).length,
    didntHelp: entries.filter(
      (entry) => entry.source === "one_tap" && entry.sentiment === "negative",
    ).length,
  };
}

function getTopReasonBlocks(entries: FeedbackEntry[]) {
  const counts = new Map<FeedbackCategory, number>();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({
      title: feedbackCategoryLabels[category],
      value: feedbackCategoryLabels[category],
      detail: getPatternDetail(count),
      count,
    }));
}

function createBlock(
  title: string,
  entries: FeedbackEntry[],
  categories: FeedbackCategory[],
): FeedbackInsightBlock {
  const matches = entries.filter((entry) => categories.includes(entry.category));
  const pattern = getTopPattern(matches);

  if (pattern.count === 0) {
    return {
      title,
      value: "No signal yet",
      detail: "Keep collecting one-tap and natural feedback.",
      count: 0,
    };
  }

  return {
    title,
    value: pattern.label,
    detail: getPatternDetail(pattern.count),
    count: pattern.count,
  };
}

function getTopPattern(entries: FeedbackEntry[]) {
  const counts = new Map<FeedbackCategory, number>();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  const [category = "other", count = 0] =
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];

  return {
    category: category as FeedbackCategory,
    count,
    label: count > 0 ? feedbackCategoryLabels[category as FeedbackCategory] : "No signal yet",
  };
}

function getSignalStrength(count: number): FeedbackSignalStrength {
  if (count === 0) return "none";
  if (count >= 7) return "high";
  if (count >= 3) return "emerging";
  return "low";
}

function getSignalLabel(signalStrength: FeedbackSignalStrength) {
  if (signalStrength === "high") return "High signal";
  if (signalStrength === "emerging") return "Emerging pattern";
  if (signalStrength === "low") return "Low signal";
  return "No signal yet";
}

function getPatternDetail(count: number) {
  if (count >= 7) return `${count} matching signals. Improvement is ready for review.`;
  if (count >= 3) return `${count} matching signals. Watch closely before changing the system.`;
  return `${count} signal. Do not change direction from one voice.`;
}

function createRecommendation(
  pattern: { category: FeedbackCategory; count: number; label: string },
  signalStrength: FeedbackSignalStrength,
) {
  if (signalStrength === "none") {
    return "Collect five-second feedback after completed actions.";
  }

  if (signalStrength === "low") {
    return "Park the signal and keep collecting; one loud response does not steer the product.";
  }

  if (pattern.category === "confusion" || pattern.category === "wrong_answer") {
    return "Recommended improvement available: clarify the confusing step before adding features.";
  }

  if (pattern.category === "missing_feature" || pattern.category === "new_idea") {
    return "Recommended improvement available: write a scoped proposal and route it through governance.";
  }

  if (pattern.category === "too_long" || pattern.category === "ux_friction") {
    return "Recommended improvement available: shorten the answer path and reduce friction.";
  }

  if (pattern.category === "praise") {
    return "Repeat what users value while keeping the mission protected.";
  }

  return "Recommended improvement available: review the pattern before changing the product.";
}

function containsProtectedBoundary(value: string) {
  return [
    "mission",
    "values",
    "product direction",
    "governance",
    "payment",
    "payments",
    "stripe",
    "privacy",
    "security",
    "legal",
    "user data",
    "data handling",
    "memory architecture",
    "safety_concern",
  ].some((term) => value.includes(term));
}
