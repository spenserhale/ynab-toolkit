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
