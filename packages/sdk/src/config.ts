import type { YnabConfig } from "./types.js";

export function resolveConfig(overrides: Partial<YnabConfig> = {}): YnabConfig {
  const apiKey = overrides.apiKey ?? process.env["YNAB_API_KEY"] ?? "";
  if (!apiKey) throw new Error("YNAB_API_KEY is required");
  return {
    apiKey,
    baseUrl:
      overrides.baseUrl ??
      process.env["YNAB_BASE_URL"] ??
      "https://api.ynab.com/v1",
    budgetId: overrides.budgetId ?? process.env["YNAB_BUDGET_ID"],
  };
}
