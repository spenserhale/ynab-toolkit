import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabValidationError } from "../src/errors.js";
import { ImportRowError, prepareImport, ynabImportId } from "../src/imports.js";
import { mockFetch, mockFetchSequence } from "./helpers/mock-fetch.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

describe("ynabImportId()", () => {
  it("uses the YNAB Direct Import format", () => {
    expect(ynabImportId(-294230, "2015-12-30", 1)).toBe("YNAB:-294230:2015-12-30:1");
  });
});

describe("prepareImport()", () => {
  it("numbers same account/amount/date occurrences in file order", () => {
    const { transactions, generated_import_ids } = prepareImport(
      [
        { date: "2026-10-01", amount: -5000 },
        { date: "2026-10-01", amount: -5000 },
        { date: "2026-10-01", amount: -7000 },
        { date: "2026-10-01", amount: -5000, account_id: "other" },
      ],
      { defaultAccountId: "acct" }
    );
    expect(transactions.map((t) => t.import_id)).toEqual([
      "YNAB:-5000:2026-10-01:1",
      "YNAB:-5000:2026-10-01:2",
      "YNAB:-7000:2026-10-01:1",
      "YNAB:-5000:2026-10-01:1",
    ]);
    expect(generated_import_ids).toBe(4);
  });

  it("is deterministic, so a re-run produces the same ids", () => {
    const rows = [
      { date: "2026-10-02", amount: -1000, payee_name: "A" },
      { date: "2026-10-02", amount: -1000, payee_name: "B" },
    ];
    const a = prepareImport(rows, { defaultAccountId: "acct" });
    const b = prepareImport(rows, { defaultAccountId: "acct" });
    expect(a.transactions.map((t) => t.import_id)).toEqual(b.transactions.map((t) => t.import_id));
  });

  it("keeps supplied import_ids and skips occurrence numbers they already use", () => {
    const { transactions, generated_import_ids } = prepareImport(
      [
        { date: "2026-10-01", amount: -5000 },
        { date: "2026-10-01", amount: -5000, import_id: "YNAB:-5000:2026-10-01:1" },
      ],
      { defaultAccountId: "acct" }
    );
    expect(transactions.map((t) => t.import_id)).toEqual([
      "YNAB:-5000:2026-10-01:2",
      "YNAB:-5000:2026-10-01:1",
    ]);
    expect(generated_import_ids).toBe(1);
  });

  it("defaults cleared to 'cleared' and passes other fields through", () => {
    const { transactions } = prepareImport(
      [{ date: "2026-10-01", amount: -5000, payee_name: "Store", memo: "m", approved: true, flag_color: "red" }],
      { defaultAccountId: "acct" }
    );
    expect(transactions[0]).toMatchObject({
      account_id: "acct",
      cleared: "cleared",
      payee_name: "Store",
      memo: "m",
      approved: true,
      flag_color: "red",
    });
  });

  it("reports the 1-based row number of an invalid row", () => {
    const run = () =>
      prepareImport(
        [{ date: "2026-10-01", amount: -5000 }, { date: "10/01/2026", amount: -5000 }],
        { defaultAccountId: "acct" }
      );
    expect(run).toThrow(ImportRowError);
    expect(run).toThrow(/Row 2: date/);
  });

  it("rejects fractional milliunits and missing accounts", () => {
    expect(() => prepareImport([{ date: "2026-10-01", amount: -50.5 }], { defaultAccountId: "a" })).toThrow(
      YnabValidationError
    );
    expect(() => prepareImport([{ date: "2026-10-01", amount: -50 }])).toThrow(/account_id/);
  });
});

describe("importTransactions()", () => {
  const rows = [
    { date: "2026-10-01", amount: -5000, payee_name: "A" },
    { date: "2026-10-03", amount: -6000, payee_name: "B" },
  ];

  it("sends one bulk POST and reports created vs duplicate counts", async () => {
    const spy = mockFetch(
      { transaction_ids: ["t1"], duplicate_import_ids: ["YNAB:-6000:2026-10-03:1"], server_knowledge: 9 },
      201
    );
    const result = await client.importTransactions(BUDGET_ID, rows, { defaultAccountId: "acct" });
    expect(result).toMatchObject({ dry_run: false, total: 2, created: 1, duplicates: 1, server_knowledge: 9 });
    expect(spy).toHaveBeenCalledTimes(1);
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.transactions).toHaveLength(2);
    expect(body.transactions[0].import_id).toBe("YNAB:-5000:2026-10-01:1");
  });

  it("dry run estimates duplicates from existing import_ids and never POSTs", async () => {
    const spy = mockFetchSequence([
      {
        data: {
          transactions: [
            {
              id: "x", date: "2026-10-01", amount: -5000, cleared: "cleared", approved: true,
              account_id: "acct", account_name: "Visa", deleted: false, subtransactions: [],
              import_id: "YNAB:-5000:2026-10-01:1",
            },
          ],
          server_knowledge: 3,
        },
      },
    ]);
    const result = await client.importTransactions(BUDGET_ID, rows, { defaultAccountId: "acct", dryRun: true });
    expect(result).toMatchObject({ dry_run: true, created: 1, duplicates: 1 });
    expect(result.transactions).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe(`https://api.example.com/plans/${BUDGET_ID}/accounts/acct/transactions?since_date=2026-10-01`);
    expect((init as RequestInit).method).toBe("GET");
  });

  it("sends nothing for an empty file", async () => {
    const spy = mockFetch({});
    const result = await client.importTransactions(BUDGET_ID, [], { defaultAccountId: "acct" });
    expect(result).toMatchObject({ total: 0, created: 0, duplicates: 0 });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("importLinkedTransactions()", () => {
  it("POSTs to /transactions/import and returns the imported ids", async () => {
    const spy = mockFetch({ transaction_ids: ["t1", "t2"] });
    const result = await client.importLinkedTransactions(BUDGET_ID);
    expect(result.transaction_ids).toEqual(["t1", "t2"]);
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe(`https://api.example.com/plans/${BUDGET_ID}/transactions/import`);
    expect((init as RequestInit).method).toBe("POST");
  });

  it("accepts the empty response the deprecated endpoint returns", async () => {
    mockFetch({ transaction_ids: [] });
    expect((await client.importLinkedTransactions(BUDGET_ID)).transaction_ids).toEqual([]);
  });
});
