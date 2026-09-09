# Tay Workspace Product Reference — Aura Screenshot Study

Status: implementation reference for the interrupted Work path
Source: user-provided Aura mobile screenshots, analyzed as product/UX inspiration only.

## Why this matters

The screenshots validate the direction already identified in the Work audit: Tay should feel like a single immersive operating environment, not a long stack of SaaS panels.

Do not copy Aura branding, artwork, typography, proprietary illustrations, marketing copy, or game-development-specific identity. Translate the interaction patterns into Tay's own royal command-room system.

## Core product pattern to adopt

Aura presents one primary environment and one primary action surface at a time. Secondary systems are revealed contextually. Tay should do the same.

Tay's experience should center on:

Request -> Understand -> Plan -> Govern -> Act -> Report -> Replay

The user should not need to understand the underlying architecture before getting useful work done.

## 1. Three clear operating modes

Aura exposes Ask / Plan / Agent. Tay should use a native version aligned with existing architecture:

### Ask
- understand the user's goal
- inspect available context
- answer questions
- explain current state
- no consequential external changes

### Plan
- build a structured execution plan
- identify tools, people, dependencies, costs, approvals, and risks
- allow refinement before execution
- display what will change before it changes

### Act
- execute through the existing Action Engine
- route every consequential move through Governance
- pause for approval when required
- surface progress, result, failure, recovery, and next step

The mode selector should be compact and attached to the composer, not a large dashboard module.

## 2. The Throne Room should be the product

The primary screen should feel like one living command environment.

Recommended mobile hierarchy:

1. compact royal top bar: Tay, current workspace, menu
2. mission/status strip: active objective + state
3. conversation / active work surface
4. Action Card immediately below or integrated with the current turn
5. sticky composer at bottom
6. compact mode selector: Ask | Plan | Act
7. context/attachment control
8. governance state shown only when relevant

Remove the feeling that the homepage is a marketing site followed by an admin dashboard.

## 3. Progressive disclosure

Aura keeps documentation, pricing, updates, account controls, and deeper configuration behind navigation rather than putting everything on the first screen.

For Tay, move these away from the default command surface:

- System Stack
- Private Alpha diagnostics
- full Governance registry
- Memory inspector
- Feedback analytics
- Session Log details
- Founder command controls
- Launch readiness
- Deployment readiness
- Revenue setup internals
- Sales setup internals
- Fulfillment setup internals
- Future Council preview
- Coming Soon modules

These remain available, but through an Operator Drawer / Command Menu / Inspector rather than a long vertical homepage.

## 4. Persistent bottom command bar on mobile

Aura's persistent bottom CTA is effective because the user's primary action is always reachable.

Tay should translate that into a persistent mobile command dock rather than a marketing CTA.

Suggested dock:

[ Ask | Plan | Act ]   [ + Context ]
[ Tell Tay what needs to get done... ] [ Send ]

When an approval is pending, the dock can temporarily become:

[ Decline ] [ Approve & Continue ]

When execution is running:

Tay is working... [ View steps ] [ Stop if safe ]

When complete:

Done. [ View result ] [ Next step ]

## 5. Context should be a first-class control

Aura supports project-aware context, @ search, images, documents, drag/drop, and editor state.

Tay should support the broader equivalent:

- files and documents
- images/screenshots
- GitHub repositories/issues/PRs
- Gmail messages/threads when authorized
- Calendar events when authorized
- Drive/Docs/Sheets/Slides when authorized
- contacts
- business/project records
- current workspace/project
- previously approved operating context

A compact `+ Context` or `@` control should let the user see exactly what Tay is using.

Never hide authority or data boundaries.

## 6. Threads and parallel work

Aura shows multiple conversation threads and limited parallel prompts. Tay should eventually support:

- named work threads
- one active objective per thread
- multiple simultaneous safe jobs where infrastructure allows
- clear status per job: queued / planning / approval / running / blocked / complete
- no hidden background claims
- thread replay from the Operating Graph

This should connect to the moat: every thread becomes a governed execution trace, not merely chat history.

## 7. Ask -> Plan -> Act handoff

A particularly strong Aura pattern is the ability to create a plan, review it, and then start implementation.

Tay should make this native:

Ask result -> `Turn into plan`
Plan -> `Approve plan & execute`
Execution result -> `Save as reusable Skill`

That creates a natural path from conversation to repeatable operational intelligence.

## 8. Model/tool selection without forcing complexity

Aura exposes model choice and relative cost. Tay should stay model-agnostic but avoid making ordinary users manage models constantly.

Default behavior:
- Tay selects an appropriate available model/tool route
- user sees a simple execution profile such as Fast / Balanced / Deep when useful
- advanced users can inspect the actual model/tool route
- cost estimates should be shown where execution has meaningful variable cost
- actual costs must come from real usage records where available

The Operating Graph should record model/tool route, latency, cost, outcome, and recovery data.

## 9. Self-verification and recovery

Aura emphasizes build + test + verify and crash recovery. This maps directly to Tay's strongest opportunity.

Tay should not stop at `action completed` when the action can be verified.

Desired loop:

execute -> inspect result -> test/verify -> repair if safe -> report truth

Examples:
- code change -> typecheck/lint/test/build
- deployment -> health check / route check
- outbound draft -> validate required fields before send
- workflow change -> dry run / test event
- data operation -> confirm resulting record count/state

Failures should feed the Recovery Graph.

## 10. Documentation as a product layer

Aura has a coherent docs experience with Quick Start, installation, modes, context, and next steps.

Tay needs an equivalent Operator Guide, but it should be generated from the real product state.

Initial sections:
- Quick Start
- Ask / Plan / Act
- Approvals & Governance
- Context & Connections
- Threads & Workspaces
- Actions & Verification
- Memory & Operating Graph
- Skills & Playbooks
- Privacy & Data Boundaries
- Costs & Usage
- Troubleshooting / Recovery

Do not document unimplemented capabilities as live.

## 11. Pricing lessons, not pricing copy

Aura makes the free trial and plan progression highly visible and simple.

For Tay, do not hard-code pricing until validated. Product lesson only:
- one dominant conversion action
- simple tier distinction
- benefits phrased by outcome/capability
- usage/cost model explained plainly
- enterprise controls separated from normal-user complexity

## 12. Visual translation into Tay canon

Do not imitate Aura's cream/coral workshop identity.

Tay's equivalent should use the established Transcenlutions canon:
- near-black / black foundation
- dark royal purple
- dark royal blue
- gold structural trim
- lightning-blue active energy
- restrained red for destructive/critical states
- metallic vibranium surfaces
- glass
- sacred geometry
- very subtle uranium glow only as accent

The immersive environment can be a modern royal command room / throne-room-workshop hybrid rather than a conventional dashboard.

Visual principles:
- one environmental backdrop
- glass/metal work surfaces layered over it
- large readable mobile type
- strong state changes for Ask / Plan / Act
- motion should communicate system state, not decoration
- accessibility and legibility outrank visual spectacle

## Immediate implementation sequence

1. Keep existing Tay Core, Action Engine, Governance, Revenue, Founder OS, and Operating Graph work.
2. Replace the first-screen marketing/dashboard composition with a compact Throne Room command surface.
3. Add Ask / Plan / Act mode state at the UI layer without duplicating the engine.
4. Keep the composer persistently reachable on mobile.
5. Move secondary panels into a progressive-disclosure Operator Drawer.
6. Put the Action Card in the main flow immediately after the active request.
7. Add a visible Context control placeholder connected to real sources only as integrations become available.
8. Preserve approval and blocked states as first-class visual states.
9. Verify one allowed, one approval-required, and one blocked workflow end to end.
10. Run typecheck, lint, smoke, and build.

## Acceptance test for the redesign

A new user opening Tay on a phone should be able to understand within ten seconds:

- who Tay is
- what they can ask Tay to do
- whether Tay is answering, planning, or acting
- what Tay is doing now
- whether approval is needed
- what happened
- what happens next

They should not need to scroll through product architecture, founder diagnostics, future modules, or setup panels to use Tay.
