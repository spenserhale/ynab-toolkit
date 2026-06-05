import { buildCommand } from "@stricli/core";
export const deleteTransactionCommand = buildCommand({
  docs: { brief: "Delete a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
