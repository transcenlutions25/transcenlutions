# Revenue Payment Setup

Transcenlutions handles income as real money. Tay should never pretend to charge
a buyer, hide payment work, or collect card details inside the app.

## Supported Phase 1 Payment Paths

1. Approved Stripe Payment Links per offer.
2. Stripe API checkout keys plus price IDs when custom checkout is added later.
3. Manual invoice email handoff when a real company or billing email is configured.
4. Setup-required state when no approved payment path is configured.

## Environment Variables

```bash
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK="https://buy.stripe.com/your-starter-map-link"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK="https://buy.stripe.com/your-operator-sprint-link"
NEXT_PUBLIC_STRIPE_ACCOUNT_READY="false"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_or_live_key_here"
STRIPE_SECRET_KEY="sk_test_or_live_key_here"
NEXT_PUBLIC_STRIPE_STARTER_MAP_PRICE_ID="price_starter_map"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PRICE_ID="price_operator_sprint"
NEXT_PUBLIC_TAY_REVENUE_TEST_MODE="false"
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_SUPPORT_EMAIL="support@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_REFUND_COPY="Refund requests are reviewed against the paid scope and delivery status."
NEXT_PUBLIC_TRANSCENLUTIONS_REVENUE_DISCLAIMER="Transcenlutions does not guarantee income; results depend on execution, market fit, and buyer response."
NEXT_PUBLIC_DELIVERY_ARTIFACT_LOCATION="Tay result card and confirmed buyer delivery folder"
```

`NEXT_PUBLIC_TRANSCENLUTIONS_PAYMENT_URL` is still accepted as a legacy fallback
for the starter offer, but per-offer Stripe Payment Links are the preferred path.
When every current offer has an approved Stripe-hosted Payment Link, the app does
not require Stripe API keys for checkout handoff because Stripe hosts the payment
page outside Tay.

## Care Rules

- Use one Stripe Payment Link per offer so price and buyer expectation stay clear.
- Confirm the checkout page has the correct price, scope, receipt details, and
  delivery expectation before sharing it with a buyer.
- Do not enter card data into Tay or the Transcenlutions app.
- Do not show a checkout button unless the URL is an approved HTTPS Stripe link.
- Checkout and invoice handoff must go through Tay approval before the link or
  invoice draft appears.
- Test mode must stay labeled as simulated and must not claim real revenue.
- Do not show invoice handoff unless a real company or billing email recipient
  is configured.
- Keep every revenue command visible in Tay's activity record.

See [company-email-setup.md](company-email-setup.md) for the inbox setup rules.
