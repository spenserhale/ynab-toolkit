import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { loadClient, render, withUserErrors } from "./shared.js";

const format = z.enum(["toon", "json"]).default("toon").describe("Output format");
const budgetId = z
  .string()
  .optional()
  .describe("Budget ID; defaults to YNAB_BUDGET_ID, then YNAB's `last-used` budget");
const knowledge = z
  .number()
  .int()
  .nonnegative()
  .optional()
  .describe("last_knowledge_of_server for a delta request; omit for everything");

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

function pickBudget(explicit: string | undefined, fallback: string | undefined): string {
  return explicit ?? fallback ?? "last-used";
}

/** Read-only YNAB tools. Amounts are milliunits (1000 = 1.00 in the budget currency). */
export function registerResourceTools(server: FastMCP): void {
  server.addTool({
    name: "ynab_list_budgets",
    description: "List the user's YNAB budgets (plans) and the default budget, if any.",
    parameters: z.object({ format }),
    annotations: { title: "List budgets", ...readOnly },
    execute: async (args) => {
      const { client } = await loadClient();
      return render(await withUserErrors(() => client.listBudgets()), args.format);
    },
  });

  server.addTool({
    name: "ynab_list_accounts",
    description: "List accounts in a budget. Balances are milliunits.",
    parameters: z.object({ budget_id: budgetId, knowledge, format }),
    annotations: { title: "List accounts", ...readOnly },
    execute: async (args) => {
      const { client, config } = await loadClient();
      const id = pickBudget(args.budget_id, config.budgetId);
      return render(await withUserErrors(() => client.listAccounts(id, args.knowledge)), args.format);
    },
  });

  server.addTool({
    name: "ynab_list_categories",
    description: "List category groups and their categories. Amounts are milliunits.",
    parameters: z.object({ budget_id: budgetId, knowledge, format }),
    annotations: { title: "List categories", ...readOnly },
    execute: async (args) => {
      const { client, config } = await loadClient();
      const id = pickBudget(args.budget_id, config.budgetId);
      return render(await withUserErrors(() => client.listCategories(id, args.knowledge)), args.format);
    },
  });

  server.addTool({
    name: "ynab_list_payees",
    description: "List payees in a budget.",
    parameters: z.object({ budget_id: budgetId, knowledge, format }),
    annotations: { title: "List payees", ...readOnly },
    execute: async (args) => {
      const { client, config } = await loadClient();
      const id = pickBudget(args.budget_id, config.budgetId);
      return render(await withUserErrors(() => client.listPayees(id, args.knowledge)), args.format);
    },
  });

  server.addTool({
    name: "ynab_list_transactions",
    description:
      "List transactions in a budget. Use since_date to bound the result. Amounts are milliunits " +
      "(negative = outflow).",
    parameters: z.object({
      budget_id: budgetId,
      since_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Only transactions on or after this date (YYYY-MM-DD)"),
      knowledge,
      format,
    }),
    annotations: { title: "List transactions", ...readOnly },
    execute: async (args) => {
      const { client, config } = await loadClient();
      const id = pickBudget(args.budget_id, config.budgetId);
      const result = await withUserErrors(() =>
        client.listTransactions(id, {
          sinceDate: args.since_date,
          lastKnowledgeOfServer: args.knowledge,
        }),
      );
      return render(result, args.format);
    },
  });

  server.addTool({
    name: "ynab_get_month",
    description:
      "Get one budget month with its categories (budgeted, activity, balance in milliunits).",
    parameters: z.object({
      budget_id: budgetId,
      month: z
        .string()
        .regex(/^(\d{4}-\d{2}-01|current)$/)
        .describe("Month as YYYY-MM-01, or `current`"),
      format,
    }),
    annotations: { title: "Get month", ...readOnly },
    execute: async (args) => {
      const { client, config } = await loadClient();
      const id = pickBudget(args.budget_id, config.budgetId);
      return render(await withUserErrors(() => client.getMonth(id, args.month)), args.format);
    },
  });
}
