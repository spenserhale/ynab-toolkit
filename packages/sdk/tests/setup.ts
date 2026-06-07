import { beforeEach } from "bun:test";

// Capture the real fetch before any spy can replace it. This preload runs before
// any test file is evaluated, so globalThis.fetch is guaranteed to be the native
// implementation here.
const _realFetch = globalThis.fetch;

// Restore the real fetch before every test. Without this, a spy set by a concurrent
// or preceding test file (sharing the same Bun process) leaks into the smoke test and
// causes ERR_BODY_ALREADY_USED or unexpected Zod parse errors. Tests that need a mock
// call mockFetch() inside their own test body after this hook runs.
beforeEach(() => {
  globalThis.fetch = _realFetch;
});
