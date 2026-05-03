"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { href: "#money-os", label: "Money OS" },
  { href: "#creator", label: "Creator Hub" },
  { href: "#workspace", label: "Workspace" },
  { href: "#connectors", label: "Connectors" },
  { href: "#copilot", label: "Copilot" },
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
        <nav className="hidden md:flex items-center gap-6">
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
            href="#copilot"
            className="text-sm px-3 py-1.5 rounded-md hairline hover:bg-white/5 transition"
            data-testid="cta-sign-in"
          >
            Sign in
          </a>
          <a
            href="#workspace"
            className="text-sm px-3 py-1.5 rounded-md gold-border bg-gold/10 text-gold hover:bg-gold/20 transition"
            data-testid="cta-launch"
          >
            Launch app
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              <a
                href="#copilot"
                onClick={() => setOpen(false)}
                className="text-center text-sm py-2 rounded-md hairline"
              >
                Sign in
              </a>
              <a
                href="#workspace"
                onClick={() => setOpen(false)}
                className="text-center text-sm py-2 rounded-md gold-border bg-gold/10 text-gold"
              >
                Launch
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
