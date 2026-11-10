---
name: ynab-cli
description: How to drive the ynab-toolkit CLI (the `ynab` command) to read and write YNAB (You Need A Budget) data — budgets, accounts, categories, payees, transactions, scheduled transactions, and months. Use this skill whenever the user wants to list/get/create/update/delete YNAB data from the terminal or a script, mentions the `ynab` CLI, `bun run cli`/`dev:cli`, YNAB budgets/transactions/categories, milliunit amounts, a `last-used` budget, or wants an agent to pull or push financial data through this repo's CLI — even if they don't name the CLI explicitly.
---

# YNAB CLI

This repo ships an agent-native CLI (`ynab`) that is a thin wrapper over `@ynab-toolkit/sdk`. Every command takes flags/positional args, calls the SDK, and prints the raw JSON API result to stdout. There are no interactive prompts — it is built to be driven by scripts and agents.

Use this skill to invoke the CLI correctly the first time: right run command, right flags, right handling of milliunit amounts, budget IDs, and exit codes.

## Prerequisites

- **Auth:** the CLI needs `YNAB_API_KEY` (a YNAB Personal Access Token). It looks in process env, then the nearest `.env`, then the OS keychain (service `ynab-toolkit`). Check with `bun run cli auth list` (never prints values). To store a token non-interactively, pipe it: `printf '%s' "$TOKEN" | bun run cli auth set ynab --stdin`; never pass it as an argument. Without a key the CLI exits `3` with `Config error: YNAB_API_KEY is required` and a hint. Get a token at YNAB → Account Settings → Developer Settings → New Token.
- **Runtime:** Bun. Run `bun install` once at the repo root.

## Running the CLI

Prefer the `cli` script — it runs the entry point directly, so stdout is **clean JSON** with no wrapper noise:

```bash
bun run cli <command> [args]            # clean output — use this for JSON you'll parse
bun run cli budgets list | jq '.budgets[].id'
bun run cli accounts list > accounts.json
```

Avoid `bun run dev:cli <command>` when you need to parse output: it goes through Bun's `--filter` runner, which on a TTY draws a tree (`│ … [N lines elided] …`) and otherwise prefixes every line with `@ynab-toolkit/cli dev:`. The data isn't truncated, but the framing corrupts JSON. `dev:cli` is fine for eyeballing `--help`. When passing leading-dash flags through `dev:cli`, separate them with `--` (e.g. `bun run dev:cli -- --help`); `bun run cli --help` needs no separator.

After `bun run build`, the compiled `ynab` binary works the same way (`ynab budgets list`).

## Command surface

All commands print JSON on success. `--budget-id` defaults to `last-used` (YNAB's alias for the most recently used budget), so single-budget users rarely set it. IDs come from the corresponding `list` command.

| Command | Args | Notes |
|---|---|---|
| `auth set ynab` | `--stdin`, `--key`, `--dry-run` | Store the token in the OS keychain. Hidden prompt on a TTY; agents must use `--stdin`. Exits 2 with no TTY and no `--stdin`. |
| `auth list` | `--text`, `--csv` | Keychain state and active source per key; no values. |
| `auth delete ynab` | `--yes`, `--dry-run` | Removes the keychain entry. Requires `--yes`. |
| `auth migrate` | `--dry-run`, `--overwrite` | Copies `.env` keys into the keychain; lists `clean_up` files; never edits files. |
| `config show` | — | Resolved config, sources, keychain status; secrets redacted. |
| `budgets list` | — | Returns `{ budgets, default_budget? }`. Not a delta endpoint. |
| `budgets get <budget-id>` | positional id (or `last-used`) | |
| `accounts list` | `--budget-id`, `--open`, `--on-budget`, `--type <t,...>`, `--unlinked`, `--link-error`, `--include-deleted`, `--knowledge <n>` | Each row has `link_status` (`linked`, `error`, `unlinked`). Deleted accounts hidden by default. |
| `accounts get <account-id>` | `--budget-id` | Includes `link_status`, `last_reconciled_at`, loan fields. |
| `accounts create <name>` | `--type`, `--balance <milliunits>`, `--dry-run`, `--allow-positive-liability` | Returns the existing open account (`created: false`) instead of duplicating. Types: checking, savings, cash, creditCard, otherAsset, otherLiability. Liability balances are negative. |
| `categories list` | `--budget-id` | Returns category groups, each with nested categories. |
| `categories get <category-id>` | `--budget-id` | |
| `categories update-month <month> <category-id> <budgeted>` | `--budget-id` | `month` = `YYYY-MM-01`; `budgeted` in **milliunits**. Mutation. |
| `payees list` | `--budget-id` | |
| `payees get <payee-id>` | `--budget-id` | |
| `transactions list` | `--budget-id`, `--since-date YYYY-MM-DD`, `--knowledge <n>` | `--knowledge` is `last_knowledge_of_server` for delta sync (`0` = full). |
| `transactions get <transaction-id>` | `--budget-id` | |
| `transactions create <account-id> <date> <amount>` | `--budget-id`, `--payee-name`, `--payee-id`, `--memo`, `--category-id`, `--cleared`, `--approved`, `--flag-color`, `--dry-run`, `--idempotency-key` | `date`=`YYYY-MM-DD`; `amount` in **milliunits** (negative = outflow). |
| `transactions import --file <path>` | `--account-id`, `--amounts milliunits\|currency`, `--dry-run` | Bulk create from JSON or CSV. Generates `YNAB:<milliunits>:<date>:<n>` import IDs so re-runs never duplicate. Reports `created` and `duplicates`. |
| `transactions import-linked` | `--budget-id`, `--dry-run` | Asks YNAB to pull linked bank accounts now. Deprecated endpoint: an empty result is normal. Never imports unlinked accounts. |
| `transactions update <transaction-id> <account-id> <date> <amount>` | `--budget-id`, `--dry-run` | |
| `transactions delete <transaction-id>` | `--budget-id`, `--dry-run`, `--yes` | Irreversible — requires `--yes` to actually delete. |
| `scheduled-transactions list` | `--budget-id` | |
| `scheduled-transactions get <scheduled-transaction-id>` | `--budget-id` | |
| `months list` | `--budget-id` | |
| `months get <month>` | `--budget-id` | `month` = `YYYY-MM-01`. |

Run `bun run cli <command> --help` for the authoritative flag list of any command.

## Money is in milliunits — never pass dollars

YNAB represents every amount as an integer where **1000 = one currency unit**. `$1.00` → `1000`, `$12.34` → `12340`, and outflows are negative: `-$45.67` → `-45670`. The CLI passes these integers straight through to the API; it does **not** accept dollar decimals. Convert at the edge before calling, and divide by 1000 when displaying results to a human.

## Mutations are deliberate

Write commands follow the toolkit's safety conventions:

- **`--dry-run`** (on `accounts create` and `transactions create`/`import`/`update`/`delete`) prints exactly what would be sent and exits `0` without touching the API. Use it to validate inputs first.
- **`transactions delete` requires `--yes`** in addition to running without `--dry-run` — there's no way to delete by accident.
- **`--idempotency-key`** on `transactions create` maps to YNAB's `import_id`, which YNAB dedupes on. Pass a stable key when retrying so you don't create duplicates.

## Not possible through the API

Renaming, closing or deleting accounts; creating loan or line-of-credit accounts; and creating or repairing bank connections all have to be done in the YNAB app. Don't look for a command for them.

## Exit codes

Scripts should branch on these (defined in `packages/cli/src/handle-error.ts`):

| Code | Meaning |
|---|---|
| `0` | Success (also dry-run) |
| `1` | Network / generic API error |
| `2` | Validation error (bad input or unexpected API response) |
| `3` | Config error (missing `YNAB_API_KEY`) |
| `4` | Not found |
| `5` | Auth error (bad/expired token) |
| `6` | Rate limit exceeded — YNAB allows 200 req/hour per token; wait 5–10 min |

## Common workflows

**Find a budget, then list its accounts:**
```bash
bun run cli budgets list | jq -r '.budgets[].id'
bun run cli accounts list --budget-id <budget-id>
```

**Add a $25.00 outflow, validating first:**
```bash
bun run cli transactions create <account-id> 2026-06-05 -25000 --dry-run   # check the payload
bun run cli transactions create <account-id> 2026-06-05 -25000 --idempotency-key rent-2026-06
```

**Import a statement for an account YNAB can't connect to:**
```bash
bun run cli transactions import --account-id <id> --file oct.csv --amounts currency --dry-run
bun run cli transactions import --account-id <id> --file oct.csv --amounts currency
```

**Set a category's June 2026 budget to $300.00:**
```bash
bun run cli categories update-month 2026-06-01 <category-id> 300000
```

**Incremental transaction sync:** capture `server_knowledge` from a response, then pass it back via `--knowledge` to fetch only what changed.

## Where things live

- CLI source: `packages/cli/src/` (`app.ts` = route map, `commands/` = one file per command).
- API logic and types: `packages/sdk/src/` — change behavior there, not in the CLI.
- API reference and quirks: `docs/ynab-api.md`. CLI design conventions: `docs/cli-conventions.md`.
