export const ROBINHOOD_TRADING_MCP_URL =
  "https://agent.robinhood.com/mcp/trading" as const;

export type RobinhoodMcpToolClass =
  | "read_only"
  | "trade_preview"
  | "external_write"
  | "trade_execution"
  | "unknown";

export type RobinhoodMcpDecision = {
  toolClass: RobinhoodMcpToolClass;
  permission: "allowed_after_connection" | "requires_owner_approval";
  reason: string;
};

// Robinhood can add tools over time. Unknown tools deliberately fail closed.
const TRADE_PREVIEW_TOOLS = new Set([
  "review_equity_order",
  "review_option_order",
  "preview_crypto_order",
  "review_advanced_order",
]);

const TRADE_EXECUTION_TOOLS = new Set([
  "place_equity_order",
  "cancel_equity_order",
  "place_option_order",
  "cancel_option_order",
  "exercise_option",
  "cancel_option_exercise",
  "place_crypto_order",
  "cancel_crypto_order",
  "place_advanced_order",
  "cancel_advanced_order",
]);

const EXTERNAL_WRITE_PREFIXES = [
  "create_",
  "update_",
  "delete_",
  "add_",
  "remove_",
  "follow_",
  "unfollow_",
  "set_",
  "mark_",
] as const;

const READ_ONLY_PREFIXES = [
  "get_",
  "search",
  "run_scan",
] as const;

export const ROBINHOOD_MCP_SAFETY_DEFAULTS = {
  connectionRequiresOwnerAuthentication: true,
  robinhoodTradeApprovalsRequired: true,
  tayTradeExecutionRequiresOwnerApproval: true,
  unknownToolsRequireOwnerApproval: true,
  directCredentialStorageInSource: false,
} as const;

export function classifyRobinhoodMcpTool(
  toolName: string,
): RobinhoodMcpToolClass {
  if (TRADE_EXECUTION_TOOLS.has(toolName)) return "trade_execution";
  if (TRADE_PREVIEW_TOOLS.has(toolName)) return "trade_preview";

  if (EXTERNAL_WRITE_PREFIXES.some((prefix) => toolName.startsWith(prefix))) {
    return "external_write";
  }

  if (READ_ONLY_PREFIXES.some((prefix) => toolName.startsWith(prefix))) {
    return "read_only";
  }

  return "unknown";
}

export function evaluateRobinhoodMcpTool(
  toolName: string,
): RobinhoodMcpDecision {
  const toolClass = classifyRobinhoodMcpTool(toolName);

  if (toolClass === "read_only") {
    return {
      toolClass,
      permission: "allowed_after_connection",
      reason:
        "Read-only Robinhood data may be used after the owner completes Robinhood authentication and MCP account setup.",
    };
  }

  if (toolClass === "trade_preview") {
    return {
      toolClass,
      permission: "allowed_after_connection",
      reason:
        "Order review/preview may run after connection because it does not submit a live order.",
    };
  }

  if (toolClass === "trade_execution") {
    return {
      toolClass,
      permission: "requires_owner_approval",
      reason:
        "Placing, canceling, or exercising an order is consequential and must remain owner-approved in Tay; Robinhood Trade Approvals should also stay enabled.",
    };
  }

  if (toolClass === "external_write") {
    return {
      toolClass,
      permission: "requires_owner_approval",
      reason:
        "This changes Robinhood account state outside Tay and therefore requires explicit owner approval.",
    };
  }

  return {
    toolClass,
    permission: "requires_owner_approval",
    reason:
      "Robinhood may add tools over time. Unrecognized tools fail closed until reviewed and classified.",
  };
}
