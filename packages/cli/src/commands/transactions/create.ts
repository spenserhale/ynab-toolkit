import { buildCommand } from "@stricli/core";
import { YnabClient, SaveTransactionParamsSchema } from "@ynab-toolkit/sdk";
import type { TransactionClearedStatus, TransactionFlagColor } from "@ynab-toolkit/sdk";
import { loadConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";

interface CreateTransactionFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "dry-run": boolean;
  readonly "idempotency-key": string;
  readonly "payee-name"?: string;
  readonly "payee-id"?: string;
  readonly memo?: string;
  readonly "category-id"?: string;
  readonly cleared?: TransactionClearedStatus;
  readonly approved?: boolean;
  readonly "flag-color"?: TransactionFlagColor;
}

export const createTransactionCommand = buildCommand({
  docs: {
    brief: "Create a transaction. Amount is in milliunits (negative = outflow).",
    fullDescription:
      "Creates one transaction. Amount is milliunits (-12340 = $12.34 outflow). Future dates are " +
      "rejected by the API. --payee-name finds a payee by name or creates one; --payee-id wins if " +
      "both are given. Unapproved unless --approved. --idempotency-key becomes the import_id " +
      "(max 36 chars), so a retry with the same key is reported as a duplicate.",
  },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "payee-name": { kind: "parsed", parse: String, brief: "Payee name (max 200 chars)", optional: true },
      "payee-id": { kind: "parsed", parse: String, brief: "Payee ID", optional: true },
      memo: { kind: "parsed", parse: String, brief: "Memo (max 500 chars)", optional: true },
      "category-id": { kind: "parsed", parse: String, brief: "Category ID", optional: true },
      cleared: {
        kind: "enum",
        values: ["cleared", "uncleared", "reconciled"],
        brief: "Cleared status (API default: uncleared)",
        optional: true,
      },
      approved: { kind: "boolean", brief: "Mark the transaction approved", optional: true },
      "flag-color": {
        kind: "enum",
        values: ["red", "orange", "yellow", "green", "blue", "purple"],
        brief: "Flag color",
        optional: true,
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
    let params;
    try {
      params = SaveTransactionParamsSchema.parse({
        account_id: accountId,
        date,
        amount,
        payee_id: flags["payee-id"],
        payee_name: flags["payee-name"],
        memo: flags.memo,
        category_id: flags["category-id"],
        cleared: flags.cleared,
        approved: flags.approved,
        flag_color: flags["flag-color"],
        import_id: flags["idempotency-key"] || null,
      });
    } catch (err) {
      handleError(err);
    }
    if (flags["dry-run"]) {
      console.log(formatOutput({ dry_run: true, transaction: params }, flags));
      process.exit(0);
    }
    const config = await loadConfigOrExit();
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
