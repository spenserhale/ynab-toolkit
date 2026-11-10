# YNAB API

## Purpose

Use this guide whenever a task touches the YNAB API: writing or changing SDK client methods, defining Zod schemas for API entities, handling money amounts, configuring auth, or implementing efficient syncing. The current scaffold ships generic placeholder `Resource` CRUD that does **not** reflect the real API — this doc is the source of truth for replacing it correctly.

Authoritative references live in `refs/` (read-only):

- `refs/ynab-sdk-js/` — the **official** YNAB JavaScript SDK (generated from their OpenAPI spec). The definitive shape of every endpoint and model. See `src/apis/` and `src/models/`.
- `refs/ynab-mcp-server/` — a community YNAB MCP server (tool design ideas).
- `refs/ynab-cli/` — a community YNAB CLI (command surface ideas).
- `refs/ynab-api-starter-kit/` — official web starter (auth flow).

The canonical online docs are at <https://api.ynab.com>.

## Policy

- **Base URL is `https://api.ynab.com/v1`** — note the `/v1`. The scaffold's `.env.example` and `config.ts` default (`https://api.ynab.com`) are **missing the version segment** and must be corrected. Confirmed in `refs/ynab-sdk-js/src/runtime.ts` (`BASE_PATH`).
- **Auth is a Personal Access Token** sent as `Authorization: Bearer <token>`. Users generate one at YNAB → Account Settings → Developer Settings → New Token. The current bearer-header approach in `client.ts` is correct; keep it. (Full OAuth is also supported by YNAB but is out of scope for this toolkit's token-based flow.)
- **All monetary amounts are milliunits** — integers where `1000` = one currency unit (`$1.00`). `-12340` = `-$12.34`. Never treat amounts as floats/dollars. Convert only at the display edge (CLI human output, MCP human-readable summaries), never in the SDK transport layer. Affected fields appear on Account, Category, Transaction, ScheduledTransaction, and their sub-transactions — see the `milliunit` references across `refs/ynab-sdk-js/src/models/`.
- **Budget id accepts `"last-used"`** (and `"default"` when default-budget selection is enabled) anywhere a `budget_id` path param is required. Support `"last-used"` as the default so single-budget users don't have to look up an id.
- **Respect the rate limit: 200 requests/hour per token.** Exceeding it returns HTTP `429`. Surface this as a distinct typed error (e.g. a `YnabRateLimitError`) and a dedicated CLI exit code so callers can back off. Per the community CLI, the practical recovery is to wait 5–10 minutes.
- **Use delta requests for syncing.** Endpoints that return server knowledge accept a `last_knowledge_of_server` query param and return only data changed since that value, plus a new `server_knowledge` to persist. Supported on accounts, categories, payees, months, transactions, and scheduled transactions (see `refs/ynab-sdk-js/src/apis/`). Prefer delta requests for anything that polls or re-fetches. **Note:** the budget *list* endpoint (`GET /plans`) is **not** a delta endpoint — `getPlans` takes `include_accounts`, returns `{ data: { plans, default_plan } }`, and has no `server_knowledge`. The budget *detail* endpoint (`GET /plans/{id}`) does return `server_knowledge`.
- **Validate responses with Zod at the SDK boundary**, mirroring the existing pattern in `types.ts`. Types are `z.infer<typeof Schema>`. Real YNAB responses wrap payloads in a `{ "data": { ... } }` envelope — unwrap `data` in the client, as the shared architecture's "unwrap API envelopes" convention dictates.

## Implementation notes

- **Entity model** (replace the placeholder `Resource`). The core YNAB hierarchy:
  - **Budget** (aka "plan") — the top-level container. The API path segment is `plans`: list is `GET /plans` (envelope key `plans`, plus `default_plan`), detail is `GET /plans/{plan_id}` (envelope key `plan`), and most other endpoints are nested under `/plans/{plan_id}/...`. The toolkit's public surface still uses "budget" terminology (`listBudgets`, `getBudget`, `budgets` CLI namespace) — only the wire path/envelope uses `plan(s)`.
  - **Account** — on/off-budget accounts with a milliunit `balance`. `AccountSchema` keeps every `AccountBase` field from the OpenAPI spec, including `direct_import_linked` / `direct_import_in_error` (bank connection), `last_reconciled_at`, and the loan maps `debt_interest_rates`, `debt_minimum_payments`, `debt_escrow_amounts` (effective date → value). `debt_original_balance` is deprecated and always null. `tests/account-fields.test.ts` fails if a spec field is missing from the schema, because zod strips unknown keys. `accountLinkStatus()` derives `linked` / `error` / `unlinked`.
  - **Category Group → Category** — categories carry `budgeted`, `activity`, and `balance` (all milliunits).
  - **Payee** — who money goes to/from.
  - **Transaction** — has `amount` (milliunits), `date`, `account_id`, `payee_id`, `category_id`, `cleared`, `approved`, and optional **subtransactions** (split transactions).
  - **Scheduled Transaction** — recurring/future transactions.
  - **Month** — per-month budget snapshot (`/budgets/{id}/months/{month}`), with `to_be_budgeted`, `age_of_money`, and per-category month data.
- **Save vs. read shapes differ.** Creating/updating a transaction uses a `SaveTransaction` shape (a subset of fields), not the full read model. Mirror this split in the SDK: separate `*Schema` (read) and `Save*Schema` / `*ParamsSchema` (write). See `refs/ynab-sdk-js/src/models/SaveTransaction.ts`.
- **Bulk transaction endpoints exist** — creating and updating multiple transactions in one call. Prefer them over loops to conserve the rate-limit budget.
- **Account create** (`POST /plans/{id}/accounts`) takes only `name`, `type` and `balance`, and `type` is limited to `SaveAccountType`: checking, savings, cash, creditCard, otherAsset, otherLiability. There is no update or delete endpoint for accounts, and no endpoint for bank connections.
- **`POST /plans/{id}/transactions/import` is deprecated.** The spec says no import is performed and the response is always empty, because YNAB imports linked accounts on its own. It is still wrapped (`importLinkedTransactions()`, `ynab transactions import-linked`) as a fallback for linked accounts that lag; callers must treat an empty result as normal. It never affects unlinked accounts.
- **`import_id` enables idempotent transaction imports** — YNAB dedupes on it (max 36 chars). Direct Import and File Based Import use `YNAB:<milliunits>:<YYYY-MM-DD>:<occurrence>`. `prepareImport()` generates the same format, so API imports, file imports and a later bank connection on the same account do not duplicate each other. A bulk create reports skipped rows in `duplicate_import_ids`. This is the natural backing for the toolkit's `--idempotency-key` CLI convention (see `docs/cli-conventions.md`).
- **Date format is `YYYY-MM-DD`** (ISO date, not datetime) for transaction/month fields. The placeholder schema's `z.string().datetime()` is wrong for YNAB dates.
- When implementing a new endpoint, find its exact request/response shape in `refs/ynab-sdk-js/src/apis/*Api.ts` and the corresponding `src/models/`, then express it as Zod in `packages/sdk/src/types.ts`.

## Related docs

- `docs/cli-conventions.md` — how SDK operations surface as CLI commands (exit codes for rate-limit/auth errors, `--dry-run`, `--idempotency-key` ↔ `import_id`).
- `../AGENTS.md` — repo router and done criteria.
