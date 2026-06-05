import {
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
  YnabError,
  resolveConfig,
} from "@ynab-toolkit/sdk";
import type { YnabConfig } from "@ynab-toolkit/sdk";

export function resolveConfigOrExit(): YnabConfig {
  try {
    return resolveConfig();
  } catch {
    console.error("Config error: YNAB_API_KEY is required. Set it in your .env file.");
    process.exit(3);
  }
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
  if (err instanceof YnabError) {
    console.error(`API error: ${err.message}`);
    process.exit(1);
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
