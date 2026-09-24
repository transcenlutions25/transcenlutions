# TRANSCENLUTIONS LLC — PLATFORM ARCHITECTURE V1

Status: CANON
Date: 2026-09-24

This document extends the Tay Command canon. It does not authorize a rebuild or replacement of the existing Tay Command interface, routes, navigation, chat, or working features.

## 1. Platform rule

Transcenlutions is built as a portable platform, not as a collection of disconnected apps and not around any single builder or host.

GitHub repository `transcenlutions25/transcenlutions` is the source of truth. Replit, Base44, local development, Vercel, or future cloud infrastructure are replaceable build/deployment equipment. No host or builder may become the canonical architecture.

The normal software release path is:

feature branch -> automated tests -> preview/staging -> controlled merge -> production

Production code is not edited casually in place.

## 2. Dependency contract

Business/product modules consume shared platform services. Shared platform services must not contain business-specific behavior.

Examples:
- Hallway Cleaning may use the Command/Workflow Engine; the engine must not know Hallway Cleaning-specific rules.
- Ascended Forge may use Agent Runtime; Agent Runtime must not contain Ascended Forge-specific behavior.
- Tay may orchestrate SiteForge; SiteForge must not require Tay-specific database coupling to exist.
- A deployment provider may run Tay Command; Tay Command must remain portable to another provider.

New capabilities should prefer registration/configuration over modification of platform core whenever practical.

## 3. Platform Core

The shared platform foundation is organized around:
- Identity and Tenant Core
- Organization / Business Registry
- Agent Registry
- Agent Runtime
- Authority and Approval Engine
- Command / Workflow Engine
- Integration Gateway
- Operating Graph
- Audit Ledger
- Knowledge / Memory Layer
- Notification / Event Layer
- Financial Core
- Model Router and provider adapters

Tay Command is the user-facing command center over these shared services.

Businesses/divisions are organizations. Agents are workers. Tools/providers are equipment. Workflows are production lines.

## 4. Update lanes

### Live configuration/data
Use for changes such as registered businesses, agents, supported workflows, provider configuration, knowledge, feature flags, and permitted settings when safe. These should not require rebuilding the entire platform.

### Feature/module release
New modules and normal application patches follow branch -> tests -> preview/staging -> controlled merge -> production.

### Core/platform release
Changes to identity, authorization, Agent Runtime, Queue/Workflow Engine, approvals, Operating Graph, audit, financial core, or other shared infrastructure require broader regression/security testing and migration/rollback planning before production promotion.

App-wide patches use the same governed release system. Scope changes testing requirements; it does not justify bypassing the release path.

## 5. Learning Mode — CANON

Tay Command must include an optional platform-wide Learning Mode for users who want to understand a system, process, tool, workflow, sales method, business method, or other supported subject rather than merely have Tay perform it.

Learning Mode is a presentation/orchestration mode over the same platform and agent runtime. It is not a separate Tay identity and must not fork core business logic.

Learning Mode requirements:
- Teach in tiny, sequential steps by default.
- Present one immediately actionable step at a time when the user selects hand-holding mode.
- Explain what the step does, why it matters, and what successful completion looks like.
- Wait for completion/confirmation when hands-on execution genuinely depends on the prior step.
- Allow users to ask “why?”, “show me”, “explain deeper”, “repeat”, “simplify”, or “skip ahead” without losing their place.
- Support progressive depth: Quick Guide, Guided/Hand-Holding, and Deep Understanding.
- Track learning progress and resume from the last appropriate checkpoint when authenticated persistence exists.
- Teach the actual system the user is working with when possible, so instruction and execution stay aligned.
- Support sales/process training through examples, practice, role-play, feedback, and explanation, while clearly distinguishing simulations from real external actions.
- Keep accessibility first: concise language, strong hierarchy, keyboard/screen-reader compatibility, read-aloud/voice compatibility, and no dependence on visual cues alone.
- Never weaken authority, approval, privacy, child-safety, or security controls because Learning Mode is active.
- Never pretend a step was completed when it was not verified.
- Let experienced users leave Learning Mode instantly and return to normal execution.

Target experience:
A user can say “teach me how this works,” “walk me through it,” or select Learning Mode, then learn the same Transcenlutions system Tay can help operate—at the user's chosen depth—without being forced into a separate product.

## 6. Build sequence

Until Platform Architecture V1 is established, avoid expanding disconnected major product surfaces.

Priority:
1. Protect and consolidate the current source of truth.
2. Establish and test platform contracts/interfaces.
3. Complete shared core services in dependency order.
4. Establish CI, preview/staging, migration, rollback, and production promotion rules.
5. Build business/product capabilities as modules over the shared core.
6. Deploy through replaceable infrastructure.
7. Measure reliability, performance, cost, and revenue; optimize from evidence.

## 7. Definition of done

The architecture is successful when:
- Tay Command can evolve without repeated rebuilds.
- New businesses/agents/workflows can usually be registered rather than hard-coded into core.
- Core services have explicit contracts and authority boundaries.
- App-wide patches can be tested and promoted without destabilizing unrelated modules.
- configuration changes and software releases have separate safe paths.
- deployments are reproducible from GitHub and portable between infrastructure providers.
- Learning Mode can teach supported systems without duplicating their implementation.
- consequential actions remain approval-governed and auditable.
