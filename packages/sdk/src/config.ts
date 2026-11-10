import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { YnabConfigError } from "./errors.js";
import {
  bunSecretStore,
  CREDENTIAL_KEYS,
  readKeychainValues,
  type KeychainStatus,
  type SecretStore,
} from "./secrets.js";
import type { YnabConfig } from "./types.js";

export type Env = Record<string, string | undefined>;

export const DEFAULT_BASE_URL = "https://api.ynab.com/v1";

export interface KeychainState {
  status: KeychainStatus;
  error?: string;
}

export interface ResolveConfigOptions {
  /** Directory to start the `.env` search from. Defaults to process.cwd(). */
  cwd?: string;
  /** Process environment. Defaults to process.env. */
  env?: Env;
  /** Credentials already read from the OS keychain; see loadConfig(). */
  keychainValues?: Record<string, string>;
  /** Keychain lookup status to report; defaults to disabled. */
  keychain?: KeychainState;
}

export interface LoadConfigOptions extends Omit<ResolveConfigOptions, "keychainValues" | "keychain"> {
  /** Explicit values that beat every other source. */
  overrides?: Partial<YnabConfig>;
  /** Store to read keys from. Defaults to the OS keychain; pass null to skip it. */
  secretStore?: SecretStore | null;
}

/** Everything the resolver found, without requiring an API key. */
export interface ConfigState {
  apiKey?: string;
  baseUrl: string;
  budgetId?: string;
  /** Winning source per setting: override, env, envfile:<path>, default, or missing. */
  sources: Record<string, string>;
  /** Winning source per credential key: override, env, envfile:<path>, keychain, or missing. */
  credentialSources: Record<string, string>;
  /** Whether the OS keychain was consulted for credentials. */
  keychain: KeychainState;
  envFiles: string[];
  cwd: string;
}

/** A config that is ready to hand to YnabClient. */
export interface ResolvedConfig extends ConfigState {
  apiKey: string;
}

interface EnvFileData {
  files: string[];
  values: Env;
  sources: Record<string, string>;
}

interface Picked {
  value: string;
  source: string;
}

/**
 * Resolve settings without requiring an API key. Precedence for each value:
 * override > process env > nearest `.env` > keychain (credentials only) > default.
 */
export function resolveConfigState(
  overrides: Partial<YnabConfig> = {},
  options: ResolveConfigOptions = {},
): ConfigState {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;
  const envFile = readEnvFiles(cwd);
  const keychainValues = options.keychainValues ?? {};
  const sources: Record<string, string> = {};
  const credentialSources: Record<string, string> = {};

  const pickEnv = (name: string): Picked | null => {
    const fromProcess = env[name];
    const fromFile = envFile.values[name];
    const fileSource = `envfile:${envFile.sources[name] ?? "unknown"}`;
    if (fromProcess !== undefined && fromProcess !== "") {
      // Bun loads ./.env into process.env on start; report those values as the file they came from.
      return { value: fromProcess, source: fromProcess === fromFile ? fileSource : "env" };
    }
    if (fromFile !== undefined && fromFile !== "") return { value: fromFile, source: fileSource };
    return null;
  };

  const pick = (
    key: string,
    name: string,
    override: string | undefined,
    target: Record<string, string>,
    keychainValue?: string,
  ): string | undefined => {
    if (override !== undefined && override !== "") {
      target[key] = "override";
      return override;
    }
    const fromEnv = pickEnv(name);
    if (fromEnv) {
      target[key] = fromEnv.source;
      return fromEnv.value;
    }
    if (keychainValue) {
      target[key] = "keychain";
      return keychainValue;
    }
    return undefined;
  };

  const apiKey = pick(
    "YNAB_API_KEY",
    "YNAB_API_KEY",
    overrides.apiKey,
    credentialSources,
    keychainValues["YNAB_API_KEY"],
  );
  if (!apiKey) credentialSources["YNAB_API_KEY"] = "missing";

  let baseUrl = pick("baseUrl", "YNAB_BASE_URL", overrides.baseUrl, sources);
  if (!baseUrl) {
    baseUrl = DEFAULT_BASE_URL;
    sources["baseUrl"] = "default";
  }
  const budgetId = pick("budgetId", "YNAB_BUDGET_ID", overrides.budgetId, sources);
  if (!budgetId) sources["budgetId"] = "missing";

  return {
    apiKey,
    baseUrl,
    budgetId,
    sources,
    credentialSources,
    keychain: options.keychain ?? { status: "disabled" },
    envFiles: envFile.files,
    cwd,
  };
}

/**
 * Synchronous resolver: overrides, env and `.env`, plus any keychain values
 * passed in. Throws YnabConfigError when no API key is found. Use loadConfig()
 * to include the OS keychain.
 */
export function resolveConfig(
  overrides: Partial<YnabConfig> = {},
  options: ResolveConfigOptions = {},
): ResolvedConfig {
  return requireApiKey(resolveConfigState(overrides, options));
}

/**
 * resolveConfigState() plus the OS keychain. Only credentials that overrides,
 * the process environment and `.env` files did not supply are looked up, so an
 * explicit key never triggers a keychain prompt. Set YNAB_KEYCHAIN=0 to skip
 * the lookup entirely.
 */
export async function loadConfigState(options: LoadConfigOptions = {}): Promise<ConfigState> {
  const { secretStore, overrides = {}, ...resolveOptions } = options;
  const cwd = resolve(resolveOptions.cwd ?? process.cwd());
  const env = resolveOptions.env ?? process.env;
  const envFile = readEnvFiles(cwd);
  const keychainSwitch = env["YNAB_KEYCHAIN"] ?? envFile.values["YNAB_KEYCHAIN"];
  const disabled =
    secretStore === null ||
    ["0", "false", "no", "off"].includes((keychainSwitch ?? "").trim().toLowerCase());
  if (disabled) {
    return resolveConfigState(overrides, { ...resolveOptions, keychain: { status: "disabled" } });
  }

  const supplied: Record<string, string | undefined> = { YNAB_API_KEY: overrides.apiKey };
  const missing = CREDENTIAL_KEYS.filter(
    (name) => !supplied[name] && !env[name] && !envFile.values[name],
  );
  if (missing.length === 0) {
    return resolveConfigState(overrides, { ...resolveOptions, keychain: { status: "ok" } });
  }
  const result = await readKeychainValues(secretStore ?? bunSecretStore(), missing);
  return resolveConfigState(overrides, {
    ...resolveOptions,
    keychainValues: result.values,
    keychain: result.error ? { status: result.status, error: result.error } : { status: result.status },
  });
}

/** loadConfigState() that throws YnabConfigError when no API key is found. */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  return requireApiKey(await loadConfigState(options));
}

function requireApiKey(state: ConfigState): ResolvedConfig {
  if (state.apiKey) return { ...state, apiKey: state.apiKey };
  const keychainNote =
    state.keychain.status === "unavailable"
      ? ` The OS keychain could not be read (${state.keychain.error ?? "unknown error"}).`
      : "";
  throw new YnabConfigError("YNAB_API_KEY is required", {
    hint:
      "Store it in the OS keychain with `ynab auth set ynab`, or set YNAB_API_KEY in the " +
      `environment or a .env file.${keychainNote}`,
  });
}

function readEnvFiles(cwd: string): EnvFileData {
  const files: string[] = [];
  let current = cwd;
  while (true) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) files.push(candidate);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  // Nearest .env wins, so apply parent files first.
  files.reverse();

  const values: Env = {};
  const sources: Record<string, string> = {};
  for (const file of files) {
    for (const [key, value] of Object.entries(parseEnvFile(file))) {
      values[key] = value;
      sources[key] = file;
    }
  }
  return { files, values, sources };
}

function parseEnvFile(path: string): Env {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const values: Env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const unexported = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equals = unexported.indexOf("=");
    if (equals <= 0) continue;
    const key = unexported.slice(0, equals).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = unexported.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const comment = value.indexOf(" #");
      if (comment >= 0) value = value.slice(0, comment).trim();
    }
    values[key] = value.replace(/\\n/g, "\n");
  }
  return values;
}

export interface RedactedConfig {
  schema_version: "1";
  cwd: string;
  env_files: string[];
  values: { baseUrl: string; budgetId: string | null };
  sources: Record<string, string>;
  credentials: Record<string, "set" | "missing">;
  credential_sources: Record<string, string>;
  keychain: KeychainState;
}

/** Config with every secret replaced by set/missing; safe to print. */
export function redactedConfig(state: ConfigState): RedactedConfig {
  const values: Record<string, string | undefined> = { YNAB_API_KEY: state.apiKey };
  return {
    schema_version: "1",
    cwd: state.cwd,
    env_files: state.envFiles,
    values: { baseUrl: state.baseUrl, budgetId: state.budgetId ?? null },
    sources: state.sources,
    credentials: Object.fromEntries(
      CREDENTIAL_KEYS.map((key) => [key, values[key] ? "set" : "missing"] as const),
    ),
    credential_sources: state.credentialSources,
    keychain: state.keychain,
  };
}

/** The credential value currently in effect for a key; used by `auth migrate`. */
export function credentialValue(state: ConfigState, key: string): string | undefined {
  return key === "YNAB_API_KEY" ? state.apiKey : undefined;
}
