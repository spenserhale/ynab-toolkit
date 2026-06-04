import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabRateLimitError, YnabError } from "../src/errors.js";
import { mockFetchError } from "./helpers/mock-fetch.js";

describe("YnabClient", () => {
  it("should require an API key", () => {
    expect(() => new YnabClient({ apiKey: "" })).toThrow();
  });

  it("should accept a valid config", () => {
    const client = new YnabClient({
      apiKey: "test-key",
      baseUrl: "https://api.example.com",
    });
    expect(client).toBeDefined();
  });
});

describe("YnabClient request() error handling", () => {
  const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(
      (client as unknown as { request: Function }).request("GET", "/test")
    ).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Too Many Requests");
    await expect(
      (client as unknown as { request: Function }).request("GET", "/test")
    ).rejects.toBeInstanceOf(YnabRateLimitError);
  });

  it("throws YnabError with detail on generic 4xx", async () => {
    mockFetchError(400, "400.1", "Bad request detail");
    const err = await (client as unknown as { request: Function })
      .request("GET", "/test")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(YnabError);
    expect((err as YnabError).message).toBe("Bad request detail");
  });
});
