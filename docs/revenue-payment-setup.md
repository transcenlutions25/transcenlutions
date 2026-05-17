# Revenue Payment Setup

Transcenlutions handles income as real money. Tay should never pretend to charge
a buyer, hide payment work, or collect card details inside the app.

## Supported Phase 1 Payment Paths

1. Approved Stripe Payment Links per offer.
2. Manual invoice email handoff when a real company or billing email is configured.
3. Setup-required state when neither path is configured.

## Environment Variables

```bash
NEXT_PUBLIC_STRIPE_STARTER_MAP_PAYMENT_LINK="https://buy.stripe.com/your-starter-map-link"
NEXT_PUBLIC_STRIPE_OPERATOR_SPRINT_PAYMENT_LINK="https://buy.stripe.com/your-operator-sprint-link"
NEXT_PUBLIC_TRANSCENLUTIONS_COMPANY_EMAIL="hello@transcenlutions.com"
NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL="billing@transcenlutions.com"
```

`NEXT_PUBLIC_TRANSCENLUTIONS_PAYMENT_URL` is still accepted as a legacy fallback
for the starter offer, but per-offer Stripe Payment Links are the preferred path.

## Care Rules

- Use one Stripe Payment Link per offer so price and buyer expectation stay clear.
- Confirm the checkout page has the correct price, scope, receipt details, and
  delivery expectation before sharing it with a buyer.
- Do not enter card data into Tay or the Transcenlutions app.
- Do not show a checkout button unless the URL is an approved HTTPS Stripe link.
- Do not show invoice handoff unless a real company or billing email recipient
  is configured.
- Keep every revenue command visible in Tay's activity record.

See [company-email-setup.md](company-email-setup.md) for the inbox setup rules.
