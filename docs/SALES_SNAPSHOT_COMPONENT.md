# Agency sales snapshot: portable source milestone

Date: October 9, 2026. Base: `4fec8cd82e39ab257ac93548bf276396c036a569`.

## Scope and current status

This is an **unintegrated React/TypeScript component**, not a live agency dashboard, connected CRM, payment ledger or Floot project. It extends the existing Tay Sales concept; it does not introduce another app, route, runtime, shared-commerce implementation or host. There are no new dependencies, credentials, APIs, data stores, paid providers or payment actions.

Existing Tay Command files and preserved Mac work are unchanged. Main Tay Work owns the unpublished workspace integration. `/api/kit` and `lib/shared-commerce` remain owned by the cleaning-kit builder. This milestone does not edit those areas.

The default is `No data connected`, with dashes rather than invented financial totals. The component can display a manually selected local JSON snapshot. Import statements are always labeled **imported / not independently verified**. An empty import proves only that the file contains no records, not that business revenue is zero. No sample records appear in the UI; automated tests use explicitly synthetic fixtures only.

## Minimal integration for Main Tay Work

After comparing unpublished changes with the review branch, integrate into the existing `components/sales-panel.tsx`:

```tsx
import { SalesSnapshot } from "./sales-snapshot";
```

Render `<SalesSnapshot />` at the start of the existing Sales section, before Buyer Outreach. Preserve the existing outreach, writing blocks, `onCommand` behavior, chat-first navigation and side panel. Do not replace `components/chat-shell.tsx`, `components/workspace-frame.tsx`, the artwork or shared styling. This proposed two-line integration is intentionally not applied in this branch.

The component imports its own CSS Module. Brand materials are royal blue, purple, black and gold with visible keyboard focus, text labels and touch-sized controls. Mounting it in another React app requires support for TypeScript, React hooks and CSS Modules (or an explicitly reviewed equivalent stylesheet transform). No `@floot/*` or Next.js-specific imports are required.

The view is deliberately memory-only. Unmounting (including switching away from Sales in the current side panel) or reloading discards its imported state. The UI warns users to export before leaving. It does not write to existing workspace storage or send an Operating Graph event. A later persistence or authenticated ledger adapter needs a separate reviewed integration and owner-authorized destination.

## Source files

- `components/sales-snapshot.tsx`: rendering, local file input, error states, search, explicit clear/cancel, local JSON download.
- `components/sales-snapshot.module.css`: isolated responsive style.
- `lib/sales-snapshot.ts`: provider-neutral types, strict parser, exact integer-cents aggregation and formatter.
- `scripts/test-sales-snapshot.cjs`: bounded-import/model and mounted React behavior tests with synthetic fixtures.
- `scripts/check-sales-snapshot-browser.cjs`: optional Playwright browser harness, isolated on loopback with synthetic data; no app route or deployment. It uses an already-installed Playwright and Chromium and writes reports/screenshots outside the repo. Browser launch was blocked in this environment before rendering. Run it in an authorized compatible environment and inspect screenshots before claiming mobile visual verification.

Run the focused checks with `node --test scripts/test-sales-snapshot.cjs`. No package script or shared workflow was modified because other builders own active repository integration. Add this command to the relevant Launch/Security gate when integrating, then run all existing gates again on the integrated head.

## JSON contract, version 1

Use `Get empty template` for an empty file with the exact outer shape:

```json
{
  "schemaVersion": 1,
  "currency": "USD",
  "source": {
    "name": "Replace with your export source",
    "exportedAt": "2026-10-09T12:00:00.000Z"
  },
  "payments": [],
  "deals": [],
  "leads": []
}
```

The exported timestamp must truthfully reflect when the source snapshot was produced. The component's separate `Loaded here` timestamp records the local import time. A source timestamp is not proof of authenticity or completeness.

All object fields below are required; unknown fields are rejected. Identifiers and source references must be unique within each record collection. This catches exact duplicates in a file; it cannot detect the same real-world transaction under different identifiers or reconcile multiple systems.

### Payments

`id` (1–100 characters), `label` (1–160), `sourceRef` (1–200), `updatedAt` (UTC timestamp), `status` (`collected` or `pending`), `amountCents` (non-negative integer), `refundedCents` (non-negative integer), `receivedAt` (UTC timestamp for collected, `null` for pending).

Collected totals = reported collected `amountCents` minus explicit reported `refundedCents`. Refunds cannot exceed the receipt. A pending record cannot have refunds or a received timestamp. Pending totals are separate. This is a reporting contract, not a verified money ledger, accounting system, tax/profit measure or bank-settlement reconciliation. Provide all applicable refunds and exclude test payments before importing. Fees, taxes, disputes and provider settlement verification are outside this milestone.

### Deals

`id`, `name` (1–160), `sourceRef`, `updatedAt`, `stage` (`qualified`, `proposal`, `negotiation`, `won`, `lost`), `valueCents`.

Open pipeline sums qualified, proposal and negotiation deal values without weighting. Won/lost records are excluded from the in-progress list and pipeline. A won deal never creates a collection. Pipeline, pending and collected can refer to the same customer journey and must never be added together as revenue.

### Leads

`id`, `name` (1–160), `company` (0–160; an empty string is allowed), `sourceRef`, `createdAt` (UTC timestamp), `stage` (`new`, `contacted`, `qualified`, `closed`).

Recent leads are sorted by creation time, newest first. Active deals are sorted by update time. Search filters visible lists, not totals. Names/references remain plain text, never executable HTML or clickable URLs; this view cannot contact anyone.

### Validation bounds

- Maximum file: 1,000,000 UTF-8 bytes; file size is checked before reading.
- Maximum 500 records per collection; up to 1,500 records across all three collections.
- Amount limit: 1,000,000,000,000 USD cents per record. The maximum sum remains within JavaScript safe integers; formatting operates in integer space.
- Strict valid UTC ISO dates ending in `Z`, with seconds and optional three-digit milliseconds. No impossible calendar dates, future snapshots, record timestamps newer than their source export, or receipt timestamps newer than the payment's update.
- No unknown or missing keys, blank required text, control characters or outer whitespace. Unicode and literal code-like strings remain data.
- Parsing and replacement are atomic. An invalid file preserves the last good view. A later import or confirmed clear invalidates older asynchronous reads. Re-selecting the same file works.

## Privacy, backups and recovery

The canonical repository is public. Commit **source, tests and empty contracts only**. Never commit customer imports, contact records, private sales data, credentials, `.env` values, payment links with capability tokens, private runtime state or a downloaded export.

Backup coverage must be stated precisely:

1. **GitHub-authored source:** the reviewed branch/commit preserves these source files and documentation. Verify the remote commit SHA before reporting them backed up. Recover a source copy with `git clone https://github.com/transcenlutions25/transcenlutions.git`, then `git switch --detach <verified-commit-sha>`. Work in a fresh clone; never overwrite a dirty private Mac checkout. A single canonical repo does not automatically back up unpublished work elsewhere.
2. **Floot read-back:** once Floot MCP is connected, inspect its guides and project, then compare supported `read_files` output against the authored source manifest. Record exact paths, hashes, project revision and limits. This has **not occurred** for this milestone. A GitHub branch alone is not evidence of a Floot backup.
3. **Assets:** this component introduces no binary assets. Existing Tay artwork remains in its original repo location and untouched. Assets created or stored elsewhere require a separate authorized private archive, hashes and a verified manifest; this component does not archive them.
4. **Runtime and configuration:** there is no backend or runtime data backup in this milestone. Manually imported data remains only in memory until locally exported. Exports are unencrypted files; retain them only in an authorized private, protected destination. Credentials must remain in their approved secure configuration system. Do not promise an automatic or complete backend backup.

Rollback before integration: discard this review branch without changing `main`. Rollback after an authorized integration: revert its own source/integration commit; do not roll back unrelated security or shared-commerce changes. Import a retained private JSON file to recover a local reporting view. No automatic GitHub sync, periodic backup, push hook or scheduled export is installed.

## Floot and free-use boundary

The implementation itself uses existing dependencies and needs no paid service to run locally. There is no deployment, account change or hosting substitution in this milestone.

Floot compatibility remains unverified until its supported tools/project are connected and the exact source can be read back and tested. Official documentation describes React/TypeScript frontend source, free build-action limits and separately metered hosting. Full Get Code ZIP export requires a paid plan; the documented MCP `read_files` route can inspect supported source files. Floot-provided backend services (`@floot/*`) do not travel as a portable implementation in source exports. The owner account's plan, balance, remaining credits and project entitlement have not been verified here. Do not assume recurring free hosting or activate spending.

References supplied and checked by the coordinating task on October 9, 2026:
- https://floot.com/docs/getting-started/how-floot-works
- https://floot.com/docs/projects/self-hosting

## Review and release limits

The PR must remain a draft and include `[skip netlify]` in its **title** before creation. A commit-only skip marker does not reliably suppress PR previews. No production publish, merge, authentication grant, new host, provider charge, real data upload or automatic paid preview is authorized. Existing exact-preview security checks may be pending or fail while preview publication is intentionally suppressed; report that limit instead of bypassing the gate.

Run focused tests, strict TypeScript, lint, identity, workspace, Apex/workflow, desktop and security gates. Review mobile widths, keyboard access, malformed imports, repeated file selection, interrupted reads, clear/cancel, download and unmount/remount. Record actual results separately; a source-only test does not establish a deployed or Floot-integrated dashboard.
