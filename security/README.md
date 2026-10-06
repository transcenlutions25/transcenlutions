# Security boundary and continuous checks

Scope: canonical hosted Next.js app, Netlify edge entry points, Apex purchase/delivery handlers, active desktop extension, tracked source and reachable Git history. Preserved `integrations/tay-desktop/legacy` remains historical source, not a hardened public service. Never expose that server to the internet. Install the current extension using `integrations/tay-desktop/install.py`; a GitHub/cloud deployment does not update a private Mac.

## Run and enforce

Run `npm run security`, then the Launch gate suite. `Security gate` runs on every push, every pull request, daily at 10:23 UTC, and manually. It uses read-only repository permission, no production credentials, and no `pull_request_target` execution. Dependabot proposes weekly npm and Actions updates.

Required GitHub checks to configure on `main`: `Security regression`, `Dependency vulnerabilities`, `Secret scan`, and existing Launch gate jobs. Branch-protection API access was denied by the connected integration; workflow installation alone does not prove merge enforcement. Scheduled runs become active after the workflow reaches the default branch.

The dependency check blocks every production advisory and every new development advisory. One temporary, exact advisory exception is recorded in `dependency-exception.json`: unpatched build-only braces stack exhaustion, expiring October 20, 2026. Seven dependency-chain entries trace to this one issue. Do not pass user input as glob patterns to lint/build tools. The PostCSS selector parser is overridden to patched 7.1.6; this is verified by the build and tests. Audit/network failures fail the gate. The Gitleaks binary is pinned and checksum-verified; output is redacted, full fetched history and tracked working files are scanned. The only secret-scan allowlist matches the literal `ANTHROPIC_API_KEY=` variable identifier in the empty `.env.example` template (a confirmed multiline detector false positive); it does not allow credential values. Detection is not proof that a breach never occurred.

## Request and authority boundaries

- Netlify native edge rules: all `/api/*` traffic 120/IP/domain/minute, signed Stripe webhook separately 600/minute, all remaining paths (including static/framework URLs) 600/minute. Netlify distributed counting is used, not instance-local counters or caller-supplied IP headers. Official documentation: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/ . Enforcement can lag by up to ten seconds and does not constitute a global spend cap. Verify applied rules and sustained 429 responses on each preview before release. Standalone `next start` does not provide Netlify rate enforcement.
- Edge rejects unsupported methods/encoding, excessive declared lengths, and hosted desktop adapters. Streaming route readers bound actual bodies even when Content-Length is absent. JSON object shape, depth, types, finite numbers, reserved prototype keys, unknown policy/evidence fields, and request origin are validated. Stripe HMAC still verifies the unmodified raw body. Do not sanitize/re-encode signed webhooks.
- Text is retained as text so legitimate writing and code survive; render through React/textContent, never raw HTML. A word blacklist cannot guarantee prompt-injection prevention.
- Public policy requests cannot grant approval through `approved:true`. These are advisory evaluations, not execution authorization. Real production identity and durable authenticated approvals remain unimplemented and fail closed. Internal evidence reads and writes cannot be enabled publicly with the old unauthenticated flag.
- Attached desktop references stay in user data, never the system role. Stored history cannot add privileged roles. Generated text has no tool execution capability. Existing external-action and paid-provider consent remain required. The archived legacy chat/self-development paths still require a separate deeper model-safety review before public exposure.
- Desktop loopback server adds a single-server 600/minute allowance, bounded object bodies and server-side provider lookup; it is not multi-user authentication. Provider keys are no longer accepted by the active extension from the browser. Keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY, PERPLEXITY_API_KEY, ELEVENLABS_API_KEY. Restart the desktop process after configuring its environment. The legacy source snapshot is intentionally unchanged.
- Database TLS verifies certificates. A private CA can be supplied in DATABASE_SSL_CA. Production DATABASE_URL must not contain overriding SSL query parameters. Database errors are not logged with raw provider details.

## Secrets and release limits

All service credentials must be server-side environment variables, never NEXT_PUBLIC_ values. `.env.example` contains empty templates. Stripe catalogue IDs, public company contact details and build identifiers are not secrets. Session-specific browser tokens and purchase access links are capabilities, not service configuration; they retain their existing scoped lifecycle. No real secret was copied, invented, rotated or activated in this change. Configure deployment secrets through the host's protected settings.

No production payment, outbound email, custom-domain change or private-Mac update is implied by these tests. Authenticated multi-user administration remains a separate launch dependency. Review provider/dashboard access logs to investigate an actual incident; source/dependency scans alone cannot verify absence of past compromise.

Rollback baseline: b4818e42781793d11f919ea5d9ed0e9e2fa293e5. A rollback would also remove these security protections, so prefer a targeted repair.
