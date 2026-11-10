import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { loadConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";
import { accountView } from "../../account-view.js";

interface GetAccountFlags extends OutputFlags {
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
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Account ID", parse: String }],
    },
  },
  async func(this: void, flags: GetAccountFlags, accountId: string) {
    const config = await loadConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getAccount(budgetId, accountId);
      console.log(formatOutput(accountView(result), flags));
    } catch (err) {
      handleError(err);
    }
  },
});
