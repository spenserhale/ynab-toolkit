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
