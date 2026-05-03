# Transcenlutions

The AI operating layer for makers, creators, and operators. Make money.
Protect money. Grow money.

This repo is the v0 public web app — a landing / dashboard hybrid built with
Next.js 14, TypeScript, and Tailwind CSS.

## What's in here

- `src/app/` — Next.js App Router pages and global styles
- `src/components/` — Section components (Hero, Money OS, Creator Hub,
  Business Workspace, Connectors, Insights, Copilot, Pricing, Roadmap)
- `src/lib/tay/` — Pure TypeScript ports of the Tay pricing, works engine,
  insight rules, and zustand store
- `src/lib/data/` — Sample seed data for the dashboard surface

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run typecheck
npm run lint
npm run build
npm run start
```

## Architecture (target)

Four layers, shipped in order:

1. **Connection layer** — OAuth connectors for Google Ads, Meta Ads, TikTok
   Ads, Shopify, Stripe, GA4, HubSpot, Slack.
2. **Unified data layer** — Normalized KPI feed (revenue, spend,
   conversions, refunds, audiences) every other module reads from.
3. **Insight layer** — Daily briefs, anomaly alerts, copilot routing,
   channel mix.
4. **Action layer** — Pause underperformers, scale winners, post drafts on
   schedule. Roadmap.

## Notes

- All numbers shown in the UI are sample data until the connection layer
  ships.
- The pricing surface uses `deriveTayPricing` over a capability registry —
  features that are `finished` are billable; everything else is roadmap.
- The Business Workspace tracks progress by completed actions, not elapsed
  time. Hesitation kicks in after ~30s of inactivity.

## Deployment

Any Next.js host works. For Vercel:

```bash
vercel
```

For a static-ish self-host:

```bash
npm run build && npm run start
```
