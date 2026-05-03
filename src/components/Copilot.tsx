"use client";

import { useState } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { copilotReply } from "@/lib/tay/insight";
import { sampleMetrics } from "@/lib/data/sampleMetrics";
import { SectionHeader } from "./MoneyOS";

interface Msg {
  role: "user" | "tay";
  text: string;
}

const STARTERS = [
  "How do I make more money this week?",
  "What should I do to protect cash?",
  "ROAS check on Meta vs Google",
  "Generate a content plan for my offer",
  "I want to start a service business",
];

export function Copilot() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "tay",
      text: "I'm Tay, the operator copilot. I can route you to make, protect, or grow money — and ship the next move with you. What are we working on?",
    },
  ]);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const reply = copilotReply(t, sampleMetrics);
    setMessages((m) => [
      ...m,
      { role: "user", text: t },
      { role: "tay", text: reply },
    ]);
    setDraft("");
  };

  return (
    <section
      id="copilot"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
    >
      <SectionHeader
        eyebrow="AI Copilot"
        title="Ask the operator copilot anything."
        body="Deterministic routing today; LLM reasoning behind the same surface as it ships."
      />

      <div className="mt-6 rounded-2xl glass p-4 sm:p-5">
        <div
          className="grid gap-3 max-h-[420px] overflow-auto pr-1"
          data-testid="copilot-thread"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "tay" && (
                <div className="mt-0.5 h-7 w-7 rounded-full gold-border bg-gold/10 flex items-center justify-center shrink-0">
                  <Sparkles size={13} className="text-gold" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-white/10 text-white/90"
                    : "gold-border bg-gold/5 text-white/90"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 h-7 w-7 rounded-full hairline bg-white/5 flex items-center justify-center shrink-0">
                  <User size={13} className="text-white/70" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              data-testid={`copilot-starter`}
              className="text-xs px-2.5 py-1.5 rounded-full hairline hover:bg-white/5 text-white/75"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="mt-4 flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about make, protect, grow, content, connectors…"
            data-testid="copilot-input"
            className="flex-1 rounded-md hairline bg-ink-900/60 px-3 py-2 text-sm outline-none focus:border-gold/40"
          />
          <button
            type="submit"
            data-testid="copilot-send"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md gold-border bg-gold/15 text-gold hover:bg-gold/25 transition"
          >
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </section>
  );
}
