import { buildCommand } from "@stricli/core";
export const listCategoriesCommand = buildCommand({
  docs: { brief: "List all category groups" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
