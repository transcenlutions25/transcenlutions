# Participation records and royalty attribution foundation

Status: reviewable source-only foundation. Implements the generic records portion of the October 6, 2026 owner-adopted business-structure direction. This document is a technical contract, not a legal agreement, permission to use a likeness, proof of signed terms, a live accounting service, or a payment instruction. Existing canon and production identity safeguards remain unchanged.

## Boundaries

`lib/participation/` is pure TypeScript. It has no UI, API endpoint, database, network client, filesystem writer, payment operation or production integration. It must not be connected to publication, private-record access or payouts until authenticated tenant/resource authorization, durable audit storage and approval workflows are implemented and independently verified. `authorizesExecution` is always false. A matching consent record is only an advisory comparison against caller-supplied evidence references; it does not authenticate a person, signature, legal entity or agreement.

No real participant data, agreements, signatures, artwork, voices, financial transactions or private document URLs belong in this public repository. The tests contain only synthetic opaque identifiers and made-up arithmetic. There is no default royalty, guaranteed earning, automatic owner royalty, equity interest, ownership transfer or tax classification. Creator contributions and rights provenance are separate. Never infer IP ownership from a product suggestion.

## Consent and reconciliation

- `readConsent` / `parseConsent` validate exact fields, bounded lists, opaque references and canonical UTC timestamps. Scope identifies participant, tenant, asset, asset version, SHA-256 digest, product, use, context, audience, provider, territory, channel and an explicit start-inclusive/end-exclusive term. There are no wildcard scope matches or automatic renewal.
- `evaluateConsent` requires an executed record, agreement and both signature references, material approval and rights-review references. Unknown, draft, expired and revoked records deny matching. Adult status, a separately clear minor-linked review flag, and cleared third-party rights are required by this limited evaluator; minors and unknown status remain blocked for separate appropriate review. References are not proof of legal validity.
- AI generation, voice cloning, training and sublicensing each have an independent approved/denied/unknown decision. A normal display grant never silently enables any of them. The request must explicitly state whether each capability is requested.
- Existing-customer continuation uses a separate recorded scope, term, evidence and customer-cohort reference. It does not permit new-customer distribution or revive a revoked record. Where counsel determines surviving obligations, a separately reviewed continuation record is required.
- `appendReconciliation` returns a new history preserving existing promises, signed terms, conflicts, affected releases and remediation references. Duplicate IDs, cross-tenant/participant histories and nonexistent prior-reference IDs fail. A resolved review does not overwrite prior evidence. Persistence must add concurrency control and append-only authorization; this helper itself is not a database or tamper-proof log.

## Collections, allocation and evidence

`readRoyaltyLedger` / `parseRoyaltyLedger` validate schema version 1. This first version deliberately supports only USD, using integer cents and integer basis points. Safe-integer sums and BigInt multiplication prevent floating-point fractional money arithmetic.

Each collection has a unique transaction ID and unique source receipt reference. Gross is actual customer cash collected including sales tax, before payment/store fees, not processor net settlement and not a bank payout. Projected collections are explicitly flagged and excluded from attribution. Unsupported currencies, settlement-only records and unknown shapes must be reconciled before use.

A collection is divided into explicit cent allocations with unique IDs. Every allocation identifies one product and one source; bundles/subscriptions cannot book their full amount to multiple products. Allocations must sum exactly to collection gross. Include an allocation with both product/source null for any unallocated remainder. The agreed allocation policy reference is mandatory; do not invent a weight or rounding remainder. Source-scoped royalty schedules can apply only to matching product/source allocations.

Tax and each payment/store fee are uniquely identified deduction items. Their source-item references must also be unique across the ledger; when a provider document covers multiple items, resolve each actual item to a distinct stable reference. Never enter the same processor fee again as a store fee. The validator detects repeated IDs/source items, but cannot detect misrepresented provenance with fabricated new IDs. An authenticated reconciliation layer must verify provider evidence.

## Explicit compensation policy

Every applicable schedule must have executed agreement evidence, participant/entity signature references, rights provenance, effective term, named deduction and compensation policies, explicit fee categories, explicit rounding and an adjustment policy reference. No empty agreement evidence or implicit rates are accepted. Separate product-creation or combined compensation also needs contribution evidence; this does not confer ownership.

Combined compensation has one explicitly elected combined rate. Separate compensation has explicit likeness and/or product-creation components, with their sum at most 10,000 basis points. Overlapping executed schedules for the same participant/product/source/tenant are rejected rather than silently stacked. Different participants may have explicit separate schedules; aggregate calculated amounts cannot exceed the smallest applicable eligible base, both originally and after adjustments. This conservative gate requires review where participants have different deduction policies. Commercial margin adequacy remains a separate review.

Tax is excluded once. Only payment/store fee kinds explicitly allowed by the schedule reduce its eligible base. No overhead or vague net-profit deductions exist. The synthetic test rate of 700 basis points is merely a test input, not a suggested negotiation or accepted commercial term.

## Refunds, chargebacks and rounding

Corrections are separate uniquely keyed events against an original collected transaction and allocation. Refund/chargeback principal excludes returned tax. Each principal adjustment includes an explicit zero-based cent offset into original tax-exclusive principal; these ranges must be disjoint and in bounds. This is a reconciliation representation, not a claim the processor supplies ranges. The ingestion layer must establish ranges from verified source events, including refund/chargeback overlaps, before calculation. Do not assign arbitrary disjoint ranges merely to bypass an overlap.

Returned tax is tracked separately for the cash bridge and bounded by original tax. It is not deducted from royalty base a second time. Fee reversals reference original non-tax deductions and cannot exceed their original amount. New dispute fees, chargeback reversals/recoveries, cross-currency corrections, reserves and revised allocation policies are unsupported in this version and require explicit reconciliation and a later version. Do not silently shoehorn them into refund fields.

Eligible base = max(0, allocated gross − original tax − cumulative returned principal − remaining allowed fees). Calculations recompute the original and remaining entitlement. `adjustmentDeltaCents` is the cumulative change from the original collection, not a fresh incremental journal entry on each run. Never sum repeated snapshots; key them by transaction/allocation/schedule and retain previous statement snapshots separately. Negative deltas flag potential corrections for review; they never authorize an automatic clawback or deduction from another product/participant. A revoked schedule requires its effective time; collections before revocation retain historical calculations, and later adjustments still reconcile them.

Rounding is explicitly elected: floor or half-up per allocation and component. `roundingResidualNumerator` is (calculated cents × 10,000) − exact cents-basis-points numerator; its denominator is 10,000 cents. Independent component rounding that exceeds the eligible base rejects for explicit reconciliation rather than inventing an extra fee. There is no hidden carry-forward or statement-level rounding. For sequential statements, event delta is current cumulative rounded entitlement minus the previous cumulative rounded entitlement. Example: a synthetic 5-cent collection at an explicitly elected 1,000 basis points yields 1 cent under half-up rounding; a 1-cent principal refund changes entitlement to 0 cents (delta −1), and a second 1-cent refund leaves 0 cents (delta 0). Independently rounding each refund would miss this correction. Agree the policy before activation.

## Fixed fees, statements and integration limits

`readFixedCreationObligations` keeps separately keyed one-time fixed creation obligations with source evidence, product, participant, due date and amount. Duplicate source references/IDs are rejected. These obligations are not multiplied by orders and are not mixed into percent royalty calculation or marked payable/paid. Final settlement and any combination with royalties require review of signed terms.

Attribution lines expose gross collections, original tax, principal/tax returned, allowed fees, original/remaining eligible base, component amounts and cumulative correction. Gross/base fields repeat across participant schedule rows for explainability: aggregate revenue once per collection/allocation, never by summing those repeated line fields. The result deliberately has `approvedPayableCents: null`, `verifiedPaidCents: null`, `reviewRequired: true`, and `authorizesExecution: false`. Reporting cadence, audit rights, renewal, governing law, entity identity, actual ownership, payment approval/due dates and existing promises live in separately reviewed final agreements; they are not invented here.

Before production: establish authenticated evidence provenance and immutable record versions; resolve all existing promises; validate rights and affected releases; implement durable tenant authorization/idempotency/concurrency controls; elect supported policies; retain canonical/private source evidence; perform accounting/legal review; then separately review an integration plan. No migration or endpoint is shipped in this change. JSON parsers reject unknown/missing fields, malformed input and over-size input; structural validation cannot authenticate content or make untrusted references into instructions.

## Validation

Run `npm run test:participation`, `npm run typecheck`, the existing Launch gate and `npm run security`. Focused tests cover granular consent, malformed inputs, fractional/overflow arithmetic, allocation reconciliation, duplicate receipts and deduction provenance, overlapping adjustments, rounding residuals/overcount, revocation history, fixed-fee idempotency and unchanged production identity failure. All fixtures are synthetic; tests never contact payment services or initiate transactions.

Release remains branch → checks → authorized preview → controlled merge → verification. This source-only draft intentionally does not deploy or merge. Local success is not a claim of passing remote checks or a working live service.
