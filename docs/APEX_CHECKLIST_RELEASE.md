# Apex Flow checklist: release and recovery

Owner decision, 2026-10-04: the $997 guided/DWY tier stays unavailable until the owner has practiced delivery and explicitly authorizes reopening. Do not sell or book guided work. The existing $27 self-serve checklist is the immediate product candidate; its existing price is unchanged.

## What exists

`products/funnel-checklist/funnel-leak-emergency-checklist.html` is a complete offline interactive deliverable: 20 checks, four in each of Traffic, Offer, Capture, Follow-up and Close; a named fix, action and verification step for each; evidence-based status entry; stage and overall self-reported scores; top-three action plan; optional local storage; progress JSON export/import; text export; print/PDF; clean offline copy. It contains no account connections, AI scanning, coaching or revenue guarantee.

Rebuild using `python3 products/funnel-checklist/build.py`. Run `node --test products/funnel-checklist/test.cjs lib/test-apex-payments.cjs`. The existing public operational repository makes source readable; server-side payment verification gates the hosted download, not access to public source code. This is not DRM or a claim of exclusive code access.

## Existing Stripe catalog (verified 2026-10-04)

- Product: `prod_V3MBNEBCG09Rzj`, Funnel Leak Emergency Checklist.
- Price: `price_1U3FTOPLMwl8qmZP4vwkUOi8`, USD 27.00 one-time, quantity 1.
- Payment link: `plink_1U3FTTPLMwl8qmZPn4DQzrKE`.
- Existing URL: `https://buy.stripe.com/5kQdRbc7ndJM6Cr9HT6sw05`.
- Existing link is active with Stripe's hosted confirmation and no delivery redirect. Do not promote it as working instant delivery yet. No Stripe mutation or paid transaction was performed for this build.

## Release is blocked on runtime configuration and verification

Netlify project `tay-command` showed **No environment variables set for this project** on 2026-10-04. The ChatGPT Stripe connector does not install application credentials. No credential values were read or committed.

Required server-only variable names:

| Name | Purpose / location |
| --- | --- |
| `APEX_STRIPE_RESTRICTED_KEY` | Stripe restricted key, Checkout Sessions read/write plus required reads for line items, prices, payment intents and charges; configure only in trusted Netlify Functions/runtime contexts. Confirm exact permissions in Stripe's key UI. Never use a NEXT_PUBLIC prefix. |
| `APEX_STRIPE_WEBHOOK_SECRET` | Signing secret for this deployment's Stripe webhook destination; runtime only. |
| `APEX_STRIPE_MODE` | `test` in a sandbox or `live` in production. No live credentials in untrusted previews. |
| `APEX_STRIPE_TEST_PRICE_ID` | Sandbox-only USD 27.00 one-time price for verification. No fake live payments. |
| `APEX_STRIPE_TEST_PAYMENT_LINK_ID` | Sandbox-only test link matching that price. |
| `APEX_CHECKLIST_SALES_ENABLED` | Default absent/false. Enable in an isolated sandbox context to run the acceptance gate. Enable in production only after that gate passes and runtime configuration is authorized. This does not automatically publish a Buy button. |

The owner must enter credentials directly into the provider configuration; never paste them into chat, GitHub or receipts. Provisioning broader access needs owner approval.

## Delivery implementation

- `POST /api/apex/checklist` accepts a checkout session ID in the body; validates completed, paid, correct mode, payment link, exact price, quantity, currency, amount and non-refunded/non-disputed charge; marks the paid entitlement ready in Stripe metadata; returns the HTML attachment with no-store headers.
- `POST /api/apex/stripe-webhook` requires a signature over the raw body with a five-minute timestamp tolerance. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. It retrieves the current session rather than trusting client data. Unpaid sessions never unlock. Provider errors return 503 for retries.
- `apex_checklist_ready=v1` is a durable, idempotent access-ready marker in Stripe metadata. It is **not** an assertion that email or download completed. Replays do not duplicate delivery actions.
- `/apex-flow/access.html` removes the session ID from the visible URL, verifies payment on explicit button click, and provides a download. Never record real session IDs in logs or receipts. Treat them as bearer access tokens.
- Buyers who close the return page recover through the support address using their receipt. Recovery is manual; no automatic email delivery or emailed recovery link is implemented. Support must verify the payment privately before supplying a file. Never request full card information.
- Runtime dependencies: existing Node/Next runtime; no new paid service, database or package. Next output-file tracing includes the generated HTML. Static export cannot provide the paid API.

## Required acceptance gate before sales

1. Confirm the owner can download/open the actual 20-point file and understands its exact scope.
2. Use a Stripe sandbox/test account to verify paid success, failed/unpaid and delayed payments. The current connector exposes a live account only; do not charge a live card to simulate tests.
3. Verify signed webhook delivery, replay idempotency, rejection of invalid/stale signatures, and retrieval after a buyer closes the return page. Confirm the support recovery process is staffed.
4. Confirm the deployed API can read the packaged HTML; wrong price, wrong mode and refunded orders must be denied. Test real sandbox events, not only local fixtures.
5. Confirm trusted production runtime variables without revealing values. Configure the production webhook using its own signing secret.
6. Change only the existing checklist payment link's after-completion behavior to redirect to the approved live origin plus `/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}`. Preserve price, currency, tax settings and unrelated catalog entries. This step has NOT been executed.
7. Verify the live redirect configuration and public scope/support copy, then enable only the $27 checkout CTA. Do not unlock $97/$297/$497/$997 services as a side effect.

Keep the owner review file independent of paid access. Do not claim collected revenue from a deployed page, prepared checkout, or test transaction.

## Draft sales copy — publish only when the gate passes

**Find the next fix in your funnel.** The $27 Funnel Leak Emergency Checklist gives you 20 checks across Traffic, Offer, Capture, Follow-up and Close, a concrete fix for every point, and a downloadable action plan. It is a self-serve browser tool that works offline; your answers stay on your device. No live session or account connection required. It does not scan your site or promise increased revenue. One-time purchase.

Suggested audience: an owner with an existing offer and a website or inquiry path they can inspect. Do not pitch it as a done-for-you audit. Show a representative sample before asking for payment. No outreach has been sent.

## Validation performed for this build

Nine local tests passed: catalog coverage, scoring and assessment coverage, priority ordering, import sanitization, actual DOM rendering and interaction, opt-in saving, progress/action-plan export and reset, payment eligibility and denial cases, webhook raw-payload signature handling and replay behavior. The DOM test uses jsdom 30.1.2 installed only in a separate verification directory; it is not an application runtime dependency. Run it with that directory’s node_modules on NODE_PATH and `node --test products/funnel-checklist/test-ui.cjs`. No Stripe sandbox transaction or real buyer delivery has been verified.
