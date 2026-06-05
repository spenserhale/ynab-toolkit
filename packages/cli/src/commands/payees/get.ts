import { buildCommand } from "@stricli/core";
export const getPayeeCommand = buildCommand({
  docs: { brief: "Get a payee by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
