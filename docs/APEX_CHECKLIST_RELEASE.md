# Apex Flow checklist — release and recovery

Updated 2026-10-04. The $997 guided/DWY tier stays closed until the owner has practiced delivery and explicitly reopens it. The existing checklist price is USD 27 one-time, unchanged. No alternative product/price is approved by this technical work. The long-term operating objective is autonomous/remote revenue.

## Deliverable and limits

`products/funnel-checklist/funnel-leak-emergency-checklist.html` contains 20 self-assessed checks across Traffic, Offer, Capture, Follow-up and Close, evidence prompts, fixes, a top-three action plan, optional device saving, JSON import/export, text export, print/PDF and a clean offline copy. It does not scan websites, connect accounts, use AI, provide coaching or guarantee revenue. Source is in a public operational repository; payment verification gates the hosted download, not public source access.

Build the product with `python3 products/funnel-checklist/build.py`. Install pinned application dependencies with `npm ci`. Run `npm run test:workflows`, `npm run test:identity`, `npm run typecheck`, `npm run lint`, and `npm run build`. CI runs the Apex tests on pull requests. DOM tests use synthetic HTTP and do not replace an actual browser or provider sandbox test.

## Runtime configuration — release blocked until verified

The application now requires both payment verification and a transactional sender before enabling paid access. No provider was provisioned, subscription purchased, credential read, or live sales toggle enabled in this work. Netlify sign-in was restored through the previously selected Google method. A fresh authenticated 2026-10-04 check confirms **No environment variables set for this project**.

Configure values directly in trusted Netlify server/function environments, never in chat, Git, NEXT_PUBLIC variables, logs, screenshots or untrusted PR previews.

| Variable | Purpose |
| --- | --- |
| `APEX_STRIPE_RESTRICTED_KEY` | Restricted Stripe key: Checkout Sessions read/write and required price/line-item/payment-intent/charge reads. Confirm permission dependencies in Stripe. |
| `APEX_STRIPE_WEBHOOK_SECRET` | This destination's signing secret. |
| `APEX_STRIPE_MODE` | `test` for an isolated sandbox, `live` only for approved production. |
| `APEX_STRIPE_TEST_PRICE_ID` | Sandbox USD 27 one-time price. |
| `APEX_STRIPE_TEST_PAYMENT_LINK_ID` | Sandbox link for that exact price. |
| `APEX_RESEND_API_KEY` | Transactional email sending key. Adapter is implemented but no Resend account or expense was authorized/provisioned. Use an owner-controlled account after approval of any cost. |
| `APEX_DELIVERY_FROM` | Bare email address on a sender domain verified by the email provider. |
| `APEX_SUPPORT_EMAIL` | Monitored reply-to address; confirm replies arrive before release. |
| `APEX_SITE_ORIGIN` | Exact HTTPS deployment origin, no slash/path/query. Use the sandbox deployment while testing. |
| `APEX_CHECKLIST_SALES_ENABLED` | Default absent/false. Set `true` only in isolated testing first; production requires the full acceptance gate. This does not publish a Buy button by itself. |
| `APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED` | Default absent/false. Separate operational approval to expose the existing live Payment Link only after every live acceptance gate below passes. Never enable in a preview or sandbox. |

The ChatGPT Stripe connector exposes only a live account in this session and does not install credentials in Netlify. Do not charge a live card to simulate tests.

Existing catalog: product `prod_V3MBNEBCG09Rzj`, price `price_1U3FTOPLMwl8qmZP4vwkUOi8`, link `plink_1U3FTTPLMwl8qmZPn4DQzrKE`. The last verified live link used hosted confirmation without a download redirect. It must not be advertised as working instant delivery until configured and tested.

## Guarded public offer (default off)

`GET /api/apex/checkout` is a provider-free configuration gate. It returns only `{enabled:false}` unless the public-checkout flag is exactly `true`, Netlify's captured build `CONTEXT` is `production`, `APEX_STRIPE_MODE=live`, the existing delivery configuration passes `ready(config())`, and the request URL origin exactly matches `APEX_SITE_ORIGIN`. Cross-origin caller headers fail closed. No caller parameter can select a price, link or mode. The enabled response contains only the pinned existing USD 27 Payment Link; it never creates Checkout Sessions or calls a provider. Responses are private/no-store and remain under the existing `/api/*` and site-wide edge rules.

The flag records a **separate operational approval**, not proof supplied by this endpoint. Presence/format checks cannot verify credential permissions, the sender domain, webhook registration, redirect, email arrival, support coverage, legal-copy approval or delivery success. An authorized operator must verify those acceptance gates before enabling it in the protected production runtime. `next.config.mjs` captures Netlify's build-only `CONTEXT` into the nonsecret `APEX_BUILD_CONTEXT` constant explicitly referenced by the server route; it does not rely on a runtime `CONTEXT` variable. Missing and preview build markers remain closed even if runtime variables say production. Do not configure an `APEX_BUILD_CONTEXT` runtime override or promote preview artifacts. See [Netlify runtime environment limits](https://docs.netlify.com/build/functions/environment-variables/). Missing JavaScript, configuration, a failed check, or a preview/test context keeps the page inquiry-only. Returning from another tab or browser back/forward rechecks the gate and clears old links first.

The offer discloses the current compatibility exception before purchase: standalone browser HTML, JSON progress and text-plan exports; automatic Tay product-library registration is unavailable and universal agent execution is not promised. The sample and consent-based interest form stay available. No new terms, refund commitments, prices or guided services are introduced. The global `/support` page points checklist questions to the existing transcenlutions@gmail.com address; `/terms`, `/refund` and `/privacy` still contain starter copy requiring owner review. Their existence is not legal approval, and the public flag must stay off until the applicable customer-facing policies are finalized.

To hide the public offer without blocking existing buyer downloads, set `APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED=false` in production and apply the host's environment update/redeploy procedure. Recheck the endpoint and page on the deployed commit. This presentation gate does not revoke a Stripe URL already copied or opened; disabling the provider Payment Link is a separate authorized action when stopping new payments is required. `APEX_CHECKLIST_SALES_ENABLED=false` remains the broader fulfillment kill switch and blocks paid downloads too.

Local synthetic tests cover allowed/denied configuration, request origin/context, no provider calls, no-store output, no-JavaScript/failure fallback and stale browser responses. They do not establish provider readiness, actual browser rendering, deployed edge enforcement or collected revenue. Deployment, live runtime changes and provider acceptance are separate approvals and checks; this code change leaves both flags off by default.

## Payment → email → download

1. Stripe sends `checkout.session.completed` or `checkout.session.async_payment_succeeded` to `POST /api/apex/stripe-webhook`. Require the signed raw payload, mode match, bounded body and timestamp tolerance. Unsupported events are acknowledged without action.
2. Retrieve current Stripe evidence. Fulfill only a complete, paid, one-time session for the exact configured link, USD 27 price, quantity one, expected currency, sufficient total and a non-refunded/non-disputed paid charge. Pending/wrong-product orders do not unlock.
3. Record pending dispatch metadata, send to `customer_details.email` from Stripe using a deterministic Resend idempotency key, then record provider acceptance. No user-supplied delivery recipient is accepted by the endpoint. No automatic marketing enrollment occurs.
4. The transactional email includes a private fragment link to `/apex-flow/access.html#session_id=...`. Save this email for repeat access. Fragments avoid putting the order token into the initial server request. For a Stripe return redirect, use `/apex-flow/access.html?session_id={CHECKOUT_SESSION_ID}`; provider/server access logs can contain this query, so restrict log access and retention. Do not publish real order URLs in evidence.
5. The access page removes the token from its visible URL and stores it in sessionStorage for same-tab refresh for up to 24 hours. Clear order access removes it immediately. Storage denial still allows the initial download; in that case reopen the delivery email link after refresh.
6. `POST /api/apex/checklist` checks current payment eligibility every time, then returns the actual packaged HTML file as an attachment with private/no-store headers. An email-provider outage does not prevent a qualified download. The file works offline; a later refund cannot revoke an already downloaded copy.

Metadata names: `apex_email_started`, `apex_email_payload` (SHA-256, not message/recipient), `apex_email_version`, `apex_email_state`, `apex_email_id`, `apex_checklist_ready`. An `accepted` state means the provider accepted the send request, not inbox arrival or product use. Inspect delivery/bounce/suppression status in the email provider during acceptance and operations. No bounce-monitoring automation is activated.

## Failure handling and safe recovery

- Invalid signature/payload: HTTP 400, no dispatch. Disabled/unconfigured runtime: HTTP 503. Provider/file errors: generic HTTP 503 without secret/customer details.
- Email acceptance or metadata failure: webhook returns 503 so Stripe retries. Replays after recorded acceptance do not send again. Concurrent fresh events use the same provider key and identical message payload.
- Resend deduplication lasts 24 hours. Ambiguous pending sends are retried for at most 22 hours from the recorded start. Older, malformed or changed-payload retries stop with 503 and require reconciliation. This prevents blind duplicate sends after the provider key expires; it is a deliberate human exception, not fully unattended recovery.
- Reconciliation: examine the failed Stripe event and corresponding email-provider record privately. If the email was accepted, repair the acceptance metadata using the verified provider ID and matching template version. If it was definitely never accepted, an authorized operator can reset the pending metadata and resend the Stripe event. Never clear uncertain state blindly. No automatic resends to a changed address.
- Bounced/suppressed/missing delivery email: buyer may still download from their checkout return. Support verifies the receipt privately and resolves the address/delivery issue. Do not request card details. These exceptions remain manual.
- Form POST timeout: the page displays the stable inquiry reference, disables another POST in that page instance, and directs the visitor to email. It does not claim receipt. Refresh/new-tab/global form deduplication is not guaranteed by Netlify; treat matching references as one inquiry.
- Kill switch: set both `APEX_CHECKLIST_PUBLIC_CHECKOUT_ENABLED=false` and `APEX_CHECKLIST_SALES_ENABLED=false`, then apply the environment update/redeploy. This also blocks paid downloads until restored. Existing downloaded files remain usable.
- Rollback: redeploy the last verified provider deployment from the release record; never force-push or overwrite main. Keep delivery metadata and template `v1` compatible with pending requests.

## Required live acceptance before selling

October 7 offer-only update: preserve the separately recorded October 4 legacy sandbox purchase-to-email/download acceptance. This change does not modify the payment or delivery handlers, reset or move that sandbox, or require another sandbox purchase solely to activate the offer. The sandbox steps below record the original acceptance scope; they are not authorization to repeat it. Production configuration, branded sender, webhook/redirect, support and customer-policy verification remain separate prerequisites.

1. Owner checks the actual file and confirms it matches the offer.
2. Connect an isolated Stripe sandbox and verified transactional sender; install credentials securely in a trusted test runtime. Do not send real buyer data to a new provider until approved.
3. Register the two webhook events and configure the test link's checkout return. Run successful, declined/unpaid, delayed-success, invalid-signature, duplicate-event, provider-outage, refunded/disputed and wrong-product scenarios.
4. Confirm a real sandbox checkout triggers an email that arrives in the intended test inbox, the private email link downloads the exact packaged file, refresh and reopen work, replies reach support, and provider delivery/failure status is visible. A stubbed test is insufficient.
5. Confirm Netlify function packaging, environment isolation, current build, form registration and recorded synthetic inquiry. Remove/count synthetic tests separately from prospects and revenue.
6. Only after those gates pass, approve production sender/data handling and any costs, configure live values/redirect/webhook, verify the offer and expose checkout. Do not reopen the guided tier or change prices.

Primary references: https://docs.stripe.com/checkout/fulfillment ; https://docs.stripe.com/webhooks ; https://docs.stripe.com/keys-best-practices ; https://resend.com/docs/dashboard/emails/idempotency-keys ; https://resend.com/docs/api-reference/emails/send-email .
