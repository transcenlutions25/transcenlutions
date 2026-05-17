import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(outputText, filename);
};

const { executeSuggestedAction } = require("../lib/action-engine.ts");
const { createTayResponse } = require("../lib/tay-core.ts");

const cases = [
  {
    request: "Build the first Tay feature",
    intent: "build_feature",
    action: "create_task",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Create a plan for Tay governance",
    intent: "write_plan",
    action: "draft_plan",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Log a note about Box 1 completion",
    intent: "record_note",
    action: "log_note",
    permission: "allowed",
    riskTier: "low",
    resultStatus: "completed",
  },
  {
    request: "Delete the database",
    intent: "unsupported_request",
    action: "none",
    permission: "blocked",
    riskTier: "critical",
    resultStatus: "failed",
  },
  {
    request: "Charge the buyer now",
    intent: "unsupported_request",
    action: "none",
    permission: "blocked",
    riskTier: "critical",
    resultStatus: "failed",
  },
  {
    request: "Send checkout details to the buyer",
    intent: "sell_offer",
    action: "prepare_offer",
    permission: "requires_approval",
    riskTier: "high",
    resultStatus: "failed",
  },
  {
    request: "Prepare a $97 Tay Command Starter Map offer",
    intent: "sell_offer",
    action: "prepare_offer",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "completed",
    requiresArtifact: true,
  },
  {
    request: "Buyer replied: yes, send me the details",
    intent: "handle_buyer_reply",
    action: "recommend_follow_up",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "completed",
  },
  {
    request: "Buyer replied: can you guarantee I will make money?",
    intent: "handle_buyer_reply",
    action: "recommend_follow_up",
    permission: "allowed",
    riskTier: "medium",
    resultStatus: "failed",
  },
  {
    request: "Use an external API to automate leads",
    intent: "build_feature",
    action: "create_task",
    permission: "requires_approval",
    riskTier: "high",
    resultStatus: "failed",
  },
];

for (const testCase of cases) {
  const response = createTayResponse(testCase.request);
  const result = executeSuggestedAction(response);

  assertEqual(response.intent, testCase.intent, `${testCase.request} intent`);
  assertEqual(response.action.type, testCase.action, `${testCase.request} action`);
  assertEqual(
    response.action.permissionStatus,
    testCase.permission,
    `${testCase.request} permission`,
  );
  assertEqual(
    response.action.governance.riskTier,
    testCase.riskTier,
    `${testCase.request} risk`,
  );
  assertEqual(result.status, testCase.resultStatus, `${testCase.request} result`);

  if (testCase.requiresArtifact && !result.artifact) {
    throw new Error(`${testCase.request} should return a delivery artifact`);
  }
}

console.log(`Smoke tests passed: ${cases.length} Tay flows verified.`);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}
