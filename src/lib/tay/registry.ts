import type { CapabilityRegistry } from "./pricing";

/**
 * The current Tay capability registry. Capabilities marked "finished"
 * are billable through the pricing derivation. Anything else is roadmap.
 */
export const tayCapabilityRegistry: CapabilityRegistry = {
  capabilities: {
    offer_writer: {
      label: "Offer & Copy Writer",
      description:
        "Turns a rough idea into a tight offer with hook, body, and call-to-action.",
      weight: 2,
      status: "finished",
    },
    funnel_blueprint: {
      label: "Funnel Blueprint",
      description:
        "Generates a 5-step funnel — landing, lead magnet, nurture, offer, follow-up.",
      weight: 3,
      status: "finished",
    },
    lead_pipeline: {
      label: "Lead Pipeline Tracker",
      description:
        "Local-first CRM lite: log leads, conversations, and closed deals.",
      weight: 2,
      status: "finished",
    },
    content_engine: {
      label: "Content Engine",
      description:
        "One offer in, multi-platform posts out (X, LinkedIn, IG caption, TikTok script).",
      weight: 3,
      status: "finished",
    },
    insight_brief: {
      label: "Daily Insight Brief",
      description:
        "Surfaces what's working and what to fix from the week's metrics.",
      weight: 2,
      status: "finished",
    },
    money_protection: {
      label: "Money Protection Audit",
      description:
        "Reviews recurring expenses, exposure, and tax surface for waste and risk.",
      weight: 2,
      status: "finished",
    },
    connector_google_ads: {
      label: "Google Ads Connector",
      description: "OAuth + spend / conversions sync, normalized for dashboards.",
      weight: 2,
      status: "in-progress",
    },
    connector_meta_ads: {
      label: "Meta Ads Connector",
      description: "Spend, ROAS, and audience signals for FB / Instagram.",
      weight: 2,
      status: "in-progress",
    },
    connector_shopify: {
      label: "Shopify Connector",
      description: "Orders, products, refunds, and customer LTV.",
      weight: 2,
      status: "in-progress",
    },
    connector_stripe: {
      label: "Stripe Connector",
      description: "Revenue, MRR, churn, and fee analytics.",
      weight: 2,
      status: "in-progress",
    },
    connector_ga4: {
      label: "GA4 Connector",
      description: "Sessions, channels, events — joined to revenue.",
      weight: 1,
      status: "queued",
    },
    connector_hubspot: {
      label: "HubSpot Connector",
      description: "Deals, contacts, pipeline stages.",
      weight: 1,
      status: "queued",
    },
    connector_tiktok_ads: {
      label: "TikTok Ads Connector",
      description: "Spend, hooks, CTR, conversions.",
      weight: 1,
      status: "queued",
    },
    connector_slack: {
      label: "Slack Alerts",
      description: "Push anomalies, daily briefs, and milestones to a channel.",
      weight: 1,
      status: "queued",
    },
    auto_actions: {
      label: "Automated Actions",
      description:
        "Pause underperformers, scale winners, post drafts on a schedule.",
      weight: 4,
      status: "queued",
    },
  },
};
