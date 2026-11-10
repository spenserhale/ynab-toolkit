import { spyOn, afterEach } from "bun:test";

// Capture the real fetch before any spy can replace it.
const _realFetch = globalThis.fetch;

let activeSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | null = null;

export function mockFetch(innerData: unknown, status = 200) {
  const body = JSON.stringify({ data: innerData });
  activeSpy = spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(new Response(body, { status, headers: { "Content-Type": "application/json" } }))
  );
  return activeSpy;
}

export function mockFetchError(status: number, errorId: string, detail: string) {
  const body = JSON.stringify({ error: { id: errorId, name: errorId, detail } });
  activeSpy = spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(new Response(body, { status, headers: { "Content-Type": "application/json" } }))
  );
  return activeSpy;
}

afterEach(() => {
  activeSpy?.mockRestore();
  activeSpy = null;
  // Belt-and-suspenders: force-restore the real fetch after every test so a leaked spy
  // never survives into the next test within the same worker.
  globalThis.fetch = _realFetch;
});

/** Respond to successive fetch calls with these `{ status, data }` payloads in order. */
export function mockFetchSequence(responses: { data: unknown; status?: number }[]) {
  let i = 0;
  activeSpy = spyOn(globalThis, "fetch").mockImplementation(() => {
    const next = responses[Math.min(i, responses.length - 1)]!;
    i += 1;
    return Promise.resolve(
      new Response(JSON.stringify({ data: next.data }), {
        status: next.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });
  return activeSpy;
}
