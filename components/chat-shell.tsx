"use client";

import { useState } from "react";
import { executeSuggestedAction, createSessionLogEntry } from "../lib/action-engine";
import { createTayResponse } from "../lib/tay-core";
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
      text: "I am Tay, CEO Operator + Orchestrator of Transcenlutions. Give me a Box 1-safe request and I will detect intent, suggest an action, show permission status, execute only when allowed, return a result, and log the session.",
    },
  ]);

  const submitRequest = (request: string) => {
    const trimmed = request.trim();
    if (!trimmed) return;

    const response = createTayResponse(trimmed);
    const logDetail = `${response.intent} detected. ${response.action.title}: ${response.action.permissionStatus}.`;

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
        text: `${response.message} Detected intent: ${response.intent}. Suggested action: ${response.action.type}. Permission status: ${response.action.permissionStatus}.`,
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
        <p className="eyebrow">Tay Engine / Box 1</p>
        <h1>Tay runs the first approved Transcenlutions loop.</h1>
        <p>
          User request, intent, action, permission, execution, result, log, and
          next step. Nothing beyond Box 1 is active.
        </p>
      </header>

      <div className="workspace">
        <main className="chat-column">
          <section className="panel chat-panel">
            <div className="section-heading">
              <p className="eyebrow">Chat System</p>
              <span>Box 1 only</span>
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
          </section>

          <ActionCard
            response={activeResponse}
            executionStatus={executionStatus}
            result={result}
            onExecute={executeActiveAction}
          />
        </main>

        <aside className="side-column">
          <SystemStack />
          <SessionLog entries={logEntries} />
        </aside>
      </div>
    </div>
  );
}
