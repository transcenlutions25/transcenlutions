import { ArrowRight, CheckCircle2, CircleDot } from "lucide-react";
import { AGENTS, AGENT_HONEST_NOTE, type Agent } from "@/lib/agents";
import { SectionHeader } from "./MoneyOS";

function accentClass(accent: Agent["accent"]) {
  switch (accent) {
    case "gold":
      return "text-gold";
    case "green":
      return "text-accent-green";
    case "blue":
      return "text-accent-blue";
    case "violet":
      return "text-accent-violet";
  }
}

function statusBadge(status: Agent["status"]) {
  switch (status) {
    case "live":
      return "bg-accent-green/15 text-accent-green";
    case "starter-v0":
      return "bg-gold/15 text-gold";
    case "training":
      return "bg-accent-blue/15 text-accent-blue";
    case "queued":
      return "bg-white/10 text-white/65";
  }
}

export function Agents() {
  return (
    <section
      id="agents"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
      data-testid="agents-section"
    >
      <SectionHeader
        eyebrow="Agents"
        title="Tay, Rory, and Dawn — your founder AI team."
        body="Tay runs the platform with you. Rory makes and grows revenue. Dawn protects and operates. One console, one set of moves."
      />

      <div
        className="mt-4 rounded-xl glass p-3.5 text-sm text-white/80"
        data-testid="agents-honest-note-page"
      >
        <span className="text-[11px] uppercase tracking-widest text-gold mr-2">
          Honest note
        </span>
        {AGENT_HONEST_NOTE}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3" data-testid="agents-grid-page">
        {AGENTS.map((a) => (
          <article
            key={a.id}
            className="rounded-2xl glass p-4 flex flex-col gap-3"
            data-testid={`agents-page-card-${a.id}`}
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-[11px] uppercase tracking-widest ${accentClass(a.accent)}`}
                >
                  {a.tracks.join(" · ")}
                </div>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {a.name}
                </h3>
                <div className="text-[12px] text-white/60">{a.role}</div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 ${statusBadge(a.status)}`}
                data-testid={`agents-page-${a.id}-status`}
              >
                {a.status}
              </span>
            </header>
            <p className="text-sm text-white/80">{a.tagline}</p>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/55">
                Capabilities
              </div>
              <ul className="mt-1.5 grid gap-1 text-[12px] text-white/75">
                {a.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <CheckCircle2
                      size={10}
                      className={`mt-1 shrink-0 ${accentClass(a.accent)}`}
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/55">
                Sample commands
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {a.sampleCommands.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] hairline rounded-full px-2 py-0.5 text-white/75"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/55">
                Build next
              </div>
              <ul className="mt-1.5 grid gap-1 text-[12px] text-white/70">
                {a.buildNext.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CircleDot size={10} className="mt-1 text-gold shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
              <p className="text-[11px] text-white/55 max-w-[80%]">
                {a.disclosure}
              </p>
              <a
                href="#founder"
                className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline"
                data-testid={`agents-page-${a.id}-open`}
              >
                Open <ArrowRight size={12} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
