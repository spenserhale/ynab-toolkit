# YNAB_BUDGET_ID Environment Variable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ads:subagent-driven-development (recommended) or ads:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `YNAB_BUDGET_ID` env var support so users can set a default budget ID without passing `--budget-id` on every CLI call.

**Architecture:** Add optional `budgetId` to `YnabConfig` (types + Zod schema), read it from `YNAB_BUDGET_ID` in `resolveConfig()`, then update all 16 budget-aware CLI commands to fall back to `config.budgetId` when their `--budget-id` flag is at its `"last-used"` default. The flag still wins when explicitly provided.

**Tech Stack:** Bun, TypeScript, Zod (SDK types/validation), Stricli (CLI)

---

## File Map

| File | Change |
|------|--------|
| `packages/sdk/src/types.ts` | Add `budgetId: z.string().optional()` to `YnabConfigSchema` |
| `packages/sdk/src/config.ts` | Read `YNAB_BUDGET_ID` env var into `budgetId` |
| `packages/sdk/tests/config.test.ts` | Add 3 tests for `budgetId` resolution |
| `packages/cli/src/commands/accounts/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/accounts/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/categories/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/categories/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/categories/update-month.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/months/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/months/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/payees/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/payees/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/scheduled-transactions/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/scheduled-transactions/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/transactions/list.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/transactions/get.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/transactions/create.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/transactions/update.ts` | Use env-backed budget resolution |
| `packages/cli/src/commands/transactions/delete.ts` | Use env-backed budget resolution |
| `.env.example` | Add `YNAB_BUDGET_ID=` entry with comment |

---

## Task 1: Add `budgetId` to `YnabConfig` type

**Files:**
- Modify: `packages/sdk/src/types.ts`

- [ ] **Step 1: Add `budgetId` to `YnabConfigSchema`**

In `packages/sdk/src/types.ts`, update the schema (lines 7–12):

```ts
export const YnabConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().default("https://api.ynab.com/v1"),
  budgetId: z.string().optional(),
});
```

- [ ] **Step 2: Run lint to verify the type change is clean**

```bash
bun run lint
```

Expected: no errors. `YnabConfig` now infers as `{ apiKey: string; baseUrl: string; budgetId?: string }`.

- [ ] **Step 3: Commit**

```bash
git add packages/sdk/src/types.ts
git commit -m "feat(sdk): add optional budgetId to YnabConfig type"
```

---

## Task 2: Read `YNAB_BUDGET_ID` in `resolveConfig()` (TDD)

**Files:**
- Modify: `packages/sdk/tests/config.test.ts`
- Modify: `packages/sdk/src/config.ts`

- [ ] **Step 1: Add failing tests to `config.test.ts`**

Replace the entire contents of `packages/sdk/tests/config.test.ts` with:

```ts
import { describe, expect, it, afterEach } from "bun:test";
import { resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  const savedKey = process.env["YNAB_API_KEY"];
  const savedUrl = process.env["YNAB_BASE_URL"];
  const savedBudgetId = process.env["YNAB_BUDGET_ID"];

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env["YNAB_API_KEY"];
    } else {
      process.env["YNAB_API_KEY"] = savedKey;
    }
    if (savedUrl === undefined) {
      delete process.env["YNAB_BASE_URL"];
    } else {
      process.env["YNAB_BASE_URL"] = savedUrl;
    }
    if (savedBudgetId === undefined) {
      delete process.env["YNAB_BUDGET_ID"];
    } else {
      process.env["YNAB_BUDGET_ID"] = savedBudgetId;
    }
  });

  it("reads YNAB_API_KEY from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig().apiKey).toBe("my-key");
  });

  it("defaults baseUrl to https://api.ynab.com/v1", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig().baseUrl).toBe("https://api.ynab.com/v1");
  });

  it("reads YNAB_BASE_URL override from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BASE_URL"] = "http://localhost:3000";
    expect(resolveConfig().baseUrl).toBe("http://localhost:3000");
  });

  it("allows override via argument", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig({ baseUrl: "http://custom" }).baseUrl).toBe("http://custom");
  });

  it("throws when API key is empty", () => {
    process.env["YNAB_API_KEY"] = "";
    expect(() => resolveConfig()).toThrow();
  });

  it("reads YNAB_BUDGET_ID from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BUDGET_ID"] = "budget-abc";
    expect(resolveConfig().budgetId).toBe("budget-abc");
  });

  it("budgetId is undefined when YNAB_BUDGET_ID is not set", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    delete process.env["YNAB_BUDGET_ID"];
    expect(resolveConfig().budgetId).toBeUndefined();
  });

  it("allows budgetId override via argument", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BUDGET_ID"] = "budget-from-env";
    expect(resolveConfig({ budgetId: "budget-override" }).budgetId).toBe("budget-override");
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd packages/sdk && bun test tests/config.test.ts
```

Expected: the 3 new `budgetId` tests fail (the existing 5 tests still pass).

- [ ] **Step 3: Implement `YNAB_BUDGET_ID` reading in `config.ts`**

Replace the entire contents of `packages/sdk/src/config.ts` with:

```ts
import type { YnabConfig } from "./types.js";

export function resolveConfig(overrides: Partial<YnabConfig> = {}): YnabConfig {
  const apiKey = overrides.apiKey ?? process.env["YNAB_API_KEY"] ?? "";
  if (!apiKey) throw new Error("YNAB_API_KEY is required");
  return {
    apiKey,
    baseUrl:
      overrides.baseUrl ??
      process.env["YNAB_BASE_URL"] ??
      "https://api.ynab.com/v1",
    budgetId: overrides.budgetId ?? process.env["YNAB_BUDGET_ID"],
  };
}
```

- [ ] **Step 4: Run all SDK tests to confirm everything passes**

```bash
cd packages/sdk && bun test
```

Expected: all 8 tests in `config.test.ts` pass; no regressions in other test files.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/config.ts packages/sdk/tests/config.test.ts
git commit -m "feat(sdk): read YNAB_BUDGET_ID env var into resolveConfig"
```

---

## Task 3: Update CLI commands to use env-backed budget default

The pattern applied to every command below is: after `resolveConfigOrExit()` returns, resolve the effective budget ID by checking whether `--budget-id` was explicitly set (i.e., differs from its `"last-used"` default). If it wasn't, fall back to `config.budgetId`, then to `"last-used"`.

```ts
const config = resolveConfigOrExit();
const budgetId = flags["budget-id"] !== "last-used"
  ? flags["budget-id"]
  : (config.budgetId ?? "last-used");
// then pass budgetId instead of flags["budget-id"] to the client method
```

**Files:** All 16 command files listed below.

- [ ] **Step 1: Update `packages/cli/src/commands/accounts/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListAccountsFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Update `packages/cli/src/commands/accounts/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetAccountFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Update `packages/cli/src/commands/categories/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListCategoriesFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 4: Update `packages/cli/src/commands/categories/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetCategoryFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 5: Update `packages/cli/src/commands/categories/update-month.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface UpdateMonthCategoryFlags {
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
      const result = await client.updateMonthCategory(
        budgetId,
        month,
        categoryId,
        budgeted
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 6: Update `packages/cli/src/commands/months/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListMonthsFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 7: Update `packages/cli/src/commands/months/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetMonthFlags {
  readonly "budget-id": string;
}

export const getMonthCommand = buildCommand({
  docs: { brief: "Get a specific budget month" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 8: Update `packages/cli/src/commands/payees/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListPayeesFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 9: Update `packages/cli/src/commands/payees/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetPayeeFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 10: Update `packages/cli/src/commands/scheduled-transactions/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListScheduledTransactionsFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 11: Update `packages/cli/src/commands/scheduled-transactions/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetScheduledTransactionFlags {
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
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Scheduled Transaction ID", parse: String }],
    },
  },
  async func(
    this: void,
    flags: GetScheduledTransactionFlags,
    scheduledTransactionId: string
  ) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getScheduledTransaction(
        budgetId,
        scheduledTransactionId
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 12: Update `packages/cli/src/commands/transactions/list.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListTransactionsFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 13: Update `packages/cli/src/commands/transactions/get.ts`**

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetTransactionFlags {
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 14: Update `packages/cli/src/commands/transactions/create.ts`**

Note: `resolveConfigOrExit()` is called after the dry-run guard; budget resolution goes immediately after it.

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface CreateTransactionFlags {
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
      console.log(JSON.stringify({ dry_run: true, transaction: params }, null, 2));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.createTransaction(budgetId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 15: Update `packages/cli/src/commands/transactions/update.ts`**

Note: `resolveConfigOrExit()` is called after the dry-run guard; budget resolution goes immediately after it.

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface UpdateTransactionFlags {
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
      console.log(JSON.stringify({ dry_run: true, transaction_id: transactionId, transaction: params }, null, 2));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.updateTransaction(budgetId, transactionId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 16: Update `packages/cli/src/commands/transactions/delete.ts`**

Note: `resolveConfigOrExit()` is called after the dry-run and `--yes` guards; budget resolution goes immediately after it.

```ts
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface DeleteTransactionFlags {
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
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Transaction ID", parse: String }],
    },
  },
  async func(this: void, flags: DeleteTransactionFlags, transactionId: string) {
    if (flags["dry-run"]) {
      console.log(JSON.stringify({ dry_run: true, transaction_id: transactionId }, null, 2));
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
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 17: Run lint and full test suite**

```bash
bun run lint && bun test
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 18: Commit**

```bash
git add packages/cli/src/commands/
git commit -m "feat(cli): use YNAB_BUDGET_ID env var as default budget for all commands"
```

---

## Task 4: Document `YNAB_BUDGET_ID` in `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add `YNAB_BUDGET_ID` entry**

Replace the entire contents of `.env.example` with:

```
# Ynab API Configuration
YNAB_API_KEY=your-api-key-here
YNAB_BASE_URL=https://api.ynab.com/v1

# Optional: set a default budget ID so you don't need --budget-id on every call
YNAB_BUDGET_ID=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add YNAB_BUDGET_ID to .env.example"
```
