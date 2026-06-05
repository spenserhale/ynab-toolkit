import { buildCommand } from "@stricli/core";
export const updateMonthCategoryCommand = buildCommand({
  docs: { brief: "Update the budgeted amount for a category in a given month" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
