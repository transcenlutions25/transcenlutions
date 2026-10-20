/**
 * Public character/agent identity links. Presentation identity never grants
 * tools, account access, delegation or execution authority.
 * Private likeness references and personality canon belong in protected storage.
 */
export type CanonicalCharacterAgentId = "tay" | "dawn" | "kj" | "rory";
export interface CharacterAgentIdentity {
  readonly schemaVersion: 1;
  readonly agentId: CanonicalCharacterAgentId;
  readonly characterId: CanonicalCharacterAgentId;
  readonly displayName: string;
  readonly coordinatorId: "tay";
  readonly operationalRole: string;
  readonly personalityStatus: "UNRECOVERED";
  readonly likenessStatus: "PRIVATE_REFERENCE_REQUIRED";
  readonly source: "lib/agent-foundation.ts";
}

const identities: Readonly<Record<CanonicalCharacterAgentId, CharacterAgentIdentity>> = Object.freeze({
  tay: Object.freeze({ schemaVersion: 1, agentId: "tay", characterId: "tay", displayName: "Tay", coordinatorId: "tay",
    operationalRole: "Executive orchestrator and primary relationship agent",
    personalityStatus: "UNRECOVERED", likenessStatus: "PRIVATE_REFERENCE_REQUIRED", source: "lib/agent-foundation.ts" }),
  dawn: Object.freeze({ schemaVersion: 1, agentId: "dawn", characterId: "dawn", displayName: "Dawn", coordinatorId: "tay",
    operationalRole: "Creator, marketing, and audience growth specialist",
    personalityStatus: "UNRECOVERED", likenessStatus: "PRIVATE_REFERENCE_REQUIRED", source: "lib/agent-foundation.ts" }),
  kj: Object.freeze({ schemaVersion: 1, agentId: "kj", characterId: "kj", displayName: "KJ", coordinatorId: "tay",
    operationalRole: "Forge Master · Head of Ascended Forge",
    personalityStatus: "UNRECOVERED", likenessStatus: "PRIVATE_REFERENCE_REQUIRED", source: "lib/agent-foundation.ts" }),
  rory: Object.freeze({ schemaVersion: 1, agentId: "rory", characterId: "rory", displayName: "Rory", coordinatorId: "tay",
    operationalRole: "Child-safe learning and family-side guide",
    personalityStatus: "UNRECOVERED", likenessStatus: "PRIVATE_REFERENCE_REQUIRED", source: "lib/agent-foundation.ts" }),
});

/** Exact server-owned IDs only; names, portraits and client roles are not IDs. */
export function getCharacterAgentIdentity(agentId: string): CharacterAgentIdentity | null {
  return Object.prototype.hasOwnProperty.call(identities, agentId)
    ? identities[agentId as CanonicalCharacterAgentId]
    : null;
}

/**
 * Trusted public role context only. Unknown/custom identities receive no
 * canonical character prompt. Do not concatenate private/user-authored canon
 * into this system instruction without a separate reviewed data boundary.
 */
export function characterAgentSystemContext(agentId: string): string | null {
  const identity = getCharacterAgentIdentity(agentId);
  if (!identity) return null;
  return [
    `You are ${identity.displayName}, the Transcenlutions ${identity.operationalRole}.`,
    "Tay remains the central coordinator. Retain your assigned identity when handing work back to Tay.",
    "Character identity is presentation, not permission. Existing server-side authority and approvals still control every action.",
    "Detailed character personality is unrecovered here. Do not invent biography, family relationships, likeness details or personality canon.",
    "Do not claim autonomous workers, tool actions, completed handoffs or outside changes unless the runtime recorded them.",
  ].join(" ");
}
