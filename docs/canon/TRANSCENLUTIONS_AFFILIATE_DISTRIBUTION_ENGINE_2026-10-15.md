# Transcenlutions Affiliate Distribution Engine Canon

**Effective:** 2026-10-15  
**Scope:** Affiliate marketing, partner distribution, creator commissions, referral tracking, marketplace distribution, Transcenlutions-owned offers, and approved third-party offers.

## Core rule

Affiliate marketing is a distribution model, not a ClickBank-specific workflow.

Tay must treat ClickBank as one provider among many. The affiliate engine must be platform-agnostic so Transcenlutions can both:

1. **Promote third-party offers** and earn commissions as an affiliate; and
2. **Publish Transcenlutions-owned offers for other affiliates, creators, and partners to promote** and pay commissions on referred sales.

The same campaign and attribution model should support both directions.

## Two-sided operating model

### Side A — Transcenlutions as affiliate

**traffic/content/ad → Transcenlutions opt-in or pre-sell → bridge/VSL/sales education → tracked partner link → merchant checkout → commission attribution → follow-up where permitted**

Tay may research and rank third-party offers using conversion economics and customer value. Provider-specific metrics are inputs, not universal truth. ClickBank Gravity must never be treated as the sole selection criterion.

### Side B — Transcenlutions as vendor / advertiser

**affiliate/creator/partner → tracked Transcenlutions referral link or code → product funnel → Transcenlutions checkout → sale attribution → commission calculation → approved payout workflow → customer delivery/follow-up**

Every substantial Transcenlutions product should be capable of becoming an affiliate-ready offer when commercially appropriate.

## Provider classes

Tay should support multiple provider types rather than hard-code one marketplace:

- Affiliate marketplaces/networks where Transcenlutions can promote other vendors and/or list its own offers.
- Store-native creator/affiliate systems tied to the commerce platform.
- Direct affiliate software that tracks links, codes, conversions, commissions and partner status.
- Direct partner/referral relationships with custom tracking.

Examples may include ClickBank, Digistore24, Shopify-compatible affiliate systems, Payhip affiliate programs, and future providers that meet the same operating contract. Provider availability, pricing, eligibility and capabilities must be verified before activation.

## Affiliate-ready product package

A Transcenlutions offer intended for outside promoters should include, where useful:

- clear customer and problem definition;
- approved sales page / VSL / bridge assets;
- affiliate-specific landing page where appropriate;
- commission structure and attribution window;
- product positioning and allowed claims;
- prohibited claims and compliance notes;
- approved short-form copy, email copy and social copy;
- image/video creative pack;
- FAQ and objection-handling notes;
- affiliate link/code generation instructions;
- campaign and source attribution;
- conversion reporting where available;
- refund/reversal treatment;
- payout rules and status;
- support/contact path for affiliates.

Affiliate materials must not invent testimonials, scarcity, earnings claims or guarantees.

## Shared data model

The affiliate engine should normalize provider-specific records into a common model where implementation permits:

- `offerId`
- `productId`
- `provider`
- `providerOfferId`
- `affiliateId` / `partnerId`
- `campaignId`
- `requestId`
- `trackingLink`
- `couponCode` when used
- `trafficSource`
- UTM parameters
- `funnelVersion`
- `checkoutDestination`
- `commissionType`
- `commissionRate` / `commissionAmount`
- `cookieWindow` / attribution window when disclosed
- `clicks`
- `optIns`
- `sales`
- `refunds` / reversals
- `grossRevenue`
- `commissionExpense` for Transcenlutions-owned offers
- `commissionRevenue` for third-party offers
- `netRevenue`
- `status`
- `lastVerifiedAt`

Do not fabricate metrics a provider does not expose.

## Offer selection

For third-party offers, evaluate:

- customer value and actual product quality;
- conversion rate;
- EPC or equivalent earnings metric;
- average payout;
- recurring revenue where relevant;
- refund/reversal and compliance risk;
- traffic-channel fit;
- competition and creative saturation;
- seller support and affiliate resources;
- approval requirements;
- tracking reliability;
- landing-page/funnel quality;
- ability to create a congruent bridge experience.

Reject offers whose economics look attractive but whose value, claims, refund profile or customer experience do not meet the Transcenlutions standard.

## Revenue-first rollout

Near-term revenue does not wait for the entire multi-provider engine to be complete. Use the best verified channel available now, while keeping all campaign records portable enough to migrate to additional providers later.

Initial rollout priority:

1. Launch one verified third-party offer through a bridge funnel and organic traffic.
2. Make one Transcenlutions-owned product affiliate-ready.
3. Add provider adapters only when they unlock distribution or measurable revenue.
4. Expand to additional networks after the first funnel proves its message and conversion path.

## Owner gates

Do not activate a new paid plan, accept binding commercial terms, submit tax or banking information, enter credentials, issue payouts, change commission economics, spend on ads, or publish live external campaigns without the owner authorization required by platform governance.

Existing authorization to pursue revenue does authorize research, drafting, safe internal build work, approved vendor inquiries, and preparation of affiliate assets within those gates.