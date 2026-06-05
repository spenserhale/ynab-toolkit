import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const YnabConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().default("https://api.ynab.com/v1"),
});

export type YnabConfig = z.infer<typeof YnabConfigSchema>;

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
  "mortgage",
  "autoLoan",
  "studentLoan",
  "personalLoan",
  "medicalDebt",
  "otherDebt",
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

// ---------------------------------------------------------------------------
// Payee schemas
// ---------------------------------------------------------------------------

export const PayeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  transfer_account_id: z.string().optional().nullable(),
  deleted: z.boolean(),
});

export type Payee = z.infer<typeof PayeeSchema>;

// ---------------------------------------------------------------------------
// Transaction schemas
// ---------------------------------------------------------------------------

export const TransactionClearedStatusSchema = z.enum(["cleared", "uncleared", "reconciled"]);
export type TransactionClearedStatus = z.infer<typeof TransactionClearedStatusSchema>;

export const SubTransactionSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  amount: z.number().int(),
  memo: z.string().optional().nullable(),
  payee_id: z.string().optional().nullable(),
  payee_name: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  category_name: z.string().optional().nullable(),
  deleted: z.boolean(),
});

export type SubTransaction = z.infer<typeof SubTransactionSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.number().int(),
  memo: z.string().optional().nullable(),
  cleared: TransactionClearedStatusSchema,
  approved: z.boolean(),
  account_id: z.string(),
  payee_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  transfer_account_id: z.string().optional().nullable(),
  import_id: z.string().optional().nullable(),
  deleted: z.boolean(),
  account_name: z.string(),
  subtransactions: z.array(SubTransactionSchema),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const SaveTransactionParamsSchema = z.object({
  account_id: z.string(),
  date: z.string(),
  amount: z.number().int(),
  payee_id: z.string().optional().nullable(),
  payee_name: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  cleared: TransactionClearedStatusSchema.optional(),
  approved: z.boolean().optional(),
  import_id: z.string().optional().nullable(),
});

export type SaveTransactionParams = z.infer<typeof SaveTransactionParamsSchema>;

export const BulkCreateTransactionsResponseSchema = z.object({
  transaction_ids: z.array(z.string()),
  duplicate_import_ids: z.array(z.string()).optional(),
  server_knowledge: z.number().optional(),
});

export type BulkCreateTransactionsResponse = z.infer<typeof BulkCreateTransactionsResponseSchema>;

// ---------------------------------------------------------------------------
// Scheduled Transaction schemas
// ---------------------------------------------------------------------------

export const ScheduledTransactionFrequencySchema = z.enum([
  "never",
  "daily",
  "weekly",
  "everyOtherWeek",
  "twiceAMonth",
  "every4Weeks",
  "monthly",
  "everyOtherMonth",
  "every3Months",
  "every4Months",
  "twiceAYear",
  "yearly",
  "everyOtherYear",
]);

export type ScheduledTransactionFrequency = z.infer<typeof ScheduledTransactionFrequencySchema>;

export const ScheduledTransactionSchema = z.object({
  id: z.string(),
  date_first: z.string(),
  date_next: z.string(),
  frequency: ScheduledTransactionFrequencySchema,
  amount: z.number().int(),
  memo: z.string().optional().nullable(),
  account_id: z.string(),
  payee_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  deleted: z.boolean(),
});

export type ScheduledTransaction = z.infer<typeof ScheduledTransactionSchema>;

// ---------------------------------------------------------------------------
// Month schemas
// ---------------------------------------------------------------------------

export const MonthSummarySchema = z.object({
  month: z.string(),
  note: z.string().optional().nullable(),
  income: z.number().int(),
  budgeted: z.number().int(),
  activity: z.number().int(),
  to_be_budgeted: z.number().int(),
  age_of_money: z.number().optional().nullable(),
  deleted: z.boolean(),
});

export type MonthSummary = z.infer<typeof MonthSummarySchema>;

export const MonthDetailSchema = MonthSummarySchema.extend({
  categories: z.array(CategorySchema),
});

export type MonthDetail = z.infer<typeof MonthDetailSchema>;
