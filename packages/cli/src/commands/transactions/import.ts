import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { readFile } from "node:fs/promises";
import { loadConfigOrExit, handleError } from "../../handle-error.js";
import { outputFlags, formatOutput } from "../../output.js";
import type { OutputFlags } from "../../output.js";
import { parseImportFile } from "../../import-file.js";
import type { AmountUnit } from "../../import-file.js";

interface ImportTransactionsFlags extends OutputFlags {
  readonly "budget-id": string;
  readonly "account-id"?: string;
  readonly file: string;
  readonly amounts: AmountUnit;
  readonly "dry-run": boolean;
}

export const importTransactionsCommand = buildCommand({
  docs: {
    brief: "Bulk-create transactions from a JSON or CSV file without creating duplicates",
    fullDescription:
      "Creates many transactions in one API request. Rows: date (YYYY-MM-DD), amount, and " +
      "optionally payee_name, payee_id, memo, category_id, cleared, approved, flag_color, " +
      "import_id, account_id. JSON is an array of rows or { \"transactions\": [...] }; CSV needs " +
      "a header row.\n\n" +
      "Rows without import_id get a YNAB-style one (YNAB:<milliunits>:<date>:<occurrence>), the " +
      "same format bank imports use, so re-running a file never duplicates. Output reports " +
      "created vs duplicates. Rows default to cleared=cleared and are unapproved unless the row " +
      "says approved.\n\n" +
      "--dry-run sends nothing and estimates duplicates with one GET per account.",
  },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
      "account-id": {
        kind: "parsed",
        parse: String,
        brief: "Account for rows that have no account_id",
        optional: true,
      },
      file: { kind: "parsed", parse: String, brief: "Path to a .json or .csv file" },
      amounts: {
        kind: "enum",
        values: ["milliunits", "currency"],
        brief: "Unit of the amount column: milliunits (-12340) or currency (-12.34)",
        default: "milliunits",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Validate, assign import IDs and estimate duplicates without creating anything",
        default: false,
      },
      ...outputFlags,
    },
  },
  async func(this: void, flags: ImportTransactionsFlags) {
    const config = await loadConfigOrExit();
    const budgetId = flags["budget-id"] !== "last-used"
      ? flags["budget-id"]
      : (config.budgetId ?? "last-used");
    try {
      let text: string;
      try {
        text = await readFile(flags.file, "utf8");
      } catch (err) {
        console.error(`Validation error: cannot read ${flags.file}: ${(err as Error).message}`);
        process.exit(2);
      }
      const rows = parseImportFile(text, flags.file, flags.amounts);
      const client = new YnabClient(config);
      const result = await client.importTransactions(budgetId, rows, {
        defaultAccountId: flags["account-id"],
        dryRun: flags["dry-run"],
      });
      console.log(formatOutput(result, flags));
    } catch (err) {
      handleError(err);
    }
  },
});
