"use client";

import { useState } from "react";
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
        <p className="eyebrow">Transcenlutions</p>
        <h1>Tay turns business ideas into clear next moves.</h1>
        <p>
          Start with a passive-income idea, business plan, or operating note.
          Tay reviews it, proposes a safe next move, shows the result, and keeps
          the record visible.
        </p>
      </header>

      <div className="workspace">
        <main className="chat-column">
          <section className="panel chat-panel">
            <div className="section-heading">
              <p className="eyebrow">Conversation</p>
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
