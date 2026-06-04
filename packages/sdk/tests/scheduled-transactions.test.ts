import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listScheduledTransactions()", () => {
  it("returns scheduled_transactions array with server_knowledge", async () => {
    mockFetch(Fixtures.scheduledTransactions.list);
    const result = await client.listScheduledTransactions(BUDGET_ID);
    expect(result.scheduled_transactions).toHaveLength(1);
    expect(result.scheduled_transactions[0]!.id).toBe("sched-1");
    expect(result.server_knowledge).toBe(100);
  });

  it("amount is raw milliunits integer", async () => {
    mockFetch(Fixtures.scheduledTransactions.list);
    const result = await client.listScheduledTransactions(BUDGET_ID);
    expect(result.scheduled_transactions[0]!.amount).toBe(-150000);
    expect(Number.isInteger(result.scheduled_transactions[0]!.amount)).toBe(true);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.scheduledTransactions.list);
    await client.listScheduledTransactions(BUDGET_ID);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/scheduled_transactions`,
      expect.any(Object)
    );
  });

  it("passes last_knowledge_of_server", async () => {
    const spy = mockFetch(Fixtures.scheduledTransactions.list);
    await client.listScheduledTransactions(BUDGET_ID, 20);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/scheduled_transactions?last_knowledge_of_server=20`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listScheduledTransactions(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listScheduledTransactions(BUDGET_ID)).rejects.toBeInstanceOf(
      YnabRateLimitError
    );
  });
});

describe("getScheduledTransaction()", () => {
  it("returns the scheduled transaction directly", async () => {
    mockFetch(Fixtures.scheduledTransactions.get);
    const result = await client.getScheduledTransaction(BUDGET_ID, "sched-1");
    expect(result.id).toBe("sched-1");
    expect(result.frequency).toBe("monthly");
    expect(result.amount).toBe(-150000);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.scheduledTransactions.get);
    await client.getScheduledTransaction(BUDGET_ID, "sched-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/scheduled_transactions/sched-1`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(
      client.getScheduledTransaction(BUDGET_ID, "missing")
    ).rejects.toBeInstanceOf(YnabNotFoundError);
  });
});
