import { buildCommand } from "@stricli/core";
import { YnabClient } from "@ynab-toolkit/sdk";
import { resolveConfigOrExit, handleError } from "../../handle-error.js";

interface GetCategoryFlags {
  readonly "budget-id": string;
}

export const getCategoryCommand = buildCommand({
  docs: { brief: "Get a category by ID" },
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
      parameters: [{ brief: "Category ID", parse: String }],
    },
  },
  async func(this: void, flags: GetCategoryFlags, categoryId: string) {
    const config = resolveConfigOrExit();
    try {
      const client = new YnabClient(config);
      const result = await client.getCategory(flags["budget-id"], categoryId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  },
});
