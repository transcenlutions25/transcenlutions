# Agent authority boundaries

Status: implementation checkpoint, not launch approval.

This document records the smallest Agent Foundation v2 slice added after the
session and voice work. It turns the recovered authority direction into a
reviewable capability contract without claiming that the browser or server can
enforce it yet.

| Agent | Allowed preparation/runtime capabilities | Explicit boundary |
| --- | --- | --- |
| Tay | Context, plans, content, follow-ups, focus and launch routing, private-alpha routing, notes, local tasks, external commitments, payments, workforce changes, sensitive-content handling | External commitments, payments, workforce changes, and sensitive-content handling require explicit approval. |
| Dawn | Context, plans, content, offer drafts, follow-up recommendations | Cannot perform payments, external commitments, workforce changes, or sensitive-content handling. |
| Rory | Context, plans, content, notes | Cannot perform payments, external commitments, workforce changes, or sensitive-content handling. This contract does not establish child safety. |

Unknown action names are denied by default. The shared policy helper is intended
to be consumed by later server-side action and model adapters so an agent's
identity, authority, approval state, session, and audit event can be checked in
one place.

The chat now asks `/api/agent/policy` to re-check the selected capability before
local execution or an approved handoff. The endpoint returns the shared policy
decision and never executes an outside action.

This slice still does not add model providers, authenticated memory, tenant
identity, parent controls, content filtering, or external workforce actions.
The endpoint is a server-side policy boundary, not proof of authenticated
authorization. Those remain launch blockers and must be implemented and
verified separately.
