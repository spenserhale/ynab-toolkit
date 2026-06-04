import type {
  YnabConfig,
  Resource,
  ListResourcesParams,
  CreateResourceParams,
  PaginatedResponse,
  BudgetSummary,
  Account,
  Category,
  CategoryGroup,
  Payee,
  Transaction,
  SaveTransactionParams,
} from "./types.js";
import {
  YnabConfigSchema,
  ResourceSchema,
  PaginatedResponseSchema,
  ErrorResponseSchema,
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
  // Resource operations -- add your own here
  // -------------------------------------------------------------------------

  async listResources(
    params: ListResourcesParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Resource>> {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });
    return this.request("GET", `/resources?${query}`);
  }

  async getResource(id: string): Promise<Resource> {
    return this.request("GET", `/resources/${id}`);
  }

  async createResource(params: CreateResourceParams): Promise<Resource> {
    return this.request("POST", "/resources", params);
  }

  async deleteResource(id: string): Promise<void> {
    await this.request("DELETE", `/resources/${id}`);
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
    return this.request("GET", `/plans${query}`);
  }

  async getBudget(budgetId: string): Promise<BudgetSummary> {
    const data = await this.request<{
      budget: BudgetSummary;
      server_knowledge: number;
    }>("GET", `/plans/${budgetId}`);
    return data.budget;
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
    return this.request("GET", `/plans/${budgetId}/accounts${query}`);
  }

  async getAccount(budgetId: string, accountId: string): Promise<Account> {
    const data = await this.request<{ account: Account }>(
      "GET",
      `/plans/${budgetId}/accounts/${accountId}`
    );
    return data.account;
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
    return this.request("GET", `/plans/${budgetId}/categories${query}`);
  }

  async getCategory(budgetId: string, categoryId: string): Promise<Category> {
    const data = await this.request<{ category: Category }>(
      "GET",
      `/plans/${budgetId}/categories/${categoryId}`
    );
    return data.category;
  }

  async updateMonthCategory(
    budgetId: string,
    month: string,
    categoryId: string,
    budgeted: number
  ): Promise<Category> {
    const data = await this.request<{ category: Category }>(
      "PATCH",
      `/plans/${budgetId}/months/${month}/categories/${categoryId}`,
      { month_category: { budgeted } }
    );
    return data.category;
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
    return this.request("GET", `/plans/${budgetId}/payees${query}`);
  }

  async getPayee(budgetId: string, payeeId: string): Promise<Payee> {
    const data = await this.request<{ payee: Payee }>(
      "GET",
      `/plans/${budgetId}/payees/${payeeId}`
    );
    return data.payee;
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
    return this.request("GET", `/plans/${budgetId}/transactions${qs}`);
  }

  async getTransaction(budgetId: string, transactionId: string): Promise<Transaction> {
    const data = await this.request<{ transaction: Transaction }>(
      "GET",
      `/plans/${budgetId}/transactions/${transactionId}`
    );
    return data.transaction;
  }

  async createTransaction(
    budgetId: string,
    transaction: SaveTransactionParams
  ): Promise<{ transaction: Transaction; duplicate_import_ids: string[] }> {
    return this.request("POST", `/plans/${budgetId}/transactions`, {
      transaction,
    });
  }

  async createTransactions(
    budgetId: string,
    transactions: SaveTransactionParams[]
  ): Promise<{ transaction_ids: string[]; duplicate_import_ids: string[] }> {
    return this.request("POST", `/plans/${budgetId}/transactions`, {
      transactions,
    });
  }

  async updateTransaction(
    budgetId: string,
    transactionId: string,
    transaction: SaveTransactionParams
  ): Promise<Transaction> {
    const data = await this.request<{ transaction: Transaction }>(
      "PUT",
      `/plans/${budgetId}/transactions/${transactionId}`,
      { transaction }
    );
    return data.transaction;
  }

  async deleteTransaction(budgetId: string, transactionId: string): Promise<Transaction> {
    const data = await this.request<{ transaction: Transaction }>(
      "DELETE",
      `/plans/${budgetId}/transactions/${transactionId}`
    );
    return data.transaction;
  }
}
