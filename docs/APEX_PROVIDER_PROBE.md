# One-off production provider probe

This is a code-only preparation. It does not authorize or perform a deployment, provider request, email, purchase, sandbox reset, credential creation or runtime change. Existing Apex order, webhook and email handlers are unchanged. The `npm run build` script is unchanged. Netlify’s checked-in build command invokes the probe only behind its explicit default-off enable switch; there is no HTTP route or scheduled job.

## Bounded evidence

`npm run probe:apex-providers` reads secrets only inside the authorized Netlify build process. It does not print, save, hash for output, copy to artifacts, or return credentials. It emits one JSON object with fixed status/reason codes, check results and explicit unverified booleans. Provider bodies, error text, headers, email IDs and customer data are never logged. HTTP redirects are rejected; responses are bounded to 64 KiB with a ten-second timeout. There are no automatic retries.

The probe makes at most four Stripe GET requests:

1. Retrieve the pinned live checklist Price and check its exact ID/product, active/live status, USD currency, 2700 unit amount and one-time type.
2. Check list-read access to Checkout Sessions, PaymentIntents and Charges using `limit=1&created[gte]=4102444800` (January 1, 2100). The result must be an empty, non-paginated list. There is no fallback to an unfiltered query or real buyer record.

These checks prove only the reported reads at that moment. They do not prove Checkout Session metadata-write access, real-session expanded-object permissions, the configured webhook secret's match with Stripe, webhook delivery, payment-to-file fulfillment, inbox arrival or future availability. A 404 is a failed check, never proof of complete permissions. The probe never signs a synthetic webhook, transmits its signing secret, creates an order/Checkout Session, charges a card, writes payment metadata or changes a provider object.

## Separate optional test email

Only `APEX_PROVIDER_PROBE_EMAIL_ENABLED=true`, after separate approval, permits a single Resend POST attempt after all four Stripe checks pass. Sender and recipient are pinned in code:

- From: `receipts@updates.transcenlutions.com`
- To and Reply-To: `transcenlutions@gmail.com`
- Subject: `TEST: Apex Flow production sender verification`
- Body: clearly labeled TEST ONLY; says no purchase or payment confirmation occurred; contains no order/download links, attachments, receipt data, customer data or promotion.

`APEX_DELIVERY_FROM` and `APEX_SUPPORT_EMAIL` must match these addresses. The existing Resend key must permit this sender. The payload and idempotency key remain identical across retries and concurrent builds within the same release approval. The key derives only from the fixed approval timestamp, never the current time or build ID. Approval expires after one hour, well inside Resend's 24-hour idempotency retention. Do not refresh the approval timestamp to recover an ambiguous send. Check the provider privately and obtain a new explicit approval if another test is needed.

`email=provider_accepted` means API acceptance only. The owner must separately find this exact TEST message in the intended inbox and inspect sender authentication/delivery evidence. No inbox reader or ongoing monitoring is installed here.

## Required operator-controlled staging

Do not run without explicit release/provider-read/email approvals. No secrets belong in a build command, shell arguments, chat, logs, `.env` files, or the repository. Existing secrets must already be authorized for the trusted production build scope. If they are Functions-only, request the necessary scope approval; do not silently broaden access. Never expose production secrets to PR or branch-preview contexts.

Before invoking the command, the release operator must verify in Netlify that the currently published deploy is locked so the new production-context candidate remains unpublished. The probe cannot inspect or enforce Netlify's publication lock; the staging variable below is explicit operator attestation, not independent evidence. Verify that lock again before the build and verify the candidate remains unpublished afterward. A missing lock is a stop condition.

All gates must match:

- Netlify-provided `NETLIFY=true`, `CONTEXT=production`, `PULL_REQUEST=false`, with no preview-server flag
- Netlify `URL` and `APEX_SITE_ORIGIN` both exactly `https://tay-command.netlify.app`
- `APEX_STRIPE_MODE=live` and an existing live restricted key
- `APEX_PROVIDER_PROBE_ENABLED=true`
- `APEX_PROVIDER_PROBE_STAGING_APPROVAL=locked-unpublished-production`
- `APEX_PROVIDER_PROBE_APPROVED_COMMIT` equal to the exact reviewed 40-character `COMMIT_REF`
- `APEX_PROVIDER_PROBE_APPROVED_AT` equal to the fixed timestamp for the approved release attempt; it must not be in the future or at least one hour old
- For the separately approved email only: `APEX_PROVIDER_PROBE_EMAIL_ENABLED=true` plus the exact configured sender/support and existing Resend key

Netlify’s file-based build command overrides the UI build setting. The checked-in command therefore runs the unchanged `npm run build`, then invokes `npm run probe:apex-providers` only when `APEX_PROVIDER_PROBE_ENABLED` is exactly `true`. Missing/false values skip the probe without provider calls or output; a failed app build never invokes it. An enabled probe with missing, expired, preview or otherwise invalid approval fails the build. Configure approved flags only for the trusted production candidate, never for deploy previews. Remove/disable the probe and email flags after the one-off validation; a subsequent build must not inherit an active approval window.

A separately approved candidate may have its public-checkout flag already true so the exact staged build can later be published without another configuration build. This probe does not set that flag or grant publication approval. The existing checkout origin guard still keeps the public checkout response disabled on the deploy permalink. The currently published deployment and the sandbox remain untouched. Publish only the exact validated candidate after the remaining delivery, support, policy and owner approval gates are satisfied.

## Local verification and sources

`node --test scripts/test-apex-provider-probe.cjs` uses synthetic configuration and HTTP stubs only. It covers all gates independently, denied/non-production contexts, expiration, pinned requests, unexpected records, bounded/error responses, no secret leakage, email opt-in, fixed recipients, idempotency ambiguous outcomes, and conditional build-command sequencing/failure propagation. `npm run test:apex` includes these tests. These tests do not establish live provider readiness.

Primary references:
- Netlify [file-based command precedence](https://docs.netlify.com/build/configure-builds/file-based-configuration/) and [build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/)
- Stripe [retrieve Price](https://docs.stripe.com/api/prices/retrieve), [list Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/list), [list PaymentIntents](https://docs.stripe.com/api/payment_intents/list), [list Charges](https://docs.stripe.com/api/charges/list)
- Resend [send email](https://resend.com/docs/api-reference/emails/send-email) and [24-hour idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
