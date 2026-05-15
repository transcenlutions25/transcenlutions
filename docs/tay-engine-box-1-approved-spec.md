# Tay Engine Box 1: Approved Build Spec

## Summary
Build a fresh **Next.js + TypeScript** local web app for **Box 1 only**. Tay is the **CEO Operator + Orchestrator of Transcenlutions**. The app proves the loop: user request → intent detected → suggested action → permission status → execute → running state → result → log entry → next step.

The sidebar must not become a dashboard. It should be a small **System Stack** panel only.

## Required Files
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `lib/tay-core.ts`
- `lib/action-engine.ts`
- `lib/types.ts`
- `components/chat-shell.tsx`
- `components/action-card.tsx`
- `components/session-log.tsx`
- `components/system-stack.tsx`

## Implementation Rules
- All business logic lives in `/lib`.
- UI components only display state and trigger actions.
- Do not add database, auth, API calls, payments, memory, agent dashboards, extra pages, or full dashboard UI.
- Keep future concepts locked behind labels only:
  - **Coming Later**
  - **Locked Until Foundation Is Stable**

## Box 1 Behavior
- Tay speaks as Transcenlutions’ CEO Operator + Orchestrator.
- Demo intents:
  - `build_feature`
  - `write_plan`
  - `record_note`
  - `clarify_request`
  - `unsupported_request`
- Allowed actions:
  - `create_task`
  - `draft_plan`
  - `log_note`
- Requires approval examples:
  - future external API call
  - future autonomous task
- Blocked examples:
  - payments
  - deleting data
  - real-world automation
  - hidden background work
- Every failed, blocked, vague, or unsupported action appears in both chat and session log.

## UI Requirements
- Mobile-first dark luxury Transcenlutions shell.
- Black/navy base, royal purple glow, gold accents.
- Chat is the center.
- Action cards and logs are secondary.
- System Stack panel shows:
  - Transcenlutions
  - Tay Core
  - Chat System
  - Action Engine
  - Governance Placeholder
  - Supporting Agents Coming Later

## Definition Of Done
Typing `Build the first Tay feature` must produce:
- Detected intent: `build_feature`
- Suggested structured action
- Permission status: `allowed`
- Execute button
- Visible running state
- Visible result
- Visible session log entry
- Clear next step

## Test Plan
- Run `npm run lint`.
- Run `npm run build`.
- Manually verify:
  - `Build the first Tay feature` completes the full core loop.
  - Planning request maps to `write_plan` / `draft_plan`.
  - Note request maps to `record_note` / `log_note`.
  - Vague request maps to `clarify_request` and logs it.
  - Payment/deletion/background automation request is blocked and logged.
  - Mobile layout keeps chat primary and System Stack compact.

## Final Report Format
After implementation, report:
1. Files created
2. How to run locally
3. Which acceptance tests passed
4. Any errors or limitations
