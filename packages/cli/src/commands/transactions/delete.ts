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
