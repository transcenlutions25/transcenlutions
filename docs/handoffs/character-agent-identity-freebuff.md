# Character-agent identity handoff for Freebuff

Status: additive implementation candidate; no merge, activation or deployment.
Base: PR #81 head `45a19116d0d0ff189dee98697c88b67191cda56e`.
Branch: `codex/character-agent-identity-handoff`.

## What this connects

- `lib/character-agent-identity.ts` defines stable presentation links for the four
  existing public canonical agent IDs: Tay, Dawn, KJ and Rory.
- Tay is the coordinator. Existing specialist roles come from the published
  `lib/agent-foundation.ts`; no new family roles or biographical facts are inferred.
- The Agent Foundation and consolidated workspace roster expose the same identity.
- The conversation model context follows the selected canonical role instead of
  telling every selected specialist that it is Tay.
- Custom agents do not inherit a canonical identity by matching a display name.
  Unknown IDs receive no canonical character context.
- Identity metadata contains no tools, grants or permissions. Existing authority
  decisions and consequential-action approval requirements remain unchanged.

## What is deliberately unrecovered

The full approved character personalities, private reference images, voice IDs,
likeness permissions, private family names and additional characters are not
published by this change. Personality is explicitly `UNRECOVERED`; likeness
requires a protected reference. This is a working identity linkage, not a claim
that the entire family character bible has been recovered or integrated.

The repository was public when this candidate was prepared. Import additional
character records only after verifying a private destination, authoritative
owner-approved canon, and server-side account/resource authorization. Do not put
private likenesses, family biography or secrets in public source or generated
client bundles. Character instructions cannot grant action authority.

## Verification

`node --test scripts/test-character-agent-identity.mjs`

Four focused tests cover stable role handoffs and return to Tay, denial of unknown
and prototype-property IDs, unchanged payment/local-task authority, and explicit
absence of private personality/likeness data. They passed on Node 24.19.0 in an
in-memory read-only run using the exact prepared module and foundation sources.
The test is included in the Launch gate; full CI must be checked on the final
published commit before release. This does not establish live model behavior.

This candidate does not resolve PR #81's durable hosted database, cross-device
history, voice, Android Tay integration or dependency-audit release blockers.
Existing child-safety status is unchanged; a character binding is not child
access approval or a verified child-safety system.

## Pickup

Review this dependent branch against `fix/tay-handoff-auth-storage`.
Do not overwrite that branch or merge an older copy over newer work. Use the same
GitHub source from Freebuff and preserve its current code before integration.
If PR #81 changes, reconcile this candidate against its new head and rerun the
Launch/security checks. Main was not edited.

Rollback: revert this candidate's changes to the base commit above; user data,
schema and permission grants are not migrated or changed by this candidate.
