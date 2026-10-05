import type { ActionArtifact, ActionResult } from "./types";

export type FocusLane = "NOW" | "NEXT" | "LATER" | "PARKED";

export interface FocusLaneGroup {
  lane: FocusLane;
  purpose: string;
  items: string[];
}

export interface FounderOperatingState {
  currentFocus: string;
  expectedFinish: string;
  completed: string[];
  moneyReadiness: string;
  dailyPriorities: string[];
  revenueActions: string[];
  winsCompleted: string[];
  notNowBacklog: string[];
  weeklyReview: string[];
  lanes: FocusLaneGroup[];
  antiDistractionPrompt: string;
  spouseVisibleSummary: {
    currentFocus: string;
    expectedFinish: string;
    completed: string;
    moneyReadiness: string;
  };
}

export const founderOperatingState: FounderOperatingState = {
  currentFocus: "Shared Transcenlutions platform foundation",
  expectedFinish: "Set after the next scoped milestone",
  completed: [
    "Tay command foundation",
    "Governance foundation",
    "Revenue infrastructure prepared",
  ],
  moneyReadiness:
    "Prepared, with live collection awaiting real Stripe and company email setup.",
  dailyPriorities: [
    "Advance the shared platform while preserving the full canon and Mac Tay design.",
    "Pick three priorities for today before adding new ideas.",
    "Complete one revenue-readiness action tied to Stripe, email, buyer outreach, or delivery.",
    "Record one win and one stall before ending the work session.",
  ],
  revenueActions: [
    "Verify one buyer journey from outreach to delivery artifact.",
    "Prepare one real offer handoff without sending payment before approval.",
    "Move one setup item from missing to configured when an external account is ready.",
  ],
  winsCompleted: [
    "Tay command loop is working.",
    "Governance routes allowed, approval-required, and blocked actions.",
    "Revenue setup shows what is real and what still needs external setup.",
  ],
  notNowBacklog: [
    "Dating app",
    "Crowne Legacy production pipeline (dependencies pending)",
    "advanced agent council",
    "full autonomy",
    "marketplace expansion",
  ],
  weeklyReview: [
    "What shipped this week?",
    "What stalled and why?",
    "What moved revenue readiness forward?",
    "What created context switching?",
    "What is the next verified platform milestone?",
  ],
  lanes: [
    {
      lane: "NOW",
      purpose: "Active work only.",
      items: [
        "shared platform and Mac Tay workspace",
        "daily execution rhythm",
        "weekly review rhythm",
        "family-visible focus summary",
      ],
    },
    {
      lane: "NEXT",
      purpose: "Prepared after current box is stable.",
      items: [
        "complete external revenue setup",
        "first real buyer conversation",
        "delivery workflow proof",
      ],
    },
    {
      lane: "LATER",
      purpose: "Valid future work with no action today.",
      items: [
        "persistent memory",
        "agent council",
        "Crowne Legacy and Forge production pipelines",
        "advanced autonomy",
      ],
    },
    {
      lane: "PARKED",
      purpose: "Strong ideas intentionally held back.",
      items: [
        "dating app",
        "marketplace expansion",
        "unscoped new proposals",
      ],
    },
  ],
  antiDistractionPrompt:
    "Current box incomplete. Add to backlog or continue current phase?",
  spouseVisibleSummary: {
    currentFocus: "Shared Transcenlutions platform foundation",
    expectedFinish: "Set after the next scoped milestone",
    completed: "command, governance and revenue planning foundations",
    moneyReadiness: "Prepared, awaiting Stripe/email setup",
  },
};

const expansionTerms = [
  "dating app",
  "crowne legacy",
  "dawn",
  "rory",
  "kj",
  "bidness",
  "agent council",
  "12 agents",
  "full autonomy",
  "marketplace",
  "box 5",
];

const weeklyTerms = ["weekly", "review", "stalled", "bottleneck"];
const familyTerms = ["wife", "spouse", "family", "alignment"];
const backlogTerms = ["backlog", "park", "parked", "not now", "later"];

export function looksLikeFounderFocusRequest(input: string) {
  return (
    input.includes("box 4") ||
    input.includes("founder") ||
    input.includes("focus") ||
    input.includes("priority") ||
    input.includes("priorities") ||
    input.includes("today") ||
    input.includes("daily") ||
    input.includes("next box") ||
    weeklyTerms.some((term) => input.includes(term)) ||
    familyTerms.some((term) => input.includes(term)) ||
    backlogTerms.some((term) => input.includes(term)) ||
    expansionTerms.some((term) => input.includes(term))
  );
}

export function createFounderFocusResult(request: string): ActionResult {
  const normalized = request.toLowerCase();
  const isExpansion = expansionTerms.some((term) => normalized.includes(term));
  const isWeekly = weeklyTerms.some((term) => normalized.includes(term));
  const isFamily = familyTerms.some((term) => normalized.includes(term));
  const isBacklog = backlogTerms.some((term) => normalized.includes(term));
  const artifact = createFounderArtifact();

  if (isBacklog) {
    return {
      status: "completed",
      result: `${founderOperatingState.antiDistractionPrompt} A backlog review is prepared; confirm its priority without removing it from the platform scope.`,
      nextStep:
        "Next step: finish today's scoped priority, then review the backlog item during the weekly review.",
      artifact,
    };
  }

  if (isExpansion) {
    return {
      status: "completed",
      result: "Scope review prepared: this request belongs in the broader Transcenlutions map. Review its dependencies and priority; it has not been automatically parked or removed.",
      nextStep: "Next step: select a scoped milestone that uses the shared platform services.",
      artifact,
    };
  }

  if (isWeekly) {
    return {
      status: "completed",
      result:
        "Weekly review prepared: inspect what shipped, what stalled, revenue progress, bottlenecks, and the next box before starting any expansion.",
      nextStep:
        "Next step: answer the weekly review prompts and choose one shared-platform improvement for the next work session.",
      artifact,
    };
  }

  if (isFamily) {
    return {
      status: "completed",
      result:
        `Family alignment summary prepared: ${founderOperatingState.spouseVisibleSummary.currentFocus}. Completed: ${founderOperatingState.spouseVisibleSummary.completed}. ${founderOperatingState.moneyReadiness}`,
      nextStep:
        "Next step: share the focus summary and keep new ideas in PARKED until the current box is complete.",
      artifact,
    };
  }

  return {
    status: "completed",
    result:
      "Founder command prepared: choose today's priorities, keep the current box active, preserve a not-now backlog, and move one revenue-readiness action forward.",
    nextStep:
      "Next step: complete one daily priority, record one win, and leave distractions in PARKED.",
    artifact,
  };
}

function createFounderArtifact(): ActionArtifact {
  return {
    title: "Founder Command Artifact",
    subtitle: "A focus system for launching Transcenlutions without context switching.",
    sections: [
      {
        heading: "Current focus",
        items: [
          founderOperatingState.currentFocus,
          `Expected finish: ${founderOperatingState.expectedFinish}`,
        ],
      },
      {
        heading: "Daily priorities",
        items: founderOperatingState.dailyPriorities,
      },
      {
        heading: "Revenue actions",
        items: founderOperatingState.revenueActions,
      },
      {
        heading: "Not now backlog",
        items: founderOperatingState.notNowBacklog,
      },
      {
        heading: "Weekly review",
        items: founderOperatingState.weeklyReview,
      },
      {
        heading: "Family alignment",
        items: [
          `Current focus: ${founderOperatingState.spouseVisibleSummary.currentFocus}`,
          `Expected finish: ${founderOperatingState.spouseVisibleSummary.expectedFinish}`,
          `Completed: ${founderOperatingState.spouseVisibleSummary.completed}`,
          `Money readiness: ${founderOperatingState.spouseVisibleSummary.moneyReadiness}`,
        ],
      },
    ],
    careNote:
      "The founder operating rule is simple: finish the current box before expanding the empire.",
  };
}
