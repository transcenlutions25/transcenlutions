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
import { executeSuggestedAction, createSessionLogEntry } from "../lib/action-engine";
import { createTayResponse } from "../lib/tay-core";
import {
  actionLabels,
  intentLabels,
  permissionLabels,
} from "../lib/public-copy";
import type {
  ActionResult,
  ExecutionStatus,
  SessionLogEntry,
  TayResponse,
} from "../lib/types";
import { ActionCard } from "./action-card";
import { SessionLog } from "./session-log";
import { SystemStack } from "./system-stack";

interface ChatMessage {
  id: string;
  role: "user" | "tay";
  text: string;
}

const starter = "Build the first Tay feature";
const businessFocus =
  "Passive income systems, digital operations, and business growth";

const quickStarts = [
  "Build a passive income offer",
  "Create a plan for Tay governance",
  "Log a note about command room completion",
  "Use an external API to automate leads",
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

const comingModules = [
  "Memory profile",
  "Content command flows",
  "Community challenges",
  "Avatar recognition",
  "Agent council",
  "Crowne Legacy bridge",
];

export function ChatShell() {
  const [input, setInput] = useState("");
  const [activeResponse, setActiveResponse] = useState<TayResponse | null>(
    null,
  );
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>("idle");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [logEntries, setLogEntries] = useState<SessionLogEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "tay",
      text: "I am Tay for Transcenlutions. Tell me what you want to build, plan, or record, and I will turn it into one clear next move focused on passive income, business growth, and visible execution.",
    },
  ]);

  const submitRequest = (request: string) => {
    const trimmed = request.trim();
    if (!trimmed) return;

    const response = createTayResponse(trimmed);
    const logDetail = `${intentLabels[response.intent]} reviewed. ${
      response.action.title
    }: ${permissionLabels[response.action.permissionStatus]}.`;

    setActiveResponse(response);
    setExecutionStatus("idle");
    setResult(null);
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
  };

  const executeActiveAction = () => {
    if (!activeResponse) return;

    setExecutionStatus("running");
    setResult(null);

    window.setTimeout(() => {
      const actionResult = executeSuggestedAction(activeResponse);
      setResult(actionResult);
      setExecutionStatus(actionResult.status);
      setMessages((current) => [
        ...current,
        {
          id: `${activeResponse.id}-result`,
          role: "tay",
          text: `${actionResult.result} ${actionResult.nextStep}`,
        },
      ]);
      setLogEntries((entries) => [
        createSessionLogEntry(activeResponse, actionResult.result),
        ...entries,
      ]);
    }, 700);
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
            onExecute={executeActiveAction}
            onFollowNextStep={submitRequest}
          />
        </main>

        <aside className="side-column">
          <SystemStack />
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
          {comingModules.map((item) => (
            <span key={item}>
              <Network size={15} />
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
