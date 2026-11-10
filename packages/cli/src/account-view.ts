import { accountLinkStatus } from "@ynab-toolkit/sdk";
import type { Account } from "@ynab-toolkit/sdk";

/** Account with a derived `link_status` column placed next to the name. */
export function accountView(account: Account) {
  const { id, name, type, ...rest } = account;
  return { id, name, type, link_status: accountLinkStatus(account), ...rest };
}
