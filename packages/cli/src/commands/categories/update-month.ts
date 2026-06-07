import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface UpdateMonthCategoryFlags extends OutputFlags {
  readonly "budget-id": string;
}

export const updateMonthCategoryCommand = buildCommand({
  docs: { brief: "Update the budgeted amount for a category in a specific month" },
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
      parameters: [
        { brief: "Month (YYYY-MM-01)", parse: String },
        { brief: "Category ID", parse: String },
        { brief: "Budgeted amount in milliunits", parse: Number },
      ],
    },
  },
  async func(
    this: void,
    flags: UpdateMonthCategoryFlags,
    month: string,
    categoryId: string,
    budgeted: number
  ) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.updateMonthCategory(budgetId, month, categoryId, budgeted);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
