import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listCategories()", () => {
  it("returns category_groups array with server_knowledge", async () => {
    mockFetch(Fixtures.categories.list);
    const result = await client.listCategories(BUDGET_ID);
    expect(result.category_groups).toHaveLength(1);
    expect(result.category_groups[0]!.id).toBe("group-1");
    expect(result.category_groups[0]!.categories).toHaveLength(1);
    expect(result.server_knowledge).toBe(100);
  });

  it("category budgeted/activity/balance are raw milliunits", async () => {
    mockFetch(Fixtures.categories.list);
    const result = await client.listCategories(BUDGET_ID);
    const cat = result.category_groups[0]!.categories[0]!;
    expect(cat.budgeted).toBe(150000);
    expect(cat.activity).toBe(-150000);
    expect(cat.balance).toBe(0);
    expect(Number.isInteger(cat.budgeted)).toBe(true);
  });

  it("passes last_knowledge_of_server as query param", async () => {
    const spy = mockFetch(Fixtures.categories.list);
    await client.listCategories(BUDGET_ID, 75);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/categories?last_knowledge_of_server=75`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listCategories(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listCategories(BUDGET_ID)).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getCategory()", () => {
  it("returns the category directly", async () => {
    mockFetch(Fixtures.categories.get);
    const result = await client.getCategory(BUDGET_ID, "cat-1");
    expect(result.id).toBe("cat-1");
    expect(result.name).toBe("Rent");
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.categories.get);
    await client.getCategory(BUDGET_ID, "cat-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/categories/cat-1`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getCategory(BUDGET_ID, "missing")).rejects.toBeInstanceOf(
      YnabNotFoundError
    );
  });
});

describe("updateMonthCategory()", () => {
  it("sends PATCH with budgeted amount and returns updated category", async () => {
    const spy = mockFetch(Fixtures.categories.update);
    const result = await client.updateMonthCategory(BUDGET_ID, "2024-01-01", "cat-1", 200000);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/months/2024-01-01/categories/cat-1`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ month_category: { budgeted: 200000 } }),
      })
    );
    expect(result.budgeted).toBe(200000);
  });

  it("budgeted in request and response are raw milliunits", async () => {
    mockFetch(Fixtures.categories.update);
    const result = await client.updateMonthCategory(BUDGET_ID, "2024-01-01", "cat-1", 200000);
    expect(Number.isInteger(result.budgeted)).toBe(true);
  });
});
