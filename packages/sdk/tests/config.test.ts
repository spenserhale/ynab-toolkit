import { describe, expect, it, afterEach } from "bun:test";
import { resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  const savedKey = process.env["YNAB_API_KEY"];
  const savedUrl = process.env["YNAB_BASE_URL"];

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
});
