# PLATFORM CORE GAP MAP — 2026-09-24

Status: Working implementation map
Parent canon: Platform Architecture V1 and Reliability Foundation V1

## Verified current foundation

| Platform area | Current evidence | State | Next reliability milestone |
| --- | --- | --- | --- |
| Release gate | GitHub Launch Gate runs typecheck, lint, smoke, build, desktop runtime tests, queue JS syntax | PARTIAL/WORKING | Add release/deployment environment and migration gates as those capabilities become real |
| Agent Registry | Shared typed Tay/Dawn/Rory registry with explicit actions/delegates | PARTIAL/WORKING | Move toward persisted/tenant-scoped registry without hard-coding every future agent |
| Authority policy | Server policy endpoint + default-deny capability checks | PARTIAL/WORKING | Bind decisions to authenticated user/tenant/agent identity and real action adapters |
| Agent Runtime | Shared session/routing foundation | PARTIAL | Genuine model-backed agents, authenticated persistent context, governed tool adapters |
| Command Queue | Persistent desktop Queue/Steer store with recovery/dependency tests | PARTIAL/WORKING | Integrate with shared server platform/Operating Graph and safely add concurrency where warranted |
| Operating Graph | Client event contract and persistence handoff exist | PARTIAL | Establish authenticated durable event store, schemas, querying, retention, tenant boundaries |
| Audit | Governance/log/event metadata exists | PARTIAL | Durable tamper-aware audit records for consequential operations |
| Identity/Tenant | README explicitly says authenticated tenant identity is not implemented | BLOCKER | Implement before multi-user/private production data or consequential external actions |
| Knowledge/Memory | Session-visible memory exists; authenticated persistent memory does not | BLOCKER/PARTIAL | Durable scoped memory with tenant/agent/session boundaries |
| Integration Gateway | External action/provider layer is not yet a unified gateway | MISSING/PARTIAL | Provider-neutral adapters, credentials vault boundary, timeouts/retries/idempotency |
| Organization Registry | Canon exists; shared durable registry not verified | MISSING | Registry for businesses/divisions/products independent of UI modules |
| Approval Engine | Local/governance approval flows exist | PARTIAL | Durable server-side approvals bound to actor, action, expiry/state, audit |
| Notifications/Events | Operating Graph event handoff exists; general event bus not verified | MISSING/PARTIAL | Durable event/outbox pattern before broad automation |
| Financial Core | Revenue UI/setup exists; shared financial ledger/core not verified | MISSING/PARTIAL | Separate financial domain from checkout/provider adapters |
| Model Router | Canon requirement; not verified as shared production service | MISSING | Provider-neutral router, budgets, failover policy, observability |
| Learning Mode | Canonized; existing feedback/learning UX is separate | PLANNED | Implement one shared learning state machine over Agent Runtime, not duplicate business logic |

## Dependency order

The next implementation order is:

1. Identity/Tenant contract and authenticated server boundary.
2. Durable Organization + Agent registry contracts.
3. Server-side Authority/Approval contract bound to identity.
4. Durable Command/Workflow service contract and Operating Graph/Audit event contract.
5. Integration Gateway contract: provider adapters, credential boundary, timeout/retry/idempotency.
6. Knowledge/Memory scopes and retention.
7. Notification/Event delivery.
8. Model Router/failover/cost controls.
9. Financial Core shared ledger/reporting interfaces.
10. Learning Mode state/progress interfaces over the same runtime.
11. Business modules consume these services without introducing parallel cores.

## Stop conditions

Do not claim production readiness while authenticated tenant identity, durable authorization, external action safety, and production data boundaries are unresolved.

Do not create a second queue, second agent runtime, second approval system, or business-specific copy of a platform core service.

Do not choose Replit/Base44/another host in a way that changes these domain contracts.
