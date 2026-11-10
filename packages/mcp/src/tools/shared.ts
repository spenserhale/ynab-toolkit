import { encode } from "@toon-format/toon";
import { UserError } from "fastmcp";
import { YnabClient, YnabError, loadConfig, type ResolvedConfig } from "@ynab-toolkit/sdk";

/**
 * Resolve config on every call (env > .env > OS keychain), so a key stored
 * or rotated with `ynab auth set` applies without restarting the MCP host.
 */
export async function loadClient(): Promise<{ client: YnabClient; config: ResolvedConfig }> {
  const config = await withUserErrors(() => loadConfig());
  return { client: new YnabClient(config), config };
}

/** Turn typed SDK errors into messages the MCP client shows to the model. */
export async function withUserErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof YnabError) {
      const hint = (err as { hint?: string }).hint;
      throw new UserError(hint ? `${err.message}. ${hint}` : err.message);
    }
    throw err;
  }
}

export type OutputFormat = "toon" | "json";

export function render(data: unknown, format: OutputFormat = "toon"): string {
  return format === "json" ? JSON.stringify(data, null, 2) : encode(data);
}
