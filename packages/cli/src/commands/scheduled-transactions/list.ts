import { buildCommand } from "@stricli/core";
export const listScheduledTransactionsCommand = buildCommand({
  docs: { brief: "List scheduled transactions" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
