---
title: Credential storage
description: Behavior spec for YNAB_API_KEY resolution and the auth commands.
---

## Resolution

- `loadConfig(options)` (async) resolves `apiKey`, `baseUrl`, `budgetId` with precedence override > process env > nearest `.env` > OS keychain (credentials only) > default, and throws `YnabConfigError` when no API key is found.
- `loadConfigState(options)` does the same without requiring an API key; `auth` and `config show` use it.
- The keychain is read only for credential keys (`CREDENTIAL_KEYS = ["YNAB_API_KEY"]`) that overrides, env and `.env` did not supply.
- The keychain is skipped when `secretStore === null` or `YNAB_KEYCHAIN` is `0|false|no|off` in env or `.env`; status `disabled`.
- A store that throws yields status `unavailable` with an `error` string; it never throws from `loadConfigState`.
- `credentialSources.YNAB_API_KEY` is one of `override`, `env`, `envfile:<path>`, `keychain`, `missing`.
- `resolveConfig(overrides?, options?)` stays synchronous and only uses keychain values passed in `options.keychainValues`.

## CLI

- `auth set <resource>`: hidden prompt on a TTY; `--stdin` reads one trimmed value; no TTY and no `--stdin` exits 2; empty input exits 2; more than one key with `--stdin` and no `--key` exits 2. `--dry-run` writes nothing. Output has `stored`/`would_store` per key and `shadowed_by` when env or `.env` supplies the key (checked with `secretStore: null`).
- `auth list`: one row per credential key with `keychain` (`set|missing|unknown`) and `active_source`. No values.
- `auth delete <resource> --yes`: exits 2 without `--yes` (unless `--dry-run`); reports `deleted|not_found|would_delete`.
- `auth migrate`: stores keys whose source is `envfile:*`, `skipped_exists` unless `--overwrite`, ignores `env`, returns `clean_up` file paths, never edits files.
- Unknown resource or `--key` exits 2. Keychain read or write failures on `set`/`delete` exit 3.

## MCP

- Tools call `loadConfig()` per call. No tool writes or deletes secrets.
- `ynab_config_status` returns `configured`, redacted config and `keychain`.
