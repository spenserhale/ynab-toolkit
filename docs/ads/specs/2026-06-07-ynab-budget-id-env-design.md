# YNAB_BUDGET_ID Environment Variable Support

**Date:** 2026-06-07
**Status:** Approved

## Problem

Every CLI command and MCP tool that operates on a specific budget requires a `budget_id` argument. Users who always work with one budget must repeat this value on every call. There is no way to set a default at the environment level.

## Goal

Allow `YNAB_BUDGET_ID` to be set in the environment (or `.env` file) as a default budget ID. CLI flags can still override it per-call. MCP tools will use it automatically when implemented.

## Approach

Add `budgetId` as an optional field on `YnabConfig`, resolved by `resolveConfig()` from `YNAB_BUDGET_ID`. This follows the existing pattern for `baseUrl` — optional, env-backed, with a sensible fallback. All resolution stays in one place; CLI and MCP consumers get it for free.

## Changes

### `packages/sdk/src/types.ts`

Add `budgetId` to `YnabConfigSchema`:

```ts
export const YnabConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().default("https://api.ynab.com/v1"),
  budgetId: z.string().optional(),
});
```

### `packages/sdk/src/config.ts`

Read `YNAB_BUDGET_ID` in `resolveConfig()`:

```ts
export function resolveConfig(overrides: Partial<YnabConfig> = {}): YnabConfig {
  const apiKey = overrides.apiKey ?? process.env["YNAB_API_KEY"] ?? "";
  if (!apiKey) throw new Error("YNAB_API_KEY is required");
  return {
    apiKey,
    baseUrl: overrides.baseUrl ?? process.env["YNAB_BASE_URL"] ?? "https://api.ynab.com/v1",
    budgetId: overrides.budgetId ?? process.env["YNAB_BUDGET_ID"],
  };
}
```

### `packages/cli/src/commands/**` (budget-aware commands)

Commands that accept `--budget-id`: accounts/list, accounts/get, categories/list, categories/get, categories/update-month, months/list, months/get, payees/list, payees/get, scheduled-transactions/list, scheduled-transactions/get, transactions/list, transactions/get, transactions/create, transactions/update, transactions/delete.

Resolution order in each command's `func`:

```ts
const budgetId = flags["budget-id"] !== "last-used"
  ? flags["budget-id"]
  : (config.budgetId ?? "last-used");
```

Flag explicitly passed → wins. `YNAB_BUDGET_ID` set → used as default. Neither → YNAB's `"last-used"` sentinel.

The `budgets/list` and `budgets/get` commands do not take a budget ID argument and require no changes.

### `.env.example`

Add:

```
# Optional: set a default budget ID so you don't need --budget-id on every call
YNAB_BUDGET_ID=
```

### `packages/mcp`

No changes. The MCP tools are currently a stub. When real tools are implemented, they will read `config.budgetId` from the already-resolved config, the same way the CLI does.

## Resolution Priority

```
--budget-id <value>   (explicit flag)          ← highest
YNAB_BUDGET_ID        (env var / .env)
"last-used"           (YNAB sentinel default)  ← lowest
```

## Out of Scope

- Implementing MCP tools (separate work)
- Validating that the budget ID is a real YNAB UUID at config-load time (too eager; let the API return a 404)
- Multi-budget profiles or named budget aliases
