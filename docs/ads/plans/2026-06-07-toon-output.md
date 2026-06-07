# TOON Output Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ads:subagent-driven-development (recommended) or ads:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded `JSON.stringify` output in CLI commands with a shared `formatOutput` utility that defaults to TOON, with explicit `--toon` / `--json` / `--csv` flags on every data-returning command.

**Architecture:** A new `packages/cli/src/output.ts` exports `outputFlags` (a Stricli-compatible flag definition object) and `formatOutput(data, flags)`. Every command spreads `outputFlags` into its flags and calls `formatOutput(result, flags)`. The MCP server is a draft — this plan only adds documentation for MCP's intended TOON convention.

**Tech Stack:** `@toon-format/toon` ^2.3.0 (zero-dependency, MIT), Bun, Stricli, TypeScript strict mode with `noUncheckedIndexedAccess`.

---

## File map

| File | Action |
|---|---|
| `packages/cli/package.json` | Add `@toon-format/toon` dependency |
| `packages/cli/src/output.ts` | **New** — `outputFlags`, `OutputFlags`, `formatOutput`, `toCsv` |
| `packages/cli/src/output.test.ts` | **New** — unit tests for `formatOutput` |
| `packages/cli/src/commands/budgets/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/budgets/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/accounts/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/accounts/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/categories/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/categories/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/categories/update-month.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/payees/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/payees/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/transactions/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/transactions/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/transactions/create.ts` | Add output flags, replace `JSON.stringify` incl. dry-run |
| `packages/cli/src/commands/transactions/update.ts` | Add output flags, replace `JSON.stringify` incl. dry-run |
| `packages/cli/src/commands/transactions/delete.ts` | Add output flags, replace `JSON.stringify` incl. dry-run |
| `packages/cli/src/commands/scheduled-transactions/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/scheduled-transactions/get.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/months/list.ts` | Add output flags, replace `JSON.stringify` |
| `packages/cli/src/commands/months/get.ts` | Add output flags, replace `JSON.stringify` |
| `AGENTS.md` | Add MCP TOON convention note |
| `docs/cli-conventions.md` | Update structured output section |

---

## Task 1: Add dependency and create output.ts (TDD)

**Files:**
- Modify: `packages/cli/package.json`
- Create: `packages/cli/src/output.ts`
- Create: `packages/cli/src/output.test.ts`

### Implementation note on flag defaults

The spec shows `default: true` for `--toon`, but all existing boolean flags in this codebase use `default: false`. Setting `default: true` requires Stricli to support `--no-toon` negation (unverified). Use `default: false` for all three flags instead — `formatOutput` handles TOON as the implicit fallback when none are set. Behavior is identical for users.

- [ ] **Step 1: Add the dependency**

In `packages/cli/package.json`, add to `"dependencies"`:
```json
"@toon-format/toon": "^2.3.0"
```

Run from `packages/cli/`:
```bash
cd /path/to/ynab-toolkit && bun install
```
Expected: lockfile updates, no errors.

- [ ] **Step 2: Write the failing tests**

Create `packages/cli/src/output.test.ts`:

```ts
import { describe, it, expect, spyOn } from "bun:test";
import { formatOutput } from "./output.js";
import type { OutputFlags } from "./output.js";

const toon: OutputFlags = { toon: false, json: false, csv: false };
const json: OutputFlags = { toon: false, json: true,  csv: false };
const csv:  OutputFlags = { toon: false, json: false, csv: true  };

describe("formatOutput", () => {
  it("defaults to TOON when no flag is set", () => {
    const result = formatOutput({ id: "abc", name: "test" }, toon);
    expect(result).not.toContain('"id"');
    expect(result).toContain("id: abc");
  });

  it("returns TOON when --toon is explicitly set", () => {
    const result = formatOutput({ id: "abc" }, { toon: true, json: false, csv: false });
    expect(result).toContain("id: abc");
    expect(result).not.toContain('"id"');
  });

  it("returns JSON when --json is set", () => {
    const data = { id: "abc", name: "test" };
    const result = formatOutput(data, json);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("--json takes precedence when both --json and --toon are set", () => {
    const data = { id: "abc" };
    const result = formatOutput(data, { toon: true, json: true, csv: false });
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("returns CSV with header row for array data", () => {
    const data = [
      { id: "abc", name: "foo" },
      { id: "def", name: "bar" },
    ];
    const result = formatOutput(data, csv);
    expect(result).toBe("id,name\nabc,foo\ndef,bar");
  });

  it("serializes nested objects as JSON strings in CSV cells", () => {
    const data = [{ id: "abc", meta: { x: 1 } }];
    const result = formatOutput(data, csv);
    const lines = result.split("\n");
    expect(lines[0]).toBe("id,meta");
    expect(lines[1]).toContain('"{"x":1}"');
  });

  it("quotes CSV values that contain commas", () => {
    const data = [{ id: "abc", name: "foo, bar" }];
    const result = formatOutput(data, csv);
    expect(result).toBe('id,name\nabc,"foo, bar"');
  });

  it("returns empty string for empty array with --csv", () => {
    const result = formatOutput([], csv);
    expect(result).toBe("");
  });

  it("writes error to stderr and exits 2 for --csv on non-array", () => {
    const exitSpy = spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("exit:2");
    });
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    expect(() => formatOutput({ id: "abc" }, csv)).toThrow("exit:2");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("--csv requires a list command")
    );

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /path/to/ynab-toolkit && bun test packages/cli/src/output.test.ts
```
Expected: errors — `output.ts` does not exist yet.

- [ ] **Step 4: Implement output.ts**

Create `packages/cli/src/output.ts`:

```ts
import { encode } from "@toon-format/toon";

export const outputFlags = {
  toon: { kind: "boolean" as const, brief: "Output as TOON (default)", default: false },
  json: { kind: "boolean" as const, brief: "Output as JSON",           default: false },
  csv:  { kind: "boolean" as const, brief: "Output as CSV (list commands only)", default: false },
};

export interface OutputFlags {
  readonly toon: boolean;
  readonly json: boolean;
  readonly csv:  boolean;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      const s = JSON.stringify(val);
      return `"${s.replace(/"/g, '""')}"`;
    }
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ].join("\n");
}

export function formatOutput(data: unknown, flags: OutputFlags): string {
  if (flags.json) return JSON.stringify(data, null, 2);
  if (flags.csv) {
    if (!Array.isArray(data)) {
      console.error(
        "error: --csv requires a list command; this command returns a single object. Use --toon (default) or --json."
      );
      process.exit(2);
    }
    return toCsv(data as Record<string, unknown>[]);
  }
  return encode(data);
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /path/to/ynab-toolkit && bun test packages/cli/src/output.test.ts
```
Expected: all tests pass.

- [ ] **Step 6: Run lint**

```bash
cd /path/to/ynab-toolkit && bun run lint
```
Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/package.json bun.lock packages/cli/src/output.ts packages/cli/src/output.test.ts
git commit -m "feat(cli): add output.ts with TOON/JSON/CSV formatting and unit tests"
```

---

## Task 2: Update budgets commands

**Files:**
- Modify: `packages/cli/src/commands/budgets/list.ts`
- Modify: `packages/cli/src/commands/budgets/get.ts`

- [ ] **Step 1: Update budgets/list.ts**

Replace the entire file content:

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: { ...outputFlags } },
  async func(this: void, flags: OutputFlags) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listBudgets();
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update budgets/get.ts**

Replace the entire file content:

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: {
    flags: { ...outputFlags },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Budget ID (or 'last-used')", parse: String }],
    },
  },
  async func(this: void, flags: OutputFlags, budgetId: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getBudget(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
cd /path/to/ynab-toolkit && bun run lint
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/budgets/
git commit -m "feat(cli): add output flags to budgets commands"
```

---

## Task 3: Update accounts commands

**Files:**
- Modify: `packages/cli/src/commands/accounts/list.ts`
- Modify: `packages/cli/src/commands/accounts/get.ts`

- [ ] **Step 1: Update accounts/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListAccountsFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listAccountsCommand = buildCommand({
  docs: { brief: "List all accounts in a budget" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListAccountsFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listAccounts(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update accounts/get.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetAccountFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getAccountCommand = buildCommand({
  docs: { brief: "Get an account by ID" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Account ID", parse: String }],
    },
  },
  async func(this: void, flags: GetAccountFlags, accountId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getAccount(budgetId, accountId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint and commit**

```bash
cd /path/to/ynab-toolkit && bun run lint
git add packages/cli/src/commands/accounts/
git commit -m "feat(cli): add output flags to accounts commands"
```

---

## Task 4: Update categories commands

**Files:**
- Modify: `packages/cli/src/commands/categories/list.ts`
- Modify: `packages/cli/src/commands/categories/get.ts`
- Modify: `packages/cli/src/commands/categories/update-month.ts`

- [ ] **Step 1: Update categories/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListCategoriesFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listCategoriesCommand = buildCommand({
  docs: { brief: "List all category groups and their categories" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListCategoriesFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listCategories(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update categories/get.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetCategoryFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getCategoryCommand = buildCommand({
  docs: { brief: "Get a category by ID" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Category ID", parse: String }],
    },
  },
  async func(this: void, flags: GetCategoryFlags, categoryId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getCategory(budgetId, categoryId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Update categories/update-month.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface UpdateMonthCategoryFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const updateMonthCategoryCommand = buildCommand({
  docs: { brief: "Update the budgeted amount for a category in a specific month" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [
        { brief: "Month (YYYY-MM-01)", parse: String },
        { brief: "Category ID", parse: String },
        { brief: "Budgeted amount in milliunits", parse: Number },
      ],
    },
  },
  async func(
    this: void,
    flags: UpdateMonthCategoryFlags,
    month: string,
    categoryId: string,
    budgeted: number
  ) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.updateMonthCategory(budgetId, month, categoryId, budgeted);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 4: Run lint and commit**

```bash
cd /path/to/ynab-toolkit && bun run lint
git add packages/cli/src/commands/categories/
git commit -m "feat(cli): add output flags to categories commands"
```

---

## Task 5: Update payees commands

**Files:**
- Modify: `packages/cli/src/commands/payees/list.ts`
- Modify: `packages/cli/src/commands/payees/get.ts`

- [ ] **Step 1: Update payees/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListPayeesFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listPayeesCommand = buildCommand({
  docs: { brief: "List all payees in a budget" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListPayeesFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listPayees(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update payees/get.ts**

Read the current `packages/cli/src/commands/payees/get.ts` first, then apply this pattern (same as `accounts/get.ts` above — replace `GetAccountFlags` with `GetPayeeFlags`, `accountId` with `payeeId`, and `getAccount` with `getPayee`):

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetPayeeFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getPayeeCommand = buildCommand({
  docs: { brief: "Get a payee by ID" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Payee ID", parse: String }],
    },
  },
  async func(this: void, flags: GetPayeeFlags, payeeId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getPayee(budgetId, payeeId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint and commit**

```bash
cd /path/to/ynab-toolkit && bun run lint
git add packages/cli/src/commands/payees/
git commit -m "feat(cli): add output flags to payees commands"
```

---

## Task 6: Update transactions commands

**Files:**
- Modify: `packages/cli/src/commands/transactions/list.ts`
- Modify: `packages/cli/src/commands/transactions/get.ts`
- Modify: `packages/cli/src/commands/transactions/create.ts`
- Modify: `packages/cli/src/commands/transactions/update.ts`
- Modify: `packages/cli/src/commands/transactions/delete.ts`

- [ ] **Step 1: Update transactions/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListTransactionsFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "since-date": string;
  readonly knowledge: number;
}

export const listTransactionsCommand = buildCommand({
  docs: { brief: "List transactions in a budget" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "since-date": {
        kind: "parsed",
        parse: String,
        brief: "Only return transactions on or after this date (YYYY-MM-DD)",
        default: "",
      },
      knowledge: {
        kind: "parsed",
        parse: Number,
        brief: "last_knowledge_of_server for delta requests (0 = full sync)",
        default: "0",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListTransactionsFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listTransactions(budgetId, {
        sinceDate: flags["since-date"] || undefined,
        lastKnowledgeOfServer: flags.knowledge || undefined,
      });
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update transactions/get.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getTransactionCommand = buildCommand({
  docs: { brief: "Get a transaction by ID" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Transaction ID", parse: String }],
    },
  },
  async func(this: void, flags: GetTransactionFlags, transactionId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getTransaction(budgetId, transactionId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Update transactions/create.ts**

Note: the `--dry-run` branch also goes through `formatOutput` so the format flag is respected even for dry runs.

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface CreateTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
  readonly "idempotency-key": string;
}

export const createTransactionCommand = buildCommand({
  docs: { brief: "Create a transaction. Amount is in milliunits (negative = outflow)." },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Print what would be sent without creating the transaction",
        default: false,
      },
      "idempotency-key": {
        kind: "parsed",
        parse: String,
        brief: "Idempotency key (maps to import_id for deduplication)",
        default: "",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [
        { brief: "Account ID", parse: String },
        { brief: "Date (YYYY-MM-DD)", parse: String },
        { brief: "Amount in milliunits (negative for outflow)", parse: Number },
      ],
    },
  },
  async func(
    this: void,
    flags: CreateTransactionFlags,
    accountId: string,
    date: string,
    amount: number
  ) {
    const params = {
      account_id: accountId,
      date,
      amount,
      import_id: flags["idempotency-key"] || null,
    };
    if (flags["dry-run"]) {
      console.log(formatOutput({ dry_run: true, transaction: params }, flags));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.createTransaction(budgetId, params);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 4: Update transactions/update.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface UpdateTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
}

export const updateTransactionCommand = buildCommand({
  docs: { brief: "Update a transaction. Amount is in milliunits (negative = outflow)." },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Print what would be sent without updating",
        default: false,
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [
        { brief: "Transaction ID", parse: String },
        { brief: "Account ID", parse: String },
        { brief: "Date (YYYY-MM-DD)", parse: String },
        { brief: "Amount in milliunits (negative for outflow)", parse: Number },
      ],
    },
  },
  async func(
    this: void,
    flags: UpdateTransactionFlags,
    transactionId: string,
    accountId: string,
    date: string,
    amount: number
  ) {
    const params = { account_id: accountId, date, amount };
    if (flags["dry-run"]) {
      console.log(formatOutput({ dry_run: true, transaction_id: transactionId, transaction: params }, flags));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.updateTransaction(budgetId, transactionId, params);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 5: Update transactions/delete.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface DeleteTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
  readonly yes: boolean;
}

export const deleteTransactionCommand = buildCommand({
  docs: { brief: "Delete a transaction (irreversible — requires --yes)" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Print what would be deleted without deleting",
        default: false,
      },
      yes: {
        kind: "boolean",
        brief: "Confirm deletion (required for non-dry-run)",
        default: false,
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Transaction ID", parse: String }],
    },
  },
  async func(this: void, flags: DeleteTransactionFlags, transactionId: string) {
    if (flags["dry-run"]) {
      console.log(formatOutput({ dry_run: true, transaction_id: transactionId }, flags));
      process.exit(0);
    }
    if (!flags.yes) {
      console.error("Error: --yes is required to confirm deletion.");
      process.exit(2);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.deleteTransaction(budgetId, transactionId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 6: Run lint and commit**

```bash
cd /path/to/ynab-toolkit && bun run lint
git add packages/cli/src/commands/transactions/
git commit -m "feat(cli): add output flags to transactions commands"
```

---

## Task 7: Update scheduled-transactions and months commands

**Files:**
- Modify: `packages/cli/src/commands/scheduled-transactions/list.ts`
- Modify: `packages/cli/src/commands/scheduled-transactions/get.ts`
- Modify: `packages/cli/src/commands/months/list.ts`
- Modify: `packages/cli/src/commands/months/get.ts`

- [ ] **Step 1: Update scheduled-transactions/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListScheduledTransactionsFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listScheduledTransactionsCommand = buildCommand({
  docs: { brief: "List all scheduled transactions in a budget" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListScheduledTransactionsFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listScheduledTransactions(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update scheduled-transactions/get.ts**

Read the current file first (it follows the same `get` pattern as `accounts/get.ts`), then apply the same transformation — add output flags, replace `JSON.stringify`:

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetScheduledTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getScheduledTransactionCommand = buildCommand({
  docs: { brief: "Get a scheduled transaction by ID" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Scheduled Transaction ID", parse: String }],
    },
  },
  async func(this: void, flags: GetScheduledTransactionFlags, scheduledTransactionId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getScheduledTransaction(budgetId, scheduledTransactionId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Update months/list.ts**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListMonthsFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listMonthsCommand = buildCommand({
  docs: { brief: "List all months in a budget" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListMonthsFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listMonths(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 4: Update months/get.ts**

Read the current file first. It follows the same pattern as `budgets/get.ts` (positional budget ID). Apply the same transformation:

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetMonthFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getMonthCommand = buildCommand({
  docs: { brief: "Get a budget month" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Month (YYYY-MM-01)", parse: String }],
    },
  },
  async func(this: void, flags: GetMonthFlags, month: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getMonth(budgetId, month);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 5: Run lint and commit**

```bash
cd /path/to/ynab-toolkit && bun run lint
git add packages/cli/src/commands/scheduled-transactions/ packages/cli/src/commands/months/
git commit -m "feat(cli): add output flags to scheduled-transactions and months commands"
```

---

## Task 8: Update documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/cli-conventions.md`

- [ ] **Step 1: Update AGENTS.md**

In `AGENTS.md`, find the section that describes the MCP package (`packages/mcp/`) and add after its description block:

```markdown
### Output format convention

**CLI:** All data-returning commands support `--toon` (default), `--json`, and `--csv` flags via the shared `outputFlags` / `formatOutput` utility in `packages/cli/src/output.ts`. TOON (`@toon-format/toon`) is the default — token-efficient for LLM consumers.

**MCP (draft):** MCP tools should return TOON-formatted strings by default using `encode(result)` from `@toon-format/toon`, with raw JSON available where the MCP client requests it. This is the target convention; implement it when MCP tools are wired up.
```

- [ ] **Step 2: Update docs/cli-conventions.md**

Replace the **Structured output** bullet in the Policy section with:

```markdown
- **Structured output.** Every data-returning command exposes three explicit flags via the shared `outputFlags` constant in `packages/cli/src/output.ts`:
  - `--toon` (default) — Token-Oriented Object Notation via `@toon-format/toon`. Token-efficient; optimized for LLM consumers.
  - `--json` — Pretty-printed JSON. Use for jq, scripts, and non-LLM tooling.
  - `--csv` — CSV output. Supported only on list commands (those returning arrays). On single-object commands, exits with code 2 and this message: `error: --csv requires a list command; this command returns a single object. Use --toon (default) or --json.`
  
  Flag precedence (first match wins): `--json` → `--csv` → TOON (implicit default).
  
  All commands call `console.log(formatOutput(result, flags))` from `output.ts`; no format logic belongs in individual command files. `--json` output preserves raw milliunit integers.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/cli-conventions.md
git commit -m "docs: document TOON/JSON/CSV output conventions for CLI and MCP"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
cd /path/to/ynab-toolkit && bun test
```
Expected: all tests pass including the new `output.test.ts`.

- [ ] **Step 2: Run lint across all packages**

```bash
cd /path/to/ynab-toolkit && bun run lint
```
Expected: no TypeScript errors.

- [ ] **Step 3: Smoke-test the CLI**

```bash
cd /path/to/ynab-toolkit && bun run dev:cli -- budgets list
```
Expected: TOON-formatted output (not JSON).

```bash
cd /path/to/ynab-toolkit && bun run dev:cli -- budgets list --json
```
Expected: JSON output.

```bash
cd /path/to/ynab-toolkit && bun run dev:cli -- budgets get last-used --csv
```
Expected: stderr message `error: --csv requires a list command...`, exit code 2.

- [ ] **Step 4: Confirm no remaining JSON.stringify in commands**

```bash
grep -r "JSON.stringify" /path/to/ynab-toolkit/packages/cli/src/commands/
```
Expected: no output (all instances replaced).
