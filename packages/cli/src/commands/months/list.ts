import { buildCommand } from "@stricli/core";
export const listMonthsCommand = buildCommand({
  docs: { brief: "List budget months" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
