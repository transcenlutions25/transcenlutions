import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleUrl = (source) => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const identityUrl = moduleUrl(readFileSync(new URL("lib/character-agent-identity.ts", root), "utf8"));
const identities = await import(identityUrl);
const foundationSource = readFileSync(new URL("lib/agent-foundation.ts", root), "utf8")
  .replace('from "./character-agent-identity"', `from "${identityUrl}"`);
const foundation = await import(moduleUrl(foundationSource));

test("stable identities survive role handoff; Tay remains coordinator", () => {
  const session = foundation.createConversationSession();
  for (const id of ["dawn", "kj", "rory"]) {
    const handoff = foundation.delegate(session, id, "test");
    const identity = foundation.agentRegistry[id].characterIdentity;
    assert.equal(handoff.session.activeAgentId, identity.agentId);
    assert.equal(identity.characterId, id);
    assert.equal(identity.coordinatorId, "tay");
    assert.equal(foundation.switchAgent(handoff.session, "tay").activeAgentId, "tay");
    assert.equal(identities.getCharacterAgentIdentity(id), identity);
  }
});

test("unknown, inherited-property and display-name identities are denied", () => {
  for (const id of ["__proto__", "constructor", "Tay", "", "custom-agent", "tay "]) {
    assert.equal(identities.getCharacterAgentIdentity(id), null);
    assert.equal(identities.characterAgentSystemContext(id), null);
  }
});

test("presentation never increases existing authority", () => {
  assert.equal(foundation.canPerform("dawn", "payment", true), false);
  assert.equal(foundation.canPerform("kj", "execute_local_task", true), false);
  assert.equal(foundation.canPerform("rory", "external_commitment", true), false);
  assert.equal(foundation.canPerform("tay", "payment", false), false);
  assert.equal(foundation.canPerform("tay", "payment", true), true);
});

test("selected role reaches model context without inventing private personality", () => {
  assert.match(identities.characterAgentSystemContext("dawn"), /^You are Dawn,/);
  assert.match(identities.characterAgentSystemContext("kj"), /Forge Master/);
  for (const id of ["tay", "dawn", "kj", "rory"]) {
    const identity = identities.getCharacterAgentIdentity(id);
    assert.equal(identity.personalityStatus, "UNRECOVERED");
    assert.equal(identity.likenessStatus, "PRIVATE_REFERENCE_REQUIRED");
    assert.ok(Object.isFrozen(identity));
    assert.equal("allowedActions" in identity, false);
    assert.equal("voice" in identity, false);
    assert.equal("picture" in identity, false);
  }
});
