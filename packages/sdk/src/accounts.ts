import type { Account, AccountLinkStatus, AccountType, SaveAccountType } from "./types.js";

/**
 * Bank-connection status of an account, derived from the direct-import fields.
 * "unknown" means the API response did not include `direct_import_linked`.
 */
export function accountLinkStatus(account: Account): AccountLinkStatus {
  if (account.direct_import_linked === undefined) return "unknown";
  if (!account.direct_import_linked) return "unlinked";
  return account.direct_import_in_error ? "error" : "linked";
}

export interface AccountFilters {
  /** Only accounts that are not closed. */
  open?: boolean;
  /** Only on-budget accounts. */
  onBudget?: boolean;
  /** Only accounts of these types. */
  types?: AccountType[];
  /** Only accounts with no bank connection. */
  unlinked?: boolean;
  /** Only accounts whose bank connection is in error. */
  linkError?: boolean;
  /** Keep deleted accounts (they only appear in delta responses). Default false. */
  includeDeleted?: boolean;
}

/** Filter accounts client-side. All given filters must match (AND). */
export function filterAccounts(accounts: Account[], filters: AccountFilters): Account[] {
  return accounts.filter((a) => {
    if (!filters.includeDeleted && a.deleted) return false;
    if (filters.open && a.closed) return false;
    if (filters.onBudget && !a.on_budget) return false;
    if (filters.types && filters.types.length > 0 && !filters.types.includes(a.type)) return false;
    const status = accountLinkStatus(a);
    if (filters.unlinked && status !== "unlinked") return false;
    if (filters.linkError && status !== "error") return false;
    return true;
  });
}

const LIABILITY_TYPES: ReadonlySet<SaveAccountType> = new Set(["creditCard", "otherLiability"]);

/**
 * Liability balances are entered as negative milliunits (money owed). Returns an
 * error message when a liability account is given a positive balance, else null.
 */
export function checkAccountBalanceSign(type: SaveAccountType, balance: number): string | null {
  if (LIABILITY_TYPES.has(type) && balance > 0) {
    return `A ${type} balance is money owed and must be zero or negative milliunits (got ${balance}). ` +
      `Use e.g. --balance -150000 for $150.00 owed.`;
  }
  return null;
}

/** Find an open, non-deleted account whose name matches (trimmed, case-insensitive). */
export function findOpenAccountByName(accounts: Account[], name: string): Account | undefined {
  const wanted = name.trim().toLowerCase();
  return accounts.find((a) => !a.deleted && !a.closed && a.name.trim().toLowerCase() === wanted);
}
