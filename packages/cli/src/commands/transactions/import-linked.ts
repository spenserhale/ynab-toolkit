import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { loadConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ImportLinkedFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
}

const EMPTY_NOTE =
  "No transactions were imported. YNAB marks this endpoint deprecated and says linked accounts " +
  "import automatically. Accounts without a bank connection are never imported here; use " +
  "`ynab transactions import --file` for those.";

export const importLinkedTransactionsCommand = buildCommand({
  docs: {
    brief: "Ask YNAB to pull new transactions from linked bank accounts now",
    fullDescription:
      "Calls POST /plans/{id}/transactions/import and returns the imported transaction ids. " +
      "Fallback for linked accounts that have not synced yet.\n\n" +
      "YNAB marks this endpoint deprecated (OpenAPI v1.90.0) and documents an always-empty " +
      "response, so an empty result is normal. It only affects accounts with a bank connection; " +
      "for statements from banks YNAB cannot connect to, use `transactions import --file`.",
  },
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
        brief: "Print the request without sending it",
        default: false,
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ImportLinkedFlags) {
    const config = await loadConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    if (flags["dry-run"]) {
      console.log(formatOutput(
        { dry_run: true, request: { method: "POST", path: `/plans/${budgetId}/transactions/import` } },
        flags
      ));
      process.exit(0);
    }
    try {
      const client = new YnabClient(config);
      const { transaction_ids } = await client.importLinkedTransactions(budgetId);
      console.log(formatOutput(
        {
          imported: transaction_ids.length,
          transaction_ids,
          ...(transaction_ids.length === 0 ? { note: EMPTY_NOTE } : {}),
        },
        flags
      ));
    } catch (err) {
      handleError(err);
    }
  },
});
