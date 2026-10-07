export type InteractionIntent =
  | "sales"
  | "support"
  | "billing"
  | "cancellation"
  | "complaint"
  | "general";

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface InteractionEntity {
  type: "email" | "phone" | "url" | "money";
  value: string;
}

export interface InteractionAnalysis {
  summary: string;
  sentiment: { label: SentimentLabel; score: number };
  intent: InteractionIntent;
  urgency: "low" | "medium" | "high";
  keyPhrases: string[];
  entities: InteractionEntity[];
  signals: string[];
  recommendedNextAction: string;
  coachingTip: string;
}

export interface PracticeScenario {
  id: string;
  title: string;
  customerMessage: string;
  goal: string;
  mustInclude: string[];
  avoid: string[];
}

export interface PracticeScore {
  score: number;
  passed: boolean;
  strengths: string[];
  improvements: string[];
}

export const practiceScenarios: PracticeScenario[] = [
  {
    id: "save-cancellation",
    title: "Save a cancellation",
    customerMessage: "I'm frustrated. The service has been slow all week and I want to cancel today.",
    goal: "Acknowledge the frustration, clarify the issue, and offer a concrete recovery path without trapping the customer.",
    mustInclude: ["frustrat", "help", "option"],
    avoid: ["guarantee", "must stay", "can't cancel"],
  },
  {
    id: "qualify-buyer",
    title: "Qualify a buyer",
    customerMessage: "I'm interested, but I need to know whether this actually fits a five-person team and what it costs.",
    goal: "Answer the fit question, clarify the buyer's use case, and move toward a transparent next step.",
    mustInclude: ["team", "cost", "next"],
    avoid: ["guarantee", "limited time", "act now"],
  },
  {
    id: "resolve-billing",
    title: "Resolve a billing concern",
    customerMessage: "I was charged twice and I need this fixed. The duplicate charge is $97.",
    goal: "Confirm the issue, gather what is needed to verify the charge, and explain the resolution path.",
    mustInclude: ["charge", "verify", "resolve"],
    avoid: ["probably", "ignore", "wait indefinitely"],
  },
];

const positiveWords = new Set(["thanks","thank","great","good","love","helpful","perfect","amazing","appreciate","resolved","happy","yes"]);
const negativeWords = new Set(["angry","bad","broken","cancel","complaint","disappointed","frustrated","hate","issue","problem","refund","slow","terrible","unhappy","wrong"]);
const stopWords = new Set(["about","after","also","and","are","because","been","but","can","could","for","from","have","how","into","just","like","need","our","please","that","the","their","there","they","this","was","what","when","where","which","with","would","you","your"]);

function words(input: string) {
  return input.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

function summarize(input: string) {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) return "No interaction text yet.";
  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences.slice(0, 2).join(" ");
  return first.length <= 280 ? first : first.slice(0, 277) + "...";
}

function detectIntent(input: string): InteractionIntent {
  const text = input.toLowerCase();
  if (/cancel|close my account|terminate|stop service/.test(text)) return "cancellation";
  if (/refund|charge|charged|invoice|billing|payment|price|fee/.test(text)) return "billing";
  if (/angry|complaint|terrible|unacceptable|frustrated|disappointed/.test(text)) return "complaint";
  if (/buy|purchase|quote|pricing|interested|demo|sales|package|plan/.test(text)) return "sales";
  if (/help|issue|problem|error|not working|reset|support|install|setup/.test(text)) return "support";
  return "general";
}

function sentiment(input: string) {
  const tokens = words(input);
  let score = 0;
  for (const token of tokens) {
    if (positiveWords.has(token)) score += 1;
    if (negativeWords.has(token)) score -= 1;
  }
  const normalized = Math.max(-1, Math.min(1, tokens.length ? score / Math.max(3, Math.sqrt(tokens.length)) : 0));
  const label: SentimentLabel = normalized > 0.18 ? "positive" : normalized < -0.18 ? "negative" : "neutral";
  return { label, score: Number(normalized.toFixed(2)) };
}

function extractEntities(input: string): InteractionEntity[] {
  const found: InteractionEntity[] = [];
  const add = (type: InteractionEntity["type"], values: string[]) => {
    for (const value of values) {
      if (!found.some((entity) => entity.type === type && entity.value === value)) found.push({ type, value });
    }
  };
  add("email", input.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? []);
  add("url", input.match(/https?:\/\/[^\s)]+/gi) ?? []);
  add("phone", input.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []);
  add("money", input.match(/(?:[$€£]\s?\d+(?:[.,]\d{1,2})?|\b\d+(?:[.,]\d{1,2})?\s?(?:usd|eur|gbp)\b)/gi) ?? []);
  return found.slice(0, 12);
}

function extractKeyPhrases(input: string) {
  const counts = new Map<string, number>();
  for (const token of words(input)) {
    if (token.length < 4 || stopWords.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([token]) => token);
}

function detectUrgency(input: string, intent: InteractionIntent, label: SentimentLabel): "low" | "medium" | "high" {
  const text = input.toLowerCase();
  if (intent === "cancellation" || /urgent|asap|immediately|today|now|fraud|charged twice|duplicate charge/.test(text)) return "high";
  if (label === "negative" || intent === "billing" || intent === "complaint") return "medium";
  return "low";
}

function recommendedNextAction(intent: InteractionIntent, urgency: "low" | "medium" | "high") {
  if (intent === "sales") return "Clarify fit, answer the buyer's stated concern, then offer one transparent next step.";
  if (intent === "billing") return "Verify the transaction details, explain the resolution path, and keep the customer updated.";
  if (intent === "cancellation") return "Acknowledge the reason, offer a recovery option, and preserve an easy path to cancel.";
  if (intent === "complaint") return "Acknowledge the impact, isolate the failure, and propose a concrete remedy.";
  if (intent === "support") return "Confirm the problem, give the smallest useful next step, and verify whether it worked.";
  return urgency === "high" ? "Confirm the immediate need and route the next safe action." : "Clarify the desired outcome and recommend one useful next step.";
}

function coachingTip(intent: InteractionIntent, label: SentimentLabel) {
  if (label === "negative") return "Lead with acknowledgment before explanation. Keep the next step specific and low-friction.";
  if (intent === "sales") return "Answer fit and price questions directly. Avoid pressure language and move toward a concrete next step.";
  return "Mirror the customer's goal in plain language, then reduce the conversation to one next move.";
}

export function analyzeInteraction(input: string): InteractionAnalysis {
  const text = input.trim();
  const detectedIntent = detectIntent(text);
  const detectedSentiment = sentiment(text);
  const detectedUrgency = detectUrgency(text, detectedIntent, detectedSentiment.label);
  const signals = [
    "Intent: " + detectedIntent,
    "Sentiment: " + detectedSentiment.label,
    "Urgency: " + detectedUrgency,
  ];
  if (/\?/.test(text)) signals.push("Customer asked a direct question");
  if (/cancel|refund|charged|complaint|frustrated|angry/i.test(text)) signals.push("Retention or service-risk signal");
  if (/buy|price|pricing|quote|interested|demo/i.test(text)) signals.push("Commercial intent signal");

  return {
    summary: summarize(text),
    sentiment: detectedSentiment,
    intent: detectedIntent,
    urgency: detectedUrgency,
    keyPhrases: extractKeyPhrases(text),
    entities: extractEntities(text),
    signals,
    recommendedNextAction: recommendedNextAction(detectedIntent, detectedUrgency),
    coachingTip: coachingTip(detectedIntent, detectedSentiment.label),
  };
}

export function scorePracticeResponse(scenario: PracticeScenario, response: string): PracticeScore {
  const normalized = response.toLowerCase();
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 40;

  const included = scenario.mustInclude.filter((term) => normalized.includes(term));
  score += included.length * 15;
  if (included.length) strengths.push("Covered " + included.length + " of " + scenario.mustInclude.length + " core ideas.");

  const avoided = scenario.avoid.filter((term) => normalized.includes(term));
  score -= avoided.length * 20;
  if (avoided.length) improvements.push("Remove pressure, coercion, or unsupported promises.");

  if (response.trim().length >= 80) {
    score += 10;
    strengths.push("Provided enough detail to be actionable.");
  } else {
    improvements.push("Add one concrete next step.");
  }

  if (/sorry|understand|frustrat|concern|thank/i.test(response)) {
    score += 10;
    strengths.push("Acknowledged the customer's perspective.");
  } else {
    improvements.push("Acknowledge the customer's perspective before solving.");
  }

  score = Math.max(0, Math.min(100, score));
  if (score < 80 && !improvements.length) improvements.push("Make the response clearer, more specific, and lower-friction.");
  return { score, passed: score >= 80, strengths, improvements };
}
