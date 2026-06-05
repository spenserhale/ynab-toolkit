import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listPayees()", () => {
  it("returns payees array with server_knowledge", async () => {
    mockFetch(Fixtures.payees.list);
    const result = await client.listPayees(BUDGET_ID);
    expect(result.payees).toHaveLength(1);
    expect(result.payees[0]!.id).toBe("payee-1");
    expect(result.server_knowledge).toBe(100);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.payees.list);
    await client.listPayees(BUDGET_ID);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/payees`,
      expect.any(Object)
    );
  });

  it("passes last_knowledge_of_server as query param", async () => {
    const spy = mockFetch(Fixtures.payees.list);
    await client.listPayees(BUDGET_ID, 30);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/payees?last_knowledge_of_server=30`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listPayees(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listPayees(BUDGET_ID)).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getPayee()", () => {
  it("returns the payee directly", async () => {
    mockFetch(Fixtures.payees.get);
    const result = await client.getPayee(BUDGET_ID, "payee-1");
    expect(result.id).toBe("payee-1");
    expect(result.name).toBe("Amazon");
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.payees.get);
    await client.getPayee(BUDGET_ID, "payee-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/payees/payee-1`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getPayee(BUDGET_ID, "missing")).rejects.toBeInstanceOf(YnabNotFoundError);
  });
});
