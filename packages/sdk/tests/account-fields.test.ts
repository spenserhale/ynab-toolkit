import { describe, expect, it } from "bun:test";
import { YnabClient } from "../src/client.js";
import { YnabValidationError } from "../src/errors.js";
import {
  accountLinkStatus,
  checkAccountBalanceSign,
  filterAccounts,
  findOpenAccountByName,
} from "../src/accounts.js";
import { AccountSchema } from "../src/types.js";
import type { Account } from "../src/types.js";
import { mockFetch, mockFetchSequence } from "./helpers/mock-fetch.js";

const client = new YnabClient({ apiKey: "test-key", baseUrl: "https://api.example.com" });
const BUDGET_ID = "budget-1";

// Every property of AccountBase in the YNAB OpenAPI spec (v1.90.0). If YNAB adds
// a field, add it here and to AccountSchema so zod does not silently drop it.
const SPEC_ACCOUNT_FIELDS = [
  "id", "name", "type", "on_budget", "closed", "note", "balance", "cleared_balance",
  "uncleared_balance", "transfer_payee_id", "direct_import_linked", "direct_import_in_error",
  "last_reconciled_at", "debt_original_balance", "debt_interest_rates", "debt_minimum_payments",
  "debt_escrow_amounts", "deleted",
];

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    name: "Checking",
    type: "checking",
    on_budget: true,
    closed: false,
    note: null,
    balance: 125000,
    cleared_balance: 125000,
    uncleared_balance: 0,
    transfer_payee_id: "payee-transfer-1",
    direct_import_linked: true,
    direct_import_in_error: false,
    last_reconciled_at: "2026-10-31T18:00:00Z",
    debt_original_balance: null,
    debt_interest_rates: null,
    debt_minimum_payments: null,
    debt_escrow_amounts: null,
    deleted: false,
    ...overrides,
  };
}

describe("AccountSchema", () => {
  it("keeps every AccountBase field from the spec", () => {
    const shape = Object.keys(AccountSchema.shape).sort();
    expect(shape).toEqual([...SPEC_ACCOUNT_FIELDS].sort());
  });

  it("keeps link, reconcile and loan fields from the API response", async () => {
    const loan = account({
      id: "loan-1",
      name: "Car loan",
      type: "autoLoan",
      on_budget: false,
      direct_import_linked: false,
      debt_interest_rates: { "2026-01-01": 4500 },
      debt_minimum_payments: { "2026-01-01": 350000 },
      debt_escrow_amounts: {},
    });
    mockFetch({ accounts: [account(), loan], server_knowledge: 7 });
    const { accounts } = await client.listAccounts(BUDGET_ID);
    expect(accounts[0]!.direct_import_linked).toBe(true);
    expect(accounts[0]!.direct_import_in_error).toBe(false);
    expect(accounts[0]!.last_reconciled_at).toBe("2026-10-31T18:00:00Z");
    expect(accounts[1]!.debt_interest_rates).toEqual({ "2026-01-01": 4500 });
    expect(accounts[1]!.debt_minimum_payments).toEqual({ "2026-01-01": 350000 });
  });

  it("accepts a null transfer_payee_id", () => {
    expect(AccountSchema.parse(account({ transfer_payee_id: null })).transfer_payee_id).toBeNull();
  });
});

describe("accountLinkStatus()", () => {
  it("maps the direct-import fields to linked / error / unlinked / unknown", () => {
    expect(accountLinkStatus(account())).toBe("linked");
    expect(accountLinkStatus(account({ direct_import_in_error: true }))).toBe("error");
    expect(accountLinkStatus(account({ direct_import_linked: false }))).toBe("unlinked");
    expect(accountLinkStatus(account({ direct_import_linked: undefined }))).toBe("unknown");
  });
});

describe("filterAccounts()", () => {
  const accounts = [
    account({ id: "a" }),
    account({ id: "b", closed: true }),
    account({ id: "c", on_budget: false, type: "otherAsset", direct_import_linked: false }),
    account({ id: "d", direct_import_in_error: true, type: "creditCard" }),
    account({ id: "e", deleted: true }),
  ];
  const ids = (list: Account[]) => list.map((a) => a.id);

  it("hides deleted accounts by default", () => {
    expect(ids(filterAccounts(accounts, {}))).toEqual(["a", "b", "c", "d"]);
    expect(ids(filterAccounts(accounts, { includeDeleted: true }))).toContain("e");
  });

  it("applies each filter and ANDs them", () => {
    expect(ids(filterAccounts(accounts, { open: true }))).toEqual(["a", "c", "d"]);
    expect(ids(filterAccounts(accounts, { onBudget: true }))).toEqual(["a", "b", "d"]);
    expect(ids(filterAccounts(accounts, { types: ["creditCard", "otherAsset"] }))).toEqual(["c", "d"]);
    expect(ids(filterAccounts(accounts, { unlinked: true }))).toEqual(["c"]);
    expect(ids(filterAccounts(accounts, { linkError: true }))).toEqual(["d"]);
    expect(ids(filterAccounts(accounts, { open: true, onBudget: true }))).toEqual(["a", "d"]);
  });
});

describe("checkAccountBalanceSign()", () => {
  it("rejects positive balances on liability types only", () => {
    expect(checkAccountBalanceSign("creditCard", 5000)).toContain("negative");
    expect(checkAccountBalanceSign("otherLiability", 1)).not.toBeNull();
    expect(checkAccountBalanceSign("creditCard", -5000)).toBeNull();
    expect(checkAccountBalanceSign("creditCard", 0)).toBeNull();
    expect(checkAccountBalanceSign("checking", 5000)).toBeNull();
  });
});

describe("findOpenAccountByName()", () => {
  it("matches trimmed, case-insensitive names on open, non-deleted accounts", () => {
    const list = [
      account({ id: "closed", name: "Visa", closed: true }),
      account({ id: "deleted", name: "Visa", deleted: true }),
      account({ id: "open", name: "Visa " }),
    ];
    expect(findOpenAccountByName(list, "visa")?.id).toBe("open");
    expect(findOpenAccountByName(list.slice(0, 2), "Visa")).toBeUndefined();
  });
});

describe("createAccount()", () => {
  it("POSTs the account wrapper and returns the created account", async () => {
    const created = account({ id: "new", name: "HSA", type: "otherAsset", direct_import_linked: false });
    const spy = mockFetch({ account: created }, 201);
    const result = await client.createAccount(BUDGET_ID, { name: "HSA", type: "otherAsset", balance: 250000 });
    expect(result.id).toBe("new");
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe(`https://api.example.com/plans/${BUDGET_ID}/accounts`);
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      account: { name: "HSA", type: "otherAsset", balance: 250000 },
    });
  });

  it("rejects a positive credit card balance before sending", async () => {
    const spy = mockFetch({});
    await expect(
      client.createAccount(BUDGET_ID, { name: "Visa", type: "creditCard", balance: 5000 })
    ).rejects.toBeInstanceOf(YnabValidationError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("allows a positive liability balance when asked", async () => {
    mockFetch({ account: account({ type: "creditCard", balance: 5000 }) }, 201);
    const result = await client.createAccount(
      BUDGET_ID,
      { name: "Visa", type: "creditCard", balance: 5000 },
      { allowPositiveLiability: true }
    );
    expect(result.balance).toBe(5000);
  });

  it("rejects types the API cannot create", async () => {
    await expect(
      // @ts-expect-error autoLoan is readable but not creatable
      client.createAccount(BUDGET_ID, { name: "Car", type: "autoLoan", balance: -1000 })
    ).rejects.toBeInstanceOf(YnabValidationError);
  });
});

describe("createAccountIfNotExists()", () => {
  it("returns the existing open account without POSTing", async () => {
    const spy = mockFetch({ accounts: [account({ name: "HSA", type: "savings" })], server_knowledge: 1 });
    const result = await client.createAccountIfNotExists(BUDGET_ID, {
      name: "hsa",
      type: "otherAsset",
      balance: 0,
    });
    expect(result.created).toBe(false);
    expect(result.note).toContain("already exists");
    expect(result.note).toContain("savings");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("creates when no open account has the name", async () => {
    const created = account({ id: "new", name: "HSA", type: "otherAsset" });
    const spy = mockFetchSequence([
      { data: { accounts: [account({ name: "HSA", closed: true })], server_knowledge: 1 } },
      { data: { account: created }, status: 201 },
    ]);
    const result = await client.createAccountIfNotExists(BUDGET_ID, {
      name: "HSA",
      type: "otherAsset",
      balance: 0,
    });
    expect(result.created).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("dry run checks for an existing account but never POSTs", async () => {
    const spy = mockFetch({ accounts: [], server_knowledge: 1 });
    const result = await client.createAccountIfNotExists(
      BUDGET_ID,
      { name: "HSA", type: "otherAsset", balance: 0 },
      { dryRun: true }
    );
    expect(result).toMatchObject({ created: false, dry_run: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
