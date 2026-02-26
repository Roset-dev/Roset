/**
 * Mock HTTP Client — intercepts fetch calls for SDK unit tests
 */

import { vi } from "vitest";

interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/**
 * Create a mock fetch function that returns configured responses
 */
export function createMockFetch() {
  const responses: MockResponse[] = [];
  const calls: { url: string; init?: RequestInit }[] = [];

  const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    calls.push({ url: urlStr, init });

    const response = responses.shift();
    if (!response) {
      return new Response(JSON.stringify({ error: "No mock response configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      response.status === 204 ? null : JSON.stringify(response.body),
      {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-test-123",
          ...(response.headers || {}),
        },
      },
    );
  });

  return {
    fetch: mockFetch,
    calls,
    /**
     * Queue a successful response
     */
    respondWith(body: unknown, status = 200) {
      responses.push({ status, body });
      return this;
    },
    /**
     * Queue an error response
     */
    respondWithError(error: string, code: string, status: number) {
      responses.push({ status, body: { error, code } });
      return this;
    },
    /**
     * Queue a 204 No Content response
     */
    respondNoContent() {
      responses.push({ status: 204, body: null });
      return this;
    },
    /**
     * Get the last call's URL and body
     */
    lastCall() {
      return calls[calls.length - 1];
    },
    /**
     * Get parsed body from last call
     */
    async lastBody() {
      const last = calls[calls.length - 1];
      if (!last?.init?.body) return undefined;
      return JSON.parse(last.init.body as string);
    },
    /**
     * Reset all state
     */
    reset() {
      mockFetch.mockClear();
      calls.length = 0;
      responses.length = 0;
    },
  };
}
