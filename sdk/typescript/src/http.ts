/**
 * HTTP Client - Low-level request handling with retries
 */

import type { RosetClientConfig, RequestOptions } from "./types.js";
import { RosetError, parseApiError, RateLimitError } from "./errors.js";

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const RETRY_DELAYS = [100, 500, 1000]; // Exponential-ish backoff
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly getAccessToken?: () => Promise<string | null> | string | null;

  private readonly mountId?: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: RosetClientConfig) {
    this.baseUrl = "https://api.roset.dev";
    this.apiKey = config.apiKey;
    this.getAccessToken = config.getAccessToken;

    this.mountId = config.mountId;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.retries ?? DEFAULT_RETRIES;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  /**
   * Core request method with retries
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout ?? this.timeout;

    // Get auth token - either from callback or static API key
    let authToken: string | null = null;
    if (this.getAccessToken) {
      authToken = await this.getAccessToken();
    } else if (this.apiKey) {
      authToken = this.apiKey;
    }

    if (!authToken) {
      throw new RosetError("No authentication configured", "NO_AUTH", 401);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...options?.headers,
    };

    if (this.mountId) {
      headers["X-Roset-Mount-Id"] = this.mountId;
    }

    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Combine signals if external signal provided
        const signal = options?.signal
          ? this.combineSignals(options.signal, controller.signal)
          : controller.signal;

        const response = await this.fetchFn(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        clearTimeout(timeoutId);

        // Parse response
        const contentType = response.headers.get("content-type");
        let data: unknown;

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else if (response.status === 204) {
          data = undefined;
        } else {
          data = await response.text();
        }

        // Handle errors
        if (!response.ok) {
          const error = parseApiError(
            response.status,
            typeof data === "object" && data !== null
              ? (data as Record<string, unknown>)
              : { error: String(data) }
          );

          // Retry on rate limit with backoff
          if (error instanceof RateLimitError && attempt < this.maxRetries) {
            const retryAfter = error.retryAfter ?? RETRY_DELAYS[attempt] ?? 1000;
            await this.sleep(retryAfter);
            lastError = error;
            continue;
          }

          // Retry on 5xx errors (only if safe or idempotent)
          if (
            response.status >= 500 &&
            attempt < this.maxRetries &&
            this.isSafeToRetry(method, options)
          ) {
            await this.sleep(RETRY_DELAYS[attempt] ?? 1000);
            lastError = error;
            continue;
          }

          throw error;
        }

        return data as T;
      } catch (error) {
        if (error instanceof RosetError) {
          throw error;
        }

        // Retry on network errors (only if safe or idempotent)
        if (
          this.isRetryableError(error) &&
          attempt < this.maxRetries &&
          this.isSafeToRetry(method, options)
        ) {
          await this.sleep(RETRY_DELAYS[attempt] ?? 1000);
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }

        // Abort signal triggered
        if (error instanceof Error && error.name === "AbortError") {
          throw new RosetError("Request aborted", "ABORTED", 0);
        }

        throw new RosetError(
          error instanceof Error ? error.message : "Network error",
          "NETWORK_ERROR",
          0
        );
      }
    }

    throw lastError ?? new RosetError("Max retries exceeded", "MAX_RETRIES", 0);
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.name === "TypeError" || // Network error in fetch
      error.message.includes("ECONNRESET") ||
      error.message.includes("ETIMEDOUT")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private combineSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return controller.signal;
  }

  /**
   * Check if a request is safe to retry.
   * Safe methods (GET, HEAD, OPTIONS) can always be retried.
   * Unsafe methods (POST, PUT, PATCH, DELETE) need an idempotency key.
   */
  private isSafeToRetry(method: string, options?: RequestOptions): boolean {
    if (SAFE_METHODS.has(method)) {
      return true;
    }
    // DELETE is considered idempotent by HTTP spec, so allow retries
    if (method === "DELETE") {
      return true;
    }
    // For POST/PUT/PATCH, only retry if idempotency key is present
    return !!options?.idempotencyKey;
  }
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
