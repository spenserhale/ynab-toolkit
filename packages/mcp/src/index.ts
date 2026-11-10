import { FastMCP } from "fastmcp";
import { registerConfigTools } from "./tools/config.js";
import { registerResourceTools } from "./tools/resources.js";

export const SERVER_VERSION = "0.2.0";

const server = new FastMCP({
  name: "ynab-toolkit",
  version: SERVER_VERSION,
});

// Read-only tools. There is deliberately no tool that writes or deletes secrets:
// credentials are managed with the `ynab auth` CLI commands.
registerConfigTools(server);
registerResourceTools(server);

// Start the server in stdio mode (for Claude Desktop, Cursor, etc.)
server.start({
  transportType: "stdio",
});
