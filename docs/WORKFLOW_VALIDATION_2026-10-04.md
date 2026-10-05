# Apex / Tay workflow validation — 2026-10-04

**Status: implementation and local tests passed; live release is BLOCKED.** This report covers the existing feature branch, its Apex product/sales flows, and the versioned Tay/desktop regression suites. It does not certify every company project, inaccessible n8n workflows, Mac-only changes, production payment delivery, or unattended revenue generation.

## Completed changes

- Added transactional email dispatch from signed paid-checkout webhooks, deterministic replay protection, durable acceptance metadata and explicit reconciliation for retries beyond the provider's deduplication window.
- Added raw-body bounds, correct input errors, safe provider failure responses, current payment eligibility checks and request-handler acceptance tests.
- Restored order access across same-tab refresh, provided a clear-access control and supported private email recovery links. Download remains available during email-provider outages when runtime is configured.
- Prevented another same-page inquiry POST after ambiguous receipt; kept the support reference and limited inquiry consent.
- Added CI coverage for product, payment, delivery and DOM interactions; extended product import/cancel/failure coverage.
- Upgraded Next.js 14.2.15 to the current maintenance security release 15.5.27, React/React DOM to 19.3.0, matching type packages and ESLint config. Moved file tracing configuration to its supported location. No async request-API codemod was needed: the source uses none of the affected APIs.

## Executed checks

| Area | Result and boundary |
| --- | --- |
| Apex product/payment/dispatch/access/inquiry | 28 Node tests passed. HTTP/provider fixtures are synthetic; no real Stripe purchase or email occurred. |
| Lead review queue | 2 Python tests passed: validation, dedupe, approval-only drafts, persisted state and safe re-export. It produces drafts, not automatic sends. |
| Versioned desktop runtime | 13 Python tests passed: queue concurrency, ordering, recovery/pause, retries, steering, credential boundaries, context routing. No live Mac instance tested. |
| Tay core | Existing 20-flow smoke suite plus agent identity/session/authority, revenue readiness, launch, feedback and legal-page rendering checks passed. These verify code behavior, not all provider integrations. |
| Platform identity | Identity contract checks passed. |
| Type/lint/build | TypeScript, ESLint, public-copy guard and production build passed on Next.js 15.5.27. |

The built server also returned HTTP 200 for Tay, the offer and order-access pages, and expected private/no-store HTTP 503 for disabled payment and webhook endpoints. The first Netlify preview caught a pre-existing plain-anchor lint error on the information pages; it was fixed using Next Link before the next deploy.

## Remaining release gates

- Netlify sign-in was restored. A fresh authenticated check confirms no project runtime variables. Configure server-only values from `APEX_CHECKLIST_RELEASE.md`; no credentials in chat.
- Stripe connector currently exposes only the live account. Connect a sandbox for genuine end-to-end tests. Live card charges are not test fixtures.
- Transactional sender/domain/reply mailbox needs approval and secure configuration. Resend adapter is implemented, but no account, expense or actual dispatch was created.
- Actual inbox delivery, delayed-payment webhook delivery, bounce handling and production recovery are not verified. Older ambiguous email retries and undeliverable email require an operator.
- Existing live Payment Link is not yet wired to the download return; public checkout on the new page remains closed. The $997 guided tier remains closed.
- Mac-only and n8n workflows cannot be certified without their actual current code/configuration or authorized access.

## Reproduction

`npm ci`, then `npm run test:workflows`, `npm run test:identity`, `npm run typecheck`, `npm run lint`, `npm run build`. Product rebuild: `python3 products/funnel-checklist/build.py`.

Use `APEX_CHECKLIST_RELEASE.md` for provider setup, sandbox scenarios, rollback and recovery. Preserve the tested source in the private master backup and independently read it back before marking the continuity task complete. No sales, real buyers or autonomous background execution are claimed by these tests.
