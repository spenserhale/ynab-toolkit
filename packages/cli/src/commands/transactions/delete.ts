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
