# Tay Engine Box 5: Launch Readiness Layer

Box 5 moves Transcenlutions from a working foundation toward a controlled first
launch.

## Purpose

The platform should not expand sideways until the launch path is honest. Tay now
shows what is ready, what is missing, which setup item matters most, and which
first use case should be proven with a real person.

## Launch Readiness Loop

```text
launch request
-> Tay detects launch readiness intent
-> governance classifies route_launch_readiness as allowed
-> Tay reviews setup, onboarding, blockers, and first use case
-> visible result appears
-> Launch Readiness Artifact is created
-> session log records the truth
-> next step clears the top blocked item
```

## Real-World Setup Tracked

- domain
- company email inbox
- billing inbox
- support email
- Stripe readiness
- privacy policy URL
- terms URL
- refund/support copy
- onboarding copy readiness

## Tay Onboarding

First-entry question:

```text
What are you building?
```

Supported launch paths:

- Business
- Personal Growth
- Content
- Wealth
- Relationship
- Community

Each path routes to one first move before Tay suggests any larger build.

## Founder Truth Panel

Box 5 shows:

- current phase
- launch readiness percent
- revenue readiness percent
- top priority
- blocked setup items
- first use case

## First Real Use Case

The selected first use case is:

```text
AI business guidance
```

Tay should help one user clarify an offer, plan revenue, and choose the next
governed action.

## What Box 5 Does Not Build

- no dating app
- no Crowne Legacy build
- no advanced agent council
- no full dashboard expansion
- no external checkout execution
- no legal advice engine

## Definition Of Done

- Launch Readiness panel is visible in the command room.
- Launch requests map to `prepare_launch` / `route_launch_readiness`.
- Stripe/email setup visibility is allowed, but payment handoff still requires
  approval.
- Placeholder payment values remain setup-required.
- Onboarding paths are visible.
- First use case is clearly selected.
- lint, typecheck, smoke, and build pass.
