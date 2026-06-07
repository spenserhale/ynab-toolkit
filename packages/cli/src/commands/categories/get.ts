import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface GetCategoryFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const getCategoryCommand = buildCommand({
  docs: { brief: "Get a category by ID" },
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
      parameters: [{ brief: "Category ID", parse: String }],
    },
  },
  async func(this: void, flags: GetCategoryFlags, categoryId: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.getCategory(budgetId, categoryId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
