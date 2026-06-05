# CLI Commands Design

**Date:** 2026-06-05
**Scope:** `packages/cli` — implement all 7 YNAB entity command groups and link the binary via `bun link`
**Goal:** `ynab <entity> <verb> [flags] [args]` works from any terminal after a one-time `bun link`

## Overview

Replace the four stub commands with real implementations for all entities the SDK supports. All output is JSON (`JSON.stringify(result, null, 2)` to stdout). No human-readable formatting in this phase. Error handling maps typed SDK errors to enumerated exit codes.

## Installation

`bun link` from `packages/cli/` registers the package globally. The `bin` field in `packages/cli/package.json` maps `ynab` → `src/bin.ts`. Bun runs the source directly — no build step, changes are live immediately.

One-time setup:
1. Ensure `YNAB_API_KEY` is set in `.env` (see `.env.example`)
2. `cd packages/cli && bun link`
3. `ynab --help` to verify

## Command surface

`--budget-id` defaults to `"last-used"` on every command that requires a budget. All `amount` values are **milliunits** (integers) — no conversion at the CLI layer.

### Budgets

```
ynab budgets list [--budget-id <id>]
ynab budgets get <budget-id>
```

`get` takes `budget-id` as a required positional argument (you are explicitly naming the budget to fetch). `list` uses `--budget-id` as an optional flag defaulting to `"last-used"` to pass `last_knowledge_of_server` filtering if needed in the future.

### Accounts

```
ynab accounts list [--budget-id <id>]
ynab accounts get [--budget-id <id>] <account-id>
```

### Categories

```
ynab categories list [--budget-id <id>]
ynab categories get [--budget-id <id>] <category-id>
ynab categories update-month [--budget-id <id>] <month> <category-id> <budgeted>
```

`<month>` is an ISO date string (`YYYY-MM-01`). `<budgeted>` is milliunits.

### Payees

```
ynab payees list [--budget-id <id>]
ynab payees get [--budget-id <id>] <payee-id>
```

### Transactions

```
ynab transactions list [--budget-id <id>] [--since-date <YYYY-MM-DD>] [--knowledge <n>]
ynab transactions get [--budget-id <id>] <transaction-id>
ynab transactions create [--budget-id <id>] [--dry-run] [--idempotency-key <key>]
                         <account-id> <date> <amount>
ynab transactions update [--budget-id <id>] [--dry-run]
                         <transaction-id> <account-id> <date> <amount>
ynab transactions delete [--budget-id <id>] [--dry-run] <transaction-id>
```

`--idempotency-key` maps to `import_id` in `SaveTransactionParams`. `--dry-run` validates inputs and prints what would be sent, exits 0 without calling the SDK.

### Scheduled Transactions

```
ynab scheduled-transactions list [--budget-id <id>]
ynab scheduled-transactions get [--budget-id <id>] <scheduled-transaction-id>
```

### Months

```
ynab months list [--budget-id <id>]
ynab months get [--budget-id <id>] <month>
```

## Command pattern

Every command follows the same body:

```typescript
async func(this: void, flags: Flags, ...positional) {
  try {
    const config = resolveConfig();
    const client = new YnabClient(config);
    // --dry-run: print params, exit 0
    const result = await client.<sdkMethod>(...);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    handleError(err);
  }
}
```

A shared `handleError` helper in `packages/cli/src/handle-error.ts` translates typed SDK errors to exit codes:

| Error | Exit code |
|-------|-----------|
| Config missing (`resolveConfig` throws) | 3 |
| `YnabAuthError` | 5 |
| `YnabNotFoundError` | 4 |
| `YnabRateLimitError` | 6 |
| `YnabError` (generic) | 1 |
| Unknown | 1 |

`handleError` logs the error message to stderr before exiting.

## File structure

```text
packages/cli/src/
  app.ts                          # rebuilt — 7 entity route maps
  bin.ts                          # unchanged
  handle-error.ts                 # new shared error→exit-code helper
  commands/
    budgets/
      list.ts
      get.ts
    accounts/
      list.ts
      get.ts
    categories/
      list.ts
      get.ts
      update-month.ts
    payees/
      list.ts
      get.ts
    transactions/
      list.ts
      get.ts
      create.ts
      update.ts
      delete.ts
    scheduled-transactions/
      list.ts
      get.ts
    months/
      list.ts
      get.ts
```

The four existing stub files (`list.ts`, `get.ts`, `create.ts`, `delete.ts`) at the top level of `commands/` are deleted.

## Subagent task decomposition

| Task | Deliverables | Depends on |
|------|-------------|------------|
| Infrastructure | `handle-error.ts`, rebuilt `app.ts`, `bun link` run, stub files deleted | — |
| Budgets | `commands/budgets/list.ts`, `commands/budgets/get.ts` | Infrastructure |
| Accounts | `commands/accounts/list.ts`, `commands/accounts/get.ts` | Infrastructure |
| Categories | `commands/categories/{list,get,update-month}.ts` | Infrastructure |
| Payees | `commands/payees/list.ts`, `commands/payees/get.ts` | Infrastructure |
| Transactions | `commands/transactions/{list,get,create,update,delete}.ts` | Infrastructure |
| Scheduled Transactions | `commands/scheduled-transactions/{list,get}.ts` | Infrastructure |
| Months | `commands/months/{list,get}.ts` | Infrastructure |

Infrastructure runs first; all 7 entity tasks run in parallel.

## Done criteria

- `bun run lint` exits 0 across all packages
- `ynab --help` lists all 7 entity groups
- `ynab transactions get --help` shows the correct flags
- `YNAB_API_KEY` unset → `ynab budgets list` exits 3
- `ynab transactions create --dry-run last-used 2026-01-01 -10000 account-id` exits 0 without hitting the API

## References

- `docs/cli-conventions.md` — exit codes, `--dry-run`, `--idempotency-key` policy
- `docs/ynab-api.md` — milliunit policy, `last-used` budget ID
- `packages/sdk/src/index.ts` — all SDK method signatures
