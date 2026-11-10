import { z } from "zod";
import {
  IsoDateSchema,
  TransactionClearedStatusSchema,
  TransactionFlagColorSchema,
} from "./types.js";
import type { SaveTransactionParams } from "./types.js";
import { YnabValidationError } from "./errors.js";

/**
 * One row of a bulk transaction import. `account_id` may be omitted when the
 * caller supplies a default account. `amount` is milliunits.
 */
export const ImportTransactionRowSchema = z.object({
  account_id: z.string().min(1).optional(),
  date: IsoDateSchema,
  amount: z.number().int("Amount must be an integer number of milliunits"),
  payee_name: z.string().max(200).optional().nullable(),
  payee_id: z.string().optional().nullable(),
  memo: z.string().max(500).optional().nullable(),
  category_id: z.string().optional().nullable(),
  cleared: TransactionClearedStatusSchema.optional(),
  approved: z.boolean().optional(),
  flag_color: TransactionFlagColorSchema.optional().nullable(),
  import_id: z.string().max(36).optional().nullable(),
});

export type ImportTransactionRow = z.infer<typeof ImportTransactionRowSchema>;

export interface PreparedImport {
  transactions: SaveTransactionParams[];
  /** How many import_ids were generated (vs supplied in the input). */
  generated_import_ids: number;
}

/**
 * The YNAB import_id format used by Direct Import and File Based Import:
 * `YNAB:<milliunits>:<YYYY-MM-DD>:<occurrence>`. Using it means a statement
 * import and a later bank connection on the same account will not duplicate.
 */
export function ynabImportId(amount: number, date: string, occurrence: number): string {
  return `YNAB:${amount}:${date}:${occurrence}`;
}

/**
 * Turn import rows into save params: fill in the default account, default
 * `cleared` to "cleared" (statement rows have posted), and generate YNAB-style
 * import_ids for rows without one.
 *
 * Occurrence numbers count rows with the same account, amount and date in file
 * order, skipping any numbers already taken by supplied import_ids. Re-running
 * the same file produces the same ids, so YNAB reports them as duplicates
 * instead of creating them again. A file that covers a day only partly and is
 * later re-imported with more rows for that day can shift occurrences; import
 * whole statement periods to avoid that.
 */
export function prepareImport(
  rows: ImportTransactionRow[],
  options: { defaultAccountId?: string } = {}
): PreparedImport {
  const parsed = rows.map((row, i) => {
    const result = ImportTransactionRowSchema.safeParse(row);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
      throw new ImportRowError(i + 1, `${where}${issue?.message ?? "invalid row"}`);
    }
    const accountId = result.data.account_id ?? options.defaultAccountId;
    if (!accountId) {
      throw new ImportRowError(i + 1, "account_id is missing and no default account was given");
    }
    return { ...result.data, account_id: accountId };
  });

  const used = new Set<string>();
  for (const row of parsed) {
    if (row.import_id) used.add(`${row.account_id}|${row.import_id}`);
  }

  const counters = new Map<string, number>();
  let generated = 0;
  const transactions = parsed.map((row): SaveTransactionParams => {
    let importId = row.import_id ?? null;
    if (!importId) {
      const key = `${row.account_id}|${row.amount}|${row.date}`;
      let occurrence = counters.get(key) ?? 0;
      do {
        occurrence += 1;
        importId = ynabImportId(row.amount, row.date, occurrence);
      } while (used.has(`${row.account_id}|${importId}`));
      counters.set(key, occurrence);
      used.add(`${row.account_id}|${importId}`);
      generated += 1;
    }
    return {
      account_id: row.account_id,
      date: row.date,
      amount: row.amount,
      payee_id: row.payee_id ?? undefined,
      payee_name: row.payee_name ?? undefined,
      category_id: row.category_id ?? undefined,
      memo: row.memo ?? undefined,
      cleared: row.cleared ?? "cleared",
      approved: row.approved,
      flag_color: row.flag_color ?? undefined,
      import_id: importId,
    };
  });

  return { transactions, generated_import_ids: generated };
}

export class ImportRowError extends YnabValidationError {
  constructor(public readonly row: number, detail: string) {
    super(`Row ${row}: ${detail}`);
    this.name = "ImportRowError";
  }
}
