import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: {} },
  async func(this: void) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listBudgets();
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
