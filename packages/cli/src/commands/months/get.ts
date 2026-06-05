import { buildCommand } from "@stricli/core";
export const getMonthCommand = buildCommand({
  docs: { brief: "Get a specific budget month" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
