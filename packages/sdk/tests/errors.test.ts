import { describe, expect, it } from "bun:test";
import {
  YnabError,
  YnabAuthError,
  YnabNotFoundError,
  YnabRateLimitError,
} from "../src/errors.js";

describe("YnabError", () => {
  it("stores code and statusCode", () => {
    const e = new YnabError("msg", "CODE", 400);
    expect(e.code).toBe("CODE");
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe("msg");
  });
});

describe("YnabAuthError", () => {
  it("is an instance of YnabError", () => {
    expect(new YnabAuthError()).toBeInstanceOf(YnabError);
  });
  it("has statusCode 401 and code AUTH_ERROR", () => {
    const e = new YnabAuthError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe("AUTH_ERROR");
  });
});

describe("YnabNotFoundError", () => {
  it("is an instance of YnabError", () => {
    expect(new YnabNotFoundError()).toBeInstanceOf(YnabError);
  });
  it("has statusCode 404 and code NOT_FOUND", () => {
    const e = new YnabNotFoundError();
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe("NOT_FOUND");
  });
});

describe("YnabRateLimitError", () => {
  it("is an instance of YnabError", () => {
    expect(new YnabRateLimitError()).toBeInstanceOf(YnabError);
  });
  it("has statusCode 429 and code RATE_LIMIT_EXCEEDED", () => {
    const e = new YnabRateLimitError();
    expect(e.statusCode).toBe(429);
    expect(e.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
