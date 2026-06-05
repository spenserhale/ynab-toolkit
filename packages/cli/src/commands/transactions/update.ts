import { buildCommand } from "@stricli/core";
export const updateTransactionCommand = buildCommand({
  docs: { brief: "Update a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
