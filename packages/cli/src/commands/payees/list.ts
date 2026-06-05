import { buildCommand } from "@stricli/core";
export const listPayeesCommand = buildCommand({
  docs: { brief: "List all payees" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
