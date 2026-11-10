import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { loadConfigState, redactedConfig } from "@ynab-toolkit/sdk";
import { render } from "./shared.js";

export function registerConfigTools(server: FastMCP): void {
  server.addTool({
    name: "ynab_config_status",
    description:
      "Show whether the YNAB API key is configured, which source supplied it (env, envfile:<path>, " +
      "keychain, or missing), and the OS keychain status. Never returns secret values. Store a key " +
      "with `ynab auth set ynab` in a terminal; this server cannot write secrets.",
    parameters: z.object({
      format: z.enum(["toon", "json"]).default("toon").describe("Output format"),
    }),
    annotations: { title: "YNAB config status", readOnlyHint: true, openWorldHint: false },
    execute: async ({ format }) => {
      const redacted = redactedConfig(await loadConfigState());
      return render(
        { configured: redacted.credentials["YNAB_API_KEY"] === "set", ...redacted },
        format,
      );
    },
  });
}
