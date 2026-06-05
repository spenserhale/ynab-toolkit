# CLI Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ads:subagent-driven-development (recommended) or ads:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 7 YNAB entity command groups in the CLI and link the binary so `ynab <entity> <verb>` works from any terminal.

**Architecture:** Infrastructure task creates `handle-error.ts`, stubs every command file, rebuilds `app.ts`, and runs `bun link`. Entity tasks replace the stubs with real implementations — each entity owns its own subdirectory and has no dependencies on other entity tasks. All commands are thin wrappers over the SDK; output is always `JSON.stringify(result, null, 2)` to stdout.

**Tech Stack:** Bun, Stricli (`@stricli/core`), `@ynab-toolkit/sdk`, TypeScript strict mode

**Key facts for all commands:**
- Stricli flag names are **exact** CLI flag names — use quoted kebab-case keys (`"budget-id"`) to get `--budget-id`; access in function body via `flags["budget-id"]`
- `--budget-id` defaults to `"last-used"` on every command that takes one
- All monetary `amount` values are **milliunits** (integers). Never convert in the CLI.
- Lint (`bun run lint` from repo root) is the test gate — CLI commands have no unit tests

---

## Task 1: Infrastructure

**Files:**
- Create: `packages/cli/src/handle-error.ts`
- Create: `packages/cli/src/commands/budgets/list.ts` (stub)
- Create: `packages/cli/src/commands/budgets/get.ts` (stub)
- Create: `packages/cli/src/commands/accounts/list.ts` (stub)
- Create: `packages/cli/src/commands/accounts/get.ts` (stub)
- Create: `packages/cli/src/commands/categories/list.ts` (stub)
- Create: `packages/cli/src/commands/categories/get.ts` (stub)
- Create: `packages/cli/src/commands/categories/update-month.ts` (stub)
- Create: `packages/cli/src/commands/payees/list.ts` (stub)
- Create: `packages/cli/src/commands/payees/get.ts` (stub)
- Create: `packages/cli/src/commands/transactions/list.ts` (stub)
- Create: `packages/cli/src/commands/transactions/get.ts` (stub)
- Create: `packages/cli/src/commands/transactions/create.ts` (stub)
- Create: `packages/cli/src/commands/transactions/update.ts` (stub)
- Create: `packages/cli/src/commands/transactions/delete.ts` (stub)
- Create: `packages/cli/src/commands/scheduled-transactions/list.ts` (stub)
- Create: `packages/cli/src/commands/scheduled-transactions/get.ts` (stub)
- Create: `packages/cli/src/commands/months/list.ts` (stub)
- Create: `packages/cli/src/commands/months/get.ts` (stub)
- Modify: `packages/cli/src/app.ts` (full rebuild)
- Delete: `packages/cli/src/commands/list.ts`
- Delete: `packages/cli/src/commands/get.ts`
- Delete: `packages/cli/src/commands/create.ts`
- Delete: `packages/cli/src/commands/delete.ts`

---

- [ ] **Step 1: Create `packages/cli/src/handle-error.ts`**

```typescript
import {
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
  YnabError,
  resolveConfig,
} from "@ynab-toolkit/sdk";
import type { YnabConfig } from "@ynab-toolkit/sdk";

export function resolveConfigOrExit(): YnabConfig {
  try {
    return resolveConfig();
  } catch {
    console.error("Config error: YNAB_API_KEY is required. Set it in your .env file.");
    process.exit(3);
  }
}

export function handleError(err: unknown): never {
  if (err instanceof YnabAuthError) {
    console.error(`Auth error: ${err.message}`);
    process.exit(5);
  }
  if (err instanceof YnabNotFoundError) {
    console.error(`Not found: ${err.message}`);
    process.exit(4);
  }
  if (err instanceof YnabRateLimitError) {
    console.error(`Rate limit exceeded: ${err.message}`);
    process.exit(6);
  }
  if (err instanceof YnabError) {
    console.error(`API error: ${err.message}`);
    process.exit(1);
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
```

- [ ] **Step 2: Create the 18 stub command files**

Create each of these with the corresponding stub content. The exported name must match exactly — entity tasks will overwrite the file content but the name is what `app.ts` imports.

`packages/cli/src/commands/budgets/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/budgets/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/accounts/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listAccountsCommand = buildCommand({
  docs: { brief: "List all accounts" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/accounts/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getAccountCommand = buildCommand({
  docs: { brief: "Get an account by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/categories/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listCategoriesCommand = buildCommand({
  docs: { brief: "List all category groups" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/categories/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getCategoryCommand = buildCommand({
  docs: { brief: "Get a category by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/categories/update-month.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const updateMonthCategoryCommand = buildCommand({
  docs: { brief: "Update the budgeted amount for a category in a given month" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/payees/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listPayeesCommand = buildCommand({
  docs: { brief: "List all payees" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/payees/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getPayeeCommand = buildCommand({
  docs: { brief: "Get a payee by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/transactions/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listTransactionsCommand = buildCommand({
  docs: { brief: "List transactions" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/transactions/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getTransactionCommand = buildCommand({
  docs: { brief: "Get a transaction by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/transactions/create.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const createTransactionCommand = buildCommand({
  docs: { brief: "Create a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/transactions/update.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const updateTransactionCommand = buildCommand({
  docs: { brief: "Update a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/transactions/delete.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const deleteTransactionCommand = buildCommand({
  docs: { brief: "Delete a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/scheduled-transactions/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listScheduledTransactionsCommand = buildCommand({
  docs: { brief: "List scheduled transactions" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/scheduled-transactions/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getScheduledTransactionCommand = buildCommand({
  docs: { brief: "Get a scheduled transaction by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/months/list.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const listMonthsCommand = buildCommand({
  docs: { brief: "List budget months" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

`packages/cli/src/commands/months/get.ts`:
```typescript
import { buildCommand } from "@stricli/core";
export const getMonthCommand = buildCommand({
  docs: { brief: "Get a specific budget month" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
```

- [ ] **Step 3: Replace `packages/cli/src/app.ts` entirely**

```typescript
import { buildApplication, buildRouteMap } from "@stricli/core";

import { listBudgetsCommand } from "./commands/budgets/list.js";
import { getBudgetCommand } from "./commands/budgets/get.js";

import { listAccountsCommand } from "./commands/accounts/list.js";
import { getAccountCommand } from "./commands/accounts/get.js";

import { listCategoriesCommand } from "./commands/categories/list.js";
import { getCategoryCommand } from "./commands/categories/get.js";
import { updateMonthCategoryCommand } from "./commands/categories/update-month.js";

import { listPayeesCommand } from "./commands/payees/list.js";
import { getPayeeCommand } from "./commands/payees/get.js";

import { listTransactionsCommand } from "./commands/transactions/list.js";
import { getTransactionCommand } from "./commands/transactions/get.js";
import { createTransactionCommand } from "./commands/transactions/create.js";
import { updateTransactionCommand } from "./commands/transactions/update.js";
import { deleteTransactionCommand } from "./commands/transactions/delete.js";

import { listScheduledTransactionsCommand } from "./commands/scheduled-transactions/list.js";
import { getScheduledTransactionCommand } from "./commands/scheduled-transactions/get.js";

import { listMonthsCommand } from "./commands/months/list.js";
import { getMonthCommand } from "./commands/months/get.js";

const routes = buildRouteMap({
  routes: {
    budgets: buildRouteMap({
      routes: { list: listBudgetsCommand, get: getBudgetCommand },
      docs: { brief: "List and get budgets" },
    }),
    accounts: buildRouteMap({
      routes: { list: listAccountsCommand, get: getAccountCommand },
      docs: { brief: "List and get accounts" },
    }),
    categories: buildRouteMap({
      routes: {
        list: listCategoriesCommand,
        get: getCategoryCommand,
        "update-month": updateMonthCategoryCommand,
      },
      docs: { brief: "List and get categories; update monthly budgeted amounts" },
    }),
    payees: buildRouteMap({
      routes: { list: listPayeesCommand, get: getPayeeCommand },
      docs: { brief: "List and get payees" },
    }),
    transactions: buildRouteMap({
      routes: {
        list: listTransactionsCommand,
        get: getTransactionCommand,
        create: createTransactionCommand,
        update: updateTransactionCommand,
        delete: deleteTransactionCommand,
      },
      docs: { brief: "List, get, create, update, and delete transactions" },
    }),
    "scheduled-transactions": buildRouteMap({
      routes: {
        list: listScheduledTransactionsCommand,
        get: getScheduledTransactionCommand,
      },
      docs: { brief: "List and get scheduled transactions" },
    }),
    months: buildRouteMap({
      routes: { list: listMonthsCommand, get: getMonthCommand },
      docs: { brief: "List and get budget months" },
    }),
  },
  docs: { brief: "YNAB CLI — agent-native commands for You Need A Budget" },
});

export const app = buildApplication(routes, {
  name: "ynab",
  versionInfo: { currentVersion: "0.1.0" },
});
```

- [ ] **Step 4: Delete the four old top-level stub files**

```bash
rm packages/cli/src/commands/list.ts \
   packages/cli/src/commands/get.ts \
   packages/cli/src/commands/create.ts \
   packages/cli/src/commands/delete.ts
```

- [ ] **Step 5: Run lint — verify it passes**

```bash
bun run lint
```
Expected: all packages exit 0. If TypeScript errors appear, fix them before continuing.

- [ ] **Step 6: Verify the CLI routes with `--help`**

```bash
bun run dev:cli -- --help
```
Expected: output lists `budgets`, `accounts`, `categories`, `payees`, `transactions`, `scheduled-transactions`, `months` as subcommands.

- [ ] **Step 7: Run `bun link`**

```bash
cd packages/cli && bun link
```
Expected: output similar to `Linked @ynab-toolkit/cli`. The `ynab` binary is now available at `~/.bun/bin/ynab`.

If `ynab --help` doesn't work after this, add `~/.bun/bin` to your PATH in `~/.zshrc`:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```
Then reload: `source ~/.zshrc`

- [ ] **Step 8: Verify global binary works**

```bash
ynab --help
```
Expected: same help output as Step 6.

- [ ] **Step 9: Commit**

Run from repo root:
```bash
git add packages/cli/src/handle-error.ts \
        packages/cli/src/app.ts \
        packages/cli/src/commands/
git commit -m "feat: scaffold CLI entity commands and link binary via bun link"
```

---

## Task 2: Budgets

**Files:**
- Modify: `packages/cli/src/commands/budgets/list.ts` (replace stub)
- Modify: `packages/cli/src/commands/budgets/get.ts` (replace stub)

- [ ] **Step 1: Replace `packages/cli/src/commands/budgets/list.ts`**

```typescript
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: {} },
  async func(this: void) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listBudgets();
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/budgets/get.ts`**

```typescript
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: {
    flags: {},
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Budget ID (or 'last-used')", parse: String }],
    },
  },
  async func(this: void, _flags: Record<string, never>, budgetId: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getBudget(budgetId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 4: Verify commands route correctly**

```bash
bun run dev:cli -- budgets list --help
bun run dev:cli -- budgets get --help
```
Expected: each prints the command's brief description and flags/args.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/budgets/
git commit -m "feat: implement budgets list and get CLI commands"
```

---

## Task 3: Accounts

**Files:**
- Modify: `packages/cli/src/commands/accounts/list.ts`
- Modify: `packages/cli/src/commands/accounts/get.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/accounts/list.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.listAccounts(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/accounts/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getAccount(flags["budget-id"], accountId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 4: Verify routing**

```bash
bun run dev:cli -- accounts list --help
bun run dev:cli -- accounts get --help
```
Expected: each prints description and flags/args.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/accounts/
git commit -m "feat: implement accounts list and get CLI commands"
```

---

## Task 4: Categories

**Files:**
- Modify: `packages/cli/src/commands/categories/list.ts`
- Modify: `packages/cli/src/commands/categories/get.ts`
- Modify: `packages/cli/src/commands/categories/update-month.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/categories/list.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.listCategories(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/categories/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getCategory(flags["budget-id"], categoryId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Replace `packages/cli/src/commands/categories/update-month.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.updateMonthCategory(
        flags["budget-id"],
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

- [ ] **Step 4: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 5: Verify routing**

```bash
bun run dev:cli -- categories list --help
bun run dev:cli -- categories get --help
bun run dev:cli -- categories update-month --help
```
Expected: each prints description and flags/args.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/categories/
git commit -m "feat: implement categories list, get, and update-month CLI commands"
```

---

## Task 5: Payees

**Files:**
- Modify: `packages/cli/src/commands/payees/list.ts`
- Modify: `packages/cli/src/commands/payees/get.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/payees/list.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.listPayees(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/payees/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getPayee(flags["budget-id"], payeeId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 4: Verify routing**

```bash
bun run dev:cli -- payees list --help
bun run dev:cli -- payees get --help
```
Expected: each prints description and flags/args.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/payees/
git commit -m "feat: implement payees list and get CLI commands"
```

---

## Task 6: Transactions

**Files:**
- Modify: `packages/cli/src/commands/transactions/list.ts`
- Modify: `packages/cli/src/commands/transactions/get.ts`
- Modify: `packages/cli/src/commands/transactions/create.ts`
- Modify: `packages/cli/src/commands/transactions/update.ts`
- Modify: `packages/cli/src/commands/transactions/delete.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/transactions/list.ts`**

```typescript
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
        default: 0,
      },
    },
  },
  async func(this: void, flags: ListTransactionsFlags) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listTransactions(flags["budget-id"], {
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

- [ ] **Step 2: Replace `packages/cli/src/commands/transactions/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getTransaction(flags["budget-id"], transactionId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Replace `packages/cli/src/commands/transactions/create.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.createTransaction(flags["budget-id"], params);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 4: Replace `packages/cli/src/commands/transactions/update.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.updateTransaction(flags["budget-id"], transactionId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 5: Replace `packages/cli/src/commands/transactions/delete.ts`**

```typescript
import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface DeleteTransactionFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
}

export const deleteTransactionCommand = buildCommand({
  docs: { brief: "Delete a transaction" },
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
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Transaction ID", parse: String }],
    },
  },
  async func(
    this: void,
    flags: DeleteTransactionFlags,
    transactionId: string
  ) {
    if (flags["dry-run"]) {
      console.log(JSON.stringify({ dry_run: true, transaction_id: transactionId }, null, 2));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.deleteTransaction(flags["budget-id"], transactionId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 6: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 7: Verify routing**

```bash
bun run dev:cli -- transactions list --help
bun run dev:cli -- transactions get --help
bun run dev:cli -- transactions create --help
bun run dev:cli -- transactions update --help
bun run dev:cli -- transactions delete --help
```
Expected: each prints description and correct flags/positionals.

- [ ] **Step 8: Verify `--dry-run` exits 0 without an API key**

```bash
YNAB_API_KEY="" bun run dev:cli -- transactions create --dry-run acct-123 2026-01-01 -10000
```
Expected: exits 0, prints JSON like `{ "dry_run": true, "transaction": { "account_id": "acct-123", "date": "2026-01-01", "amount": -10000, "import_id": null } }`

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/commands/transactions/
git commit -m "feat: implement transactions list, get, create, update, delete CLI commands"
```

---

## Task 7: Scheduled Transactions

**Files:**
- Modify: `packages/cli/src/commands/scheduled-transactions/list.ts`
- Modify: `packages/cli/src/commands/scheduled-transactions/get.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/scheduled-transactions/list.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.listScheduledTransactions(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/scheduled-transactions/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getScheduledTransaction(
        flags["budget-id"],
        scheduledTransactionId
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 4: Verify routing**

```bash
bun run dev:cli -- scheduled-transactions list --help
bun run dev:cli -- scheduled-transactions get --help
```
Expected: each prints description and flags/args.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/scheduled-transactions/
git commit -m "feat: implement scheduled-transactions list and get CLI commands"
```

---

## Task 8: Months

**Files:**
- Modify: `packages/cli/src/commands/months/list.ts`
- Modify: `packages/cli/src/commands/months/get.ts`

- [ ] **Step 1: Replace `packages/cli/src/commands/months/list.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.listMonths(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 2: Replace `packages/cli/src/commands/months/get.ts`**

```typescript
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
    try {
      const client = new YnabClient(config);
      const result = await client.getMonth(flags["budget-id"], month);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```
Expected: exits 0.

- [ ] **Step 4: Verify routing**

```bash
bun run dev:cli -- months list --help
bun run dev:cli -- months get --help
```
Expected: each prints description and flags/args.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/months/
git commit -m "feat: implement months list and get CLI commands"
```

---

## Task 9: Final Verification

**Goal:** Confirm all commands route correctly, error handling works, and `bun test` still passes.

- [ ] **Step 1: Run full lint**

```bash
bun run lint
```
Expected: exits 0 for all packages.

- [ ] **Step 2: Run SDK tests to confirm nothing regressed**

```bash
bun test
```
Expected: 86 pass, 0 fail.

- [ ] **Step 3: Verify all entity `--help` routes work**

```bash
bun run dev:cli -- --help
bun run dev:cli -- budgets --help
bun run dev:cli -- accounts --help
bun run dev:cli -- categories --help
bun run dev:cli -- payees --help
bun run dev:cli -- transactions --help
bun run dev:cli -- scheduled-transactions --help
bun run dev:cli -- months --help
```
Expected: all 7 entity groups and their subcommands appear.

- [ ] **Step 4: Verify exit code 3 on missing API key**

```bash
YNAB_API_KEY="" bun run dev:cli -- budgets list; echo "exit: $?"
```
Expected: stderr shows config error message, exit code is 3.

- [ ] **Step 5: Verify `--dry-run` exits 0 without API call**

```bash
YNAB_API_KEY="" bun run dev:cli -- transactions create --dry-run acct-123 2026-01-01 -10000; echo "exit: $?"
```
Expected: JSON printed to stdout, exit code 0.

- [ ] **Step 6: Verify `ynab` global binary is live**

```bash
ynab --help
ynab transactions create --help
```
Expected: same output as `bun run dev:cli -- --help`. If `ynab` is not found, ensure `~/.bun/bin` is in PATH (see Task 1, Step 7).
