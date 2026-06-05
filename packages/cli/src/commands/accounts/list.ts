import { buildCommand } from "@stricli/core";
export const listAccountsCommand = buildCommand({
  docs: { brief: "List all accounts" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
