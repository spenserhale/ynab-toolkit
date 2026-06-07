import { encode } from "@toon-format/toon";

export const outputFlags = {
  toon: { kind: "boolean" as const, brief: "Output as TOON (default)", default: false },
  json: { kind: "boolean" as const, brief: "Output as JSON",           default: false },
  csv:  { kind: "boolean" as const, brief: "Output as CSV (list commands only)", default: false },
};

export interface OutputFlags {
  readonly toon: boolean;
  readonly json: boolean;
  readonly csv:  boolean;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      const s = JSON.stringify(val);
      return `"${s.replace(/"/g, '""')}"`;
    }
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ].join("\n");
}

export function formatOutput(data: unknown, flags: OutputFlags): string {
  if (flags.json) return JSON.stringify(data, null, 2);
  if (flags.csv) {
    let csvData: unknown = data;
    if (!Array.isArray(data) && typeof data === "object" && data !== null) {
      const arrayProp = Object.values(data as Record<string, unknown>).find(Array.isArray);
      if (arrayProp !== undefined) csvData = arrayProp;
    }
    if (!Array.isArray(csvData)) {
      console.error(
        "error: --csv requires a list command; this command returns a single object. Use --toon (default) or --json."
      );
      process.exit(2);
    }
    return toCsv(csvData as Record<string, unknown>[]);
  }
  // TOON is the default; flags.toon is accepted but not needed (fallthrough always produces TOON)
  return encode(data);
}
