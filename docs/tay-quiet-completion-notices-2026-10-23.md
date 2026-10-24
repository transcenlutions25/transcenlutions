# Tay quiet task completion — October 23, 2026

**Owner-directed interaction requirement:** Show each completed task unobtrusively, then let its completion notice dissolve unless the owner opens it. No persistent wall of completion cards, no forced next-step prompt, and no extra approval just to acknowledge the result.

## Behavior

- Notify **only** when the existing Tay action result or Mac runtime reports status `completed`. Do not manufacture status from an agent saying it is "thinking" or merely accepting work.
- New completion: an accessible, compact card appears immediately above the command composer. A short title and check mark identify the finished action.
- Untouched: the card waits eight seconds, then fades over 240 ms and disappears. Reduced-motion preferences suppress the animation.
- Clicked: the card expands with the actual result and next step (if present); automatic dismissal is suspended until the card is collapsed or explicitly dismissed.
- Up to three recent cards are shown at once. This cap affects **only** temporary notices.
- Completed objectives remain in their preexisting Mac queue or hosted conversation/action log. Disappearing is not deletion.
- On reload or switching conversations, existing completed tasks are treated as history and do not reappear as fresh notifications.
- Failures, paused tasks and approval-required actions are **not** treated as successful completions, and their existing explicit UI remains visible.
- Mobile and keyboard interaction use readable labels, touch targets and focus indication.

## Implementation scope

- `components/task-completion-notices.tsx`: transient presentation and expand/dismiss interaction.
- `lib/task-completion-notices.ts`: pure deduplication/cap logic.
- `components/chat-shell.tsx`: translate actual hosted and desktop completed results into notice records.
- `components/workspace-frame.tsx`: place the notices above the composer without replacing the chat-first layout.
- `app/tay-workspace.css`: branded presentation and reduced-motion compatibility.
- `scripts/check-workspace.mjs` and `scripts/browser-workspace.cjs`: idempotence, visual interaction and no-replay checks.

## Verification and limits

Launch Gate is the primary CI requirement: typecheck, workspace/identity and security checks, smoke and production build. The optional browser test also exercises tap to inspect, persistence when expanded, dissolve when collapsed, and no replay on reload. Record actual run outcomes in the PR before merge; code presence alone is not verification.

Hosted Tay Core is still a guided foundation. A hosted "completed" status represents the specific local action that was recorded; it does **not** prove email sending, live payment, cloud agent execution or database synchronization. Mac completion comes from the connected runtime only. This change does not add remote execution, permissions, payments, background schedules or multi-device state syncing.

Follow the existing branch → review/tests → launch gate → approved merge/deploy process. Do not auto-merge or deploy this UX experiment without verified tests.

