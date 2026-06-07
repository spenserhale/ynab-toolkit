import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });

describe("listBudgets()", () => {
  it("returns array of budgets from the plans envelope", async () => {
    mockFetch(Fixtures.budgets.list);
    const result = await client.listBudgets();
    expect(result.budgets).toHaveLength(1);
    expect(result.budgets[0]!.id).toBe("budget-1");
  });

  it("exposes the default budget when present", async () => {
    mockFetch(Fixtures.budgets.list);
    const result = await client.listBudgets();
    expect(result.default_budget?.id).toBe("budget-1");
  });

  it("requests /plans without query params", async () => {
    const spy = mockFetch(Fixtures.budgets.list);
    await client.listBudgets();
    expect(spy).toHaveBeenCalledWith(
      "https://api.example.com/plans",
      expect.any(Object)
    );
  });

  it("sends Bearer auth header", async () => {
    const spy = mockFetch(Fixtures.budgets.list);
    await client.listBudgets();
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listBudgets()).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listBudgets()).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getBudget()", () => {
  it("returns the budget object directly", async () => {
    mockFetch(Fixtures.budgets.get);
    const result = await client.getBudget("budget-1");
    expect(result.id).toBe("budget-1");
    expect(result.name).toBe("My Budget");
  });

  it("calls the correct URL", async () => {
    const spy = mockFetch(Fixtures.budgets.get);
    await client.getBudget("budget-1");
    expect(spy).toHaveBeenCalledWith(
      "https://api.example.com/plans/budget-1",
      expect.any(Object)
    );
  });

  it("supports last-used as budget ID", async () => {
    const spy = mockFetch(Fixtures.budgets.get);
    await client.getBudget("last-used");
    expect(spy).toHaveBeenCalledWith(
      "https://api.example.com/plans/last-used",
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getBudget("missing")).rejects.toBeInstanceOf(YnabNotFoundError);
  });
});
