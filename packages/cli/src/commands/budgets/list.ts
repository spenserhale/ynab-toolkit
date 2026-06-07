import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: { ...outputFlags } },
  async func(this: void, flags: OutputFlags) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listBudgets();
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
