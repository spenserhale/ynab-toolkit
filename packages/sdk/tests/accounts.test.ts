import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listAccounts()", () => {
  it("returns accounts array with server_knowledge", async () => {
    mockFetch(Fixtures.accounts.list);
    const result = await client.listAccounts(BUDGET_ID);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.id).toBe("account-1");
    expect(result.server_knowledge).toBe(100);
  });

  it("returns balance as raw milliunits integer", async () => {
    mockFetch(Fixtures.accounts.list);
    const result = await client.listAccounts(BUDGET_ID);
    expect(result.accounts[0]!.balance).toBe(125000);
    expect(Number.isInteger(result.accounts[0]!.balance)).toBe(true);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.accounts.list);
    await client.listAccounts(BUDGET_ID);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/accounts`,
      expect.any(Object)
    );
  });

  it("passes last_knowledge_of_server as query param", async () => {
    const spy = mockFetch(Fixtures.accounts.list);
    await client.listAccounts(BUDGET_ID, 42);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/accounts?last_knowledge_of_server=42`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listAccounts(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listAccounts(BUDGET_ID)).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getAccount()", () => {
  it("returns the account directly", async () => {
    mockFetch(Fixtures.accounts.get);
    const result = await client.getAccount(BUDGET_ID, "account-1");
    expect(result.id).toBe("account-1");
    expect(result.name).toBe("Checking");
  });

  it("balance is raw milliunits", async () => {
    mockFetch(Fixtures.accounts.get);
    const result = await client.getAccount(BUDGET_ID, "account-1");
    expect(result.balance).toBe(125000);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.accounts.get);
    await client.getAccount(BUDGET_ID, "account-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/accounts/account-1`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getAccount(BUDGET_ID, "missing")).rejects.toBeInstanceOf(
      YnabNotFoundError
    );
  });
});
