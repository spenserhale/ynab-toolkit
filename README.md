# Ynab Toolkit

SDK, CLI, and MCP server for YNAB (You Need a Budget)

A monorepo containing the SDK, CLI, and MCP server for the Ynab API.

## Install the CLI

```sh
curl -fsSL https://raw.githubusercontent.com/spenserhale/ynab-toolkit/main/scripts/install.sh | sh
```

The checksum-verified installer places `ynab` in `$HOME/.local/bin`.

## Packages

| Package | Description |
|---------|-------------|
| [`@ynab-toolkit/sdk`](./packages/sdk) | Core SDK with types, API client, and business logic |
| [`@ynab-toolkit/cli`](./packages/cli) | Command-line interface (Stricli) |
| [`@ynab-toolkit/mcp`](./packages/mcp) | MCP server for AI assistants (FastMCP) |

## Getting Started

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run the CLI
bun run dev:cli -- --help

# Run the MCP server (stdio mode for Claude Desktop)
bun run dev:mcp
```

## Credentials

The toolkit needs `YNAB_API_KEY`, a YNAB Personal Access Token. Store it in the OS keychain once, and the CLI and MCP server both find it with no `.env` file and no MCP `env` block:

```bash
ynab auth set ynab                                  # hidden prompt
pbpaste | ynab auth set ynab --stdin                # non-interactive
op read 'op://Private/YNAB/token' | ynab auth set ynab --stdin
ynab auth list                                      # keychain state and active source, never values
ynab auth migrate --dry-run                         # copy a key out of .env into the keychain
```

Lookup order: process env, then the nearest `.env`, then the OS keychain (`Bun.secrets`: macOS Keychain, libsecret, Windows Credential Manager). Explicit per-project values win, so `op run` and CI work as before. See [the configuration guide](./docs/guides/configuration.md) for setup, caveats and `YNAB_KEYCHAIN=0`.

## Using the CLI

All amounts are milliunits: `1000` is $1.00 and `-12340` is a $12.34 outflow.

### Accounts

```bash
ynab accounts list                         # link_status column: linked, error, unlinked
ynab accounts list --open --unlinked       # open accounts with no bank connection
ynab accounts list --link-error            # bank connections that need repair
ynab accounts list --type creditCard,otherLiability --on-budget
ynab accounts list --knowledge 1234        # only accounts changed since server_knowledge 1234

ynab accounts create "HSA" --type otherAsset --balance 250000
ynab accounts create "Store card" --type creditCard --balance -150000 --dry-run
```

- `link_status` comes from the API's `direct_import_linked` and `direct_import_in_error` fields. `--json` output also includes `last_reconciled_at` and the loan fields (`debt_interest_rates`, `debt_minimum_payments`, `debt_escrow_amounts`).
- Deleted accounts are hidden unless you pass `--include-deleted`. The API only returns them in delta (`--knowledge`) responses.
- `accounts create` does not create duplicates. If an open account with the same name (case-insensitive) exists, the command returns it with `created: false` and exits 0. Checking this costs one extra request.
- Credit card and other liability balances are money owed, so they must be zero or negative. Pass `--allow-positive-liability` for an overpaid card.

### Transactions

```bash
ynab transactions create <account-id> 2026-10-15 -42500 \
  --payee-name "Grocer" --memo "weekly" --category-id <id> --cleared cleared --approved

ynab transactions import --account-id <id> --file statement.csv --amounts currency --dry-run
ynab transactions import --account-id <id> --file statement.json
ynab transactions import-linked            # ask YNAB to pull linked accounts now (deprecated endpoint)
```

`transactions import` reads a JSON array of rows (or `{ "transactions": [...] }`) or a CSV with a header row. Each row needs `date` and `amount`. It can also have `payee_name` (or `payee`), `payee_id`, `memo`, `category_id`, `cleared`, `approved`, `flag_color`, `import_id` and `account_id`. Amounts are milliunits by default. Use `--amounts currency` for files that use dollar amounts like `-12.34`.

- Rows without an `import_id` get one in YNAB's own format, `YNAB:<milliunits>:<date>:<occurrence>`. YNAB's bank and file imports use the same format, so running the same file again creates nothing new, and a bank connection added later will not duplicate these rows. The output reports `created` and `duplicates`.
- The occurrence number counts rows on the same account with the same amount and date, in file order. Import whole statement periods. If you import part of a day and later import the full day, the occurrence numbers can shift.
- Rows default to `cleared` and stay unapproved unless a row sets `approved`.
- The whole file goes in one API request. `--dry-run` sends nothing. It estimates duplicates with one GET per account, and the estimate can miss deleted transactions.

### Known YNAB API limits

These are not available in the API (checked against the YNAB OpenAPI spec v1.90.0), so they have to be done in the YNAB web or mobile app:

- **Accounts cannot be renamed, closed, reopened or deleted.** The API only lets you list, get and create accounts.
- **Only some account types can be created:** checking, savings, cash, creditCard, otherAsset and otherLiability. Mortgages, auto/student/personal/medical loans, other debt and lines of credit have to be created in the app. After that, the API can read them.
- **Bank connections cannot be created, repaired or removed.** The API only reports whether an account is linked and whether the link is in error.
- **Triggering a bank import is deprecated.** YNAB marks `POST /plans/{id}/transactions/import` deprecated and documents an always-empty response, since linked accounts import automatically. The toolkit still wraps it as `ynab transactions import-linked`, a fallback for linked accounts that have not synced. It never imports accounts without a bank connection. Use `transactions import --file` for those.
- **Rate limit:** 200 requests per hour per token. Use `--knowledge` on list commands so repeated runs only fetch what changed.

## Using the MCP server

The MCP server exposes read-only tools (`ynab_config_status`, `ynab_list_budgets`, `ynab_list_accounts`, `ynab_list_categories`, `ynab_list_payees`, `ynab_list_transactions`, `ynab_get_month`). It reads the key from the keychain on every call, so a rotated key applies without restarting the host. With the key in the keychain, the host config needs no `env` block:

```json
{
  "mcpServers": {
    "ynab": { "command": "bun", "args": ["run", "/abs/path/ynab-toolkit/packages/mcp/src/index.ts"] }
  }
}
```

The server has no tool that writes or deletes secrets. Use `ynab auth` in a terminal for that.

## Using the SDK

```ts
import { loadConfig, YnabClient } from "@ynab-toolkit/sdk";

const config = await loadConfig();          // env > .env > OS keychain; throws YnabConfigError if no key
const client = new YnabClient(config);
```

`resolveConfig()` stays synchronous and skips the keychain. `loadConfig({ secretStore })` accepts any `SecretStore` (pass `null` to skip the keychain); `bunSecretStore()` is the OS keychain. The keychain lookup needs the Bun runtime; under Node it reports `unavailable` and env keys still work.

## Architecture

```
packages/sdk/     <-- Types, API client, business logic (foundation)
    ^       ^
    |       |
packages/cli/   packages/mcp/
    (Stricli)    (FastMCP)
```

Both the CLI and MCP server are thin wrappers over the SDK. If the REST API
changes, you update the SDK and both consumers get the fix automatically.

## Development

```bash
# Run tests across all packages
bun test

# Build a specific package
cd packages/sdk && bun run build
```

## Adding a New API Operation

1. Add types to `packages/sdk/src/types.ts`
2. Add the client method to `packages/sdk/src/client.ts`
3. Add a CLI command in `packages/cli/src/commands/`
4. Add an MCP tool in `packages/mcp/src/tools/`

## Agent Skills

This repo bundles a `ynab-cli` agent skill at [`.agents/skills/ynab-cli`](./.agents/skills/ynab-cli/SKILL.md). It teaches AI coding agents (Claude Code, Cursor, etc.) how to drive the `ynab` CLI correctly — the command surface, milliunit amounts, budget IDs, dry-run/idempotency safety flags, and exit codes.

Add it to another project with the [`skills`](https://www.npmjs.com/package/skills) CLI:

```bash
npx skills add github.com/spenserhale/ynab-toolkit/.agents/skills/ynab-cli
```

Agents working in this repo pick it up automatically via the `.agents/skills/` directory — no install step needed.
