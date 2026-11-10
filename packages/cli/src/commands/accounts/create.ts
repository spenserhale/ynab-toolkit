import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import type { SaveAccountType } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";
import { accountView } from "../../account-view.js";

const CREATABLE_TYPES = [
  "checking", "savings", "cash", "creditCard", "otherAsset", "otherLiability",
] as const satisfies readonly SaveAccountType[];

interface CreateAccountFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly type: SaveAccountType;
  readonly balance: number;
  readonly "allow-positive-liability": boolean;
  readonly "dry-run": boolean;
}

export const createAccountCommand = buildCommand({
  docs: {
    brief: "Create an account, unless an open account with that name already exists",
    fullDescription:
      "Creates an unlinked account. Idempotent by name: if an open account with the same name " +
      "(case-insensitive) exists, it is returned with created=false and nothing is created.\n\n" +
      "--balance is milliunits (1000 = $1.00). creditCard and otherLiability balances are money " +
      "owed and must be zero or negative (e.g. -150000 for $150.00 owed); pass " +
      "--allow-positive-liability for an overpaid card.\n\n" +
      "The API can only create checking, savings, cash, creditCard, otherAsset and " +
      "otherLiability accounts. Loans and lines of credit, renaming, closing, deleting and bank " +
      "connections are web-app only.",
  },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      type: { kind: "enum", values: CREATABLE_TYPES, brief: "Account type" },
      balance: {
        kind: "parsed",
        parse: Number,
        brief: "Starting balance in milliunits (negative for money owed)",
      },
      "allow-positive-liability": {
        kind: "boolean",
        brief: "Allow a positive creditCard / otherLiability balance",
        default: false,
      },
      "dry-run": {
        kind: "boolean",
        brief: "Check for an existing account and print the request without creating it",
        default: false,
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Account name", parse: String }],
    },
  },
  async func(this: void, flags: CreateAccountFlags, name: string) {
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.createAccountIfNotExists(
        budgetId,
        { name, type: flags.type, balance: flags.balance },
        { allowPositiveLiability: flags["allow-positive-liability"], dryRun: flags["dry-run"] }
      );
      const account = "id" in result.account ? accountView(result.account) : result.account;
      console.log(formatOutput({ ...result, account }, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
