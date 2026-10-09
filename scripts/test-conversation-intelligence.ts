import assert from "node:assert/strict";
import {
  analyzeInteraction,
  practiceScenarios,
  scorePracticeResponse,
} from "../lib/conversation-intelligence";

const billing = analyzeInteraction(
  "I'm frustrated. I was charged twice for $97 and need this fixed today. My email is jordan@example.com",
);
assert.equal(billing.intent, "billing");
assert.equal(billing.urgency, "high");
assert.equal(billing.sentiment.label, "negative");
assert.ok(billing.entities.some((entity) => entity.type === "email"));
assert.ok(billing.entities.some((entity) => entity.type === "money"));
assert.ok(billing.recommendedNextAction.length > 20);

const sales = analyzeInteraction(
  "I'm interested in pricing for our five person team. Can I get a quote?",
);
assert.equal(sales.intent, "sales");
assert.ok(sales.keyPhrases.includes("pricing"));

const scenario = practiceScenarios.find((item) => item.id === "resolve-billing");
assert.ok(scenario);

const score = scorePracticeResponse(
  scenario,
  "I understand the duplicate charge concern. I can help verify the charge details and explain the resolution path so we can resolve this cleanly.",
);
assert.ok(score.score >= 80);
assert.equal(score.passed, true);

console.log("conversation intelligence checks passed");
