TRANSCENLUTIONS LLC — TAY COMMAND
CANON BUILD DIRECTIVE

STATUS:
CANON. These requirements extend the existing Tay Command architecture. Do not rebuild or replace Tay Command.

CORE PRINCIPLE:
Tay Command is the user-facing command center for the Transcenlutions ecosystem.

Transcenlutions is the company/empire.

Agents are people/workers.
Businesses and divisions are organizations/places.
Tools are equipment.
Workflows are production lines.
The Operating Graph records the operational state and history of the empire.

Tay is the primary Executive Chief of Staff and empire-level orchestrator.

==================================================
1. AGENT RUNTIME V1
==================================================

Stop expanding disconnected prototype surfaces and establish Agent Runtime V1 as a core platform foundation.

Convert Tay, Dawn, Rory, KJ, and future agents from UI identities or routed responses into genuine model-backed agents operating through a shared runtime.

The runtime must support:

- Persistent agent identity.
- Agent-specific personality and instructions.
- Persistent authenticated memory.
- Scoped capabilities and permissions.
- Server-side authorization.
- Governed agent handoffs.
- Approval enforcement.
- Tool execution.
- Action execution.
- Operating Graph events.
- Audit history.
- Model routing.
- Voice and text through the same runtime.

Tay is the primary executive agent.

Voice must NOT create a separate "voice Tay."

Typing, speaking, mobile interaction, future phone-call interaction, Aegis hardware, figurine hardware, and other interfaces must reach the same Tay identity, memory, authority, Agent Runtime, and Operating Graph.

Target runtime flow:

USER
→ AGENT
→ OBJECTIVE
→ COMMAND QUEUE
→ MODEL ROUTER
→ POLICY / AUTHORITY
→ APPROVAL WHEN REQUIRED
→ TOOL / AGENT / WORKFLOW
→ OPERATING GRAPH
→ RESULT

Finish line:

A user can close Tay Command, return later, speak or type to an agent, retain appropriate persistent context, intentionally hand work between agents, receive genuine model-generated responses, and have consequential actions checked against the active agent's authority.

==================================================
2. SCALABLE COMMAND QUEUE
==================================================

Do not impose a three-task architectural limit.

Three tasks are only a minimum useful visible preview.

Implement a persistent, scalable command queue with no small user-facing task limit.

The user should be able to give Tay many objectives without manually waiting for each one to finish.

The queue must contain:

ACTIVE
The objective currently being executed.

UP NEXT
A compact preview of approximately the next 3–5 objectives.

BACKLOG
An expandable/scrollable collection containing the remaining queued work.

Support:

- Queue
- Steer
- Reorder
- Prioritize
- Pause
- Resume
- Cancel
- Dependencies
- Status
- Progress
- Agent assignment
- Safe parallel execution
- Completed history
- Failure/retry state

STEER modifies or redirects the active objective.

QUEUE adds another objective without destroying or interrupting the active objective unless priority/governance rules require otherwise.

Support dependencies such as:

"Do not begin Objective B until Objective A finishes."

Independent objectives may execute concurrently when safe.

Queue state must survive sessions.

Eventually a user should be able to give Tay 20, 30, or more objectives and have Tay organize and execute them rather than forcing the user to manage a tiny queue.

Integrate the queue with:

- Agent Runtime
- Agent delegation
- Approvals
- Operating Graph
- Notifications
- Persistent memory
- Background work
- Business/division routing

==================================================
3. TRANSCENLUTIONS ORGANIZATIONAL MODEL
==================================================

Think of Transcenlutions as an empire/large company containing businesses, divisions, factories, agents, workers, systems, and tools.

Tay sits at the corporate orchestration layer.

Tay should not personally perform every job.

Tay receives objectives, determines where they belong, delegates them, monitors execution, handles escalations and approvals, and reports results to the owner.

Organizational pattern:

OWNER / FOUNDER
↓
TAY
Executive Chief of Staff / Empire Orchestrator
↓
BUSINESS OR DIVISION LEADERS
↓
SPECIALIZED AGENTS + HUMAN WORKERS
↓
TOOLS / PRODUCTION SYSTEMS

Each major Transcenlutions business can eventually have its own operating leader while Tay coordinates across the entire company.

==================================================
4. ASCENDED FORGE
==================================================

Ascended Forge is NOT an agent.

Ascended Forge is a Transcenlutions business/division.

Think of it as the digital factory inside the Transcenlutions empire.

Ascended Forge exists to forge, build, refine, test, and launch:

- Apps
- Websites
- SaaS products
- Games
- AI systems
- Agents
- Automations
- Digital tools
- Businesses
- Media assets
- 3D assets
- Digital systems

Crowne Legacy can be a flagship product produced through this factory, but Ascended Forge is much broader than gaming.

KJ is the:

FORGE MASTER
HEAD OF ASCENDED FORGE

Tay remains above KJ at the corporate orchestration level.

Chain of command:

OWNER
↓
TAY
Executive Chief of Staff
↓
KJ
Forge Master / Head of Ascended Forge
↓
ASCENDED FORGE
↓
SPECIALIZED PRODUCTION AGENTS / HUMAN WORKERS / TOOLS

Potential internal Forge departments include:

- App Forge
- Web Forge
- SaaS Forge
- Game Forge
- 3D Forge
- AI / Agent Forge
- Automation Forge
- Media / Asset Forge
- QA / Test Foundry
- Launch / Deployment

When a user gives Tay an objective belonging to Ascended Forge, Tay can route the objective to KJ.

KJ coordinates the appropriate Forge departments, agents, humans, and tools.

Tay monitors the objective at the executive level.

If the owner enters Ascended Forge directly, KJ should function as the leader/operator of that facility.

==================================================
5. ASCENDED FORGE — 3D FORGE
==================================================

Add:

ASCENDED FORGE → 3D FORGE

Do not rebuild or replace the existing Tay Command interface.

Create a premium Transcenlutions-native text/image-to-3D workflow inspired by the simplicity of modern AI 3D-generation experiences without copying another company's branding, proprietary assets, or interface.

Possible interface messaging:

FORGE 3D ASSETS

From Thought to Form.

Describe it.
Show it.
Tay and the Forge turn it into form.

Users should be able to:

- Type a 3D request.
- Speak a 3D request.
- Attach one reference image.
- Attach multiple reference images.
- Generate concept imagery when needed.
- Convert concepts into 3D.
- Generate textures/materials.
- Remove backgrounds when required.
- Remesh.
- Retopologize.
- Control polygon/detail targets.
- Prepare assets for rigging.
- Prepare assets for animation.
- Optimize game-ready assets.
- Prepare 3D-print-ready assets.
- Inspect models interactively.
- Request conversational revisions.
- Approve finished assets.

Support appropriate export pathways such as:

- GLB
- GLTF
- OBJ
- FBX
- STL

when supported by the selected provider/toolchain.

The workflow should follow:

FORGE
→ INSPECT
→ REFINE
→ APPROVE
→ DEPLOY

Approved assets can be routed toward:

- Crowne Legacy
- Other games
- Websites
- Apps
- Product visualization
- Ecommerce
- Aegis
- Figurines
- 3D printing
- Media
- Other Transcenlutions systems

Do NOT attempt to build a foundational 3D-generation model from scratch as the initial implementation.

Build a provider-agnostic 3D generation adapter.

External providers such as Hyper3D or future alternatives should be pluggable without changing the user-facing Forge experience.

3D generation jobs must integrate with the scalable command queue.

Preserve generated assets, job metadata, approvals, routing, and relevant history through the Operating Graph.

Consequential external actions remain governed by Tay Command's policy and approval system.

==================================================
6. SMART MODEL ROUTER
==================================================

Add platform-wide Smart Model Switching.

Users should normally interact with AGENTS rather than manually selecting underlying AI models.

The user chooses WHO they are working with and WHAT they want accomplished.

Transcenlutions determines which intelligence machinery should perform each part of the job.

Maintain a strict architectural distinction:

AGENT = who the user is interacting with.

MODEL = the intelligence engine currently being used by that agent.

TOOL = something the agent uses to accomplish work.

Changing models must NEVER automatically change:

- Agent identity
- Personality
- Memory
- Role
- Permissions
- Authority
- Governance boundaries

For every request or workflow step, automatically select an appropriate available model/provider based on factors including:

- Capability
- Quality
- Reasoning requirements
- Coding ability
- Modality
- Vision requirements
- Audio requirements
- Context requirements
- Latency
- Cost / credits
- Privacy
- Availability
- Reliability
- Tool compatibility
- Agent permissions

Support MULTI-MODEL OBJECTIVES.

Example:

"Create a game character."

The system may automatically use:

Reasoning model
→ specifications

Image model
→ concept art

3D model/provider
→ geometry

Coding model
→ game integration

Vision model
→ QA inspection

The user should not have to manually perform those switches.

==================================================
7. MODEL ROUTING MODES
==================================================

Provide user-selectable routing preferences:

BALANCED

BEST QUALITY

FASTEST

LOWEST COST

PRIVATE / LOCAL

Balanced should normally be the default.

Also provide an ADVANCED manual model override for users who explicitly want direct model control.

Manual model selection should be optional rather than required for ordinary operation.

==================================================
8. MODEL FAILOVER
==================================================

The Smart Model Router should support safe automatic fallback.

If the preferred model:

- Is unavailable
- Hits usage limits
- Fails
- Times out
- Cannot perform the modality
- Cannot access required tools
- Violates configured cost limits

the router may select another compatible model/provider when governance permits.

The user should not need to restart the entire objective because one provider became unavailable.

==================================================
9. MODEL ROUTING INTELLIGENCE
==================================================

Record model-routing information in the Operating Graph, including appropriate:

- Model/provider selected
- Reason/category for routing
- Cost
- Latency
- Success/failure
- Retry
- Fallback
- Quality/performance signals

Over time, Tay Command should be capable of improving routing decisions based on observed performance.

For example:

If one model repeatedly performs better for Ascended Forge coding while another performs better for planning, the router can incorporate that evidence into future routing.

Learning must remain constrained by:

- Governance
- Permissions
- Privacy rules
- Cost limits
- User routing preferences

==================================================
10. EXPERIENCE PRINCIPLE
==================================================

The long-term user experience should feel like this:

The user tells Tay or another agent what they want.

The agent understands the objective.

The system determines which Transcenlutions business or division should handle it.

The appropriate business leader receives it.

That leader coordinates specialized agents, human workers, models, tools, and production lines.

Smart Model Routing chooses the underlying intelligence engines.

The Command Queue organizes execution.

Governance determines what can happen automatically and what requires approval.

The Operating Graph records what happened.

The agent returns the result to the user.

The user should NOT have to behave like the orchestration engine.

Transcenlutions should perform the orchestration.

==================================================
11. PRESERVATION RULE
==================================================

DO NOT REBUILD TAY COMMAND.

Preserve the existing:

- Interface
- Navigation
- Chat experience
- Routes
- Working features
- Agent work
- Governance work
- Existing architecture
- Brand language
- Royal/premium/futuristic design system

Implement these capabilities as extensions, modules, services, and controlled merges into the existing source-of-truth architecture.

Tay Command remains the user-facing command center.

Transcenlutions remains the company/empire behind it.

Ascended Forge remains its digital factory.

KJ runs the Forge.

Tay coordinates the empire.

The Owner remains the ultimate authority.