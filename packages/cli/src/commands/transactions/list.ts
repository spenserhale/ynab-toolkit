import { buildCommand } from "@stricli/core";
export const listTransactionsCommand = buildCommand({
  docs: { brief: "List transactions" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
