# Transcenlutions Master Canon and System Map

Updated: 2026-10-05 UTC (founder decisions: October 4, 2026, America/New_York).
Latest addition: October 5, 2026, 11:42 a.m. America/New_York — [Founder product and authority rules](FOUNDER_PRODUCT_AND_AUTHORITY_RULES_2026-10-05.md).
Source of truth: `transcenlutions25/transcenlutions`.

## Current founder decisions

1. Consolidate the recovered work and deploy from this repository.
2. Build for the full Transcenlutions scope, not only the latest revenue offer.
3. **The Mac Tay Command UI/UX is visual and interaction canon.** Preserve its artwork, conversation-first layout, navigation, compact controls, bottom composer, writing blocks, contextual panels, royal purple/black/gold materials and geometric identity. Improve legibility, accessibility and behavior within this design.
4. The company is **Transcenlutions**. Tay Command is its command center. The Mac source and web workspace belong to one versioned platform; private Mac files and SQLite state are not automatically synchronized to the hosted app.
5. **Writing blocks, product portability and authority follow the October 5 founder rules.** Editable/copyable prose uses writing blocks; ordinary chat does not. Created/purchased products are usable in Tay and authorized agent chats by default, subject to explicit compatibility limits and account entitlements. Only the founding owner can change the system globally. Owner-controlled admin invitations and customizable admin AI agents belong in left-panel Administration. This records required behavior, not completed backend enforcement.

These direct instructions supersede the older description of Mac Tay as merely an optional reference. The September surface canon remains applicable where consistent. The Cobalt branch's root single-module mission is scoped to Cobalt; its instructions are preserved verbatim in [Cobalt module instructions](COBALT_CURRENT_MODULE_BUILD_INSTRUCTIONS.md). No payment, communication or approval safeguard is removed by this scope correction.

Brand promise: **Transcending problems by building solutions.**
Slogan: **There is no problem, only solutions. Transcenlutions.**
Operating goal: useful, verifiable work and measurable revenue; never substitute readiness scores, simulated actions or audience attention for actual revenue.

## Master system map

This is a recovery and implementation map, not a claim that the complete platform is finished. “Available” means code exists in this consolidated release; connection and production status are separate. The Explore panel exposes this distinction without overwhelming the conversation.

| Domain | Recovered scope | Current implementation | Dependencies / source |
| --- | --- | --- | --- |
| Tay Command | Shared Mac/web workspace, conversation, navigation, Queue/Steer, project and artifact references, writing blocks, contextual systems | Shared UI available; browser-local state and export; preserved Mac runtime and loopback adapter | [Shared workspace](../tay-shared-workspace-release.md), [desktop feature map](../tay-desktop-feature-map.md) |
| Identity / Tenant Core | Authenticated user, tenant, organization, agent boundaries | Typed identity foundation; authenticated multi-user boundary incomplete | [Core gap map](PLATFORM_CORE_GAP_MAP_2026-09-24.md) |
| Organization / Business Registry | Businesses and divisions are organizations; agents are workers | Canon and partial metadata, not a durable organization service | [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) |
| Agent Registry / Runtime | Tay, Dawn, KJ, Rory and future specialists; voice/text/mobile share identity and memory | Local Mac model runtime preserved; hosted Tay Core remains guided; governed shared runtime incomplete | [Implementation status](TAY_COMMAND_IMPLEMENTATION_STATUS_2026-09-24.md) |
| Authority / Approval Engine | Server-side identity-bound authority, consequential-action approval and audit | Existing policy and approval scaffolding; durable authenticated enforcement still required | [Governance](../tay-engine-box-2-governance.md), [authority boundaries](../agent-authority-boundaries.md) |
| Command / Workflow Engine | Scalable queue, steering, dependencies, assignment, recovery, safe parallelism | Persistent serial Mac queue; shared local workspace queue; no claim of hosted background workers or safe parallel execution | [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md), runtime tests |
| Integration Gateway | Provider-neutral adapters, credential boundary, retries, idempotency | Desktop adapter and Apex handlers; unified authenticated gateway incomplete | [Architecture](PLATFORM_ARCHITECTURE_V1_2026-09-24.md) |
| Operating Graph / Audit Ledger | Provenance, operational events, state, approval and action history | Contracts and local history; authenticated durable store incomplete | [Operating graph](../anything-import-operating-graph.md), [reliability](RELIABILITY_FOUNDATION_V1_2026-09-24.md) |
| Knowledge / Memory | Tenant-, project-, agent- and session-scoped persistent context | Browser-local context/export and preserved Mac persistence; shared authenticated memory incomplete | [Core gap map](PLATFORM_CORE_GAP_MAP_2026-09-24.md) |
| Notification / Event Layer | Durable outbox, updates, background notifications and scheduling | Planned; Scheduled honestly reports unavailable execution | [Architecture](PLATFORM_ARCHITECTURE_V1_2026-09-24.md) |
| Financial Core | Shared ledger, cost/revenue evidence, provider-independent reporting | Revenue UI and sandbox checkout/delivery; shared financial ledger not implemented | [Revenue](../tay-engine-box-3-revenue.md), [Apex release](../APEX_CHECKLIST_RELEASE.md) |
| Model Router / visible stack | Intelligence, image, video, voice, code, knowledge, browser and deployment lanes; Tay Auto, overrides, budgets, failover and usage | Canon; preserved Mac provider pathways, not a hosted routing service | [Thread sync](TAY_CROWNE_LEGACY_THREAD_SYNC_2026-09-28.md), [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) |
| Live agent presence | Ready/listening/thinking/building/approval states, speech, synchronized animation and expandable live window | Canon; full live animated implementation planned | [Thread sync](TAY_CROWNE_LEGACY_THREAD_SYNC_2026-09-28.md) |
| Ascended Forge | KJ-led apps, web, SaaS, game, AI, automation, media, 3D, QA and launch departments | Division identity and existing Mac tools preserved; shared production workflows planned | [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) |
| 3D Forge | Text/image/voice input; concept, material, remesh, retopology, inspection, refinement, approvals and supported exports | Canon, not a working shared generation pipeline | Provider adapters, queue, asset provenance; [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) |
| Creator Flow / Crowne Legacy | Writing and publishing, flagship film/game, canon cast, continuity, story, cinema, voice, music, VFX, QA and measured generation cost | Production canon recovered; no completed movie/game claim | [Studio and character canon](TAY_CROWNE_LEGACY_THREAD_SYNC_2026-09-28.md) |
| Business Command / Founder Console | Offers, priorities, sales, fulfillment, focus, insight and feedback | Planning panels and session feedback available; external execution not implied | [Founder OS](../tay-engine-box-4-founder-os.md), [learning feedback](../tay-learning-feedback-engine.md) |
| Apex Flow | Offer, intake, paid offline checklist and purchase-to-delivery flow | Product and handlers implemented; one sandbox flow previously verified; production commerce remains gated | [Validation](../WORKFLOW_VALIDATION_2026-10-04.md), [delivery](../APEX_FLOW_DELIVERY.md) |
| Cobalt Current | Remote lead recovery: prospects, client leads, reviewed drafts, audit, weekly reporting, do-not-contact exclusion | Specification only; Stage 1 prohibits sending | [Master spec](../cobalt-current-lead-recovery-master-spec.md) |
| Acquisition OS | Typed acquisition domain/workflow contract | Contract only | [Acquisition contract](../acquisition-os-domain-contract.md) |
| Funding Engine | Verified funding profile, eligibility, ranking, tailored answers, approval, submission and monitoring | Implementation foundation specified, not connected automation | [Funding engine](TAY_FUNDING_ENGINE_V1_2026-09-30.md) |
| Learning Mode / Rory | Quick Guide, tiny guided steps, deep understanding, practice, progress, same agent/runtime; child safety | Canon; shared learning state and Rory safeguards incomplete | [Architecture](PLATFORM_ARCHITECTURE_V1_2026-09-24.md), [Rory](RORY_LEARNING_SYSTEM_V1_2026-09-24.md) |
| Experience-to-Playbook | Turn verified outcomes into reusable knowledge without escaping governance | Canon; feedback foundation partial | [Playbooks](EXPERIENCE_TO_PLAYBOOK_V1_2026-09-24.md) |
| Personal environment / Crowne | Persistent user-chosen office, cabin, mansion, throne room or other workspace; customization and upgrades | Canon; exact prices, exchange meaning, earn/purchase rules **UNRECOVERED** | [Founder directive](FOUNDER_CANON_DIRECTIVE.md); do not invent economics |
| Businesses / device surfaces | Hallway Cleaning and other businesses consume shared services; mobile, voice, Aegis and figurines reach same identity | Future integrations; private local cleaning/PWA work was not present in these remote branches | [Architecture](PLATFORM_ARCHITECTURE_V1_2026-09-24.md), [Build directive](TAY_COMMAND_BUILD_DIRECTIVE_2026-09-24.md) |

## Canon records and provenance

- **Master Canon:** this index plus [Founder Directive](FOUNDER_CANON_DIRECTIVE.md) and the linked source documents. Original full specifications remain authoritative; table summaries do not delete details.
- **Master System Map:** the table above and [Platform Core Gap Map](PLATFORM_CORE_GAP_MAP_2026-09-24.md).
- **Character & Agent Bible:** [Tay / Crowne Legacy thread sync](TAY_CROWNE_LEGACY_THREAD_SYNC_2026-09-28.md), [Agent Authority Boundaries](../agent-authority-boundaries.md), shared registry and preserved runtime identities. Approved likeness assets remain their own identity authorities.
- **Feature & Inspiration Registry:** the complete linked source documents and `lib/future-modules.ts`. Third-party examples are research, not permission to copy branding or fabricate implemented features.
- **Decision Log:** dated canon files; October 4 founder decisions above; merge ancestry; [consolidation release](../CONSOLIDATED_RELEASE_2026-10-05.md).
- **Research Library:** source-linked research sections in recovered canon. No claim is made that missing earlier research or inaccessible screenshots were recovered.

## Visual implementation contract

`components/workspace-frame.tsx`, `components/chat-shell.tsx` and `app/tay-workspace.css` carry the shared Mac workspace. `public/assets/tay-command-v1.png` remains unchanged. `public/transcenlutions-brand.css` carries the same materials into Apex and is embedded in the offline checklist by its build script. Avoid disconnected color systems and preserve readable white-paper printing.

The archived Mac source manifest remains intact. “Shared source” does not mean the cloud can control a private Mac, that a provider is connected, or that browser data is encrypted or authenticated.

## Next dependency order

Authenticated tenant boundaries → durable organization/agent registries → identity-bound authority and approvals → durable queue/Operating Graph/audit → credential-bound integration adapters → scoped knowledge → notifications → model routing/cost controls → financial ledger → shared learning workflows → expanded business/production modules.

Missing prior authoritative material remains UNRECOVERED. Later explicit founder decisions supersede older ones; unresolved conflicting sources remain CONFLICT. No domain purchase, alternate spelling or assistant proposal creates a new product specification by itself.
