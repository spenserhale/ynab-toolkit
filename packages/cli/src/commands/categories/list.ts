import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface ListCategoriesFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const listCategoriesCommand = buildCommand({
  docs: { brief: "List all category groups and their categories" },
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
  },
  async func(this: void, flags: ListCategoriesFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listCategories(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
