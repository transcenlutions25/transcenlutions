# Cobalt Current Lead Recovery

**Tagline:** Intelligence Under Pressure.

## Business purpose

Cobalt Current Lead Recovery is a remote, approval-gated lead follow-up service for local service businesses. The initial market is independent cleaning companies and property-maintenance vendors, followed by landscapers, pressure washers, handymen, apartment vendors, and similar operators.

The service helps clients recover value from new inquiries, unsold estimates, dormant prospects, and past customers. It does not promise revenue or booked work. It provides consistent research, organization, draft preparation, approved follow-up, and performance reporting.

## Founder operating model

The owner should be able to run the business from a phone without transportation or required sales calls.

### Work the system may prepare

- Prospect research
- Business qualification
- Personalized audit notes
- Outreach drafts
- Follow-up drafts
- Reply summaries
- Proposal drafts
- Client onboarding checklists
- Lead-status recommendations
- Weekly performance reports
- Review-request drafts

### Owner approval remains required for

- Sending outreach or follow-up
- Contacting a client lead
- Publishing claims
- Issuing a proposal or agreement
- Changing prices or scope
- Activating payments
- Sharing client data
- Deleting records
- Marking work as delivered

## Initial commercial offer

### Founding Client Plan

- Setup fee: $250
- Monthly service: $350
- Up to 50 active leads per month
- Four-step follow-up sequence
- Old-lead reactivation drafts
- Review-request drafts
- Weekly report

### Standard Plan

Introduce only after the first two client results are documented.

- Setup fee: $500
- Monthly service: $750
- Up to 150 active leads per month
- Customized follow-up workflows
- Estimate follow-up
- Dormant-lead reactivation
- Review generation workflow
- Monthly conversion analysis

The application must label these as planned offers until real checkout and fulfillment systems are deliberately activated.

## Core workflows

### 1. Prospect acquisition

1. Research a local service company.
2. Record source, website, service area, contact channel, business type, and observed follow-up gaps.
3. Score fit using transparent criteria.
4. Create a personalized audit draft.
5. Route the draft to owner approval.
6. After the owner sends externally, manually record the sent event.
7. Schedule the next follow-up date.
8. Stop all follow-up when the record is marked `DO_NOT_CONTACT`.

### 2. Reply handling

1. Record or import the reply.
2. Classify intent as interested, question, objection, referral, not now, unsubscribe, or unrelated.
3. Prepare a response draft.
4. Route the draft to owner approval.
5. Record the external send only after it actually occurs.

### 3. Client onboarding

1. Confirm signed scope outside the Stage 1 application.
2. Create the client account.
3. Record service plan, lead limit, approved channels, business hours, offer details, service area, exclusions, and escalation rules.
4. Obtain explicit authorization before handling customer communications.
5. Import or enter current leads.
6. Review the first follow-up sequence with the client.

### 4. Client lead recovery

1. Add or import a lead.
2. Check consent, source, status, and do-not-contact state.
3. Draft the correct follow-up step.
4. Route it to approval.
5. Record actual send externally.
6. Track replies and outcomes.
7. Escalate complaints, discounts, disputes, emergencies, and legal questions to the owner.

### 5. Reporting

Weekly reports should show:

- Leads received
- Leads requiring action
- Drafts prepared
- Drafts approved
- Sends recorded
- Replies received
- Estimates followed up
- Booked outcomes reported by the client
- Lost or do-not-contact records
- Data gaps and unresolved items

Never infer revenue or bookings without client-confirmed evidence.

## MVP pages

### Command dashboard

Display:

- Qualified prospects
- Drafts awaiting review
- Follow-ups due today
- Interested replies
- Active clients
- Client leads requiring action
- Do-not-contact count
- Recent audit events

### Prospect pipeline

Provide:

- Search and filters
- Status columns or compact mobile list
- Fit score
- Service category
- City and service area
- Last action
- Next follow-up date
- Draft status
- Do-not-contact protection

### Prospect detail

Provide:

- Business information
- Research evidence
- Observed opportunity
- Qualification score breakdown
- Contact history
- Draft history
- Notes
- Approval actions
- Audit history

### Client pipeline

Provide:

- Plan
- Active lead count
- Monthly limit
- Approved channels
- Follow-up policy
- Escalation rules
- Reporting status

### Lead queue

Provide:

- Client
- Lead source
- Service requested
- Urgency
- Current stage
- Last contact date
- Next action date
- Consent and do-not-contact state
- Assigned draft

### Draft queue and approval center

Each draft must show:

- Recipient identity
- Related prospect, client, or lead
- Channel
- Purpose
- Draft body
- Supporting evidence
- Risk flags
- Approval status
- Approve, reject, or return-for-revision action

The Stage 1 application must not send the draft.

### Audit log

Record:

- Timestamp
- Actor
- Entity type and ID
- Previous state
- New state
- Reason
- Approval reference
- External-send evidence when manually recorded

## Qualification scoring

Use a visible 100-point score:

- Clear local service offer: 15
- Working website or active business listing: 10
- Email or web contact path: 15
- Evidence of lead volume or active marketing: 15
- Follow-up weakness visible or reasonably documented: 20
- Business can support recurring service fee: 15
- Strong match with cleaning or property-maintenance expertise: 10

A score is an internal prioritization tool, not proof that the business needs the service.

## Data model

### Prospect

- id
- businessName
- category
- websiteUrl
- city
- state
- serviceArea
- contactName
- contactEmail
- contactFormUrl
- phoneDisplayOnly
- sourceUrl
- fitScore
- fitScoreReasons
- observedGap
- status
- doNotContact
- lastActionAt
- nextFollowUpAt
- createdAt
- updatedAt

### Client

- id
- businessName
- plan
- monthlyLeadLimit
- approvedChannels
- authorizedContactPolicy
- businessHours
- services
- serviceArea
- escalationRules
- status
- createdAt
- updatedAt

### Lead

- id
- clientId
- name
- email
- phoneDisplayOnly
- source
- serviceRequested
- city
- urgency
- status
- consentState
- doNotContact
- lastContactAt
- nextActionAt
- outcomeEvidence
- createdAt
- updatedAt

### Draft

- id
- entityType
- entityId
- channel
- purpose
- subject
- body
- evidenceSummary
- riskFlags
- status
- approvedBy
- approvedAt
- rejectedReason
- createdAt
- updatedAt

### AuditEvent

- id
- entityType
- entityId
- action
- previousState
- newState
- reason
- actor
- occurredAt

## Compliance and safety requirements

- Honor opt-out and unsubscribe instructions.
- Prevent further contact when `DO_NOT_CONTACT` is set.
- Keep sender identity and commercial purpose truthful.
- Do not fabricate personal research, reviews, performance metrics, or client outcomes.
- Do not scrape or store sensitive personal data that is unnecessary for the service.
- Keep client data separated by client in later persistent implementations.
- Require explicit client authorization before communicating with client leads.
- Preserve an audit trail for approvals and recorded sends.

## Release stages

### Stage 1: Internal deterministic MVP

- No database credentials
- No email sending
- No SMS
- No payments
- No background jobs
- Typed demo adapter
- Fully working UI and state rules

### Stage 2: Supabase persistence

- Schema and migrations
- Authentication
- Row-level security
- Client separation
- Server-side mutations
- Audit-event persistence

### Stage 3: Gmail-assisted operations

- Import selected conversations only
- Create Gmail drafts, not automatic sends
- Reply classification
- Owner review queue
- Unsubscribe protection

### Stage 4: Client reporting

- Client-visible reports
- CSV export
- Scheduled report generation
- No unsupported revenue attribution

### Stage 5: Billing and public acquisition

- Activate only after service delivery is proven
- Approved payment links
- Signed scope and onboarding
- Public landing page
- No guaranteed-income language

## Stage 1 acceptance standard

The release is acceptable when the operator can use a phone to review seeded prospects and client leads, create or edit drafts, approve or reject them, see the resulting audit events, and verify that no external message or payment can occur.