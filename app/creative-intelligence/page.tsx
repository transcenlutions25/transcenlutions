import Link from "next/link";

const marketSignals = [
  ["150k+", "creatives surveyed in Contra's 2026 study"],
  ["2M+", "creative experts represented in three years of Contra network data"],
  ["20% → 70%+", "reported AI adoption growth across the observed period"],
  ["40%+", "growth in project size for AI-powered creatives reported by Contra"],
] as const;

const operatingRules = [
  "Sell outcomes, direction, taste, judgment, continuity, and accountability — not access to an AI tool.",
  "Use AI to shorten production cycles, expand iteration, and reduce low-value repetitive work while keeping a human approval layer for consequential creative decisions.",
  "Price around the value and scope of the finished work rather than discounting simply because AI reduced production time.",
  "Show the client what remains human-led: strategy, brand fit, storytelling choices, quality control, factual review, rights checks, and final approval.",
  "Package repeatable AI-assisted workflows into services that can be measured, improved, and eventually delegated through Tay governance.",
  "Track before/after production time, revision count, client acceptance, gross margin, and repeat-business rate so Transcenlutions proves where AI actually creates value.",
] as const;

const serviceImplications = [
  ["Creator Flow Studio", "Lead with AI-assisted production plus human creative direction. Preserve recurring character, brand, voice, and visual canon as a premium continuity advantage."],
  ["Ascended Forge", "Offer AI-enabled build acceleration while keeping architecture, QA, security, deployment, and owner approval explicit. Faster generation is not a substitute for engineering responsibility."],
  ["Apex / revenue products", "Turn repeatable internal workflows into productized services, templates, audits, and managed implementation where the buyer pays for a completed outcome and clear operating system."],
  ["Tay", "Route creative work by objective and risk, preserve provenance, require approval for public publishing or spend, and record which model/tool combination produced the best measured result."],
] as const;

export default function CreativeIntelligencePage() {
  return (
    <main className="info-shell">
      <Link className="info-back" href="/">Back to Tay command room</Link>
      <article className="info-panel">
        <p className="eyebrow">Transcenlutions Market Intelligence</p>
        <h1>Creative Intelligence 2026</h1>
        <p className="info-intro">
          Contra's October 8, 2026 briefing reinforces the Transcenlutions direction: AI is becoming standard creative infrastructure, while human taste, perspective, judgment, and accountable execution become more valuable — not less.
        </p>

        <div className="info-section-grid">
          <section>
            <h2>Observed market signals</h2>
            <dl>
              {marketSignals.map(([metric, meaning]) => (
                <div key={metric}>
                  <dt><strong>{metric}</strong></dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Operating rules</h2>
            <ol>{operatingRules.map(rule => <li key={rule}>{rule}</li>)}</ol>
          </section>
          <section>
            <h2>What changes in the build</h2>
            <dl>
              {serviceImplications.map(([area, body]) => (
                <div key={area}>
                  <dt><strong>{area}</strong></dt>
                  <dd>{body}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Revenue test</h2>
            <p>
              Any new creative-AI capability must answer four questions before it becomes a priority: Who pays for it, what completed outcome do they receive, how does it improve margin or recurring revenue, and what proof will Tay record after delivery?
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
