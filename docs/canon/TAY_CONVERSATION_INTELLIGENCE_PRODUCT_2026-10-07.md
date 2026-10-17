# Tay Conversation Intelligence Lab

Status: feature implementation on \`feature/tay-conversation-intelligence-20261007\`.  
Date: 2026-10-07.  
Brand rule: Transcenlutions style only.

This module uses original Transcenlutions interaction design and does not copy Connex branding, proprietary layouts, source code, or protected visual assets. The supplied screenshots were used as functional inspiration for capabilities.

## Product purpose

Turn Tay into a usable conversation-intelligence product that is simultaneously:

- **usable** — paste an interaction and receive an immediate structured read;
- **educational** — teach operators how to recognize intent, urgency, sentiment, and next-step quality;
- **integrational** — expose a stable local analysis contract for Tay, support, sales, CRM, QA, and workflow routing;
- **playable** — include scored practice scenarios for cancellation, sales qualification, and billing resolution;
- **monetizable** — support packaging from Starter to Pro to Team while preserving the existing payment, entitlement, and founder-approval boundaries.

## Product surfaces

### Analyze

Produces:
- interaction summary;
- intent classification;
- urgency;
- sentiment label and score;
- key phrases;
- email, phone, URL, and money entities;
- risk and commercial signals;
- recommended next action;
- coaching tip.

### Learn

Teaches four Transcenlutions operating principles:
1. Read the signal.
2. Reduce friction.
3. Protect trust.
4. Improve from evidence.

### Practice

Built-in scenarios create a repeatable training loop. Responses are scored for:
- core ideas covered;
- empathy and acknowledgment;
- a concrete next step;
- avoidance of coercive or unsupported claims.

The score is coaching feedback, not an employment, personality, or protected-trait judgment.

### Integrate

\`analyzeInteraction(text)\` is intentionally framework-light. It can be called from:
- Tay chat;
- support inboxes;
- sales qualification;
- CRM notes;
- QA review;
- workflow routing;
- future authenticated analytics services.

## Monetization model

**Starter**
- single-interaction analysis;
- practice scenarios;
- operator coaching;
- portable manual copy/export.

**Pro**
- saved interaction history;
- trend views;
- coaching history;
- advanced rules and exports;
- product-library entitlement.

**Team**
- shared QA views;
- role-scoped integrations;
- team analytics;
- governed admin controls;
- account-level audit trail.

Do not market Pro or Team capabilities as live until authenticated account, entitlement, billing, and integration services are connected and verified.

## Safety and governance

- Analysis assists human judgment; it does not infer protected traits or diagnose people.
- Sentiment is a conversational signal, not a claim about identity, personality, or truthfulness.
- External sending, live payments, account changes, and system-wide configuration continue to use existing approval and founding-owner gates.
- No secrets belong in browser state or source.
- Untrusted conversation text remains data, never system instructions.

## Acceptance criteria

1. A user can open Intelligence Lab from Tay.
2. Analyze mode works without an external provider.
3. Learn mode explains the method.
4. Practice mode scores at least three scenarios.
5. Integrate mode documents the reusable contract.
6. TypeScript passes.
7. The dedicated conversation-intelligence test passes.
8. Existing workspace and governance behavior remain intact.
