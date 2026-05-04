"use client";

import { useState } from "react";
import { Crown, Menu, Slack, X } from "lucide-react";
import { Logo } from "./Logo";
import { SLACK_CTA_LABEL, SLACK_INVITE_URL } from "@/lib/community";
import { FOUNDER } from "@/lib/founder";

const NAV = [
  { href: "#founder", label: "Founder" },
  { href: "#agents", label: "Agents" },
  { href: "#money-os", label: "Money OS" },
  { href: "#creator", label: "Creator" },
  { href: "#workspace", label: "Workspace" },
  { href: "#connectors", label: "Connectors" },
  { href: "#roadmap", label: "Roadmap" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="#top" className="flex items-center" data-testid="site-logo">
          <Logo />
        </a>
        <nav className="hidden md:flex items-center gap-5">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <a
            href={SLACK_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md hairline hover:bg-white/5 transition"
            data-testid="cta-slack"
            aria-label={SLACK_CTA_LABEL}
          >
            <Slack size={14} className="text-gold" />
            <span>Slack</span>
          </a>
          <a
            href="#founder"
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md gold-border bg-gold/10 text-gold hover:bg-gold/20 transition"
            data-testid="header-founder-pill"
            title={`${FOUNDER.name} · ${FOUNDER.email}`}
          >
            <Crown size={13} />
            <span className="hidden lg:inline">Founder</span>
            <span
              className="inline-flex items-center justify-center h-5 w-5 rounded-full gold-border bg-gradient-to-br from-gold/40 to-transparent text-[10px] font-semibold text-gold"
              aria-hidden
            >
              F
            </span>
          </a>
        </div>
        <button
          aria-label="Toggle menu"
          className="md:hidden p-2 rounded-md hairline"
          onClick={() => setOpen((o) => !o)}
          data-testid="mobile-menu-toggle"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/5 bg-ink-900/95">
          <nav className="px-4 py-3 grid gap-1">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="px-2 py-2 rounded-md text-sm text-white/80 hover:bg-white/5"
              >
                {n.label}
              </a>
            ))}
            <a
              href={SLACK_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-2 text-sm py-2 rounded-md hairline hover:bg-white/5"
              data-testid="cta-slack-mobile"
              aria-label={SLACK_CTA_LABEL}
            >
              <Slack size={14} className="text-gold" />
              <span>{SLACK_CTA_LABEL}</span>
            </a>
            <a
              href="#founder"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-2 text-sm py-2 rounded-md gold-border bg-gold/10 text-gold"
              data-testid="cta-founder-mobile"
            >
              <Crown size={14} />
              Founder console
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
