# Spec: TOON Output Format for CLI (and MCP documentation)

**Date:** 2026-06-07
**Status:** Approved

## Problem

Every CLI command currently hardcodes `console.log(JSON.stringify(result, null, 2))`. There is no output format abstraction, no `--toon` / `--json` / `--csv` flags, and no shared pattern. The MCP server is a draft stub with no output format decision documented.

## Goals

- Make TOON the default CLI output format (token-efficient for LLM consumers).
- Expose `--toon` (default), `--json`, and `--csv` as explicit flags on every data-returning command.
- Keep command files thin — no format logic inline.
- Document TOON as the expected MCP output format without implementing it yet.

## Out of scope

- `--deliver` routing (`stdout` / `file:` / `webhook:`)
- MCP tool implementation
- CSV support beyond flat-array outputs

---

## Design

### New dependency

Add to `packages/cli/package.json`:

```json
"@toon-format/toon": "^2.3.0"
```

No SDK-level dependency — formatting is a presentation concern owned by the CLI.

---

### New file: `packages/cli/src/output.ts`

Exports two things:

**`outputFlags`** — a Stricli-compatible flag definition object, spread into every command's `flags`:

```ts
export const outputFlags = {
  toon:  { kind: "boolean", brief: "Output as TOON (default)", default: true },
  json:  { kind: "boolean", brief: "Output as JSON",           default: false },
  csv:   { kind: "boolean", brief: "Output as CSV (list commands only)", default: false },
} as const;

export interface OutputFlags {
  readonly toon: boolean;
  readonly json: boolean;
  readonly csv:  boolean;
}
```

**`formatOutput(data: unknown, flags: OutputFlags): string`**

Selection logic (first match wins):
1. `--json` → `JSON.stringify(data, null, 2)`
2. `--csv` + `data` is an array → CSV string (header row from first object's keys, one row per item; nested values serialized as JSON strings in their cell)
3. `--csv` + `data` is not an array → write structured error to stderr, `process.exit(2)`
4. default (TOON) → `encode(data)` from `@toon-format/toon`

Returns a string; callers do `console.log(formatOutput(result, flags))`.

---

### Command changes (all 20 command files)

Each command gets:

1. Spread `...outputFlags` into the `flags` definition.
2. Interface updated:
   - Commands with no existing flags: interface becomes `OutputFlags`.
   - Commands with existing flags: interface `extends OutputFlags`.
3. `console.log(JSON.stringify(result, null, 2))` replaced with `console.log(formatOutput(result, flags))`.
4. `--dry-run` outputs (already formatted inline as JSON) also go through `formatOutput`.

CSV applicability by command group:

| Group | CSV supported? |
|---|---|
| `budgets list`, `accounts list`, `categories list`, `payees list`, `transactions list`, `scheduled-transactions list`, `months list` | Yes — returns flat array |
| All `get` commands, `create`, `update`, `delete` | No — returns single object; `--csv` exits 2 with enumerated error |

---

### MCP documentation

No code changes. Two doc edits:

**`AGENTS.md`** — add under the MCP section:

> MCP tools should return TOON-formatted strings by default using `encode(result)` from `@toon-format/toon`, with raw JSON available where the MCP client requests it. This is the target convention; implement it when MCP tools are wired up.

**`docs/cli-conventions.md`** — update the structured output section to:
- Name `@toon-format/toon` as the package.
- Document the explicit `--toon` (default) / `--json` / `--csv` flag triplet.
- Add the CSV-on-non-tabular error: `error: --csv requires a list command; this command returns a single object. Use --toon (default) or --json.` → exit 2.
- Reference the shared `outputFlags` / `formatOutput` pattern in `output.ts`.

---

## File change summary

| File | Change |
|---|---|
| `packages/cli/package.json` | Add `@toon-format/toon` dependency |
| `packages/cli/src/output.ts` | **New** — `outputFlags`, `OutputFlags`, `formatOutput` |
| `packages/cli/src/commands/**/*.ts` (×20) | Add output flags, replace `JSON.stringify` with `formatOutput` |
| `AGENTS.md` | Add MCP TOON documentation note |
| `docs/cli-conventions.md` | Update structured output section |

---

## Testing

- Unit tests for `formatOutput` in `packages/cli/` covering: TOON default, JSON flag, CSV on array, CSV on non-array (exit 2).
- Existing SDK tests unaffected (no SDK changes).
- `bun run lint` and `bun test` must pass before done.
