import { buildCommand } from "@stricli/core";
export const getTransactionCommand = buildCommand({
  docs: { brief: "Get a transaction by ID" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
