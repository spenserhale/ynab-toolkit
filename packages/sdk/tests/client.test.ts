import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";

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
