import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  loadConfigState,
  redactedConfig,
  resolveConfig,
  resolveConfigState,
} from "../src/config.js";
import { YnabConfigError } from "../src/errors.js";
import { readKeychainValues, type SecretStore } from "../src/secrets.js";

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "ynab-secrets-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function memoryStore(initial: Record<string, string> = {}): SecretStore & { requested: string[] } {
  const values = new Map(Object.entries(initial));
  const requested: string[] = [];
  return {
    description: "memory",
    requested,
    async get(name) {
      requested.push(name);
      return values.get(name) ?? null;
    },
    async set(name, value) {
      values.set(name, value);
    },
    async delete(name) {
      return values.delete(name);
    },
  };
}

function failingStore(): SecretStore {
  const fail = async (): Promise<never> => {
    throw new Error("no secret service");
  };
  return { description: "failing", get: fail, set: fail, delete: fail };
}

describe("keychain credential resolution", () => {
  it("resolves the key from the keychain when env and .env are empty", async () => {
    const config = await loadConfig({
      cwd: tempDir(),
      env: {},
      secretStore: memoryStore({ YNAB_API_KEY: "from-keychain" }),
    });
    expect(config.apiKey).toBe("from-keychain");
    expect(config.credentialSources["YNAB_API_KEY"]).toBe("keychain");
    expect(config.keychain.status).toBe("ok");
  });

  it("ranks override > env > .env > keychain", () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "YNAB_API_KEY=from-env-file\n");
    const keychainValues = { YNAB_API_KEY: "from-keychain" };

    const fromEnv = resolveConfig({}, { cwd, env: { YNAB_API_KEY: "from-process" }, keychainValues });
    expect(fromEnv.apiKey).toBe("from-process");
    expect(fromEnv.credentialSources["YNAB_API_KEY"]).toBe("env");

    const fromFile = resolveConfig({}, { cwd, env: {}, keychainValues });
    expect(fromFile.apiKey).toBe("from-env-file");
    expect(fromFile.credentialSources["YNAB_API_KEY"]).toBe(`envfile:${join(cwd, ".env")}`);

    const fromKeychain = resolveConfig({}, { cwd: tempDir(), env: {}, keychainValues });
    expect(fromKeychain.credentialSources["YNAB_API_KEY"]).toBe("keychain");

    const fromOverride = resolveConfig({ apiKey: "explicit" }, { cwd, env: { YNAB_API_KEY: "p" } });
    expect(fromOverride.apiKey).toBe("explicit");
    expect(fromOverride.credentialSources["YNAB_API_KEY"]).toBe("override");
  });

  it("uses the nearest .env and reports a Bun-loaded value as its file", () => {
    const parent = tempDir();
    const child = join(parent, "child");
    mkdirSync(child);
    writeFileSync(join(parent, ".env"), "YNAB_API_KEY=parent\nYNAB_BUDGET_ID=b1\n");
    writeFileSync(join(child, ".env"), "YNAB_API_KEY=child\n");
    const state = resolveConfigState({}, { cwd: child, env: { YNAB_API_KEY: "child" } });
    expect(state.apiKey).toBe("child");
    expect(state.credentialSources["YNAB_API_KEY"]).toBe(`envfile:${join(child, ".env")}`);
    expect(state.budgetId).toBe("b1");
  });

  it("only asks the keychain for keys env and .env did not supply", async () => {
    const store = memoryStore({ YNAB_API_KEY: "from-keychain" });
    const fromEnv = await loadConfig({ cwd: tempDir(), env: { YNAB_API_KEY: "x" }, secretStore: store });
    expect(fromEnv.apiKey).toBe("x");

    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "YNAB_API_KEY=from-env-file\n");
    await loadConfig({ cwd, env: {}, secretStore: store });
    await loadConfig({ cwd: tempDir(), env: {}, overrides: { apiKey: "o" }, secretStore: store });
    expect(store.requested).toEqual([]);

    await loadConfig({ cwd: tempDir(), env: {}, secretStore: store });
    expect(store.requested).toEqual(["YNAB_API_KEY"]);
  });

  it("skips the keychain when YNAB_KEYCHAIN=0 in env or .env", async () => {
    const store = memoryStore({ YNAB_API_KEY: "from-keychain" });
    const state = await loadConfigState({ cwd: tempDir(), env: { YNAB_KEYCHAIN: "0" }, secretStore: store });
    expect(state.apiKey).toBeUndefined();
    expect(state.keychain.status).toBe("disabled");

    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "YNAB_KEYCHAIN=off\n");
    const fromFile = await loadConfigState({ cwd, env: {}, secretStore: store });
    expect(fromFile.keychain.status).toBe("disabled");
    expect(store.requested).toHaveLength(0);
  });

  it("skips the keychain when secretStore is null", async () => {
    const state = await loadConfigState({ cwd: tempDir(), env: {}, secretStore: null });
    expect(state.keychain.status).toBe("disabled");
    expect(state.credentialSources["YNAB_API_KEY"]).toBe("missing");
  });

  it("reports an unavailable keychain without failing, and env keys still work", async () => {
    const config = await loadConfig({
      cwd: tempDir(),
      env: {},
      secretStore: failingStore(),
    }).catch((err: unknown) => err);
    expect(config).toBeInstanceOf(YnabConfigError);
    expect((config as YnabConfigError).hint).toContain("no secret service");

    const state = await loadConfigState({ cwd: tempDir(), env: {}, secretStore: failingStore() });
    expect(state.keychain).toEqual({ status: "unavailable", error: "no secret service" });

    const withEnv = await loadConfig({
      cwd: tempDir(),
      env: { YNAB_API_KEY: "from-process" },
      secretStore: failingStore(),
    });
    expect(withEnv.apiKey).toBe("from-process");
  });

  it("throws a config error with a hint when no key is found", () => {
    expect(() => resolveConfig({}, { cwd: tempDir(), env: {} })).toThrow(YnabConfigError);
  });

  it("redacts secrets and reports keychain status", async () => {
    const state = await loadConfigState({
      cwd: tempDir(),
      env: {},
      secretStore: memoryStore({ YNAB_API_KEY: "super-secret" }),
    });
    const redacted = redactedConfig(state);
    expect(redacted.credentials).toEqual({ YNAB_API_KEY: "set" });
    expect(redacted.keychain.status).toBe("ok");
    expect(JSON.stringify(redacted)).not.toContain("super-secret");
  });

  it("reads keys in parallel and drops empty values", async () => {
    const result = await readKeychainValues(memoryStore({ A: "a", B: "" }), ["A", "B"]);
    expect(result).toEqual({ status: "ok", values: { A: "a" } });
  });
});
