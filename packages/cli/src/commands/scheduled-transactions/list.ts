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
