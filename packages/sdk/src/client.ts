import type {
  YnabConfig,
  BudgetSummary,
  Account,
  Category,
  CategoryGroup,
  Payee,
  Transaction,
  SaveTransactionParams,
  BulkCreateTransactionsResponse,
  ScheduledTransaction,
  MonthSummary,
  MonthDetail,
} from "./types.js";
import {
  YnabConfigSchema,
  ErrorResponseSchema,
  BudgetSummarySchema,
  AccountSchema,
  CategorySchema,
  CategoryGroupSchema,
  PayeeSchema,
  TransactionSchema,
  BulkCreateTransactionsResponseSchema,
  ScheduledTransactionSchema,
  MonthSummarySchema,
  MonthDetailSchema,
} from "./types.js";
import {
  YnabError,
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
} from "./errors.js";

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

  async listBudgets(
    lastKnowledgeOfServer?: number
  ): Promise<{ budgets: BudgetSummary[]; server_knowledge: number }> {
    const query =
      lastKnowledgeOfServer !== undefined
        ? `?last_knowledge_of_server=${lastKnowledgeOfServer}`
        : "";
    const data = await this.request<{ budgets: unknown[]; server_knowledge: number }>(
      "GET", `/plans${query}`
    );
    return {
      budgets: BudgetSummarySchema.array().parse(data.budgets),
      server_knowledge: data.server_knowledge,
    };
  }

  async getBudget(budgetId: string): Promise<BudgetSummary> {
    const data = await this.request<{ budget: unknown; server_knowledge: number }>(
      "GET", `/plans/${budgetId}`
    );
    return BudgetSummarySchema.parse(data.budget);
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
