# Transcenlutions build instructions

## Platform scope and authority

The source of truth is `transcenlutions25/transcenlutions`. Read `docs/canon/MASTER_CANON_AND_SYSTEM_MAP.md` and its source records before changing scope. The founder's October 4, 2026 consolidation directive covers the whole Transcenlutions platform. Tay Command is its command center; Apex Flow and Cobalt Current are modules, not replacements for the company.

The Mac Tay Command UI/UX is the visual and interaction canon. Preserve the approved artwork, purple/black/gold materials, conversation-first layout, navigation, bottom composer, writing blocks and contextual side panel. Refine accessibility, clarity and behavior within that design. Do not replace the workspace with a landing page or unrelated dashboard.

Read [Founder product and authority rules](docs/canon/FOUNDER_PRODUCT_AND_AUTHORITY_RULES_2026-10-05.md) before changing output rendering, product delivery, account permissions or agent creation. Writing blocks are for editable/copyable prose deliverables, not ordinary chat. Products created or purchased here must be usable in Tay and authorized agent chats by default, with explicit compatibility exceptions. The founding owner alone can make system-wide changes; account ownership or an admin label never grants that authority. The left-panel Administration flow must support owner-controlled human-admin invitations and admin-agent creation (instructions, picture, voice and explicit scoped permissions). These are binding build requirements; production authentication and those management flows remain incomplete until verified.

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

## Security gate

Read `security/README.md` before adding endpoints, provider integrations or authority flows. Run `npm run security` plus Launch gate checks. New endpoints must remain covered by the edge rules and bounded server-side validation. Never promote untrusted references into system instructions, accept client approval as server authorization, add public secret environment variables, or silently broaden/renew security exceptions. Preserve signed webhook bytes and production fail-closed identity. Keep security workflow changes in the same reviewed PR as the code they protect.
