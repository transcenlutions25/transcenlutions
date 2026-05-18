"use client";

import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  Crown,
  Gem,
  Handshake,
  LockKeyhole,
  Network,
  PenLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  createSessionLogEntry,
  executeSuggestedAction,
  resolveApproval,
} from "../lib/action-engine";
import type { DeploymentReadinessState } from "../lib/deployment-readiness";
import {
  addSessionMemoryEntry,
  createSessionMemoryEntry,
} from "../lib/memory";
import type { MemoryEntry } from "../lib/memory";
import { createTayResponse } from "../lib/tay-core";
import {
  actionLabels,
  intentLabels,
  permissionLabels,
} from "../lib/public-copy";
import { futureModules } from "../lib/future-modules";
import {
  createFeedbackDraft,
  createFeedbackInsights,
  createNaturalFeedbackEntry,
  createOneTapFeedbackEntry,
  createWeeklyCheckInEntry,
  isFeedbackOnlyInput,
  upsertFeedbackEntry,
} from "../lib/feedback";
import type {
  FeedbackCategory,
  FeedbackDraft,
  FeedbackEntry,
  FeedbackRating,
} from "../lib/feedback";
import {
  createAlphaAhaCommand,
  createAlphaOnboardingCommand,
  privateAlphaState,
} from "../lib/private-alpha";
import type { AlphaPathId } from "../lib/private-alpha";
import type { LaunchReadinessState } from "../lib/launch-readiness";
import type {
  ActionResult,
  ApprovalDecision,
  ExecutionStatus,
  SessionLogEntry,
  TayResponse,
} from "../lib/types";
import type { RevenueSetupState } from "../lib/revenue-setup";
import { ActionCard } from "./action-card";
import { DeploymentReadinessPanel } from "./deployment-readiness-panel";
import {
  FeedbackInsightsPanel,
  type WeeklyCheckInDraft,
} from "./feedback-insights-panel";
import { FounderCommandPanel } from "./founder-command-panel";
import { FulfillmentPanel } from "./fulfillment-panel";
import { GovernancePanel } from "./governance-panel";
import { LaunchReadinessPanel } from "./launch-readiness-panel";
import { MemoryPanel } from "./memory-panel";
import { PrivateAlphaPanel } from "./private-alpha-panel";
import { RevenuePanel } from "./revenue-panel";
import { SalesPanel } from "./sales-panel";
import { SessionLog } from "./session-log";
import { SystemStack } from "./system-stack";

interface ChatMessage {
  id: string;
  role: "user" | "tay";
  text: string;
}

const starter = "Build the first Tay feature";
const businessFocus =
  "Stop spinning, choose one move, and execute visibly";

const quickStarts = [
  "Show private alpha readiness",
  "I have too many ideas and need help choosing what to do first.",
  "I feel overwhelmed and need one clear next step.",
  "I am stuck and need a simple action plan.",
  "I feel disorganized and need structure.",
  "Prepare Founders Circle tester invite",
  "Show today's priorities",
  "Prepare buyer outreach for the $97 Tay Command Starter Map offer",
  "Buyer replied: yes, send me the details",
  "Buyer replied: can you guarantee I will make money?",
  "Create a plan for Tay governance",
];

const tayCapabilities = [
  {
    icon: BrainCircuit,
    title: "Understands the mission",
    text: "Tay reads the request, identifies the business intent, and keeps the work pointed toward growth.",
  },
  {
    icon: Rocket,
    title: "Turns ideas into action",
    text: "Safe moves become structured tasks, plans, notes, and execution records instead of loose thoughts.",
  },
  {
    icon: ShieldCheck,
    title: "Protects the operator",
    text: "Risky requests pause for approval. Unsafe requests stop clearly and stay visible in the activity record.",
  },
];

const agentPreviews = [
  "Business Builder",
  "Writer Ally",
  "Motivation Guide",
  "Creative Producer",
];

interface ChatShellProps {
  deploymentReadiness: DeploymentReadinessState;
  launchReadiness: LaunchReadinessState;
  revenueSetup: RevenueSetupState;
}

export function ChatShell({
  deploymentReadiness,
  launchReadiness,
  revenueSetup,
}: ChatShellProps) {
  const [input, setInput] = useState("");
  const [activeResponse, setActiveResponse] = useState<TayResponse | null>(
    null,
  );
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>("idle");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [logEntries, setLogEntries] = useState<SessionLogEntry[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft | null>(
    null,
  );
  const [selectedAlphaPath, setSelectedAlphaPath] =
    useState<AlphaPathId | null>(null);
  const [weeklyCheckIn, setWeeklyCheckIn] = useState<WeeklyCheckInDraft>({
    score: 8,
    helpedMost: "",
    frustrated: "",
    improveNext: "",
    submitted: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "tay",
      text: `${privateAlphaState.promise} Choose a path or tell me where you feel stuck. I will turn it into one clear next move with visible execution and feedback.`,
    },
  ]);
  const feedbackInsights = createFeedbackInsights(feedbackEntries);

  const submitRequest = (request: string) => {
    const trimmed = request.trim();
    if (!trimmed) return;

    const naturalFeedback = createNaturalFeedbackEntry(trimmed);
    if (naturalFeedback) {
      setFeedbackEntries((entries) =>
        upsertFeedbackEntry(entries, naturalFeedback),
      );
    }

    if (naturalFeedback && isFeedbackOnlyInput(trimmed)) {
      setActiveResponse(null);
      setExecutionStatus("idle");
      setResult(null);
      setFeedbackDraft(null);
      setInput("");
      setMessages((current) => [
        ...current,
        { id: `${naturalFeedback.id}-user`, role: "user", text: trimmed },
        {
          id: `${naturalFeedback.id}-tay`,
          role: "tay",
          text: "Feedback captured. Tay will use this signal to improve clarity and usefulness while mission, values, governance, payments, privacy, security, legal copy, user data, and memory architecture stay protected.",
        },
      ]);
      return;
    }

    const response = createTayResponse(trimmed);
    const logDetail = `${intentLabels[response.intent]} reviewed. ${
      response.action.title
    }: ${permissionLabels[response.action.permissionStatus]}.`;

    setActiveResponse(response);
    setExecutionStatus("idle");
    setResult(null);
    setFeedbackDraft(null);
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `${response.id}-user`, role: "user", text: trimmed },
      {
        id: `${response.id}-tay`,
        role: "tay",
        text: `${response.message} Request type: ${
          intentLabels[response.intent]
        }. Proposed move: ${actionLabels[response.action.type]}. Status: ${
          permissionLabels[response.action.permissionStatus]
        }.`,
      },
    ]);

    if (response.shouldLogImmediately) {
      setLogEntries((entries) => [
        createSessionLogEntry(response, logDetail),
        ...entries,
      ]);
    }

    if (response.action.permissionStatus === "requires_approval") {
      setLogEntries((entries) => [
        createSessionLogEntry(response, logDetail, "approval_required"),
        ...entries,
      ]);
      setMemoryEntries((entries) =>
        addSessionMemoryEntry(entries, createSessionMemoryEntry(response)),
      );
    }

    if (response.action.permissionStatus === "blocked") {
      setMemoryEntries((entries) =>
        addSessionMemoryEntry(entries, createSessionMemoryEntry(response)),
      );
    }
  };

  const executeActiveAction = () => {
    if (!activeResponse) return;
    if (activeResponse.action.permissionStatus !== "allowed") return;

    const response = activeResponse;

    setExecutionStatus("running");
    setResult(null);

    window.setTimeout(() => {
      const actionResult = executeSuggestedAction(response, {
        launchReadinessState: launchReadiness,
      });
      setResult(actionResult);
      setFeedbackDraft(createFeedbackDraft(response.id));
      setExecutionStatus(actionResult.status);
      setMessages((current) => [
        ...current,
        {
          id: `${response.id}-result`,
          role: "tay",
          text: `${actionResult.result} ${actionResult.nextStep}`,
        },
      ]);
      setLogEntries((entries) => [
        createSessionLogEntry(
          response,
          actionResult.result,
          actionResult.status === "failed" ? "blocked" : "executed",
        ),
        ...entries,
      ]);
      setMemoryEntries((entries) =>
        addSessionMemoryEntry(
          entries,
          createSessionMemoryEntry(response, actionResult),
        ),
      );
    }, 700);
  };

  const resolveActiveApproval = (decision: ApprovalDecision) => {
    if (!activeResponse) return;
    if (activeResponse.action.permissionStatus !== "requires_approval") return;

    const response = activeResponse;

    setExecutionStatus("running");
    setResult(null);

    window.setTimeout(() => {
      const actionResult = resolveApproval(response, decision);
      const logStatus = decision === "approved" ? "approved" : "declined";

      setResult(actionResult);
      setFeedbackDraft(createFeedbackDraft(response.id));
      setExecutionStatus(actionResult.status);
      setMessages((current) => [
        ...current,
        {
          id: `${response.id}-${decision}`,
          role: "tay",
          text: `${actionResult.result} ${actionResult.nextStep}`,
        },
      ]);
      setLogEntries((entries) => [
        createSessionLogEntry(response, actionResult.result, logStatus),
        ...entries,
      ]);
      setMemoryEntries((entries) =>
        addSessionMemoryEntry(
          entries,
          createSessionMemoryEntry(response, actionResult),
        ),
      );
    }, 700);
  };

  const saveFeedbackDraft = (draft: FeedbackDraft) => {
    setFeedbackDraft(draft);

    if (!activeResponse || !result || !draft.rating) return;

    const entry = createOneTapFeedbackEntry({
      response: activeResponse,
      result,
      rating: draft.rating,
      category: draft.category,
      note: draft.note,
    });

    setFeedbackEntries((entries) => upsertFeedbackEntry(entries, entry));
  };

  const rateResult = (rating: FeedbackRating) => {
    if (!activeResponse) return;

    saveFeedbackDraft({
      relatedActionId: activeResponse.id,
      rating,
      category:
        rating === "helped"
          ? "praise"
          : feedbackDraft?.rating === rating
            ? feedbackDraft.category
            : undefined,
      note: feedbackDraft?.note ?? "",
    });
  };

  const chooseFeedbackCategory = (category: FeedbackCategory) => {
    if (!activeResponse || !feedbackDraft?.rating) return;

    saveFeedbackDraft({
      ...feedbackDraft,
      relatedActionId: activeResponse.id,
      category,
    });
  };

  const updateFeedbackNote = (note: string) => {
    if (!activeResponse || !feedbackDraft?.rating) return;

    saveFeedbackDraft({
      ...feedbackDraft,
      relatedActionId: activeResponse.id,
      note,
    });
  };

  const submitWeeklyCheckIn = () => {
    const entry = createWeeklyCheckInEntry(weeklyCheckIn);
    setFeedbackEntries((entries) => upsertFeedbackEntry(entries, entry));
    setWeeklyCheckIn((current) => ({
      ...current,
      submitted: true,
    }));
  };

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Transcenlutions LLC</p>
          <h1>Build. Command. Automate. Grow.</h1>
          <p>
            Enter Tay&apos;s royal command room for business-building,
            automation planning, creative execution, and passive-income systems.
            Speak the mission. Tay turns it into a visible next move.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => submitRequest("Build a passive income offer")}
            >
              <Sparkles size={17} />
              Start command
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => submitRequest("Create a plan for Tay governance")}
            >
              <ShieldCheck size={17} />
              Test governance
            </button>
          </div>
        </div>
        <div className="tay-visual" aria-label="Tay command interface visual">
          <div className="sacred-ring sacred-ring--outer" />
          <div className="sacred-ring sacred-ring--inner" />
          <div className="tay-orb">
            <Crown size={34} />
            <span>Tay</span>
          </div>
          <div className="orbit-chip orbit-chip--one">Intent</div>
          <div className="orbit-chip orbit-chip--two">Action</div>
          <div className="orbit-chip orbit-chip--three">Result</div>
        </div>
      </header>

      <div className="workspace">
        <main className="chat-column">
          <section className="panel chat-panel">
            <div className="section-heading">
              <p className="eyebrow">Tay Command Chat</p>
              <span>{businessFocus}</span>
            </div>

            <section
              className="alpha-onboarding-card"
              aria-label="First-time Tay onboarding"
            >
              <div>
                <p className="eyebrow">One Clear Promise</p>
                <h2>{privateAlphaState.promise}</h2>
                <p>
                  Start with one path. Tay will help you get a useful first win
                  in the first 10 minutes, then capture feedback without making
                  it homework.
                </p>
              </div>
              <div>
                <h3>What are you trying to improve or build?</h3>
                <div className="alpha-path-grid">
                  {privateAlphaState.paths.map((path) => (
                    <button
                      className={`alpha-path-button ${
                        selectedAlphaPath === path.id
                          ? "alpha-path-button--active"
                          : ""
                      }`}
                      key={path.id}
                      type="button"
                      onClick={() => {
                        setSelectedAlphaPath(path.id);
                        submitRequest(createAlphaOnboardingCommand(path.id));
                      }}
                    >
                      <strong>{path.label}</strong>
                      <span>{path.firstWin}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="alpha-aha-card">
                <div>
                  <p className="eyebrow">First 10-Minute Win</p>
                  <h3>Feeling stuck?</h3>
                </div>
                <div className="alpha-aha-grid">
                  {privateAlphaState.ahaMoments.map((moment) => (
                    <button
                      className="secondary-button"
                      key={moment.id}
                      type="button"
                      onClick={() =>
                        submitRequest(createAlphaAhaCommand(moment.id))
                      }
                    >
                      {moment.trigger}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="message-list" aria-live="polite">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`message message--${message.role}`}
                >
                  <span>{message.role === "tay" ? "Tay" : "You"}</span>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>

            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                submitRequest(input);
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={starter}
                aria-label="Send a request to Tay"
              />
              <button type="submit">Send</button>
            </form>

            <button
              className="starter-button"
              type="button"
              onClick={() => submitRequest(starter)}
            >
              Try: {starter}
            </button>

            <div className="quick-grid" aria-label="Example commands">
              {quickStarts.map((item) => (
                <button
                  className="quick-command"
                  key={item}
                  type="button"
                  onClick={() => submitRequest(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <ActionCard
            response={activeResponse}
            executionStatus={executionStatus}
            result={result}
            feedbackDraft={feedbackDraft}
            onExecute={executeActiveAction}
            onApprove={() => resolveActiveApproval("approved")}
            onDecline={() => resolveActiveApproval("declined")}
            onFollowNextStep={submitRequest}
            onRateResult={rateResult}
            onChooseFeedbackCategory={chooseFeedbackCategory}
            onFeedbackNoteChange={updateFeedbackNote}
          />
        </main>

        <aside className="side-column">
          <SystemStack />
          <PrivateAlphaPanel
            alphaState={privateAlphaState}
            selectedPathId={selectedAlphaPath}
            onCommand={submitRequest}
          />
          <GovernancePanel />
          <MemoryPanel entries={memoryEntries} />
          <FeedbackInsightsPanel
            insights={feedbackInsights}
            weeklyCheckIn={weeklyCheckIn}
            onWeeklyChange={setWeeklyCheckIn}
            onSubmitWeeklyCheckIn={submitWeeklyCheckIn}
          />
          <SessionLog entries={logEntries} />
        </aside>
      </div>

      <section className="section-grid" aria-label="What Tay does">
        <div className="section-header">
          <p className="eyebrow">What Tay Does</p>
          <h2>One operator, visible execution, controlled autonomy.</h2>
        </div>
        <div className="feature-grid">
          {tayCapabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article className="feature-card" key={item.title}>
                <span className="icon-disc">
                  <Icon size={18} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="preview-band" aria-label="Autonomous action engine preview">
        <div>
          <p className="eyebrow">Autonomous Action Engine</p>
          <h2>Safe execution first. Approval when the risk rises.</h2>
          <p>
            Tay proposes the move, shows its status, runs approved local
            actions, pauses approval work, and records every result. No silent
            failures. No invisible work.
          </p>
        </div>
        <div className="engine-map">
          <span>Request</span>
          <span>Interpret</span>
          <span>Approve</span>
          <span>Execute</span>
          <span>Log</span>
        </div>
      </section>

      <FounderCommandPanel onCommand={submitRequest} />
      <LaunchReadinessPanel
        launchReadiness={launchReadiness}
        onCommand={submitRequest}
      />
      <DeploymentReadinessPanel deploymentReadiness={deploymentReadiness} />
      <RevenuePanel onCommand={submitRequest} revenueSetup={revenueSetup} />
      <SalesPanel onCommand={submitRequest} />
      <FulfillmentPanel onCommand={submitRequest} />

      <section className="section-grid" aria-label="Future agent council preview">
        <div className="section-header">
          <p className="eyebrow">Future Council Preview</p>
          <h2>Specialist helpers will plug into Tay, not replace Tay.</h2>
        </div>
        <div className="agent-grid">
          {agentPreviews.map((agent, index) => (
            <article className="agent-card" key={agent}>
              <div className={`agent-avatar agent-avatar--${index + 1}`}>
                <Bot size={22} />
              </div>
              <h3>{agent}</h3>
              <p>Prepared for future guided work through Tay&apos;s action flow.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-panels">
        <article className="vision-panel achievement-panel">
          <div className="card-title-row">
            <span className="icon-disc">
              <Trophy size={18} />
            </span>
            <p className="eyebrow">Cooperative Growth</p>
          </div>
          <h2>Achievement without a winner-take-all scoreboard.</h2>
          <p>
            The future system will celebrate consistency, helpfulness, creative
            output, and shared momentum. Growth is tracked as contribution, not
            ego.
          </p>
        </article>

        <article className="vision-panel crowne-panel">
          <div className="card-title-row">
            <span className="icon-disc">
              <Gem size={18} />
            </span>
            <p className="eyebrow">Crowne Legacy</p>
          </div>
          <h2>A companion game tied to the larger ecosystem.</h2>
          <p>
            Crowne Legacy stays preview-only here: a future bridge between
            story, progress, identity, and the Transcenlutions command layer.
          </p>
        </article>
      </section>

      <section className="preview-band trust-band" aria-label="Trust and governance preview">
        <div>
          <p className="eyebrow">Trust, Approval, Control</p>
          <h2>The operator stays in command.</h2>
          <p>
            Tay can move fast on safe work, but approval gates and visible logs
            stay central. Destructive or risky work is stopped or paused before
            action.
          </p>
        </div>
        <div className="trust-icons">
          <span>
            <LockKeyhole size={18} />
            Approval gates
          </span>
          <span>
            <PenLine size={18} />
            Visible record
          </span>
          <span>
            <Handshake size={18} />
            Cooperative progress
          </span>
        </div>
      </section>

      <section className="module-cloud" aria-label="Coming soon modules">
        <div className="section-header">
          <p className="eyebrow">Coming Soon Modules</p>
          <h2>Prepared for a living business-building ecosystem.</h2>
        </div>
        <div className="module-grid">
          {futureModules.map((item) => (
            <article className="module-card" key={item.title}>
              <div className="module-card__top">
                <span>
                  <Network size={15} />
                  {item.category}
                </span>
                <em>{item.status}</em>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
