import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const YnabConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().default("https://api.ynab.com/v1"),
});

export type YnabConfig = z.infer<typeof YnabConfigSchema>;

// ---------------------------------------------------------------------------
// API Resource schemas -- add your own here
// ---------------------------------------------------------------------------

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Resource = z.infer<typeof ResourceSchema>;

export const ListResourcesParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type ListResourcesParams = z.infer<typeof ListResourcesParamsSchema>;

export const CreateResourceParamsSchema = z.object({
  name: z.string().min(1),
});

export type CreateResourceParams = z.infer<typeof CreateResourceParamsSchema>;

// ---------------------------------------------------------------------------
// API Response wrappers
// ---------------------------------------------------------------------------

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export const ErrorResponseSchema = z.object({
  error: z.object({
    id: z.string(),
    name: z.string(),
    detail: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ---------------------------------------------------------------------------
// Budget schemas
// ---------------------------------------------------------------------------

export const BudgetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  last_modified_on: z.string().optional(),
  first_month: z.string().optional(),
  last_month: z.string().optional(),
});

export type BudgetSummary = z.infer<typeof BudgetSummarySchema>;

// ---------------------------------------------------------------------------
// Account schemas
// ---------------------------------------------------------------------------

export const AccountTypeSchema = z.enum([
  "checking",
  "savings",
  "cash",
  "creditCard",
  "lineOfCredit",
  "otherAsset",
  "otherLiability",
  "payPal",
  "merchantAccount",
  "investmentAccount",
  "mortgage",
]);

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AccountTypeSchema,
  on_budget: z.boolean(),
  closed: z.boolean(),
  note: z.string().optional().nullable(),
  balance: z.number().int(),
  cleared_balance: z.number().int(),
  uncleared_balance: z.number().int(),
  transfer_payee_id: z.string(),
  deleted: z.boolean(),
});

export type Account = z.infer<typeof AccountSchema>;

// ---------------------------------------------------------------------------
// Category schemas
// ---------------------------------------------------------------------------

export const CategorySchema = z.object({
  id: z.string(),
  category_group_id: z.string(),
  category_group_name: z.string().optional(),
  name: z.string(),
  hidden: z.boolean(),
  note: z.string().optional().nullable(),
  budgeted: z.number().int(),
  activity: z.number().int(),
  balance: z.number().int(),
  deleted: z.boolean(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CategoryGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hidden: z.boolean(),
  deleted: z.boolean(),
  categories: z.array(CategorySchema),
});

export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;
