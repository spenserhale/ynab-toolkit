# @ynab-toolkit/mcp

MCP server for YNAB, built with [FastMCP](https://github.com/punkpeye/fastmcp). All tools are read-only. Amounts are milliunits (`1000` = 1.00).

## Tools

| Tool | Description |
|------|-------------|
| `ynab_config_status` | Whether `YNAB_API_KEY` is configured, which source supplied it, and the keychain status. Never returns values. |
| `ynab_list_budgets` | List budgets and the default budget |
| `ynab_list_accounts` | List accounts in a budget |
| `ynab_list_categories` | List category groups and categories |
| `ynab_list_payees` | List payees |
| `ynab_list_transactions` | List transactions, optionally since a date |
| `ynab_get_month` | Get one budget month with category amounts |

Every tool takes `format: "toon" | "json"` (default `toon`). Budget tools take an optional `budget_id`, which defaults to `YNAB_BUDGET_ID` and then YNAB's `last-used` budget.

There is deliberately no tool that writes or deletes secrets.

## Setup with Claude Desktop

Store the key once in the OS keychain:

```bash
ynab auth set ynab      # or: bun run cli auth set ynab
```

Then add the server with no `env` block (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ynab": {
      "command": "bun",
      "args": ["run", "/abs/path/ynab-toolkit/packages/mcp/src/index.ts"]
    }
  }
}
```

The server reads the keychain on every tool call, so `ynab auth set` takes effect without restarting the host. On macOS, the first read from a GUI host can show a "wants to use your confidential information" dialog; choose **Always Allow**.

An `env` block with `YNAB_API_KEY` still works and takes precedence over the keychain. Set `YNAB_KEYCHAIN=0` there to skip the keychain entirely.

## Development

```bash
bun run dev       # run in stdio mode
bun run inspect   # FastMCP inspector
bun test          # spawns the server with YNAB_KEYCHAIN=0
```
