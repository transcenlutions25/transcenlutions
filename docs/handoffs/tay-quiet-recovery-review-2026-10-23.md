# Quiet completion selective integration review

Reviewed October 24, 2026 against main e094f43f17d16d263a59069e9e455f84d1cdf3a1.
This candidate selectively carries PR92's completion-notice implementation and tests, not its PR90 ancestry. It supersedes duplicate PR89 notices. No scanner, authentication, static /tay client, SQLite backend or Pages workflow changes are included.

The existing root chat shows recorded completed results in up to three expandable temporary cards. Existing history remains unchanged. Delayed desktop history is seeded without replay, repeated poll results are deduplicated, expanded results stay open, collapsed notices dissolve, and reload does not replay prior tasks. Nonpositive, fractional-below-one and nonfinite capacity returns no cards.

Isolated workspace and DOM regressions passed using already installed React19/jsdom26/TypeScript dependencies. These are not the exact pinned application dependency versions. Fresh CI must verify the checked-in React18/jsdom30 lock, Launch and security gates and exact-head deploy preview before merge. No production or real-account test was performed.

Next and eslint-config-next are aligned to reviewed 15.5.28. No new dependency, auth behavior, permissions, payment behavior, outbound operation or customer record is added. The native Pages source and publication workflow remain unchanged.
