import { buildCommand } from "@stricli/core";
export const createTransactionCommand = buildCommand({
  docs: { brief: "Create a transaction" },
  parameters: { flags: {} },
  async func(this: void) { console.error("Not yet implemented"); process.exit(1); },
});
