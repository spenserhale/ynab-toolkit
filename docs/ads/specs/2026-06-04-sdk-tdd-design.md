# SDK TDD Test Suite Design

**Date:** 2026-06-04  
**Scope:** `packages/sdk` — unit tests for all real YNAB entities  
**Approach:** TDD-first; tests are written before SDK implementation and drive it

## Goal

Replace the placeholder `Resource` scaffold with real YNAB entity support, using a test suite as the authoritative spec. Tests fail first, implementation makes them pass. All SDK methods for Budgets, Accounts, Categories, Payees, Transactions, Scheduled Transactions, and Months are covered.

## Test layer

SDK only (`packages/sdk/tests/`). CLI and MCP are thin wiring and are not tested in this phase.

## Test infrastructure

### `tests/helpers/mock-fetch.ts`

Exports `mockFetch(body, status = 200)`:
- Calls `spyOn(global, "fetch")` and returns a `Response` with the given JSON body
- Wraps body in the YNAB `{ "data": { ... } }` envelope automatically
- Reset via `afterEach` so tests are isolated
- Returns the spy so tests can assert on call args (URL, headers)

### `tests/helpers/fixtures.ts`

Typed YNAB response fixtures organized by entity namespace:
- `Fixtures.budgets`, `Fixtures.accounts`, `Fixtures.categories`, `Fixtures.payees`, `Fixtures.transactions`, `Fixtures.scheduledTransactions`, `Fixtures.months`
- Each namespace has `list` and `get` variants; write-op responses where applicable
- Shapes match `refs/ynab-sdk-js/src/models/` — single source of truth for test data

## Test file layout

```
packages/sdk/tests/
  helpers/
    mock-fetch.ts
    fixtures.ts
  client.test.ts              # existing constructor tests — unchanged
  config.test.ts              # resolveConfig() coverage
  errors.test.ts              # error class hierarchy
  budgets.test.ts
  accounts.test.ts
  categories.test.ts
  payees.test.ts
  transactions.test.ts
  scheduled-transactions.test.ts
  months.test.ts
```

## Coverage per entity test file

Each of the seven entity test files covers the same four categories:

1. **Happy path** — list (with and without `last_knowledge_of_server`), get by ID, and the write operations each entity supports:
   - Budgets: list + get only (YNAB API is read-only for budgets)
   - Accounts: list + get only (read-only via API)
   - Categories: list + get; update category budget amount
   - Payees: list + get only (read-only via API)
   - Transactions: list + get + create + update + delete + bulk create/update
   - Scheduled Transactions: list + get only
   - Months: list + get only
2. **Milliunit handling** — for entities with amounts (Accounts, Categories, Transactions, Months): assert the SDK returns raw milliunits unchanged, never converted to floats
3. **Error cases** — `401` → `YnabAuthError`, `404` → `YnabNotFoundError`, `429` → `YnabRateLimitError`, generic `4xx/5xx` → `YnabError` with message from the `error.detail` envelope
4. **Request shape** — assert `fetch` was called with the correct URL (`/v1/budgets/{id}/...`) and `Authorization: Bearer <token>` header

## `config.test.ts`

- `YNAB_API_KEY` env var is read correctly
- `YNAB_BASE_URL` override is applied
- Missing API key throws a validation error
- Default base URL is `https://api.ynab.com/v1` (the scaffold default `https://api.ynab.com` is missing `/v1` and must be corrected here)

## `errors.test.ts`

- `YnabAuthError instanceof YnabError` is true
- `YnabNotFoundError instanceof YnabError` is true
- `YnabRateLimitError instanceof YnabError` is true (new class — not in current scaffold)
- Each class has the correct `code` string and `statusCode`
- `YnabRateLimitError` has `statusCode: 429`

## SDK changes driven by the tests

The tests will require the following SDK additions beyond the placeholder scaffold:

- **`config.ts`**: change default `baseUrl` from `https://api.ynab.com` to `https://api.ynab.com/v1`
- **`errors.ts`**: add `YnabRateLimitError` (code `RATE_LIMIT_EXCEEDED`, statusCode `429`)
- **`types.ts`**: replace placeholder `Resource` schemas with real YNAB entity schemas for all seven entities, using shapes from `refs/ynab-sdk-js/src/models/`
- **`client.ts`**: replace placeholder `Resource` methods with typed methods for each entity; unwrap the `{ data: { ... } }` response envelope; handle `429` → `YnabRateLimitError`; support `last_knowledge_of_server` on list endpoints

## Subagent task decomposition

Tasks are designed to be independently executable by separate subagents after the infrastructure task completes.

| Task | Deliverables | Depends on |
|------|-------------|------------|
| Infrastructure | `helpers/mock-fetch.ts`, `helpers/fixtures.ts`, `YnabRateLimitError` in `errors.ts`, base URL fix in `config.ts` | — |
| Config tests | `tests/config.test.ts` | Infrastructure |
| Budgets | `tests/budgets.test.ts` + SDK types/methods | Infrastructure |
| Accounts | `tests/accounts.test.ts` + SDK types/methods | Infrastructure |
| Categories | `tests/categories.test.ts` + SDK types/methods | Infrastructure |
| Payees | `tests/payees.test.ts` + SDK types/methods | Infrastructure |
| Transactions | `tests/transactions.test.ts` + SDK types/methods | Infrastructure |
| Scheduled Transactions | `tests/scheduled-transactions.test.ts` + SDK types/methods | Infrastructure |
| Months | `tests/months.test.ts` + SDK types/methods | Infrastructure |

Infrastructure runs first. All entity tasks are independent and run in parallel.

## Done criteria

- `bun test` passes (all new tests green)
- `bun run lint` passes
- No placeholder `Resource` types or methods remain in the SDK
- All amount fields on Accounts, Categories, Transactions, Months remain as raw milliunits (integers) — never converted
- `exports` from `packages/sdk/src/index.ts` cover all new entity types and client methods

## References

- `refs/ynab-sdk-js/src/models/` — canonical entity shapes
- `refs/ynab-sdk-js/src/apis/` — endpoint signatures and `last_knowledge_of_server` params
- `docs/ynab-api.md` — milliunit policy, base URL, rate limit, delta requests
