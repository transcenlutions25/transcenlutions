"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "search" | "fetch" | "agent";
type Result = {
  ok: boolean; error?: string;
  review?: { title: string; decision: string; reasons: string[]; target: string; purpose: string };
  results?: { title: string; url: string; snippet: string }[];
  page?: { title: string; url: string; text: string };
  warning?: string;
};
const gold = "#f3d36a";
const field = { width: "100%", padding: "0.8rem", borderRadius: 10, background: "#100e22",
  color: "#fff", border: "1px solid #665ba0", fontSize: "1rem" } as const;

export default function BrowserWorkbench() {
  const [mode, setMode] = useState<Mode>("search");
  const [target, setTarget] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  async function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/browser-operator", { method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, target, ...(mode === "agent" ? { goal } : {}) }),
        cache: "no-store" });
      const data = await response.json() as Result;
      setResult(data);
      setHistory((prior) => [new Date().toLocaleString() + ": " + mode + " — " + (data.ok ? "read completed" : data.review ? data.review.decision : "unavailable"), ...prior].slice(0, 10));
    } catch {
      setResult({ ok: false, error: "The Tay server could not be reached." });
    } finally { setBusy(false); }
  }

  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "2rem 1rem 5rem", color: "#f6f2ff" }}>
      <Link href="/" style={{ color: gold }}>← Tay Command</Link>
      <p style={{ letterSpacing: 3, color: gold, marginBottom: 4 }}>TRANSCENLUTIONS / TAY</p>
      <h1 style={{ fontSize: "clamp(1.9rem, 5vw, 2.8rem)", marginTop: 4 }}>Browser workbench</h1>
      <p>Find current information, read webpages, and review website automation tasks without giving websites authority over Tay.</p>
      <section style={{ border: "1px solid #56468b", borderRadius: 18, padding: "1.2rem", background: "#17132c" }}>
        <p style={{ color: gold, fontWeight: 700 }}>Security status: owner sign-in required</p>
        <p>Search and page reading require a server-side TinyFish key and authenticated owner access. Tay currently blocks hosted execution until real owner authentication exists. Browser actions are proposals only, never silently submitted.</p>
        <form onSubmit={run} style={{ display: "grid", gap: "0.9rem" }}>
          <label htmlFor="browser-mode">Operation</label>
          <select id="browser-mode" value={mode} onChange={(e) => { setMode(e.target.value as Mode); setResult(null); }} style={field}>
            <option value="search">Search live web — read only</option>
            <option value="fetch">Read a public HTTPS page — read only</option>
            <option value="agent">Prepare browser action — approval required</option>
          </select>
          <label htmlFor="browser-target">{mode === "search" ? "What should Tay research?" : "Website URL (HTTPS)"}</label>
          <input id="browser-target" value={target} onChange={(e) => setTarget(e.target.value)}
            required maxLength={mode === "search" ? 240 : 2048}
            placeholder={mode === "search" ? "Current business registration requirements" : "https://www.example.org/"} style={field} />
          {mode === "agent" && <>
            <label htmlFor="browser-goal">What should Tay do on that website?</label>
            <textarea id="browser-goal" rows={4} value={goal} maxLength={1200} required
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe the website steps and the evidence that would prove completion." style={field} />
          </>}
          <button type="submit" disabled={busy} style={{ minHeight: 48, background: gold, color: "#120b28", fontWeight: 800,
            border: 0, borderRadius: 10, padding: "0.75rem" }}>{busy ? "Checking…" : mode === "agent" ? "Review action boundaries" : "Run read-only request"}</button>
        </form>
      </section>
      <section aria-live="polite" style={{ marginTop: 20 }}>
        {result?.error && <p role="alert" style={{ color: "#ffbaab" }}>{result.error}</p>}
        {result?.review && <article style={{ padding: "1rem", border: "1px solid #7867b2", borderRadius: 12 }}>
          <h2 style={{ color: gold }}>{result.review.title}</h2>
          <p><strong>Decision:</strong> {result.review.decision.replaceAll("_", " ")}</p>
          <p>{result.review.purpose}</p>
          <ul>{result.review.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </article>}
        {result?.results && <div><h2>Search results</h2>{result.results.map((item, index) => <article key={index}
          style={{ borderBottom: "1px solid #514872", padding: "0.8rem 0", overflowWrap: "anywhere" }}>
          <h3 style={{ marginBottom: 3 }}>{item.title || "Untitled source"}</h3>
          <p>{item.snippet}</p>
          <span style={{ color: "#cebfff" }}>{item.url}</span>
        </article>)}</div>}
        {result?.page && <article><h2>{result.page.title || "Page text"}</h2>
          <p style={{ overflowWrap: "anywhere" }}>{result.page.url}</p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit", fontSize: "1rem" }}>{result.page.text}</pre></article>}
        {result?.warning && <p>{result.warning}</p>}
      </section>
      <section style={{ marginTop: 24 }}><h2>Recent activity in this tab</h2>
        <p>Temporary display only. This is not a durable cross-device audit trail or proof of a website action.</p>
        <ol>{history.map((entry, index) => <li key={index}>{entry}</li>)}</ol>
      </section>
    </main>
  );
}
