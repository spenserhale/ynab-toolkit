import { describe, expect, it } from "bun:test";
import { resolveConfigState, type SecretStore } from "@ynab-toolkit/sdk";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deleteCredentials,
  listCredentials,
  migrateCredentials,
  parseResource,
  selectCredentialKeys,
  setCredentials,
} from "../src/lib/auth.js";

function memoryStore(initial: Record<string, string> = {}): SecretStore & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    description: "memory",
    values,
    async get(name) {
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

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "ynab-auth-"));
}

function stateWith(env: Record<string, string> = {}, cwd = tempDir()) {
  return resolveConfigState({}, { cwd, env });
}

describe("auth helpers", () => {
  it("validates resources and --key", () => {
    expect(parseResource("YNAB")).toBe("ynab");
    expect(() => parseResource("bank")).toThrow("Unknown resource");
    expect(selectCredentialKeys("ynab", undefined)).toEqual(["YNAB_API_KEY"]);
    expect(selectCredentialKeys("ynab", "ynab_api_key")).toEqual(["YNAB_API_KEY"]);
    expect(() => selectCredentialKeys("ynab", "YNAB_BUDGET_ID")).toThrow("not a credential");
  });

  it("stores trimmed values and flags keys that env still overrides", async () => {
    const store = memoryStore();
    const result = await setCredentials({
      resource: "ynab",
      keys: ["YNAB_API_KEY"],
      readValue: async () => "  secret-value\n",
      store,
      config: stateWith({ YNAB_API_KEY: "from-shell" }),
      dryRun: false,
    });
    expect(store.values.get("YNAB_API_KEY")).toBe("secret-value");
    expect(result.credentials).toEqual([{ key: "YNAB_API_KEY", action: "stored", shadowed_by: "env" }]);
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("flags a .env file that shadows the stored key, and nothing when no source wins", async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".env"), "YNAB_API_KEY=from-file\n");
    const shadowed = await setCredentials({
      resource: "ynab",
      keys: ["YNAB_API_KEY"],
      readValue: async () => "v",
      store: memoryStore(),
      config: stateWith({}, cwd),
      dryRun: false,
    });
    expect(shadowed.credentials[0]?.shadowed_by).toBe(`envfile:${join(cwd, ".env")}`);

    const clean = await setCredentials({
      resource: "ynab",
      keys: ["YNAB_API_KEY"],
      readValue: async () => "v",
      store: memoryStore(),
      config: stateWith(),
      dryRun: false,
    });
    expect(clean.credentials[0]).toEqual({ key: "YNAB_API_KEY", action: "stored" });
  });

  it("does not write on --dry-run and rejects empty input", async () => {
    const store = memoryStore();
    const dry = await setCredentials({
      resource: "ynab",
      keys: ["YNAB_API_KEY"],
      readValue: async () => "v",
      store,
      config: stateWith(),
      dryRun: true,
    });
    expect(dry.credentials[0]?.action).toBe("would_store");
    expect(store.values.size).toBe(0);
    await expect(
      setCredentials({
        resource: "ynab",
        keys: ["YNAB_API_KEY"],
        readValue: async () => "  \n",
        store,
        config: stateWith(),
        dryRun: false,
      }),
    ).rejects.toThrow("must not be empty");
    expect(store.values.size).toBe(0);
  });

  it("lists keychain state and active source without values", async () => {
    const store = memoryStore({ YNAB_API_KEY: "kc-secret" });
    const result = await listCredentials(store, stateWith({ YNAB_API_KEY: "env-secret" }));
    expect(result.keychain_status).toBe("ok");
    expect(result.credentials).toEqual([
      { resource: "ynab", key: "YNAB_API_KEY", keychain: "set", active_source: "env" },
    ]);
    expect(JSON.stringify(result)).not.toContain("kc-secret");
    expect(JSON.stringify(result)).not.toContain("env-secret");
  });

  it("lists keychain state as unknown when the store is unavailable", async () => {
    const result = await listCredentials(failingStore(), stateWith());
    expect(result.keychain_status).toBe("unavailable");
    expect(result.keychain_error).toBe("no secret service");
    expect(result.credentials[0]?.keychain).toBe("unknown");
  });

  it("deletes entries and reports missing ones", async () => {
    const store = memoryStore({ YNAB_API_KEY: "k" });
    const first = await deleteCredentials({ resource: "ynab", keys: ["YNAB_API_KEY"], store, dryRun: false });
    const second = await deleteCredentials({ resource: "ynab", keys: ["YNAB_API_KEY"], store, dryRun: false });
    expect(first.credentials[0]?.action).toBe("deleted");
    expect(second.credentials[0]?.action).toBe("not_found");
    const dry = await deleteCredentials({ resource: "ynab", keys: ["YNAB_API_KEY"], store, dryRun: true });
    expect(dry.credentials[0]?.action).toBe("would_delete");
  });

  it("migrates .env keys, skips existing ones, and returns clean_up", async () => {
    const cwd = tempDir();
    const envFile = join(cwd, ".env");
    writeFileSync(envFile, "YNAB_API_KEY=key-from-file\n");
    const config = stateWith({}, cwd);

    const store = memoryStore();
    const dry = await migrateCredentials({ store, config, dryRun: true, overwrite: false });
    expect(dry.credentials).toEqual([
      { resource: "ynab", key: "YNAB_API_KEY", from: `envfile:${envFile}`, action: "would_store" },
    ]);
    expect(store.values.size).toBe(0);

    const result = await migrateCredentials({ store, config, dryRun: false, overwrite: false });
    expect(store.values.get("YNAB_API_KEY")).toBe("key-from-file");
    expect(result.clean_up).toEqual([envFile]);
    expect(JSON.stringify(result)).not.toContain("key-from-file");

    const existing = memoryStore({ YNAB_API_KEY: "already-there" });
    const skipped = await migrateCredentials({ store: existing, config, dryRun: false, overwrite: false });
    expect(skipped.credentials[0]?.action).toBe("skipped_exists");
    expect(existing.values.get("YNAB_API_KEY")).toBe("already-there");

    const replaced = await migrateCredentials({ store: existing, config, dryRun: false, overwrite: true });
    expect(replaced.credentials[0]?.action).toBe("stored");
    expect(existing.values.get("YNAB_API_KEY")).toBe("key-from-file");
  });

  it("migrate ignores process-env keys (op run, CI)", async () => {
    const store = memoryStore();
    const result = await migrateCredentials({
      store,
      config: stateWith({ YNAB_API_KEY: "from-op-run" }),
      dryRun: false,
      overwrite: false,
    });
    expect(result.credentials).toEqual([]);
    expect(result.clean_up).toEqual([]);
    expect(store.values.size).toBe(0);
  });
});
