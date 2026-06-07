# Ynab Toolkit

SDK, CLI, and MCP server for YNAB (You Need a Budget)

A monorepo containing the SDK, CLI, and MCP server for the Ynab API.

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
