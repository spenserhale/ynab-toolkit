import { describe, expect, it, afterEach } from "bun:test";
import { resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  const savedKey = process.env["YNAB_API_KEY"];
  const savedUrl = process.env["YNAB_BASE_URL"];
  const savedBudgetId = process.env["YNAB_BUDGET_ID"];

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env["YNAB_API_KEY"];
    } else {
      process.env["YNAB_API_KEY"] = savedKey;
    }
    if (savedUrl === undefined) {
      delete process.env["YNAB_BASE_URL"];
    } else {
      process.env["YNAB_BASE_URL"] = savedUrl;
    }
    if (savedBudgetId === undefined) {
      delete process.env["YNAB_BUDGET_ID"];
    } else {
      process.env["YNAB_BUDGET_ID"] = savedBudgetId;
    }
  });

  it("reads YNAB_API_KEY from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig().apiKey).toBe("my-key");
  });

  it("defaults baseUrl to https://api.ynab.com/v1", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig().baseUrl).toBe("https://api.ynab.com/v1");
  });

  it("reads YNAB_BASE_URL override from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BASE_URL"] = "http://localhost:3000";
    expect(resolveConfig().baseUrl).toBe("http://localhost:3000");
  });

  it("allows override via argument", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    expect(resolveConfig({ baseUrl: "http://custom" }).baseUrl).toBe("http://custom");
  });

  it("throws when API key is empty", () => {
    process.env["YNAB_API_KEY"] = "";
    expect(() => resolveConfig()).toThrow();
  });

  it("reads YNAB_BUDGET_ID from env", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BUDGET_ID"] = "budget-abc";
    expect(resolveConfig().budgetId).toBe("budget-abc");
  });

  it("budgetId is undefined when YNAB_BUDGET_ID is not set", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    delete process.env["YNAB_BUDGET_ID"];
    expect(resolveConfig().budgetId).toBeUndefined();
  });

  it("allows budgetId override via argument", () => {
    process.env["YNAB_API_KEY"] = "my-key";
    process.env["YNAB_BUDGET_ID"] = "budget-from-env";
    expect(resolveConfig({ budgetId: "budget-override" }).budgetId).toBe("budget-override");
  });
});
