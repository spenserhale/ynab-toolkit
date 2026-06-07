import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: {
    flags: { ...outputFlags },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Budget ID (or 'last-used')", parse: String }],
    },
  },
  async func(this: void, flags: OutputFlags, budgetId: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getBudget(budgetId);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
