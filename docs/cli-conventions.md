# CLI Conventions (Agent-Native Design)

## Purpose

Use this guide when adding or changing CLI commands in `packages/cli/`. The CLI is built with [Stricli](https://stricli.js.org) and is meant to be **agent-native**: predictable for both humans and AI callers. The full design system is documented in the shared `agent-native-cli-creator` skill (installed at `../invoca-toolkit/.agents/skills/`) and summarized in the parent `Toolkits/CLAUDE.md`; this doc captures the parts that matter for YNAB and the gap between the target and the current scaffold.

## Policy

- **Non-interactive by default.** No prompts in normal operation. Require `--yes`/`--force` to confirm destructive operations.
- **Structured output.** Every data-returning command exposes three explicit flags via the shared `outputFlags` constant in `packages/cli/src/output.ts`:
  - `--toon` (default) — Token-Oriented Object Notation via `@toon-format/toon`. Token-efficient; optimized for LLM consumers.
  - `--json` — Pretty-printed JSON. Use for jq, scripts, and non-LLM tooling.
  - `--csv` — CSV output. Supported only on list commands. List commands return a wrapper object (e.g. `{ transactions: [...], server_knowledge: 123 }`); `formatOutput` auto-extracts the first top-level array property for CSV. On single-object get/mutation commands with no array property, exits with code 2: `error: --csv requires a list command; this command returns a single object. Use --toon (default) or --json.`

  Flag precedence (first match wins): `--json` → `--csv` → TOON (implicit default).

  All commands call `console.log(formatOutput(result, flags))` from `output.ts`; no format logic belongs in individual command files. `--json` output preserves raw milliunit integers.
- **Enumerated, consistent exit codes** (shared across the Toolkits family):
  - `0` success (and `--dry-run`)
  - `1` network error
  - `2` validation error
  - `3` config error (e.g. missing `YNAB_API_KEY`)
  - `4` not-found
  - `5` auth error (invalid token → maps to `YnabAuthError`)
  - `6` rate-limit (HTTP `429` → see the rate-limit note in `docs/ynab-api.md`)
  The scaffold currently calls `process.exit(1)` on every error — replace with code mapping driven by the SDK's typed errors.
- **`--dry-run` on every mutation** — validate inputs and resolve the request without performing side effects; exit `0`.
- **`--idempotency-key` on retryable mutations.** For transaction creation this maps naturally onto YNAB's `import_id` (see `docs/ynab-api.md`), which the API dedupes on.
- **Introspection.** Each command supports `--help` (human). The CLI should expose `agent-context --json` (machine-readable full schema of commands/flags) so agents can discover the surface without scraping help text.

## Implementation notes

- Commands live one-per-file under `packages/cli/src/commands/` and are registered in `src/app.ts` via `buildRouteMap`. Keep the route map organized by YNAB entity (e.g. `transactions`, `accounts`, `categories`, `budgets`) once the placeholder `resources` group is replaced.
- Commands stay thin: resolve config, construct `YnabClient`, call one SDK method, format output. **No API logic in the CLI** — if you're reaching for `fetch` or building a URL in a command, it belongs in the SDK.
- Catch SDK typed errors (`YnabError`, `YnabAuthError`, `YnabNotFoundError`, and a future `YnabRateLimitError`) and translate them to the exit codes above — don't let raw errors set a blanket exit `1`.
- Display-format milliunits → currency only at the human-output edge (see `docs/ynab-api.md`). `--json` output should preserve raw milliunit integers so downstream tools get exact values.

## Related docs

- `docs/ynab-api.md` — the SDK surface these commands wrap; milliunits, exit-code-relevant error types, `import_id` ↔ `--idempotency-key`.
- `../AGENTS.md` — repo router and done criteria.
- `../../invoca-toolkit/.agents/skills/agent-native-cli-creator/` — the full shared design system.
