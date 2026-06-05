import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listMonths()", () => {
  it("returns months array", async () => {
    mockFetch(Fixtures.months.list);
    const result = await client.listMonths(BUDGET_ID);
    expect(result.months).toHaveLength(1);
    expect(result.months[0]!.month).toBe("2024-01-01");
  });

  it("all amount fields are raw milliunits integers", async () => {
    mockFetch(Fixtures.months.list);
    const result = await client.listMonths(BUDGET_ID);
    const m = result.months[0]!;
    expect(m.income).toBe(500000);
    expect(m.budgeted).toBe(400000);
    expect(m.activity).toBe(-380000);
    expect(m.to_be_budgeted).toBe(120000);
    expect(Number.isInteger(m.income)).toBe(true);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.months.list);
    await client.listMonths(BUDGET_ID);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/months`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listMonths(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listMonths(BUDGET_ID)).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getMonth()", () => {
  it("returns the month directly", async () => {
    mockFetch(Fixtures.months.get);
    const result = await client.getMonth(BUDGET_ID, "2024-01-01");
    expect(result.month).toBe("2024-01-01");
    expect(result.income).toBe(500000);
    expect(result.to_be_budgeted).toBe(120000);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.months.get);
    await client.getMonth(BUDGET_ID, "2024-01-01");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/months/2024-01-01`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getMonth(BUDGET_ID, "2024-01-01")).rejects.toBeInstanceOf(
      YnabNotFoundError
    );
  });
});
