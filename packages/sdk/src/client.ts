import type {
  YnabConfig,
  Resource,
  ListResourcesParams,
  CreateResourceParams,
  PaginatedResponse,
  BudgetSummary,
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
}
