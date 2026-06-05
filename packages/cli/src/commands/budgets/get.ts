import { buildCommand } from "@stricli/core";
export const getBudgetCommand = buildCommand({
  docs: { brief: "Get a budget by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
