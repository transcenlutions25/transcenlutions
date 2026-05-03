import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div>
          <Logo />
          <p className="mt-3 text-white/55 max-w-xs">
            The AI operating layer for makers, creators, and operators. Make
            money. Protect money. Grow money.
          </p>
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
        <FooterCol title="Company" links={[
          ["About", "#"],
          ["Contact", "mailto:hello@transcenlutions.com"],
          ["Privacy", "#"],
          ["Terms", "#"],
        ]} />
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
        {links.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              className="text-white/70 hover:text-white transition"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
