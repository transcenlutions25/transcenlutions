# Apex mobile sandbox journey

This review adds a deliberately test-only checkout entry to the existing offer and paid download flow. It does not enable live sales, configure providers, send email, create accounts or implement authenticated product-library registration.

## Configuration and provider checks

`GET /api/apex/checkout` is read-only and returns no secrets or customer data. It is covered by the existing `/api/*` edge policy. Default state is unavailable. The existing full delivery configuration must pass `payments.ready`, mode must be `test`, and the additional server-only `APEX_CHECKLIST_TEST_CHECKOUT_ENABLED=true` must be set in the isolated test runtime. No settings are enabled by this change.

The existing restricted Stripe key additionally needs Payment Links read permission to inspect the configured link and its expanded line items. Missing permission fails closed; do not expand credentials without owner approval. The handler checks the exact test link ID, active test state, Stripe-hosted test URL, one active one-time USD27 price with quantity one, no adjustable quantity, extras, shipping, automatic tax or promotion codes, and the exact configured access-page return URL. Misconfiguration/provider outage returns an unavailable state. A live configuration never exposes a checkout link through this endpoint.

The response is a point-in-time configuration check, not proof of webhook registration, sender verification, inbox delivery or settlement. Repeat the existing sandbox acceptance matrix before release. Payment Links can be edited after verification; review the total on Stripe before proceeding. Do not use real cards in the sandbox.

## Mobile and portable access

Offer and access pages retain shared brand materials, visible focus, status announcements and 44px controls. The offer resets the checkout link while rechecking after back/forward-cache restoration, and provides a retry without creating a payment session. Existing download verification, private session-link handling, refund/dispute checks and tab-local recovery remain unchanged.

Android file handling depends on the selected browser/file manager. Download the HTML file; if a previewer shows source, open it with a compatible local-HTML browser or transfer to a computer. The checklist's existing text action plan is the supported human-readable chat handoff; JSON transfers progress into the checklist. Account-library registration and agent execution are explicitly unavailable. Files and order links are different: never share the private order link with another user or agent.

## Release boundary

This is a source review milestone, not a production release. Live payment activation, terms/support finalization, authenticated library integration, real Android browser QA, provider sandbox end-to-end verification and deployed edge checks remain release gates. Existing product source is public; paid delivery is not digital-rights management. Character artwork is unchanged.

If publishing source before hosting credits are verified, use `[skip ci]` in both the commit message and draft PR title. GitHub push/pull_request workflows and Netlify branch/preview builds are intentionally skipped; this is not a passing CI result. Do not merge until budget-safe CI and preview verification have run on the final commit.

Sources: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs and https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/ .
