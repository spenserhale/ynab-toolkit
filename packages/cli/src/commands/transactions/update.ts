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
