import type { FastMCP } from "fastmcp";

export function registerResourceTools(_server: FastMCP): never {
  throw new Error(
    "registerResourceTools not implemented: wire real YNAB MCP tools before starting the server"
  );
}
