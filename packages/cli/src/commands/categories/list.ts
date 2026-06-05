import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface ListCategoriesFlags {
  readonly "budget-id": string;
}

export const listCategoriesCommand = buildCommand({
  docs: { brief: "List all category groups and their categories" },
  parameters: {
    flags: {
      "budget-id": {
        kind: "parsed",
        parse: String,
        brief: "Budget ID",
        default: "last-used",
      },
    },
  },
  async func(this: void, flags: ListCategoriesFlags) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.listCategories(flags["budget-id"]);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
