import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetMonthFlags {
  readonly "budget-id": string;
}

export const getMonthCommand = buildCommand({
  docs: { brief: "Get a specific budget month" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
    },
    positional: {
      kind: "tuple",
      parameters: [{ brief: "Month (YYYY-MM-01)", parse: String }],
    },
  },
  async func(this: void, flags: GetMonthFlags, month: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getMonth(flags["budget-id"], month);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
