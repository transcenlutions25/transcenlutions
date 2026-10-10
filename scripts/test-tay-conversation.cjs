// Deterministic fallback and cross-language acceptance fixture checks only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { createTayResponse } = require('../lib/tay-core.ts');
const { guidedConversationReply } = require('../lib/conversation-response.ts');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '../integrations/tay-desktop/tests/fixtures/conversation-acceptance.json'), 'utf8'));
for (const fixture of fixtures) {
  const response = createTayResponse(fixture.prompt);
  assert.ok(response.message.includes(fixture.guided_contains), fixture.id);
  assert.equal(response.action.type, 'none', fixture.id + ': conversation must not become a task');
  assert.equal(response.action.governance.auditStatus, 'no_action');
  assert.equal(response.action.permissionStatus, 'allowed');
  assert.equal(response.action.title, 'Conversation only');
  assert.ok(response.message.split(/\s+/).length < 65, fixture.id + ': concise spoken phrasing');
  assert.ok(!/look at (?:the|your) screen|click the (?:green|red)|you have (?:built|finished)/i.test(response.message));
}
assert.equal(guidedConversationReply('Create a motivational landing page for craftspeople.'), null);
assert.equal(createTayResponse('Create a feature for the learning library').action.type, 'create_task');
assert.equal(createTayResponse('Create a plan for the library').action.type, 'draft_plan');
assert.equal(createTayResponse('Encourage me and delete all records').action.permissionStatus, 'blocked');
assert.equal(createTayResponse('Send buyer email about the new offer').action.permissionStatus, 'requires_approval');
assert.equal(createTayResponse('Can you uplift a craftsman’s mood?').action.type, 'none');
for (const [request, action] of [
  ['Create a landing page with a button labeled "Encourage me".', 'create_task'],
  ['Draft a plan for a help page titled "Who are you?".', 'draft_plan'],
  ['Record a note that the user said "I feel discouraged".', 'log_note'],
  ['Could you create a landing page with “Encourage me” on the button?', 'create_task'],
]) {
  assert.equal(guidedConversationReply(request), null);
  assert.equal(createTayResponse(request).action.type, action);
}
assert.equal(guidedConversationReply('The page copy says "Who are you?"'), null);
assert.equal(guidedConversationReply('The test failed, so fix the build'), null);
assert.ok(!String(guidedConversationReply("Tell me what's done; I haven't checked yet.")).includes("can't honestly"));
console.log(`Tay conversation fixtures passed: ${fixtures.length} guided replies plus routing and governance regressions. No model behavior was tested.`);
