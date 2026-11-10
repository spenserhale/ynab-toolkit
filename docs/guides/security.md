---
title: Security
description: How ynab-toolkit handles the YNAB token.
---

A YNAB Personal Access Token can read and change every budget on the account. The toolkit treats it as a secret everywhere:

- **Never in argv.** `ynab auth set` reads the token from a hidden TTY prompt or from stdin with an explicit `--stdin`. No command accepts it as an argument or flag value, so it never reaches shell history or `ps`.
- **No plaintext persistence.** The persistent store is the OS keychain (`Bun.secrets`, service `ynab-toolkit`). There is no plaintext fallback file. `auth migrate` copies `.env` values into the keychain and tells you which files still hold them; it does not edit files.
- **Never printed.** `auth list`, `config show` and the MCP `ynab_config_status` tool report only `set`/`missing` and the source name. Tests assert that serialized output does not contain the value.
- **No MCP write tools for secrets.** The MCP server only reads credentials. Storing, rotating and deleting the token happens through the CLI in a terminal you control.
- **Explicit sources win.** Process env and `.env` outrank the keychain, and the keychain is only read for keys they did not supply, so `op run` and CI never trigger a keychain prompt.
- **Tests never touch the real keychain.** Unit tests inject an in-memory `SecretStore`. Every spawned CLI or MCP process in tests runs with `YNAB_KEYCHAIN=0`.
- **Limits.** The keychain protects the token at rest. Any code already running as your user can still ask the keychain for it (subject to the macOS access dialog).
