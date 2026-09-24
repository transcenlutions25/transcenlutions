# Experience-to-Playbook Canon V1

## Purpose

Transcenlutions must convert successfully completed owner and user work into reusable platform knowledge so future users can achieve the same outcome without independently rediscovering the process.

The platform does not merely remember that work happened. It captures what worked, verifies the outcome, extracts a reusable procedure, teaches it through Rory, and makes it executable through Tay under the same authority and safety controls as every other workflow.

## Core rule

**Successful work should become reusable capability.**

A successful outcome may produce a verified Experience Record and, when sufficiently generalizable, a reusable Playbook. Failures, retries, corrections, and near-misses are also learning evidence, but they must never be presented as proven instructions until a successful path is verified.

## Experience Record

For meaningful work, capture where available:

- objective and success criteria;
- actor, tenant, agent, workflow, and correlation identifiers;
- starting state and relevant prerequisites;
- ordered actions and tools/providers used;
- decisions, approvals, authority checks, and safety boundaries;
- failures, rejected approaches, retries, and corrections;
- verification evidence and final outcome;
- time/effort and assistance level when trustworthy;
- accessibility accommodations that materially helped;
- environment/version context needed for reproducibility;
- sanitized artifacts or references to them;
- lessons learned and candidate improvements.

Secrets, credentials, private chain-of-thought, unnecessary personal data, and another tenant's private data must not enter reusable knowledge.

## Success verification

A workflow is not marked successful merely because an agent says it is complete. Success requires objective verification appropriate to the task: tests pass, deployment responds, payment settles, file exists, user confirms a subjective outcome, or another defined acceptance criterion is satisfied.

The system must distinguish:

- attempted;
- failed;
- partially completed;
- completed but unverified;
- verified successful;
- deprecated or superseded.

## Playbook extraction

When a verified experience is reusable, the platform should extract a versioned Playbook containing:

1. goal;
2. prerequisites;
3. safe defaults;
4. ordered procedure;
5. decision points;
6. approval gates;
7. verification checks;
8. recovery/rollback steps;
9. known failure modes and fixes;
10. provider-specific adapters separated from provider-neutral logic;
11. accessibility-friendly guidance;
12. provenance back to verified Experience Records.

Playbooks are versioned. A later success can improve a playbook without erasing prior provenance. Contradictory evidence triggers review rather than silently rewriting canon.

## Tay execution

Tay should be able to recognize a user's desired outcome, find a matching verified Playbook, adapt it to that user's authorized environment, and execute or guide the process.

Tay must not blindly replay another user's actions. It must resolve current identity, tenant, permissions, provider state, versions, dependencies, and approvals. Consequential steps remain approval-controlled even when a playbook has succeeded many times.

## Rory teaching

Rory converts verified Playbooks and Learning Events into instruction so users do not have to independently learn everything the original operator learned.

Teaching follows:

**WATCH → EXPLAIN → TRY → PROVE → APPLY → REVIEW**

Rory explains what is happening, why it matters, how success is verified, common mistakes, and how to recover. Users may choose Quick Guide, Guided, or Deep Understanding. A user who wants the outcome without deep technical study can let Tay perform authorized work while Rory gives concise explanations.

## Build & Release exemplar

The current Tay Command workflow is a canonical exemplar:

**request → GitHub feature branch → implementation → automated gate → diagnose failures → correct safely → preview/staging → verify → controlled merge → production deployment → post-deploy verification**

The platform should learn verified fixes encountered along the way. For example, a CI compatibility failure and its verified correction become troubleshooting evidence, not an instruction to bypass CI.

## Scope and sharing

Knowledge has explicit scopes:

- private user;
- tenant/organization;
- Transcenlutions internal;
- sanitized reusable platform knowledge;
- public/community playbook where explicitly approved.

Cross-tenant reuse must use sanitized/generalized knowledge. Raw private records do not become community instructions by default.

## Feedback and continuous improvement

Every playbook run can generate new Experience Records. Compare expected versus actual results, capture provider/version drift, and propose improvements. Promote changes only after verification appropriate to risk.

Repeated success can raise confidence in a playbook, but confidence never overrides identity, authority, approvals, legal requirements, safety rules, or current verification.

## Relationship to Platform Core

This capability uses existing shared services rather than creating a parallel runtime:

**Identity/Tenant → Agent Runtime → Authority/Approval → Command/Workflow → Operating Graph/Audit → Experience Records → Knowledge/Memory → Playbooks → Tay execution + Rory teaching**

Experience-to-Playbook is therefore a platform capability available to every Transcenlutions business, product, agent, and authorized user.

## Definition of done

This canon is implemented when the platform can:

- capture structured evidence from a real workflow;
- distinguish verified success from unverified completion;
- sanitize and scope reusable knowledge;
- generate a versioned Playbook with provenance;
- retrieve the playbook for a similar user goal;
- let Tay guide/execute it through normal governance;
- let Rory teach it accessibly;
- record the new run as additional evidence;
- improve or deprecate the playbook without losing audit history.
