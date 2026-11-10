# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-09

### Added

- OS keychain credential storage via `Bun.secrets` (macOS Keychain, Linux libsecret, Windows Credential Manager). `YNAB_API_KEY` is stored under service `ynab-toolkit` and found by both the CLI and the MCP server with no `.env` file and no MCP `env` block.
- `ynab auth set|list|delete|migrate`. `auth set` reads the token from a hidden prompt or `--stdin`, never from argv. `auth migrate` copies `.env` keys into the keychain and lists the files to clean up without editing them.
- `ynab config show`: resolved config with secrets redacted, per-setting sources, and keychain status.
- SDK: `loadConfig()`, `loadConfigState()`, `resolveConfigState()`, `redactedConfig()`, `SecretStore`, `bunSecretStore()`, `readKeychainValues()`, `CREDENTIAL_KEYS`, and `YnabConfigError`.
- MCP server tools (read-only): `ynab_config_status`, `ynab_list_budgets`, `ynab_list_accounts`, `ynab_list_categories`, `ynab_list_payees`, `ynab_list_transactions`, `ynab_get_month`. The server previously threw at startup.
- `YNAB_KEYCHAIN=0` skips the keychain lookup.
- Docs: configuration guide, security guide, credential spec, and decision record 0001.

### Changed

- Credential precedence is now override > process env > nearest `.env` > OS keychain > default. The SDK reads `.env` files itself, walking up from the current directory.
- Every CLI command resolves config with `await loadConfig()`. A missing key exits 3 with a hint to run `ynab auth set ynab`.
- `resolveConfig()` throws `YnabConfigError` (a `YnabError`) instead of a plain `Error`, and returns source metadata alongside `apiKey`, `baseUrl` and `budgetId`.

[Unreleased]: https://github.com/spenserhale/ynab-toolkit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/spenserhale/ynab-toolkit/releases/tag/v0.2.0
