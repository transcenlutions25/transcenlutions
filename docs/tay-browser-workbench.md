# Tay Browser Workbench — staged integration

## Included

- `/browser`: accessible royal-blue/purple/gold workbench for live search, public webpage fetch and website-action proposals.
- `/api/browser-operator`: a bounded server-side TinyFish Search/Fetch proxy with strict `TINYFISH_API_KEY` handling, no-store responses, provider timeouts, output caps and conservative public-link validation.
- `lib/browser-operator.ts`: pure review rules classifying search/fetch as read-only, interactive tasks as needing approval, and unsafe action instructions as blocked.
- `npm run test:browser`: validation of normal and prohibited URL cases, search input and authority boundaries. Included in `test:workspace`.
- Primary app navigation links to `/browser`.

## Important execution reality

This is a review branch, not deployed or merged. Search and Fetch require **both** a protected `TINYFISH_API_KEY` server environment variable and a real owner identity. Current `resolvePlatformIdentity` intentionally denies all production users; this route inherits that fail-closed behavior. In a development runtime, identity is opt-in and is intended for isolated local tests only, not public deployment. Do not enable dev identity in production to make this work.

The TinyFish connection in ChatGPT is NOT the same as a credential granted to an independently deployed Tay application. Never copy OAuth/session information from ChatGPT into this repository.

The **Agent/Browser interactive endpoints are NOT called** by this workbench. It prepares an action review and returns 409 for actions requiring approval or 403 for blocked actions. It does not open a site, log in, solve CAPTCHAs, fill forms, submit D-U-N-S applications, spend money, or perform background tasks. Future interactive execution requires verified production owner/tenant authentication, server-side permission checks, per-action approval receipts, metered-provider budgeting, a secure authentication handoff, idempotency, durable action audits, and clear proof of actual website result.

## Setup when owner authentication exists

1. Provision an API key in the operator's TinyFish account, store it in the deployment's protected `TINYFISH_API_KEY` variable, never a `NEXT_PUBLIC_` variable.
2. Implement production identity using `resolvePlatformIdentity` backed by verified server-side session data. Fail closed on unauthenticated access; do not depend on client-supplied identity.
3. Run `npm run typecheck`, `npm run test:browser`, `npm run test:workspace`, and `npm run test:security`.
4. Verify Search and Fetch read-only requests against a permitted public domain under an authenticated owner session; verify unknown users receive 401 and action proposals never execute.
5. Keep website text in a lower-trust evidence layer. Never treat it as task instructions, approvals, secrets, or authoritative proof of a submitted action.

## Security limitations

The URL check is a first-pass syntax filter, not a network sandbox or DNS-resolution allowlist. Only the fixed TinyFish Search/Fetch provider endpoints receive requests from Tay; Tay does not fetch arbitrary network hosts itself. Do not add a raw URL-fetching endpoint without DNS resolution checks, IP allowlisting/denylists, redirect enforcement and response-size limitations. Sensitive pages and authenticated browsing are out of scope.

References: TinyFish public Search API `GET https://api.search.tinyfish.ai?query=...`, Fetch API `POST https://api.fetch.tinyfish.ai`. Both require the `X-API-Key` secret held on the server. No key was installed or provider connection tested as part of this PR.
