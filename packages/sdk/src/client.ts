import type {
  YnabConfig,
  BudgetSummary,
  Account,
  SaveAccountParams,
  Category,
  CategoryGroup,
  Payee,
  Transaction,
  SaveTransactionParams,
  BulkCreateTransactionsResponse,
  ImportLinkedTransactionsResponse,
  ScheduledTransaction,
  MonthSummary,
  MonthDetail,
} from "./types.js";
import {
  YnabConfigSchema,
  ErrorResponseSchema,
  BudgetSummarySchema,
  AccountSchema,
  SaveAccountParamsSchema,
  CategorySchema,
  CategoryGroupSchema,
  PayeeSchema,
  TransactionSchema,
  BulkCreateTransactionsResponseSchema,
  ImportLinkedTransactionsResponseSchema,
  ScheduledTransactionSchema,
  MonthSummarySchema,
  MonthDetailSchema,
} from "./types.js";
import {
  YnabError,
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
  YnabValidationError,
} from "./errors.js";
import { checkAccountBalanceSign, findOpenAccountByName } from "./accounts.js";
import { prepareImport } from "./imports.js";
import type { ImportTransactionRow } from "./imports.js";

export interface ImportTransactionsResult {
  dry_run: boolean;
  /** Rows in the input. */
  total: number;
  /** Created, or (dry run) would be created. */
  created: number;
  /** Skipped because the import_id already exists on the account. */
  duplicates: number;
  generated_import_ids: number;
  transaction_ids: string[];
  duplicate_import_ids: string[];
  server_knowledge?: number;
  /** Dry run only: the transactions that would be sent. */
  transactions?: SaveTransactionParams[];
  note?: string;
}

export class YnabClient {
  private readonly config: YnabConfig;

  constructor(config: Partial<YnabConfig> & { apiKey: string }) {
    this.config = YnabConfigSchema.parse(config);
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      if (res.status === 401) throw new YnabAuthError();
      if (res.status === 429) throw new YnabRateLimitError();
      if (res.status === 404) throw new YnabNotFoundError();

      const errorBody = await res.json().catch(() => null);
      const parsed = ErrorResponseSchema.safeParse(errorBody);

      throw new YnabError(
        parsed.success ? parsed.data.error.detail : `HTTP ${res.status}`,
        parsed.success ? parsed.data.error.id : "UNKNOWN",
        res.status
      );
    }

    const json = (await res.json()) as { data: T };
    return json.data;
  }

  // -------------------------------------------------------------------------
  // Budgets  (GET /plans, GET /plans/{plan_id})
  // -------------------------------------------------------------------------

  // The list endpoint (GET /plans) is not a delta endpoint — it has no
  // server_knowledge and returns the user's plans plus an optional default.
  async listBudgets(): Promise<{
    budgets: BudgetSummary[];
    default_budget?: BudgetSummary;
  }> {
    const data = await this.request<{ plans: unknown[]; default_plan?: unknown }>(
      "GET", `/plans`
    );
    return {
      budgets: BudgetSummarySchema.array().parse(data.plans),
      default_budget:
        data.default_plan === undefined || data.default_plan === null
          ? undefined
          : BudgetSummarySchema.parse(data.default_plan),
    };
  }

  async getBudget(budgetId: string): Promise<BudgetSummary> {
    const data = await this.request<{ plan: unknown; server_knowledge: number }>(
      "GET", `/plans/${budgetId}`
    );
    return BudgetSummarySchema.parse(data.plan);
  }

  // -------------------------------------------------------------------------
  // Accounts  (GET /plans/{id}/accounts, GET /plans/{id}/accounts/{id})
  // -------------------------------------------------------------------------

  async listAccounts(
    budgetId: string,
    lastKnowledgeOfServer?: number
  ): Promise<{ accounts: Account[]; server_knowledge: number }> {
    const query =
      lastKnowledgeOfServer !== undefined
        ? `?last_knowledge_of_server=${lastKnowledgeOfServer}`
        : "";
    const data = await this.request<{ accounts: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/accounts${query}`
    );
    return {
      accounts: AccountSchema.array().parse(data.accounts),
      server_knowledge: data.server_knowledge,
    };
  }

  async getAccount(budgetId: string, accountId: string): Promise<Account> {
    const data = await this.request<{ account: unknown }>(
      "GET",
      `/plans/${budgetId}/accounts/${accountId}`
    );
    return AccountSchema.parse(data.account);
  }

  /**
   * Create an account (POST /plans/{id}/accounts). The API only accepts the
   * types in SaveAccountTypeSchema. Liability balances must be <= 0 unless
   * `allowPositiveLiability` is set (an overpaid credit card).
   */
  async createAccount(
    budgetId: string,
    params: SaveAccountParams,
    options: { allowPositiveLiability?: boolean } = {}
  ): Promise<Account> {
    const account = validateSaveAccount(params, options);
    const data = await this.request<{ account: unknown }>(
      "POST",
      `/plans/${budgetId}/accounts`,
      { account }
    );
    return AccountSchema.parse(data.account);
  }

  /**
   * Idempotent create: if an open account with the same name exists (trimmed,
   * case-insensitive), return it instead of creating a duplicate. Costs one
   * extra GET. With `dryRun`, nothing is created.
   */
  async createAccountIfNotExists(
    budgetId: string,
    params: SaveAccountParams,
    options: { allowPositiveLiability?: boolean; dryRun?: boolean } = {}
  ): Promise<{ created: boolean; dry_run: boolean; account: Account | SaveAccountParams; note?: string }> {
    const account = validateSaveAccount(params, options);
    const { accounts } = await this.listAccounts(budgetId);
    const existing = findOpenAccountByName(accounts, account.name);
    if (existing) {
      const typeNote = existing.type !== account.type
        ? ` Its type is ${existing.type}, not the requested ${account.type}.`
        : "";
      return {
        created: false,
        dry_run: options.dryRun ?? false,
        account: existing,
        note: `An open account named "${existing.name}" already exists; nothing was created.${typeNote}`,
      };
    }
    if (options.dryRun) {
      return { created: false, dry_run: true, account, note: "Dry run: the account would be created." };
    }
    return {
      created: true,
      dry_run: false,
      account: await this.createAccount(budgetId, account, options),
    };
  }

  // -------------------------------------------------------------------------
  // Categories  (GET /plans/{id}/categories, GET /plans/{id}/categories/{id},
  //              PATCH /plans/{id}/months/{month}/categories/{id})
  // -------------------------------------------------------------------------

  async listCategories(
    budgetId: string,
    lastKnowledgeOfServer?: number
  ): Promise<{ category_groups: CategoryGroup[]; server_knowledge: number }> {
    const query =
      lastKnowledgeOfServer !== undefined
        ? `?last_knowledge_of_server=${lastKnowledgeOfServer}`
        : "";
    const data = await this.request<{ category_groups: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/categories${query}`
    );
    return {
      category_groups: CategoryGroupSchema.array().parse(data.category_groups),
      server_knowledge: data.server_knowledge,
    };
  }

  async getCategory(budgetId: string, categoryId: string): Promise<Category> {
    const data = await this.request<{ category: unknown }>(
      "GET",
      `/plans/${budgetId}/categories/${categoryId}`
    );
    return CategorySchema.parse(data.category);
  }

  async updateMonthCategory(
    budgetId: string,
    month: string,
    categoryId: string,
    budgeted: number
  ): Promise<Category> {
    const data = await this.request<{ category: unknown }>(
      "PATCH",
      `/plans/${budgetId}/months/${month}/categories/${categoryId}`,
      { month_category: { budgeted } }
    );
    return CategorySchema.parse(data.category);
  }

  // -------------------------------------------------------------------------
  // Payees  (GET /plans/{id}/payees, GET /plans/{id}/payees/{id})
  // -------------------------------------------------------------------------

  async listPayees(
    budgetId: string,
    lastKnowledgeOfServer?: number
  ): Promise<{ payees: Payee[]; server_knowledge: number }> {
    const query =
      lastKnowledgeOfServer !== undefined
        ? `?last_knowledge_of_server=${lastKnowledgeOfServer}`
        : "";
    const data = await this.request<{ payees: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/payees${query}`
    );
    return {
      payees: PayeeSchema.array().parse(data.payees),
      server_knowledge: data.server_knowledge,
    };
  }

  async getPayee(budgetId: string, payeeId: string): Promise<Payee> {
    const data = await this.request<{ payee: unknown }>(
      "GET",
      `/plans/${budgetId}/payees/${payeeId}`
    );
    return PayeeSchema.parse(data.payee);
  }

  // -------------------------------------------------------------------------
  // Transactions  (GET/POST/PUT/DELETE /plans/{id}/transactions[/{id}])
  // -------------------------------------------------------------------------

  async listTransactions(
    budgetId: string,
    params?: { lastKnowledgeOfServer?: number; sinceDate?: string }
  ): Promise<{ transactions: Transaction[]; server_knowledge: number }> {
    const query = new URLSearchParams();
    if (params?.lastKnowledgeOfServer !== undefined) {
      query.set("last_knowledge_of_server", String(params.lastKnowledgeOfServer));
    }
    if (params?.sinceDate !== undefined) {
      query.set("since_date", params.sinceDate);
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    const data = await this.request<{ transactions: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/transactions${qs}`
    );
    return {
      transactions: TransactionSchema.array().parse(data.transactions),
      server_knowledge: data.server_knowledge,
    };
  }

  /** Transactions for one account (GET /plans/{id}/accounts/{id}/transactions). */
  async listAccountTransactions(
    budgetId: string,
    accountId: string,
    params?: { sinceDate?: string; lastKnowledgeOfServer?: number }
  ): Promise<{ transactions: Transaction[]; server_knowledge: number }> {
    const query = new URLSearchParams();
    if (params?.sinceDate !== undefined) query.set("since_date", params.sinceDate);
    if (params?.lastKnowledgeOfServer !== undefined) {
      query.set("last_knowledge_of_server", String(params.lastKnowledgeOfServer));
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    const data = await this.request<{ transactions: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/accounts/${accountId}/transactions${qs}`
    );
    return {
      transactions: TransactionSchema.array().parse(data.transactions),
      server_knowledge: data.server_knowledge,
    };
  }

  async getTransaction(budgetId: string, transactionId: string): Promise<Transaction> {
    const data = await this.request<{ transaction: unknown }>(
      "GET",
      `/plans/${budgetId}/transactions/${transactionId}`
    );
    return TransactionSchema.parse(data.transaction);
  }

  async createTransaction(
    budgetId: string,
    transaction: SaveTransactionParams
  ): Promise<{ transaction: Transaction; duplicate_import_ids?: string[] }> {
    const data = await this.request<{ transaction: unknown; duplicate_import_ids?: string[] }>(
      "POST", `/plans/${budgetId}/transactions`, { transaction }
    );
    return {
      transaction: TransactionSchema.parse(data.transaction),
      duplicate_import_ids: data.duplicate_import_ids,
    };
  }

  async createTransactions(
    budgetId: string,
    transactions: SaveTransactionParams[]
  ): Promise<BulkCreateTransactionsResponse> {
    const data = await this.request<unknown>(
      "POST",
      `/plans/${budgetId}/transactions`,
      { transactions }
    );
    return BulkCreateTransactionsResponseSchema.parse(data);
  }

  /**
   * Bulk-create transactions from import rows in a single POST. Rows without
   * an import_id get a YNAB-style one, so re-running the same rows creates
   * nothing new; YNAB reports those as duplicate_import_ids.
   *
   * With `dryRun`, nothing is created. Existing import_ids are fetched with one
   * GET per account (since the earliest row date) to estimate duplicates. The
   * estimate can miss deleted transactions, which YNAB still counts.
   */
  async importTransactions(
    budgetId: string,
    rows: ImportTransactionRow[],
    options: { defaultAccountId?: string; dryRun?: boolean } = {}
  ): Promise<ImportTransactionsResult> {
    const prepared = prepareImport(rows, { defaultAccountId: options.defaultAccountId });
    const base = {
      dry_run: options.dryRun ?? false,
      total: prepared.transactions.length,
      generated_import_ids: prepared.generated_import_ids,
    };
    if (prepared.transactions.length === 0) {
      return { ...base, created: 0, duplicates: 0, transaction_ids: [], duplicate_import_ids: [] };
    }

    if (options.dryRun) {
      const byAccount = new Map<string, SaveTransactionParams[]>();
      for (const t of prepared.transactions) {
        const list = byAccount.get(t.account_id) ?? [];
        list.push(t);
        byAccount.set(t.account_id, list);
      }
      const duplicateIds: string[] = [];
      const toCreate: SaveTransactionParams[] = [];
      for (const [accountId, txns] of byAccount) {
        const since = txns.map((t) => t.date).sort()[0];
        const { transactions: existing } = await this.listAccountTransactions(budgetId, accountId, {
          sinceDate: since,
        });
        const existingIds = new Set(existing.map((t) => t.import_id).filter(Boolean));
        for (const t of txns) {
          if (t.import_id && existingIds.has(t.import_id)) duplicateIds.push(t.import_id);
          else toCreate.push(t);
        }
      }
      return {
        ...base,
        created: toCreate.length,
        duplicates: duplicateIds.length,
        transaction_ids: [],
        duplicate_import_ids: duplicateIds,
        transactions: toCreate,
        note: "Dry run: nothing was created. Duplicate counts are an estimate.",
      };
    }

    const result = await this.createTransactions(budgetId, prepared.transactions);
    const duplicateIds = result.duplicate_import_ids ?? [];
    return {
      ...base,
      created: result.transaction_ids.length,
      duplicates: duplicateIds.length,
      transaction_ids: result.transaction_ids,
      duplicate_import_ids: duplicateIds,
      server_knowledge: result.server_knowledge,
    };
  }

  /**
   * Ask YNAB to import new transactions from linked accounts now
   * (POST /plans/{id}/transactions/import). Returns the imported ids.
   *
   * YNAB marks this endpoint deprecated (spec v1.90.0): it says linked
   * accounts import automatically and the response is always empty. It is
   * wrapped anyway as a fallback while that behavior varies by institution.
   * It never imports accounts that have no bank connection; use
   * importTransactions() for those.
   */
  async importLinkedTransactions(budgetId: string): Promise<ImportLinkedTransactionsResponse> {
    const data = await this.request<unknown>("POST", `/plans/${budgetId}/transactions/import`);
    return ImportLinkedTransactionsResponseSchema.parse(data);
  }

  async updateTransaction(
    budgetId: string,
    transactionId: string,
    transaction: SaveTransactionParams
  ): Promise<Transaction> {
    const data = await this.request<{ transaction: unknown }>(
      "PUT",
      `/plans/${budgetId}/transactions/${transactionId}`,
      { transaction }
    );
    return TransactionSchema.parse(data.transaction);
  }

  async deleteTransaction(budgetId: string, transactionId: string): Promise<Transaction> {
    const data = await this.request<{ transaction: unknown }>(
      "DELETE",
      `/plans/${budgetId}/transactions/${transactionId}`
    );
    return TransactionSchema.parse(data.transaction);
  }

  // -------------------------------------------------------------------------
  // Scheduled Transactions  (GET /plans/{id}/scheduled_transactions[/{id}])
  // -------------------------------------------------------------------------

  async listScheduledTransactions(
    budgetId: string,
    lastKnowledgeOfServer?: number
  ): Promise<{ scheduled_transactions: ScheduledTransaction[]; server_knowledge: number }> {
    const query =
      lastKnowledgeOfServer !== undefined
        ? `?last_knowledge_of_server=${lastKnowledgeOfServer}`
        : "";
    const data = await this.request<{ scheduled_transactions: unknown[]; server_knowledge: number }>(
      "GET", `/plans/${budgetId}/scheduled_transactions${query}`
    );
    return {
      scheduled_transactions: ScheduledTransactionSchema.array().parse(data.scheduled_transactions),
      server_knowledge: data.server_knowledge,
    };
  }

  async getScheduledTransaction(
    budgetId: string,
    scheduledTransactionId: string
  ): Promise<ScheduledTransaction> {
    const data = await this.request<{ scheduled_transaction: unknown }>(
      "GET",
      `/plans/${budgetId}/scheduled_transactions/${scheduledTransactionId}`
    );
    return ScheduledTransactionSchema.parse(data.scheduled_transaction);
  }

  // -------------------------------------------------------------------------
  // Months  (GET /plans/{id}/months, GET /plans/{id}/months/{month})
  // -------------------------------------------------------------------------

  async listMonths(budgetId: string): Promise<{ months: MonthSummary[] }> {
    const data = await this.request<{ months: unknown[] }>(
      "GET", `/plans/${budgetId}/months`
    );
    return { months: MonthSummarySchema.array().parse(data.months) };
  }

  async getMonth(budgetId: string, month: string): Promise<MonthDetail> {
    const data = await this.request<{ month: unknown }>(
      "GET",
      `/plans/${budgetId}/months/${month}`
    );
    return MonthDetailSchema.parse(data.month);
  }
}

function validateSaveAccount(
  params: SaveAccountParams,
  options: { allowPositiveLiability?: boolean }
): SaveAccountParams {
  const parsed = SaveAccountParamsSchema.safeParse(params);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new YnabValidationError(`${where}${issue?.message ?? "invalid account"}`);
  }
  if (!options.allowPositiveLiability) {
    const signError = checkAccountBalanceSign(parsed.data.type, parsed.data.balance);
    if (signError) throw new YnabValidationError(signError);
  }
  return parsed.data;
}
