# Tay Engine Box 2: Governance Foundation

Box 2 makes every Tay action pass through one governance layer before it can run.

## What Box 2 Adds

- centralized action registry
- formal permission outcomes: allowed, approval required, blocked
- risk tiers and numeric risk scores
- global rules for outside services, payment handoff, destructive data requests,
  direct money movement, and hidden automation
- compact governance panel in the command room
- standardized audit fields on every session log entry
- smoke coverage for allowed, approval-required, blocked, revenue, and buyer
  reply paths

## Current Action Registry

- `create_task`: allowed, low risk
- `draft_plan`: allowed, low risk
- `log_note`: allowed, low risk
- `prepare_offer`: allowed, medium risk
- `recommend_follow_up`: allowed, medium risk
- `none`: no action until Tay has a clearer request

## Global Rule Order

1. Block destructive data, direct money movement, and hidden work.
2. Pause outside services, autonomous work, sent communications, and payment
   handoff for approval.
3. Run local workspace actions when the registry allows them.

## Payment Governance

Tay may prepare offers and delivery artifacts locally. Tay may not collect card
data, move money, or represent a checkout as live unless an approved payment
path is configured and the operator explicitly controls the handoff.

## Definition Of Done

- every action uses `lib/governance.ts`
- each response includes rule id, risk tier, risk score, and audit status
- session log entries carry the same governance data
- blocked and approval-required paths remain visible
- lint, typecheck, smoke, and build pass
