# Acquisition OS Domain Contract v1.0

**Status:** Approved design contract  
**Parent system:** Tay Command / Transcenlutions  
**Architecture rule:** Module/merge only. Never replace Tay Command.  
**Owner-facing orchestrator:** Tay  
**System of record:** Tay Operating Graph + Acquisition domain data  
**Notion:** Optional integration/view, not source of truth  
**Grok:** Workflow inspiration/reference, not a required dependency

## Mission

Acquisition OS exists to discover, evaluate, acquire, integrate, and oversee businesses without requiring the owner to become their day-to-day employee.

The operating objective is:

`ownership -> cash flow -> management independence -> controlled automation -> portfolio growth`

Acquisition OS is a module beneath Tay Command, not a separate application.

## Domain boundary

Acquisition OS owns:

- business discovery and listing ingestion
- canonical candidate records and source evidence
- deduplication and qualification
- seller/broker inquiry workflow and reply tracking
- financial normalization and owner-independence analysis
- document requests, NDA status, and due diligence
- financing scenarios and LOI workflow
- closing readiness, integration planning, and post-acquisition handoff

Acquisition OS does not independently:

- sign agreements, NDAs, LOIs, or purchase agreements
- accept binding legal terms
- commit financing or move money
- represent the owner legally
- change ownership or close transactions
- bypass CAPTCHAs or access controls
- fabricate financial information or turn seller claims into verified facts

These boundaries route through Tay Governance.

## Canonical lifecycle

```text
DISCOVERED
-> VERIFICATION
-> QUALIFIED
-> NEEDS_HALL_REVIEW
-> APPROVED_FOR_INQUIRY
-> INQUIRY_PREPARED
-> INQUIRY_SENT
-> RESPONSE_RECEIVED
-> INFORMATION_REQUESTED
-> NDA_MANUAL_REVIEW
-> FINANCIAL_REVIEW
-> DUE_DILIGENCE
-> FINANCING
-> LOI_REVIEW
-> LOI_SUBMITTED
-> DEFINITIVE_AGREEMENT
-> CLOSING_READY
-> ACQUIRED
-> INTEGRATION
-> OPERATING
```

Exit states:

`PASSED`, `WITHDRAWN`, `SELLER_REJECTED`, `STALE`, `DUPLICATE`, `CLOSED_BY_OTHER_BUYER`.

Records are not deleted merely because a deal is passed. The Operating Graph preserves what happened and why.

## Owner Independence Contract

Every candidate receives an Owner Independence Assessment covering:

- existing management and replacement management cost
- employee/contractor delivery capacity
- seller and founder dependency
- SOP/documentation maturity
- customer concentration
- recurring/repeat revenue
- sales dependency
- licensing and transferability
- key relationships and vendor dependencies
- CRM/accounting/scheduling/operating-system transferability
- cash flow after management, debt service, working capital, and CapEx

A profitable company can still fail this assessment if ownership would require the owner to perform the company's daily job.

## Tay acquisition workforce

Tay remains the executive orchestrator.

### Scout
Discovers candidates from authorized/public sources, normalizes listing data, detects likely duplicates, updates source timestamps, and places candidates into DISCOVERED.

### Verifier
Separates verified facts, seller/broker claims, system inference, and unknown information. Provenance must exist at the data level.

### Analyst
Normalizes revenue, EBITDA, SDE, add-backs, asking price, multiples, working capital, CapEx, management replacement cost, debt service, and transaction scenarios. Seller claims remain claims until supported.

### Operator
Performs the Owner Independence Assessment and identifies systems or management required to remove owner dependency.

### Outreach
Prepares simple inquiries, broker/seller questions, document requests, follow-ups, and response summaries. Consequential external communications remain governed.

### Deal Coordinator
Maintains stage, tasks, deadlines, communications, documents, outstanding questions, approvals, and next actions.

### Diligence
Tracks financial, tax, legal, employment, contracts, customers, vendors, operations, technology, assets, insurance, licenses, and other relevant diligence categories. Missing evidence stays visibly missing.

### Capital
Models potential transaction structures and financing scenarios. It prepares analysis; the owner approves financing decisions.

### Integration
Builds Day 0, Day 1, Days 2-30, Days 31-90, and Year 1 integration plans so acquired businesses enter the Transcenlutions operating system instead of becoming another owner-operated job.

## Canonical candidate record

Each candidate receives a stable ID such as `ACQ-2026-000001`.

The record contains:

- identity: business name, location, industry, canonical URL
- source: source/listing, URL, discovery date, last verified date
- seller/broker/contact data
- asking price and stated terms
- financial metrics and their provenance
- operations, employees, management, and locations
- owner role and dependencies
- customer/revenue durability information
- deal stage, next action, and responsible worker
- communications and follow-ups
- documents and missing-document state
- financing scenarios
- evidence/provenance
- governance/approval state
- integration plan
- Operating Graph relationships

## Evidence contract

Every material acquisition fact should support provenance equivalent to:

```text
metric
value
source_type
source_url
source_date
evidence_status
confidence
verified_at
verified_by
```

Evidence status must distinguish at minimum:

- `seller_claim`
- `broker_claim`
- `public_source`
- `document_supported`
- `system_inference`
- `unknown`

Tay must describe claims truthfully. Example: "The broker listing claims approximately $425,000 EBITDA; supporting financial statements have not yet been reviewed."

## Deduplication contract

Potential duplicates are evaluated using available signals including canonical URL, business name, location, phone, broker, asking price, revenue, description similarity, listing identifiers, and source cross-references.

Potential duplicates enter `DUPLICATE_REVIEW`; they are not silently destroyed.

## Buy-box contract

Acquisition strategies are named and configurable rather than permanently hard-coded.

An initial Transcenlutions owner-independent services strategy may prefer established service businesses, repeat/recurring customers, transferable operations, management potential, documentable cash flow, and seller transition willingness.

Risk/escalation signals include extreme owner dependency, unverifiable financials, untransferable licensing, major customer concentration, material liabilities, and businesses requiring the owner to perform core labor.

Thresholds such as price, revenue, EBITDA, SDE, geography, and industry remain configurable.

## Evaluation contract

Do not hide decisions behind an unexplained AI deal score.

Expose dimensions such as:

- financial strength
- owner independence
- revenue durability
- operational transferability
- customer concentration
- financing feasibility
- strategic fit
- evidence quality
- outstanding risk

Each assessment must expose its basis and material unknowns. The owner makes the acquisition decision.

## Governance contract

Existing Tay governance remains authoritative.

### Allowed
Research public information; normalize and deduplicate data; analyze supplied documents; calculate scenarios; prepare questions and communications; summarize replies; maintain internal workflow state; create internal reports.

### Approval required
Send external inquiries or follow-ups; contact sellers/brokers; submit forms; share Transcenlutions information externally; request sensitive financial information; schedule consequential meetings; advance a deal into LOI preparation; expose information to a new external service.

### Owner/professional gate
Accept/sign NDAs; submit/sign LOIs; accept representations or warranties; commit financing; open escrow; transfer money; execute purchase agreements; acquire equity/assets; close transactions.

Legal and tax determinations remain appropriate professional-review matters.

## CAPTCHA, NDA, and binding-term rule

```text
Simple inquiry -> prepare -> approval -> submit
CAPTCHA -> MANUAL_REVIEW
NDA -> MANUAL_OR_LEGAL_REVIEW
Binding terms -> OWNER_APPROVAL
Unknown consequence -> ESCALATE_TO_TAY
```

No CAPTCHA bypass.

## Tay intent extensions

Future acquisition-specific Tay intents should include concepts equivalent to:

- `discover_acquisitions`
- `review_candidate`
- `verify_candidate`
- `analyze_acquisition`
- `review_owner_independence`
- `prepare_inquiry`
- `handle_deal_reply`
- `run_due_diligence`
- `model_financing`
- `prepare_loi_review`
- `prepare_integration`
- `review_portfolio`

These extend existing Tay intents; they do not replace them.

## Governed action extensions

Future acquisition action types should include concepts equivalent to:

- `search_candidates`
- `verify_candidate`
- `qualify_candidate`
- `analyze_financials`
- `assess_owner_independence`
- `prepare_deal_inquiry`
- `route_deal_reply`
- `prepare_diligence`
- `model_deal_structure`
- `prepare_loi_package`
- `prepare_integration_plan`
- `route_acquisition_decision`

These must flow through the existing Tay Core -> Governance -> Action Engine -> Operating Graph path.

## Operating Graph mapping

Use the existing graph primitives instead of creating another permission framework.

Actors may include the owner as `human` and Tay, Scout, Verifier, Analyst, Operator, Outreach, Deal Coordinator, Diligence, Capital, and Integration as `ai_agent` actors where/when implemented.

Skills may include versioned definitions such as:

- `acquisition.discovery.v1`
- `acquisition.verification.v1`
- `acquisition.financial_analysis.v1`
- `acquisition.owner_independence.v1`
- `acquisition.outreach.v1`
- `acquisition.diligence.v1`
- `acquisition.financing.v1`
- `acquisition.integration.v1`

Authority grants define whether each actor may `see`, `suggest`, `assist`, `act`, or `represent` within a resource scope. No worker independently represents Transcenlutions in a binding acquisition.

## Acquisition lifecycle events

Acquisition OS should emit events such as:

```text
candidate_discovered
candidate_verified
candidate_qualified
candidate_rejected
candidate_duplicate_detected
hall_review_requested
hall_review_approved
hall_review_declined
inquiry_prepared
inquiry_approved
inquiry_sent
reply_received
nda_requested
document_received
document_missing
financial_analysis_completed
owner_independence_completed
diligence_started
diligence_issue_found
diligence_completed
financing_scenario_created
loi_prepared
loi_approved
loi_submitted
loi_rejected
loi_accepted
closing_ready
acquisition_closed
integration_started
integration_completed
operating_review_completed
```

Events retain correlation/causation data so Tay can reconstruct the deal history.

## Owner Attention Queue

The owner should not have to browse every candidate.

Tay surfaces only decisions/exceptions requiring owner authority, such as approvals, meaningful seller responses, financial anomalies, NDAs, diligence exceptions, consequential deadlines, LOIs, financing commitments, and closing decisions.

Routine permitted work remains in the workflow.

## UI contract

Tay Command remains chat-first.

Acquisition OS is a compact module/command-room view inside the existing interface, with candidate deal rooms and an Owner Attention Queue. It must not become a disconnected CRM or second application.

## Notion and Grok integration policy

Notion may be used later as an optional collaboration or synchronized view, but Tay's authoritative acquisition state belongs to Transcenlutions.

Grok may later be used as a replaceable research/provider integration if useful. Acquisition OS must not depend on Grok to function.

## Revenue and operations relationship

Acquisition OS connects to the wider Transcenlutions lifecycle:

`Revenue OS -> cash flow -> Acquisition OS -> acquired assets -> Operations OS -> additional cash flow`.

A candidate may become a Transcenlutions customer before becoming an acquisition candidate, provided each relationship is tracked truthfully and separately.

## Definition of done for Acquisition OS v1

Acquisition OS v1 is complete when Tay can govern a source-backed candidate from discovery through review without creating a second application:

1. A discovery request routes through Tay governance.
2. Source-backed candidates are recorded and deduplicated.
3. Evidence distinguishes claims, supported facts, inferences, and unknowns.
4. Qualified candidates reach the Owner Attention Queue.
5. Approved outreach is prepared and external action remains governed.
6. Replies and requested documents attach to the canonical deal.
7. Financial and owner-independence analyses are visible and evidence-aware.
8. Diligence tracks missing information and exceptions.
9. Financing scenarios and LOI preparation remain approval-controlled.
10. Integration planning begins before closing.
11. The Operating Graph records the lifecycle.
12. Tay never claims an external action occurred unless evidence shows it occurred.

## Build sequencing

This contract is architecture, not authorization to build the entire module at once.

Preserve the current Tay Command interface, routes, Tay Core, Action Engine, Governance, Founder OS, Revenue infrastructure, and Operating Graph.

Implementation must proceed through controlled modules/merges and remain subordinate to launch readiness. No separate Acquisition app should be created.
