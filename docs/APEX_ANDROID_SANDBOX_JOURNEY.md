# Apex mobile sandbox checkout

This source-review milestone implements a **default-off, test-only** fixed Checkout Session path plus mobile/access guidance. It does not activate provider configuration or live purchases. Provider integration and real Android acceptance remain unverified. Existing Payment Link orders, private downloads and email handling are preserved.

## Configuration and runtime permissions

Both endpoints require the existing complete Apex payment/delivery configuration, `APEX_STRIPE_MODE=test`, and server-only `APEX_CHECKLIST_TEST_CHECKOUT_ENABLED=true`. The flag is false/absent by default. Live mode is rejected before provider access. No credentials, persistent grants or permissions are created/expanded by this change.

The existing restricted Stripe key would need Prices read, Checkout Sessions create/read, and the existing fulfillment reads/writes. Creation is a Checkout Sessions write, already listed in the prior runtime requirements; verify actual key permissions securely before activation. Do not broaden a key without authorization. Existing webhook, sender, support and HTTPS origin settings remain required. All implementation tests use synthetic provider responses; no actual Session, payment or delivery email was created.

## Status and creation

- `GET /api/apex/checkout` reads the configured test Price only. It verifies active test mode, USD 2700 cents, one-time pricing and no custom amount, recurrence or quantity transformation. It exposes only state, amount and currency.
- `POST /api/apex/checkout` requires an exact configured/request origin match, rejects cross-site requests and non-JSON bodies, bounds actual bytes to 256 and accepts exactly one UUIDv4 request ID. Clients cannot choose price, amount, quantity, metadata, payment mode, recipient or redirects.
- The server rechecks price and creates a fixed one-item/quantity-one, card-only, one-time test Session. No adjustable quantity, extras, shipping or discounts are configured; adjustable quantity, Adaptive Pricing, automatic tax and promotion codes are explicitly false. Return/cancel URLs are server-configured. This avoids relying on Payment Link response fields that do not prove quantity locking.
- The UUID is sent as a versioned Stripe idempotency key. The browser retains it in this tab for 22 hours; ambiguous retries reuse it. Storage denial still preserves same-page retries. Explicit “Start a new test checkout” clears it and prepares a separate request. Creating a Session does not submit payment.
- A response becomes a clickable link only after the server verifies test Session ID/mode, fixed amount/provenance/item evidence and exact Stripe Checkout origin/path; the browser independently checks the test URL. Provider failures remain retryable and never return provider details or credentials.

## Provenance and entitlement

Server creation sets `metadata.apex_checkout_source=sandbox-fixed-v1`, a UUID request marker and matching `client_reference_id`. These are read back from Stripe with the restricted server key. They are **authenticated provider-record provenance, not platform user identity or a cryptographic signature**. No public endpoint accepts client-authored metadata. Trusted Stripe credential holders remain within the provider administration boundary.

A direct Session qualifies only when configuration and Session are test-mode, `payment_link` is null, the versioned metadata/reference agree, total/subtotal are exactly 2700 USD cents, tax/discount/shipping are zero and exactly one untransformed one-time configured price/quantity matches. The existing completed/paid Session and paid, non-refunded, non-disputed charge checks still apply. Legacy Payment Link entitlement remains unchanged, including live mode. Direct-session provenance can never qualify a live payment.

The existing signed webhook retrieves current Stripe evidence and calls the same fulfillment path. Download retrieves that evidence again. An unpaid, forged, wrong-price, refunded/disputed or live direct Session is denied. This does not create an authenticated account, register a product library or grant agent/platform authority.

## Customer experience and portability

The offer uses separate prepare/continue actions so the customer can review the Stripe test checkout. Loading, retry, double-click protection, back/forward restoration and URL rejection have DOM regression coverage. Test order access is clearly labeled. Existing private-link cleanup, tab recovery and paid-download protections remain intact.

On Android, download the HTML file and open it with a compatible local-HTML browser; some file managers only preview source, so a computer transfer is a supported fallback. Existing text action-plan exports support a human-readable chat handoff; JSON transfers progress into the checklist. Automatic authenticated library registration and in-chat execution remain unavailable. Never share private order links with other users or agents.

## Release gates

Before enabling the test flag, verify the intended sandbox account, restricted-key permissions, provider response shapes, signed webhook, sender/domain, support and return/cancel URLs. Run successful/declined/unpaid, duplicate/ambiguous creation, delayed completion, repeated webhooks, refund/dispute, wrong-provenance, email outage and repeat-download scenarios. Confirm real inbox arrival and Android file opening. Source/mock tests are not this acceptance.

Live commerce and real identity remain separate approved work. No live enablement, paid transaction or native Android app is claimed. Existing source is public; paid delivery is not digital-rights management.

Both commits and draft PR title use `[skip ci]` while hosting usage remains unverified. Actions/Netlify builds are deliberately skipped, not passed. Do not merge until authorized CI and deployed edge/browser verification run on the final commit.

References: https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/api/idempotent_requests ; https://docs.stripe.com/checkout/fulfillment ; https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs ; https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/ .
