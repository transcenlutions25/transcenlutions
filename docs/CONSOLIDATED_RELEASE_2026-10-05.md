# Transcenlutions consolidation release — 2026-10-05

Founder-authorized scope: merge the recovered work into `transcenlutions25/transcenlutions`, preserve the full platform scope and Mac Tay Command as visual canon, verify and deploy the combined build.

## Integrated sources

The integration branch preserves merge ancestry for acquisition contract (PR 3), brand canon (15), command surface (16), studio canon (20), funding (21), local checkpoint (22), Cobalt Current specifications, shared Mac workspace/runtime preservation (24), and Apex product/purchase/delivery work (23). Older branches with no unique patches were not replayed. No private unpushed Mac working copy is claimed as merged.

## Conflict resolution and refinements

- Retained the shared Mac UI, artwork and archived sources; retained Apex delivery handlers and all regression suites.
- Combined desktop build directory/SHA reporting with offline-product server tracing.
- Pinned Next and its ESLint package to 15.5.27; retained the shared UI's React 18.3.1 and PostCSS 8.5.24 override.
- Standardized Node 24 in CI, Netlify, `.nvmrc` and package engines. jsdom 30 requires Node 22.22.2+, 24.15.0+ or 26+; the former Node 20 CI could not load its undici dependency. No test was skipped to hide that mismatch. Source: https://github.com/jsdom/jsdom/releases and npm package engines.
- Added shared Mac material styles for Apex's offer, access and offline checklist; print output remains light and the downloaded product remains self-contained.
- Exposed the recovered system map in Explore with implementation states. Corrected the welcome text so it does not imply unconfigured tools are connected.
- Increased small mobile header/queue/voice targets within the existing layout.
- Preserved Cobalt's original module instructions verbatim and made the root build instructions reflect the founder's whole-platform scope.

## Release gate

Required: locked install, typecheck, identity/workspace/bridge checks, lint/public-copy checks, smoke, Apex logic/DOM tests, Python Apex workflow tests, Python desktop runtime tests, production dependency audit, production build, deployed-preview UI verification, then main merge and deployed SHA verification. Results and immutable production revision belong in the release receipt after the gate completes.

## Operational limits

This release is a deployed private-alpha/test foundation. Hosted Tay uses guided responses unless a supported model runtime is separately configured. Authenticated multi-tenant services, full hosted agent execution, scheduled automation, most production modules and live financial operations remain incomplete or gated. The earlier successful sandbox purchase-to-delivery flow is preserved; this merge does not enable live payments or copy secret values into production.

`transcenlutions.com` DNS remains unchanged. Netlify's existing site is the deployment target. No new outbound messages are authorized by this release. Missing historical screenshots and private Mac state are not reconstructed or invented.

## Rollback

Prior production source: `914305066231c9dae3b2772e32eec93b993c0564`; prior Netlify deployment: `6abae9c18413c20008f626d2`. If verified regression requires rollback, restore that deployment through Netlify and reconcile the correction through GitHub; preserve both histories. Do not change domain DNS to work around a build failure.
