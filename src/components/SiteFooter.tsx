import { Slack } from "lucide-react";
import { Logo } from "./Logo";
import { SLACK_CTA_LABEL, SLACK_INVITE_URL } from "@/lib/community";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 text-white/55 max-w-xs">
            The AI operating layer for makers, creators, and operators. Make
            money. Protect money. Grow money.
          </p>
          <a
            href={SLACK_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-md gold-border bg-gold/10 text-gold hover:bg-gold/20 transition text-xs"
            data-testid="footer-cta-slack"
            aria-label={SLACK_CTA_LABEL}
          >
            <Slack size={14} />
            {SLACK_CTA_LABEL}
          </a>
        </div>
        <FooterCol title="Platform" links={[
          ["Money OS", "#money-os"],
          ["Workspace", "#workspace"],
          ["Connectors", "#connectors"],
          ["Insights", "#insights"],
        ]} />
        <FooterCol title="Build" links={[
          ["Creator Hub", "#creator"],
          ["Copilot", "#copilot"],
          ["Pricing", "#pricing"],
          ["Roadmap", "#roadmap"],
        ]} />
        <FooterCol
          title="Community"
          links={[
            ["Slack", SLACK_INVITE_URL],
            ["Contact", "mailto:hello@transcenlutions.com"],
            ["About", "#"],
            ["Privacy", "#"],
          ]}
        />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-white/45">
          <div>© {new Date().getFullYear()} Transcenlutions.</div>
          <div>v0 — public preview. All numbers shown are sample data.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-gold">
        {title}
      </div>
      <ul className="mt-3 grid gap-1.5">
        {links.map(([label, href]) => {
          const external = /^https?:\/\//i.test(href);
          return (
            <li key={label}>
              <a
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-white/70 hover:text-white transition"
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
