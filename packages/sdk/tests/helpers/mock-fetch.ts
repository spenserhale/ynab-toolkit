import { spyOn, afterEach } from "bun:test";

let activeSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | null = null;

export function mockFetch(innerData: unknown, status = 200) {
  const body = JSON.stringify({ data: innerData });
  activeSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, { status, headers: { "Content-Type": "application/json" } })
  );
  return activeSpy;
}

export function mockFetchError(status: number, errorId: string, detail: string) {
  const body = JSON.stringify({ error: { id: errorId, name: errorId, detail } });
  activeSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, { status, headers: { "Content-Type": "application/json" } })
  );
  return activeSpy;
}

afterEach(() => {
  activeSpy?.mockRestore();
  activeSpy = null;
});
