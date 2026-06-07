import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface CreateTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
  readonly "idempotency-key": string;
}

export const createTransactionCommand = buildCommand({
  docs: { brief: "Create a transaction. Amount is in milliunits (negative = outflow)." },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Print what would be sent without creating the transaction",
        default: false,
      },
      "idempotency-key": {
        kind: "parsed",
        parse: String,
        brief: "Idempotency key (maps to import_id for deduplication)",
        default: "",
      },
      ...outputFlags,
    },
    positional: {
      kind: "tuple",
      parameters: [
        { brief: "Account ID", parse: String },
        { brief: "Date (YYYY-MM-DD)", parse: String },
        { brief: "Amount in milliunits (negative for outflow)", parse: Number },
      ],
    },
  },
  async func(
    this: void,
    flags: CreateTransactionFlags,
    accountId: string,
    date: string,
    amount: number
  ) {
    const params = {
      account_id: accountId,
      date,
      amount,
      import_id: flags["idempotency-key"] || null,
    };
    if (flags["dry-run"]) {
      console.log(formatOutput({ dry_run: true, transaction: params }, flags));
      process.exit(0);
    }
    const config = resolveConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      const client = new YnabClient(config);
      const result = await client.createTransaction(budgetId, params);
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
