import type { ActionArtifact, ActionResult } from "./types";

export type AlphaPathId =
  | "business"
  | "focus_productivity"
  | "revenue"
  | "planning"
  | "content"
  | "personal_growth";

export type AlphaReadinessStatus = "ready" | "watching" | "needs_attention";

export interface AlphaPath {
  id: AlphaPathId;
  label: string;
  question: string;
  firstWin: string;
  starterCommand: string;
}

export interface AlphaReadinessItem {
  id: string;
  label: string;
  status: AlphaReadinessStatus;
  detail: string;
}

export interface AlphaTesterSlot {
  slot: number;
  label: string;
  status: "open" | "invite_ready" | "session_ready";
  participation: string;
}

export interface AlphaAhaMoment {
  id: string;
  trigger: string;
  command: string;
  result: string;
}

export interface PrivateAlphaState {
  stage: string;
  promise: string;
  testerGoal: string;
  freeMonths: number;
  successDefinition: string;
  readinessPercent: number;
  readinessItems: AlphaReadinessItem[];
  paths: AlphaPath[];
  ahaMoments: AlphaAhaMoment[];
  testerSlots: AlphaTesterSlot[];
  feedbackReminder: string;
}

export const privateAlphaPaths: AlphaPath[] = [
  {
    id: "business",
    label: "Business",
    question: "What business, offer, or workflow are you trying to build?",
    firstWin:
      "Turn the request into one useful offer, workflow, or operating move.",
    starterCommand:
      "Private alpha path: Business. Help me choose one business move to execute first.",
  },
  {
    id: "focus_productivity",
    label: "Focus & Productivity",
    question: "Where are you spinning, scattered, or losing time?",
    firstWin:
      "Reduce the noise into one priority, one timer, and one visible finish line.",
    starterCommand:
      "Private alpha path: Focus & Productivity. I feel scattered and need one next action.",
  },
  {
    id: "revenue",
    label: "Revenue",
    question: "What offer, buyer, or income path needs a clean next move?",
    firstWin:
      "Shape a careful revenue action without pretending payment setup is complete.",
    starterCommand:
      "Private alpha path: Revenue. Help me prepare one honest buyer-ready offer.",
  },
  {
    id: "planning",
    label: "Planning",
    question: "What needs structure before you can move?",
    firstWin:
      "Create a short plan with one priority, one boundary, and one action.",
    starterCommand:
      "Private alpha path: Planning. Help me turn this into a simple action plan.",
  },
  {
    id: "content",
    label: "Content",
    question: "What message, audience, or publishing idea needs shape?",
    firstWin:
      "Turn the idea into one clear message and one useful publishing step.",
    starterCommand:
      "Private alpha path: Content. Help me turn one idea into a clear message.",
  },
  {
    id: "personal_growth",
    label: "Personal Growth",
    question: "What habit, confidence block, or growth goal needs support?",
    firstWin:
      "Convert the struggle into one small stabilizing action and one reflection.",
    starterCommand:
      "Private alpha path: Personal Growth. Help me move through this without spinning.",
  },
];

export const alphaAhaMoments: AlphaAhaMoment[] = [
  {
    id: "overwhelmed",
    trigger: "Overwhelmed",
    command: "I feel overwhelmed and need one clear next step.",
    result:
      "Name the pressure, choose the single highest-leverage move, and start with a 10-minute action.",
  },
  {
    id: "too_many_ideas",
    trigger: "Too many ideas",
    command: "I have too many ideas and need help choosing what to do first.",
    result:
      "Sort ideas by revenue, urgency, and energy, then commit to one next step.",
  },
  {
    id: "stuck",
    trigger: "Stuck",
    command: "I am stuck and need a simple action plan.",
    result:
      "Turn the blocker into a short plan with a first move small enough to finish today.",
  },
  {
    id: "disorganized",
    trigger: "Disorganized",
    command: "I feel disorganized and need structure.",
    result:
      "Put the work into NOW, NEXT, LATER, and PARKED so the next move is obvious.",
  },
];

export const privateAlphaState: PrivateAlphaState = createPrivateAlphaState();

export function createPrivateAlphaState(): PrivateAlphaState {
  const readinessItems: AlphaReadinessItem[] = [
    {
      id: "onboarding_clarity",
      label: "Onboarding clarity",
      status: "ready",
      detail: "New testers see one promise and choose one starting path.",
    },
    {
      id: "usefulness",
      label: "Usefulness",
      status: "watching",
      detail: "Tay must help testers feel more clear, organized, or motivated.",
    },
    {
      id: "tester_readiness",
      label: "Tester readiness",
      status: "ready",
      detail: "Five Founders Circle slots are prepared for private alpha.",
    },
    {
      id: "repeat_use",
      label: "Repeat-use likelihood",
      status: "watching",
      detail: "Weekly check-ins and one-tap feedback show if Tay is worth returning to.",
    },
    {
      id: "launch_stage",
      label: "Launch stage",
      status: "ready",
      detail: "Current stage: Private Alpha Preparation.",
    },
  ];

  return {
    stage: "Private Alpha Preparation",
    promise: "Tay helps overwhelmed builders stop spinning and start executing.",
    testerGoal: "Help 5 humans get real clarity in one session.",
    freeMonths: 6,
    successDefinition:
      "A tester leaves with one clear priority, one next action, and enough relief to come back.",
    readinessPercent: getReadinessPercent(readinessItems),
    readinessItems,
    paths: privateAlphaPaths,
    ahaMoments: alphaAhaMoments,
    testerSlots: Array.from({ length: 5 }, (_, index) => ({
      slot: index + 1,
      label: `Founders Circle ${index + 1}`,
      status: index === 0 ? "invite_ready" : "open",
      participation:
        "Free for 6 months in exchange for short, honest feedback after sessions.",
    })),
    feedbackReminder:
      "Ask for one-tap feedback after results and capture natural confusion, praise, or friction.",
  };
}

export function looksLikePrivateAlphaRequest(input: string) {
  return [
    "private alpha",
    "alpha",
    "founders circle",
    "founder circle",
    "first tester",
    "tester",
    "overwhelmed",
    "too many ideas",
    "spinning",
    "stuck",
    "disorganized",
    "what do i do here",
    "where do i start",
    "first 10 minutes",
    "first ten minutes",
    "first win",
    "aha moment",
  ].some((term) => input.includes(term));
}

export function createAlphaOnboardingCommand(pathId: AlphaPathId) {
  return findAlphaPath(pathId).starterCommand;
}

export function createAlphaAhaCommand(momentId: string) {
  return (
    alphaAhaMoments.find((moment) => moment.id === momentId)?.command ??
    alphaAhaMoments[0].command
  );
}

export function createPrivateAlphaResult(
  request: string,
  state: PrivateAlphaState = privateAlphaState,
): ActionResult {
  const normalized = request.toLowerCase();
  const selectedPath = state.paths.find((path) => {
    return (
      normalized.includes(`path: ${path.label.toLowerCase()}`) ||
      normalized.includes(`path ${path.label.toLowerCase()}`)
    );
  });
  const ahaMoment = findAhaMoment(normalized, state);
  const artifact = createPrivateAlphaArtifact(state, selectedPath, ahaMoment);

  if (selectedPath) {
    return {
      status: "completed",
      result: `${selectedPath.label} path prepared: ${selectedPath.question} Tay will turn the answer into ${selectedPath.firstWin.toLowerCase()}`,
      nextStep:
        "Next step: answer the path question in one sentence, then execute the first suggested move.",
      artifact,
    };
  }

  if (ahaMoment) {
    return {
      status: "completed",
      result: `Aha moment prepared: ${ahaMoment.result}`,
      nextStep:
        "Next step: spend 10 minutes on the first move, then tell Tay what felt clearer or still stuck.",
      artifact,
    };
  }

  if (
    normalized.includes("founders circle") ||
    normalized.includes("tester") ||
    normalized.includes("invite")
  ) {
    return {
      status: "completed",
      result: `Founders Circle invite prepared: first 5 testers, free for ${state.freeMonths} months, with short feedback after each useful session.`,
      nextStep:
        "Next step: invite one trusted tester and ask them to bring one real stuck point.",
      artifact,
    };
  }

  return {
    status: "completed",
    result: `Private alpha readiness reviewed: ${state.readinessPercent}% prepared. Stage: ${state.stage}. Promise: ${state.promise}`,
    nextStep:
      "Next step: choose one alpha path or run the overwhelmed / too-many-ideas flow with a real tester.",
    artifact,
  };
}

function createPrivateAlphaArtifact(
  state: PrivateAlphaState,
  selectedPath?: AlphaPath,
  ahaMoment?: AlphaAhaMoment,
): ActionArtifact {
  return {
    title: "Private Alpha Readiness Artifact",
    subtitle:
      "A first-tester flow for making Tay immediately clear, useful, and feedback-rich.",
    sections: [
      {
        heading: "One clear promise",
        items: [state.promise],
      },
      {
        heading: "Current stage",
        items: [
          state.stage,
          `Readiness: ${state.readinessPercent}%`,
          state.successDefinition,
        ],
      },
      {
        heading: "Selected path",
        items: selectedPath
          ? [
              selectedPath.label,
              selectedPath.question,
              selectedPath.firstWin,
            ]
          : state.paths.map((path) => `${path.label}: ${path.firstWin}`),
      },
      {
        heading: "First 10-minute win",
        items: [
          ahaMoment
            ? `${ahaMoment.trigger}: ${ahaMoment.result}`
            : "Help the tester reduce overwhelm into one priority and one next action.",
          "The goal is relief and momentum, not a giant plan.",
        ],
      },
      {
        heading: "Tester invite support",
        items: [
          `First ${state.testerSlots.length} testers`,
          `Free for ${state.freeMonths} months`,
          "Feedback reminder after each result",
        ],
      },
      {
        heading: "Feedback loop",
        items: [
          state.feedbackReminder,
          "Feedback improves clarity and friction, not mission or governance.",
        ],
      },
    ],
    careNote:
      "Private alpha is measured by real usefulness: clarity, relief, one next action, and honest feedback from five humans.",
  };
}

function findAlphaPath(pathId: AlphaPathId) {
  return (
    privateAlphaPaths.find((path) => path.id === pathId) ??
    privateAlphaPaths[0]
  );
}

function findAhaMoment(input: string, state: PrivateAlphaState) {
  if (input.includes("too many ideas") || input.includes("ideas")) {
    return state.ahaMoments.find((moment) => moment.id === "too_many_ideas");
  }

  if (input.includes("stuck")) {
    return state.ahaMoments.find((moment) => moment.id === "stuck");
  }

  if (input.includes("disorganized") || input.includes("structure")) {
    return state.ahaMoments.find((moment) => moment.id === "disorganized");
  }

  if (input.includes("overwhelmed") || input.includes("spinning")) {
    return state.ahaMoments.find((moment) => moment.id === "overwhelmed");
  }

  return undefined;
}

function getReadinessPercent(items: AlphaReadinessItem[]) {
  const readyScore = items.reduce((total, item) => {
    if (item.status === "ready") return total + 1;
    if (item.status === "watching") return total + 0.5;
    return total;
  }, 0);

  return Math.round((readyScore / items.length) * 100);
}
