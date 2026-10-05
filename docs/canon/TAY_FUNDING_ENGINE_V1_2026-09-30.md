# Tay Funding Engine V1
Date: 2026-09-30
Status: Canon proposal / implementation foundation

## Purpose

Tay Funding Engine turns grant and non-dilutive funding discovery into a governed pipeline for Transcenlutions first and, later, eligible members of the Transcenlutions community.

The owner-facing experience should be simple:

Owner/User -> Tay -> qualified funding pipeline -> prepared applications -> required approval/payment/signature -> submission -> confirmation -> monitoring.

Tay remains the primary orchestrator. Dawn, Rory, and future agents are workers. n8n, GitHub Actions, browser automation, APIs, and other systems are execution equipment.

## Core outcomes

1. Discover legitimate grants and non-dilutive funding continuously.
2. Rank by deadline, eligibility, expected value, application effort, required match/fee, and strategic fit.
3. Reject obvious scams and flag uncertain opportunities for review.
4. Maintain one verified Business Funding Profile so repeated facts are not re-entered manually.
5. Generate tailored application answers from verified facts without fabricating revenue, certifications, demographic status, impact, customers, or traction.
6. Require explicit approval for fees, purchases, bank linking, credit pulls, signatures, legal attestations, or other consequential commitments.
7. Record every application, confirmation, deadline, follow-up, result, and lesson.
8. Convert successful application workflows into reusable Playbooks.
9. Support multiple organizations/tenants later without leaking one tenant's private data to another.
10. Make the interface accessible, low-noise, and usable from mobile.

## Pipeline states

discovered
-> eligibility_check
-> qualified
-> needs_information
-> ready_to_apply
-> approval_required
-> submitted
-> confirmation_received
-> follow_up
-> awarded
-> declined
-> expired
-> withdrawn
-> disqualified

Every state change should be auditable.

## Opportunity record

Each opportunity should capture at minimum:

- opportunity_id
- source
- source_url
- sponsor
- program_name
- funding_type
- award_min
- award_max
- number_of_awards when known
- deadline_local
- timezone
- rolling_or_fixed
- application_fee
- purchase_required
- membership_required
- geography
- business_age_requirement
- revenue_requirement
- ownership/demographic eligibility when legally relevant
- industry restrictions
- use-of-funds restrictions
- documentation requirements
- selection method when known
- official_rules_url
- legitimacy_status
- last_verified_at
- fit_score inputs
- status

## Business Funding Profile

Store verified reusable facts separately from opportunity-specific answers:

- legal business name
- DBA names
- EIN reference / secure credential pointer, never plaintext in logs
- formation state
- formation date
- legal structure
- business address
- website
- business email
- phone
- owner/officer identities and roles
- ownership percentages where needed
- verified certifications
- NAICS/SIC
- products/services
- business narrative
- problem solved
- customer/community impact
- revenue history
- employee count
- business bank status
- previous funding
- current capital needs
- use-of-funds plans at multiple grant sizes
- documents and expiration dates
- accessibility preferences

Sensitive identifiers belong behind secure storage boundaries and must not be committed to GitHub.

## Ranking

Ranking should prioritize:

1. Deadline urgency.
2. Confirmed eligibility.
3. No-fee opportunities before paid-entry opportunities, all else equal.
4. Award value relative to application effort.
5. Strategic fit with the organization.
6. Reusability of required material.
7. Likelihood that missing requirements can be completed before deadline.

Ranking is operational prioritization, not a guarantee of award probability.

## Paid-entry rule

Tay may prepare paid applications automatically, but payment requires owner approval unless a separately governed spending authority is explicitly granted.

Once approval is granted for a specific fee and opportunity, Tay should proceed through supported payment/browser tooling if available, record the amount, and capture confirmation.

## Submission rule

Before submission, Tay must verify:

- correct legal entity
- deadline still open
- eligibility still satisfied
- required attestations are truthful
- required attachments are current
- fee is authorized
- no prohibited fabrication
- no accidental loan/credit application disguised as a grant
- no unexpected recurring subscription
- no rights/IP assignment beyond what owner approved

## Community architecture

V1 operates for Transcenlutions.

Later community mode must be tenant-isolated:

- each organization has its own Funding Profile
- no cross-tenant private financial or tax data
- opportunity catalog may be shared
- reusable public application guidance may be shared
- private narratives, documents, bank data, EINs, and submission history remain tenant-scoped
- community users can choose Quick Guide, Guided, or Assisted Execution modes

## Agent/tool roles

Tay:
- orchestrates
- prioritizes
- verifies
- requests approvals
- coordinates submission and monitoring

Dawn:
- may help strengthen brand, storytelling, impact, and marketing-oriented application sections

Rory:
- teaches the process from verified Playbooks and explains why fields/requirements matter

n8n:
- may orchestrate recurring discovery, normalization, reminders, webhook flows, and integrations when it is the best tool

GitHub:
- source of truth for versioned code and non-secret configuration

Browser/Work-style execution:
- handles websites that require interactive form completion when available and authorized

## Initial operating cadence

- Continuous/recurring discovery
- Daily deadline triage
- Immediate alert for strong-fit opportunities expiring within 72 hours
- Weekly pipeline review
- Submission confirmation tracking
- Award/decline learning capture

## Initial implementation phases

Phase 1: Canon + schema + manual/assisted queue
Phase 2: Opportunity ingestion and normalization
Phase 3: Funding Profile and document checklist
Phase 4: Eligibility engine
Phase 5: Application answer generation
Phase 6: Browser-assisted submission
Phase 7: n8n automation and reminders
Phase 8: Community multi-tenant release
Phase 9: Playbooks, analytics, and outcome learning

## Current urgent queue seed

As of 2026-09-30, seed the queue with currently verified opportunities such as:
- Credibly Small Business Award
- Outta Excuses Small Business Empowerment Grant
- Skip $10,000 Grant
- Verizon Small Business Digital Ready grants
- Galaxy Grant
- NASE Growth Grants

These records must be re-verified from primary/official sources before submission.

## Success standard

A funding workflow is not complete merely when an application is drafted.

Complete means:
- eligibility verified
- application submitted
- confirmation captured
- follow-up scheduled
- outcome recorded
- reusable lessons captured

"There is no problem, only solutions. Transcenlutions."
"Transcending problems by building solutions."
