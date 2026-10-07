# Robinhood Trading MCP — Tay integration

Status: STAGED — Tay-side policy prepared; owner authentication and MCP account setup are still required.

Official endpoint:

`https://agent.robinhood.com/mcp/trading`

Official Robinhood onboarding documentation:

`https://robinhood.com/us/en/support/articles/agentic-trading-overview/`

Official Robinhood trading/safety documentation:

`https://robinhood.com/us/en/support/articles/trading-with-your-agent/`

## Purpose

Connect Tay to Robinhood as a governed brokerage execution provider. Robinhood is not Tay's reasoning layer. Tay remains the orchestrator; Robinhood supplies account, market, portfolio, watchlist and order tools through its Trading MCP.

Robinhood requires a dedicated MCP/Agentic investing account for an external agent. The external agent can read supported Robinhood data but can place trades only in the dedicated MCP account.

## Safety defaults

The initial Transcenlutions policy is deliberately conservative:

1. Owner authentication is mandatory. No Robinhood credentials, account numbers, OAuth tokens or session material belong in Git, logs, prompts or screenshots.
2. Robinhood Trade Approvals must remain ON during initial use.
3. Read-only account/portfolio/market tools and order previews may run after the owner has completed the connection.
4. Placing, canceling or exercising orders always requires explicit owner approval in Tay as an additional control.
5. Other external Robinhood writes such as watchlist, scan, alert or chart-setting changes require owner approval.
6. Unknown/new Robinhood MCP tools fail closed and require owner approval until classified.
7. Tay must never claim the connection is live until a real authenticated MCP session is verified.

The machine-readable policy lives at `lib/robinhood-mcp-policy.ts`.

## Owner authentication handoff

The remaining connection step cannot be performed by repository code because Robinhood must authenticate the account owner interactively.

Use one supported MCP client and add the endpoint above. Robinhood currently documents ChatGPT, Codex, Claude Code/Desktop, Cursor, Grok, Replit and other MCP-capable platforms.

For Codex CLI, Robinhood documents:

`codex mcp add robinhood-trading --url https://agent.robinhood.com/mcp/trading`

Then open the MCP connection and complete Robinhood authentication. Robinhood will prompt for the dedicated MCP account setup when required.

After authentication, open the Robinhood MCP account's Agent Settings and turn on Trade Approvals before enabling any live order workflow.

## Verification gate

Do not mark this integration CONNECTED until all of the following are verified:

- MCP initialization succeeds through the selected client.
- Robinhood authentication completes without exposing credentials to Tay source or logs.
- The dedicated Robinhood MCP account is visible.
- `get_trade_approval_setting` reports/reflects Trade Approvals enabled, or the owner verifies the setting in Robinhood if the tool response is unavailable.
- A read-only call such as portfolio/account retrieval succeeds.
- An order review/preview succeeds without placing a trade.
- A real order placement is not used as a connectivity test.
- Tay's audit trail records the connector, tool class and approval decision without storing sensitive account data beyond what is necessary for the user's requested workflow.

## Current blocker

`OWNER ACTION REQUIRED`: complete Robinhood's interactive authentication and MCP account setup in a supported MCP client, then enable Robinhood Trade Approvals.

Until that occurs, the correct status is `STAGED — NOT CONNECTED`.
