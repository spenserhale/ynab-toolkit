import { buildCommand } from "@stricli/core";
export const getScheduledTransactionCommand = buildCommand({
  docs: { brief: "Get a scheduled transaction by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
