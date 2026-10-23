# Quiet completion recovery review — October 23, 2026

Draft candidate based on PR #90 (`feat/tay-ui-canonical-20261023`, fcbb746).
It carries the eight preserved commits from PR #89 in a separate review branch;
PRs #89 and #90 remain untouched. Do not merge both duplicate implementations.

The root chat shell now renders up to three transient completion cards above the
composer, only for recorded successful results. Cards expand to show the saved
result, stay while expanded, and dissolve after eight seconds when collapsed.
Queue/conversation history remains intact. Reduced-motion CSS and keyboard
controls are preserved. This does not change the static /tay Supabase client or
add the notices to the separate /workspace candidate.

Recovery corrections: wait for the first actual desktop state before seeding
completion history (avoid replaying a delayed initial snapshot); a zero or
nonfinite notice cap produces no cards. A DOM regression suite is included in
the Launch gate.

Verified locally: workspace suite, 11 /tay presentation tests, typecheck,
lint/public-copy guard, Next 15.5.28 production build, identity/security checks, DOM tests for delayed history, polling deduplication,
expansion retention, dissolve and remount. The real local Chrome browser flow
passed: queue/edit/pause/reload, governed guided action completion, expandable
notice, expanded retention beyond eight seconds, collapse/dissolve, and no replay
on reload. The browser ran against localhost; a 127.0.0.1 run was denied by the
existing origin guard and did not produce a successful-completion notice.
No production authorization was bypassed. No paid model or connected Mac runtime
was used. Completion here means the recorded local guided action, not an
external business outcome. The desktop notification path has DOM coverage,
not a real owner-runtime browser test.

No production deployment, domain change, secret change, expense, outbound
communication or main merge. A deploy preview and real-device visual checks
remain unverified. Existing worktrees stay preserved. Commits request Netlify
skip; release/deployment is not authorized.
