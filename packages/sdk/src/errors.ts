export class YnabError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "YnabError";
  }
}

export class YnabAuthError extends YnabError {
  constructor(message = "Authentication failed. Check your API key.") {
    super(message, "AUTH_ERROR", 401);
    this.name = "YnabAuthError";
  }
}

export class YnabNotFoundError extends YnabError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`, "NOT_FOUND", 404);
    this.name = "YnabNotFoundError";
  }
}
