import { buildCommand } from "@stricli/core";
export const getAccountCommand = buildCommand({
  docs: { brief: "Get an account by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
