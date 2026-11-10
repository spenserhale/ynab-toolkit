import { YnabValidationError } from "@ynab-toolkit/sdk";
import type { ImportTransactionRow } from "@ynab-toolkit/sdk";

export type AmountUnit = "milliunits" | "currency";

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (inQuotes) throw new YnabValidationError("CSV has an unterminated quoted field");
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, keyof ImportTransactionRow> = {
  payee: "payee_name",
  category: "category_id",
  flag: "flag_color",
  account: "account_id",
};

/** Convert a decimal currency string ("-12.34") to integer milliunits without float drift. */
export function currencyToMilliunits(value: string): number {
  const m = /^\s*([+-])?\$?(\d+)(?:\.(\d{1,3}))?\s*$/.exec(value.replace(/,/g, ""));
  if (!m) return Number.NaN;
  const whole = Number(m[2]) * 1000 + Number((m[3] ?? "").padEnd(3, "0") || "0");
  return m[1] === "-" ? -whole : whole;
}

function toAmount(value: unknown, unit: AmountUnit): unknown {
  if (unit === "currency") {
    return typeof value === "number" ? Math.round(value * 1000) : currencyToMilliunits(String(value));
  }
  return typeof value === "string" ? (value.trim() === "" ? Number.NaN : Number(value)) : value;
}

function toBool(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (v === "") return undefined;
  if (["true", "yes", "1", "y"].includes(v)) return true;
  if (["false", "no", "0", "n"].includes(v)) return false;
  return v as unknown as boolean; // let schema validation report it
}

/**
 * Read import rows from JSON (an array, or `{ "transactions": [...] }`) or CSV
 * with a header row. Recognised CSV columns: date, amount, payee_name (or
 * payee), payee_id, memo, category_id, cleared, approved, flag_color,
 * import_id, account_id. Unknown columns are ignored.
 */
export function parseImportFile(text: string, path: string, unit: AmountUnit): ImportTransactionRow[] {
  const isJson = path.toLowerCase().endsWith(".json") || /^\s*[[{]/.test(text);
  if (isJson) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new YnabValidationError(`Invalid JSON in ${path}: ${(err as Error).message}`);
    }
    const rows = Array.isArray(data)
      ? data
      : (data as { transactions?: unknown })?.transactions;
    if (!Array.isArray(rows)) {
      throw new YnabValidationError(`${path} must hold an array of rows or { "transactions": [...] }`);
    }
    return rows.map((r) => ({ ...(r as object), amount: toAmount((r as { amount?: unknown }).amount, unit) }) as ImportTransactionRow);
  }

  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const columns = header.map((h) => {
    const key = h.trim().toLowerCase().replace(/[\s-]+/g, "_");
    return HEADER_ALIASES[key] ?? key;
  });
  for (const required of ["date", "amount"]) {
    if (!columns.includes(required)) {
      throw new YnabValidationError(`CSV header must include a "${required}" column`);
    }
  }
  return body.map((cells) => {
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      const raw = (cells[i] ?? "").trim();
      if (raw === "" && col !== "amount") return;
      if (col === "amount") row.amount = toAmount(raw, unit);
      else if (col === "approved") row.approved = toBool(raw);
      else row[col] = raw;
    });
    return row as ImportTransactionRow;
  });
}
