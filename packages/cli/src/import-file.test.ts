import { describe, it, expect } from "bun:test";
import { YnabValidationError, prepareImport } from "@ynab-toolkit/sdk";
import { currencyToMilliunits, parseCsv, parseImportFile } from "./import-file.js";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });

  it("skips blank lines and strips a BOM", () => {
    expect(parseCsv("﻿a\n\n1\n")).toEqual([["a"], ["1"]]);
  });

  it("rejects an unterminated quote", () => {
    expect(() => parseCsv('a\n"oops')).toThrow(YnabValidationError);
  });
});

describe("currencyToMilliunits", () => {
  it("converts without float drift", () => {
    expect(currencyToMilliunits("-294.23")).toBe(-294230);
    expect(currencyToMilliunits("0.1")).toBe(100);
    expect(currencyToMilliunits("1,234.5")).toBe(1234500);
    expect(currencyToMilliunits("$12")).toBe(12000);
    expect(currencyToMilliunits("12.3456")).toBeNaN();
    expect(currencyToMilliunits("abc")).toBeNaN();
  });
});

describe("parseImportFile", () => {
  it("reads CSV with header aliases and ignores unknown columns", () => {
    const csv = "Date,Amount,Payee,Memo,Approved,Extra\n2026-10-01,-5000,Store,\"a, b\",yes,zzz\n";
    expect(parseImportFile(csv, "s.csv", "milliunits")).toEqual([
      { date: "2026-10-01", amount: -5000, payee_name: "Store", memo: "a, b", approved: true, extra: "zzz" } as never,
    ]);
  });

  it("converts currency amounts in CSV", () => {
    const rows = parseImportFile("date,amount\n2026-10-01,-12.34\n", "s.csv", "currency");
    expect(rows[0]!.amount).toBe(-12340);
  });

  it("requires date and amount columns", () => {
    expect(() => parseImportFile("date,payee\n2026-10-01,x\n", "s.csv", "milliunits")).toThrow(/amount/);
  });

  it("reads a JSON array or { transactions: [...] }", () => {
    const row = { date: "2026-10-01", amount: -5000, payee_name: "Store" };
    expect(parseImportFile(JSON.stringify([row]), "s.json", "milliunits")).toEqual([row]);
    expect(parseImportFile(JSON.stringify({ transactions: [row] }), "s.json", "milliunits")).toEqual([row]);
    expect(parseImportFile(JSON.stringify([{ ...row, amount: -12.34 }]), "s.json", "currency")[0]!.amount).toBe(-12340);
  });

  it("rejects invalid JSON and the wrong JSON shape", () => {
    expect(() => parseImportFile("[oops", "s.json", "milliunits")).toThrow(YnabValidationError);
    expect(() => parseImportFile('{"rows": []}', "s.json", "milliunits")).toThrow(/transactions/);
  });

  it("a non-numeric milliunit amount fails validation in prepareImport", () => {
    const rows = parseImportFile("date,amount\n2026-10-01,abc\n", "s.csv", "milliunits");
    expect(() => prepareImport(rows, { defaultAccountId: "a" })).toThrow(/Row 1: amount/);
  });
});
