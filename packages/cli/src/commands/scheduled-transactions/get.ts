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
