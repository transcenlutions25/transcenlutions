# Apex mobile checkout preparation

This is a source-review milestone, **not a completed purchase flow**. The new endpoint always keeps checkout closed. Existing private order downloads remain usable subject to the unchanged payment verification and runtime configuration. No provider settings, live payments, outbound email, account connections, authenticated library or character artwork are changed.

## Configuration and proof boundary

`GET /api/apex/checkout` is read-only, accepts no customer inputs and returns no secrets or customer data. It is covered by the existing `/api/*` edge policy. Default state is unavailable. Even inspection of the test catalogue requires the existing full delivery configuration, `APEX_STRIPE_MODE=test`, and server-only `APEX_CHECKLIST_TEST_CHECKOUT_ENABLED=true`. The last flag permits inspection only; it cannot open checkout in this milestone.

Inspection requires existing restricted-key Payment Links read permission; no credential permissions are expanded by this change. Line items and optional items are explicitly expanded. Checks cover the exact active test link, Stripe test URL, one active one-time USD27 price/quantity, returned USD subtotal/total of 2700 cents, zero tax/discount, no price quantity transformation, extras, shipping, automatic tax or promotion codes, and exact configured access-page return URL.

**Blocker:** retrieved Payment Link line items do not expose evidence that adjustable quantity is disabled. A missing request-side `adjustable_quantity` field is not proof. Even a valid catalogue returns `state: unavailable` with `reason: quantity-lock-unverified`, never a checkout URL. There is no manual attestation bypass. Live configurations never call the provider or expose checkout.

This endpoint does not prove webhook registration, sender verification, inbox delivery or settlement. No real Stripe call or payment was made during implementation; provider behavior in tests is synthetic.

## Next coherent implementation slice

Build a sandbox-only server-created Checkout Session with fixed server-side price and quantity and no adjustable quantities, promotions or extras. This must include bounded same-origin POST validation, idempotency and duplicate/ambiguous-response recovery, safe return/cancel URLs, test-mode provider evidence, and a compatible sandbox-only entitlement provenance rule. Existing fulfillment currently requires the configured Payment Link; direct Sessions do not satisfy that invariant. Do not simply remove the link guard. Preserve exact paid price/quantity and refund/dispute checks, add negative provenance tests, and run sandbox email/download acceptance before any activation. Live commerce remains a separate approved release.

## Mobile and portable access

Offer and access pages retain shared brand materials, focus, status announcements and 44px controls. Availability retry creates no session. Existing private-link cleanup, tab recovery and paid-download checks remain intact. Test orders are visibly labeled.

Android handling depends on browser/file manager: save the HTML file, open it with a compatible local-HTML browser or transfer it to a computer. Existing text action-plan export supports a human-readable chat handoff; JSON transfers progress into the checklist. Authenticated product-library registration and agent execution remain unavailable. Never share the private order link with another user or agent.

## Review and release

Local regression/build checks do not replace actual Android visual QA, real sandbox end-to-end tests or deployed edge verification. Preserve existing disclosure that source is public and paid delivery is not digital-rights management.

For source-only publication before hosting usage is verified, `[skip ci]` is present in the commit message and draft PR title. GitHub push/pull_request workflows and Netlify branch/preview builds are deliberately skipped, not passed. Do not merge until approved CI and preview verification run on the final commit.

Sources: https://docs.stripe.com/api/payment-link/object ; https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs ; https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/ .
