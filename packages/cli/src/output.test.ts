import { describe, it, expect, spyOn } from "bun:test";
import { formatOutput } from "./output.js";
import type { OutputFlags } from "./output.js";

const toon: OutputFlags = { toon: false, json: false, csv: false };
const json: OutputFlags = { toon: false, json: true,  csv: false };
const csv:  OutputFlags = { toon: false, json: false, csv: true  };

describe("formatOutput", () => {
  it("defaults to TOON when no flag is set", () => {
    const result = formatOutput({ id: "abc", name: "test" }, toon);
    expect(result).not.toContain('"id"');
    expect(result).toContain("id: abc");
  });

  it("returns TOON when --toon is explicitly set", () => {
    const result = formatOutput({ id: "abc" }, { toon: true, json: false, csv: false });
    expect(result).toContain("id: abc");
    expect(result).not.toContain('"id"');
  });

  it("returns JSON when --json is set", () => {
    const data = { id: "abc", name: "test" };
    const result = formatOutput(data, json);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("--json takes precedence when both --json and --toon are set", () => {
    const data = { id: "abc" };
    const result = formatOutput(data, { toon: true, json: true, csv: false });
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("returns CSV with header row for array data", () => {
    const data = [
      { id: "abc", name: "foo" },
      { id: "def", name: "bar" },
    ];
    const result = formatOutput(data, csv);
    expect(result).toBe("id,name\nabc,foo\ndef,bar");
  });

  it("serializes nested objects as JSON strings in CSV cells", () => {
    const data = [{ id: "abc", meta: { x: 1 } }];
    const result = formatOutput(data, csv);
    const lines = result.split("\n");
    expect(lines[0]).toBe("id,meta");
    // Valid CSV: internal quotes in JSON are doubled
    expect(lines[1]).toBe('abc,"{""x"":1}"');
  });

  it("quotes CSV values that contain commas", () => {
    const data = [{ id: "abc", name: "foo, bar" }];
    const result = formatOutput(data, csv);
    expect(result).toBe('id,name\nabc,"foo, bar"');
  });

  it("returns empty string for empty array with --csv", () => {
    const result = formatOutput([], csv);
    expect(result).toBe("");
  });

  it("writes error to stderr and exits 2 for --csv on non-array", () => {
    const exitSpy = spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error("exit:2");
    });
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    expect(() => formatOutput({ id: "abc" }, csv)).toThrow("exit:2");
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("--csv requires a list command")
    );

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
