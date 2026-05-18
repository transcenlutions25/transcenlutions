# Tay Learning Feedback Engine

## Purpose

The feedback layer lets Tay learn from real users without creating homework,
feature chaos, or mission drift.

Feedback improves:

- wording
- clarity
- onboarding
- help text
- UX friction
- minor layout improvements
- repeated pain points

Feedback does not decide:

- mission
- values
- product direction
- governance rules
- payment handling
- privacy
- security
- legal copy
- user data handling
- memory architecture

Those areas stay protected and require owner approval.

## Layer 1: One-Tap Feedback

After Tay returns a result, the user can tap:

- Helped
- Kinda
- Didn't help

If the answer was mixed or unhelpful, Tay asks what felt off:

- Confusing
- Wrong
- Too long
- Didn't solve problem
- Missing feature
- Bug
- Other

The optional note stays short. The goal is five seconds, not a survey.

## Layer 2: Natural Conversation Feedback

Tay detects feedback inside normal chat when the user says things like:

- This confused me.
- That was helpful.
- I wish Tay did this.
- This is broken.
- That did not solve my problem.

When the message is only feedback, Tay captures it directly instead of turning
it into a fake build request.

## Layer 3: Weekly Check-In

The side panel includes a short weekly check-in:

- usefulness score from 1 to 10
- what helped most
- what frustrated the user
- what should improve next

This is session-only until persistent memory or a database is intentionally
added later.

## Insight Rules

Tay groups feedback into signal categories:

- bug
- confusion
- UX friction
- wrong answer
- too long
- didn't solve
- missing feature
- new idea
- safety concern
- revenue opportunity
- praise
- high-value request
- emotional frustration
- other

Signal strength:

- no signal: nothing captured yet
- low: one or two matching signals
- emerging: three to six matching signals
- high: seven or more matching signals

One loud user does not control the product. Repeated patterns create a
recommendation for review.

## Improvement Labels

Every suggested improvement gets one of three labels:

- auto-allowed: wording, clarity, onboarding, help text, UX friction, or minor layout polish
- approval-required: new features, workflow changes, pricing, automation, or larger bugs
- blocked/protected: mission, values, governance, payment handling, privacy, security, legal copy, user data handling, or memory architecture

The app may show the signal and recommendation, but it does not auto-change
protected areas.

## Current Limits

- Feedback is session-only.
- No database is active.
- No external analytics service is connected.
- Tay does not auto-change product direction from feedback.
- Major changes still route through governance and owner approval.
