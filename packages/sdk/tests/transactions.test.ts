import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabAuthError, YnabNotFoundError, YnabRateLimitError } from "../src/errors.js";
import { mockFetch, mockFetchError } from "./helpers/mock-fetch.js";
import { Fixtures } from "./helpers/fixtures.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("listTransactions()", () => {
  it("returns transactions array with server_knowledge", async () => {
    mockFetch(Fixtures.transactions.list);
    const result = await client.listTransactions(BUDGET_ID);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]!.id).toBe("txn-1");
    expect(result.server_knowledge).toBe(100);
  });

  it("amount is raw milliunits integer", async () => {
    mockFetch(Fixtures.transactions.list);
    const result = await client.listTransactions(BUDGET_ID);
    expect(result.transactions[0]!.amount).toBe(-42500);
    expect(Number.isInteger(result.transactions[0]!.amount)).toBe(true);
  });

  it("passes last_knowledge_of_server as query param", async () => {
    const spy = mockFetch(Fixtures.transactions.list);
    await client.listTransactions(BUDGET_ID, { lastKnowledgeOfServer: 10 });
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions?last_knowledge_of_server=10`,
      expect.any(Object)
    );
  });

  it("throws YnabAuthError on 401", async () => {
    mockFetchError(401, "401.1", "Unauthorized");
    await expect(client.listTransactions(BUDGET_ID)).rejects.toBeInstanceOf(YnabAuthError);
  });

  it("throws YnabRateLimitError on 429", async () => {
    mockFetchError(429, "429.1", "Rate limit");
    await expect(client.listTransactions(BUDGET_ID)).rejects.toBeInstanceOf(YnabRateLimitError);
  });
});

describe("getTransaction()", () => {
  it("returns the transaction directly", async () => {
    mockFetch(Fixtures.transactions.get);
    const result = await client.getTransaction(BUDGET_ID, "txn-1");
    expect(result.id).toBe("txn-1");
    expect(result.date).toBe("2024-01-15");
    expect(result.amount).toBe(-42500);
  });

  it("calls correct URL", async () => {
    const spy = mockFetch(Fixtures.transactions.get);
    await client.getTransaction(BUDGET_ID, "txn-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions/txn-1`,
      expect.any(Object)
    );
  });

  it("throws YnabNotFoundError on 404", async () => {
    mockFetchError(404, "404.2", "Not found");
    await expect(client.getTransaction(BUDGET_ID, "missing")).rejects.toBeInstanceOf(
      YnabNotFoundError
    );
  });
});

describe("createTransaction()", () => {
  it("POSTs with transaction wrapper and returns saved transaction", async () => {
    const spy = mockFetch(Fixtures.transactions.create);
    const params = {
      account_id: "account-1",
      date: "2024-01-16",
      amount: -10000,
    };
    const result = await client.createTransaction(BUDGET_ID, params);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ transaction: params }),
      })
    );
    expect(result.transaction.id).toBe("txn-2");
    expect(result.duplicate_import_ids).toEqual([]);
  });

  it("amount in request is milliunits integer", async () => {
    const spy = mockFetch(Fixtures.transactions.create);
    await client.createTransaction(BUDGET_ID, {
      account_id: "account-1",
      date: "2024-01-16",
      amount: -10000,
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1]!;
    const body = JSON.parse((lastCall[1] as RequestInit).body as string);
    expect(Number.isInteger(body.transaction.amount)).toBe(true);
  });
});

describe("updateTransaction()", () => {
  it("PUTs with transaction wrapper and returns updated transaction", async () => {
    const spy = mockFetch(Fixtures.transactions.get);
    const params = { account_id: "account-1", date: "2024-01-15", amount: -42500 };
    const result = await client.updateTransaction(BUDGET_ID, "txn-1", params);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions/txn-1`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ transaction: params }),
      })
    );
    expect(result.id).toBe("txn-1");
  });
});

describe("deleteTransaction()", () => {
  it("DELETEs and returns the deleted transaction", async () => {
    const spy = mockFetch(Fixtures.transactions.deleteResponse);
    const result = await client.deleteTransaction(BUDGET_ID, "txn-1");
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions/txn-1`,
      expect.objectContaining({ method: "DELETE" })
    );
    expect(result.id).toBe("txn-1");
  });
});

describe("createTransactions() bulk", () => {
  it("POSTs array and returns bulk result", async () => {
    const spy = mockFetch(Fixtures.transactions.bulk);
    const txns = [
      { account_id: "account-1", date: "2024-01-16", amount: -10000 },
      { account_id: "account-1", date: "2024-01-17", amount: -20000 },
    ];
    const result = await client.createTransactions(BUDGET_ID, txns);
    expect(spy).toHaveBeenCalledWith(
      `https://api.example.com/plans/${BUDGET_ID}/transactions`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ transactions: txns }),
      })
    );
    expect(result.transaction_ids).toHaveLength(2);
    expect(result.duplicate_import_ids).toEqual([]);
  });
});
