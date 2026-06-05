import { buildCommand } from "@stricli/core";
export const getCategoryCommand = buildCommand({
  docs: { brief: "Get a category by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
