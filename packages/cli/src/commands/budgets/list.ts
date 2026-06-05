import { buildCommand } from "@stricli/core";
export const listBudgetsCommand = buildCommand({
  docs: { brief: "List all budgets" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
