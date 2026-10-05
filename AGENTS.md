# Transcenlutions build instructions

## Platform scope and authority

The source of truth is `transcenlutions25/transcenlutions`. Read `docs/canon/MASTER_CANON_AND_SYSTEM_MAP.md` and its source records before changing scope. The founder's October 4, 2026 consolidation directive covers the whole Transcenlutions platform. Tay Command is its command center; Apex Flow and Cobalt Current are modules, not replacements for the company.

The Mac Tay Command UI/UX is the visual and interaction canon. Preserve the approved artwork, purple/black/gold materials, conversation-first layout, navigation, bottom composer, writing blocks and contextual side panel. Refine accessibility, clarity and behavior within that design. Do not replace the workspace with a landing page or unrelated dashboard.

## Protected rules

- Preserve existing governance, approval gates, legal notices and revenue safeguards. Obtain owner authorization for consequential external actions; honor authorization already given for the current scope.
- Do not activate live payments, outbound communications, background sending or new account connections without explicit authorization. A software deployment does not authorize those operations.
- Never commit secrets or `.env` files. Do not expose credentials in client code, logs or reports.
- Report actual results. Planned modules, guided responses, local state and sandbox payments must not be presented as connected production services.
- Preserve canonical features with status and provenance. Mark missing authoritative specifications UNRECOVERED; do not invent them.
- Business modules consume shared services. Do not duplicate the agent runtime, queue, approvals, identity or operating graph.
- Keep the preserved Mac sources and artwork intact. Do not overwrite private local runtime data.

## Module instructions

The original Cobalt Current build instructions are preserved verbatim in `docs/canon/COBALT_CURRENT_MODULE_BUILD_INSTRUCTIONS.md`. Apply their module boundaries, no-send Stage 1 rules, do-not-contact exclusions and audit requirements when building Cobalt Current. Their former root-level single-module mission does not narrow the founder-authorized platform consolidation.

## Engineering and release

Use the checked-in dependency lock, Node 24.15.0 or later in the Node 24 line, strict TypeScript and existing conventions. Keep server authorization and credentials on the server. Maintain keyboard access, visible focus, mobile touch targets, empty/error states and reduced-motion support.

Follow branch → automated checks → deployment preview → controlled main merge → production verification. Run the Launch gate checks, including identity, workspace, Apex workflows and preserved desktop runtime tests. Verify changed user journeys in the deployed preview and confirm the deployed commit. Record limitations and a rollback reference. Do not silently move a custom domain or enable live commerce as part of release verification.
