import { buildCommand } from "@stricli/core";

export const deleteCommand = buildCommand({
  docs: { brief: "Delete resource (not yet implemented)" },
  parameters: { flags: {} },
  async func(this: void) {
    console.error("CLI commands not yet implemented. Use the SDK directly.");
    process.exit(1);
  },
});
