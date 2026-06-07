# AGENTS.md

## Purpose

`ynab-toolkit` is an AI-first integration for the [YNAB (You Need A Budget) API](https://api.ynab.com/) — a typed SDK, an agent-native CLI, and an MCP server, sharing one codebase so types and API logic stay consistent across every way a user (or agent) reaches YNAB. This file is the always-on router for coding agents working in this repo: it tells you the commands, the layout, and which deeper docs to read before you touch a given area.

This repo is one toolkit within the larger `Toolkits/` collection. The shared monorepo architecture is documented one level up in `Toolkits/CLAUDE.md`; this file covers the YNAB-specific parts and the essentials needed to work here standalone.

## Quick start

This is a Bun monorepo. Run these from the repo root:

```bash
bun install                 # install workspace deps
bun run build               # build all packages (sdk, cli, mcp)
bun test                    # run all package tests
bun run lint                # tsc --noEmit across all packages

bun run dev:cli -- --help   # run the CLI from source
bun run dev:mcp             # run the MCP server (stdio mode)

# Target one package
bun run --filter '@ynab-toolkit/sdk' build
bun run --filter '@ynab-toolkit/mcp' inspect   # FastMCP inspector
```

Config: copy `.env.example` → `.env` and set `YNAB_API_KEY` (a YNAB Personal Access Token). See `docs/ynab-api.md` for how to get one.

## Repo layout

```
packages/sdk/        Foundation: Zod types, HTTP client, config resolver, typed errors
  src/types.ts         Zod schemas + inferred types (the public type surface)
  src/client.ts        YnabClient — wraps fetch, throws typed errors
  src/config.ts        resolveConfig() — env vars -> validated config
  src/errors.ts        YnabError / YnabAuthError / YnabNotFoundError
  src/index.ts         Public exports (cross-package imports come from HERE only)
packages/cli/        Stricli CLI — thin consumer of the SDK
  src/app.ts           Route map
  src/commands/        One file per command
packages/mcp/        FastMCP stdio server — thin consumer of the SDK
  src/index.ts         Server bootstrap
  src/tools/           Tool group registrations
refs/                Read-only reference repos (official YNAB SDK, CLI, MCP, starter kit)
docs/                Policy docs (see Progressive disclosure below)
```

**The SDK is the single source of truth.** CLI and MCP must not contain API logic. When you add an operation: write it once in the SDK, export it from `src/index.ts`, then wire it into both consumers. All cross-package types come from `@ynab-toolkit/sdk`'s public `index.ts` — never import internal SDK paths.

> Note: the current scaffold ships placeholder `Resource` CRUD, not the real YNAB
> domain. Replacing it with real entities (budgets, accounts, categories, payees,
> transactions, months) is expected work — read `docs/ynab-api.md` first.

### Output format convention

**CLI:** All data-returning commands support `--toon` (default), `--json`, and `--csv` flags via the shared `outputFlags` / `formatOutput` utility in `packages/cli/src/output.ts`. TOON (`@toon-format/toon`) is the default — token-efficient for LLM consumers.

**MCP (draft):** MCP tools should return TOON-formatted strings by default using `encode(result)` from `@toon-format/toon`, with raw JSON available where the MCP client requests it. This is the target convention; implement it when MCP tools are wired up.

## Progressive disclosure

Before editing, check whether your task touches one of these areas and read the referenced doc first:

- **Anything calling the YNAB API** (client methods, schemas, auth, amounts, syncing): read `docs/ynab-api.md` — milliunits, Personal Access Token auth, the `/v1` base URL, rate limits, delta requests, and the entity model. The placeholder scaffold gets several of these wrong; this doc is the corrective.
- **Adding or changing CLI commands**: read `docs/cli-conventions.md` — the agent-native design system (structured output, enumerated exit codes, `--dry-run`, introspection) and the gap between it and the current scaffold.

## Done criteria

Before finishing any task:

- Run `bun run lint` and `bun test` and fix failures before declaring done.
- When you add an SDK operation, confirm it's wired into **both** the CLI and the MCP server (or note explicitly why not).
- YNAB amounts are **milliunits** — verify any new amount handling against `docs/ynab-api.md`. This is the most common source of silent bugs.
- If a check was skipped, say why. Flag risky assumptions explicitly.
- Update `docs/` when behavior, the entity model, or operational conventions change.
