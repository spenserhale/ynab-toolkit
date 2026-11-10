import { buildCommand } from "@stricli/core";
import { YnabClient, filterAccounts } from "@ynab-toolkit/sdk";
import type { AccountType } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";
import { accountView } from "../../account-view.js";

const ACCOUNT_TYPES = [
  "checking", "savings", "cash", "creditCard", "lineOfCredit", "otherAsset", "otherLiability",
  "mortgage", "autoLoan", "studentLoan", "personalLoan", "medicalDebt", "otherDebt",
] as const satisfies readonly AccountType[];

interface ListAccountsFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly open: boolean;
  readonly "on-budget": boolean;
  readonly type?: AccountType[];
  readonly unlinked: boolean;
  readonly "link-error": boolean;
  readonly "include-deleted": boolean;
  readonly knowledge: number;
}

export const listAccountsCommand = buildCommand({
  docs: {
    brief: "List accounts with bank-connection status (link_status: linked, error, unlinked)",
    fullDescription:
      "Lists accounts in a budget. Each row has a link_status column derived from " +
      "direct_import_linked / direct_import_in_error. Filters are ANDed. Deleted accounts are " +
      "hidden unless --include-deleted; they only appear in delta (--knowledge) responses. " +
      "Use the returned server_knowledge with --knowledge on the next run to fetch only changes.",
  },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      open: { kind: "boolean", brief: "Only open (not closed) accounts", default: false },
      "on-budget": { kind: "boolean", brief: "Only on-budget accounts", default: false },
      type: {
        kind: "enum",
        values: ACCOUNT_TYPES,
        brief: "Only these account types (repeat or comma-separate)",
        optional: true,
        variadic: ",",
      },
      unlinked: { kind: "boolean", brief: "Only accounts with no bank connection", default: false },
      "link-error": { kind: "boolean", brief: "Only accounts whose bank connection is in error", default: false },
      "include-deleted": { kind: "boolean", brief: "Include deleted accounts", default: false },
      knowledge: {
        kind: "parsed",
        parse: Number,
        brief: "last_knowledge_of_server for delta requests (0 = full fetch)",
        default: "0",
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ListAccountsFlags) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.listAccounts(budgetId, flags.knowledge || undefined);
      const accounts = filterAccounts(result.accounts, {
        open: flags.open,
        onBudget: flags["on-budget"],
        types: flags.type,
        unlinked: flags.unlinked,
        linkError: flags["link-error"],
        includeDeleted: flags["include-deleted"],
      });
      console.log(formatOutput(
        { accounts: accounts.map(accountView), server_knowledge: result.server_knowledge },
        flags
      ));
    } catch (err) {
      handleError(err);
    }
  },
});
