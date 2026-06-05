import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: {
    flags: {},
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Budget ID (or 'last-used')", parse: String }],
    },
  },
  async func(this: void, _flags: Record<string, never>, budgetId: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getBudget(budgetId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
