import {
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
  YnabValidationError,
  YnabConfigError,
  YnabError,
  loadConfig,
} from "@ynab-toolkit/sdk";
import type { ResolvedConfig } from "@ynab-toolkit/sdk";

/** Resolve config (env > .env > OS keychain) or exit 3 with a hint. */
export async function loadConfigOrExit(): Promise<ResolvedConfig> {
  try {
    return await loadConfig();
  } catch (err) {
    handleError(err);
  }
}

function printHint(hint: string | undefined): void {
  if (hint) console.error(`hint: ${hint}`);
}

export function handleError(err: unknown): never {
  if (err instanceof YnabAuthError) {
    console.error(`Auth error: ${err.message}`);
    process.exit(5);
  }
  if (err instanceof YnabNotFoundError) {
    console.error(`Not found: ${err.message}`);
    process.exit(4);
  }
  if (err instanceof YnabRateLimitError) {
    console.error(`Rate limit exceeded: ${err.message}`);
    process.exit(6);
  }
  if (err instanceof YnabValidationError) {
    console.error(`Validation error: ${err.message}`);
    printHint(err.hint);
    process.exit(2);
  }
  if (err instanceof YnabConfigError) {
    console.error(`Config error: ${err.message}${err.got ? ` (${err.got})` : ""}`);
    printHint(err.hint);
    process.exit(3);
  }
  if (err instanceof YnabError) {
    console.error(`API error: ${err.message}`);
    process.exit(1);
  }
  // Zod validation errors (malformed API response or invalid input)
  if (err instanceof Error && err.name === "ZodError") {
    console.error(`Validation error: ${err.message}`);
    process.exit(2);
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
