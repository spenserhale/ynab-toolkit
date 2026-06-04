import type { YnabConfig } from "./types.js";

/**
 * Resolve configuration from environment variables.
 * Useful for both CLI and MCP contexts.
 */
export function resolveConfig(
  overrides: Partial<YnabConfig> = {}
): YnabConfig {
  return {
    apiKey: overrides.apiKey ?? process.env.YNAB_API_KEY ?? "",
    baseUrl:
      overrides.baseUrl ??
      process.env.YNAB_BASE_URL ??
      "https://api.ynab.com",
  };
}
