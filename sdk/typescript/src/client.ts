/**
 * HTTP client and top-level SDK client for the Roset API.
 *
 * This module provides two classes:
 *
 * - {@link HttpClient} -- low-level HTTP transport that handles authentication,
 *   query-string serialization, JSON parsing, and error mapping. Most consumers
 *   will not use this directly.
 *
 * - {@link RosetClient} -- the primary developer-facing entry point. Instantiate
 *   it with an API key (or a dynamic access-token callback) and access every
 *   Roset resource through its namespaced properties (e.g. `client.files`,
 *   `client.jobs`, `client.analytics`).
 *
 * @module client
 */

import { parseApiError, RosetError } from "./errors.js";

/**
 * Configuration for initializing a {@link RosetClient} or {@link HttpClient}.
 *
 * Exactly one of `apiKey` or `getAccessToken` must be provided.
 */
export interface RosetClientConfig {
  /**
   * Static API key for server-to-server authentication.
   * Keys are prefixed with `rsk_` and can be created in the Roset Console or
   * via {@link ApiKeysResource.create}.
   */
  apiKey?: string;

  /**
   * Base URL of the Roset API. Defaults to `https://api.roset.dev`.
   * Override this for local development (e.g. `http://localhost:8787`).
   */
  baseUrl?: string;

  /**
   * Dynamic token provider for browser/session-based authentication.
   * Called before every request; return a Clerk JWT or `null` to skip the
   * Authorization header. Mutually exclusive with `apiKey`.
   */
  getAccessToken?: () => Promise<string | null>;
}

/**
 * Low-level HTTP client that handles request construction, authentication
 * header injection, JSON serialization, and API error parsing.
 *
 * Resources use this internally -- most SDK consumers should use
 * {@link RosetClient} instead.
 */
export class HttpClient {
  private apiKey?: string;
  private getAccessToken?: () => Promise<string | null>;
  private baseUrl: string;

  /**
   * @param config - Client configuration including auth credentials and optional base URL.
   */
  constructor(config: RosetClientConfig) {
    this.apiKey = config.apiKey;
    this.getAccessToken = config.getAccessToken;
    this.baseUrl = (config.baseUrl || "https://api.roset.dev").replace(/\/$/, "");
  }

  /**
   * Execute an HTTP request against the Roset API.
   *
   * Handles authentication (API key or Bearer token), query-string
   * construction, JSON body encoding, and maps non-2xx responses to
   * typed {@link RosetError} subclasses via {@link parseApiError}.
   *
   * @typeParam T - Expected shape of the parsed JSON response body.
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE).
   * @param path - API path relative to the base URL (e.g. `/v1/files`).
   * @param body - Optional JSON-serializable request body.
   * @param query - Optional key/value pairs appended as URL query parameters.
   *                Empty, null, or undefined values are silently omitted.
   * @returns Parsed JSON response body, or `undefined` for 204 No Content.
   * @throws {RosetError} A typed SDK error mapped from the HTTP status code.
   */
  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") params.set(k, v);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {};
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } else if (this.apiKey) {
      headers["Authorization"] = `ApiKey ${this.apiKey}`;
    }
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorBody: Record<string, unknown> = {};
      try {
        errorBody = await res.json() as Record<string, unknown>;
      } catch {
        errorBody = { error: res.statusText };
      }
      const requestId = res.headers.get("x-request-id") || undefined;
      throw parseApiError(res.status, errorBody as Parameters<typeof parseApiError>[1], { requestId });
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** Send a GET request. See {@link HttpClient.request} for full details. */
  get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  /** Send a POST request. See {@link HttpClient.request} for full details. */
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /** Send a PUT request. See {@link HttpClient.request} for full details. */
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  /** Send a PATCH request. See {@link HttpClient.request} for full details. */
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  /** Send a DELETE request. See {@link HttpClient.request} for full details. */
  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

// --- Resource Imports ---
import { FilesResource } from "./resources/files.js";
import { JobsResource } from "./resources/jobs.js";
import { ConnectionsResource } from "./resources/connections.js";
import { NodesResource } from "./resources/nodes.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { SpacesResource } from "./resources/spaces.js";
import { ApiKeysResource } from "./resources/api-keys.js";
import { ProviderKeysResource } from "./resources/provider-keys.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { SearchResource } from "./resources/search.js";
import { QAResource } from "./resources/qa.js";

/**
 * Primary entry point for the Roset SDK.
 *
 * Instantiate with an API key or dynamic access-token callback, then interact
 * with Roset resources through namespaced properties:
 *
 * | Property         | Description |
 * |------------------|-------------|
 * | `files`          | Upload, list, get, delete files and retrieve their variants |
 * | `jobs`           | Inspect, cancel, and retry processing jobs |
 * | `connections`    | Manage storage provider connections (S3, GCS, Azure Blob Storage, R2, MinIO, Supabase Storage, B2, DO Spaces, Wasabi) |
 * | `nodes`          | Browse and manipulate files/folders in connected storage |
 * | `webhooks`       | Subscribe to processing lifecycle events |
 * | `spaces`         | List and inspect space namespaces (optional, for multi-tenant apps) |
 * | `apiKeys`        | Create, list, and revoke API keys |
 * | `providerKeys`   | Manage optional BYOK extraction provider credentials |
 * | `analytics`      | Query file processing metrics and statistics |
 *
 * @example
 * ```typescript
 * import { RosetClient } from '@roset/sdk';
 *
 * // Server-side with API key
 * const roset = new RosetClient({ apiKey: 'rsk_...' });
 *
 * // Browser with Clerk session token
 * const roset = new RosetClient({
 *   getAccessToken: () => clerk.session.getToken(),
 * });
 * ```
 *
 * @throws {RosetError} If neither `apiKey` nor `getAccessToken` is provided.
 */
export class RosetClient {
  private readonly http: HttpClient;

  /** Upload, list, get, delete files and retrieve their processing variants. */
  public readonly files: FilesResource;

  /** Inspect, cancel, and retry file processing jobs. */
  public readonly jobs: JobsResource;

  /** Manage storage provider connections (S3, GCS, Azure Blob Storage, Cloudflare R2, MinIO, Supabase Storage, Backblaze B2, DigitalOcean Spaces, Wasabi). */
  public readonly connections: ConnectionsResource;

  /** Browse and manipulate files/folders within connected storage buckets. */
  public readonly nodes: NodesResource;

  /** Subscribe to processing lifecycle events via HTTP callbacks. */
  public readonly webhooks: WebhooksResource;

  /** List and inspect space namespaces. Optional -- most single-tenant apps can ignore this. */
  public readonly spaces: SpacesResource;

  /** Create, list, and revoke organization API keys (prefixed `rsk_`). */
  public readonly apiKeys: ApiKeysResource;

  /** Manage optional BYOK extraction provider credentials (Reducto, OpenAI, Gemini, Whisper). Overrides managed keys when configured. */
  public readonly providerKeys: ProviderKeysResource;

  /** Query file processing analytics, trends, and failure metrics. */
  public readonly analytics: AnalyticsResource;

  /** Search files using full-text, vector similarity, or hybrid search. */
  public readonly search: SearchResource;

  /** Ask questions about your files and get answers with citations. */
  public readonly qa: QAResource;

  /**
   * Create a new Roset client.
   *
   * @param config - Configuration object. Must include either `apiKey` for
   *                 server-side use or `getAccessToken` for browser-based auth.
   * @throws {RosetError} If neither `apiKey` nor `getAccessToken` is provided
   *                      (code: `CONFIGURATION_ERROR`).
   */
  constructor(config: RosetClientConfig) {
    if (!config.apiKey && !config.getAccessToken) {
      throw new RosetError("apiKey or getAccessToken is required", "CONFIGURATION_ERROR", 0);
    }

    this.http = new HttpClient(config);

    this.files = new FilesResource(this.http);
    this.jobs = new JobsResource(this.http);
    this.connections = new ConnectionsResource(this.http);
    this.nodes = new NodesResource(this.http);
    this.webhooks = new WebhooksResource(this.http);
    this.spaces = new SpacesResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.providerKeys = new ProviderKeysResource(this.http);
    this.analytics = new AnalyticsResource(this.http);
    this.search = new SearchResource(this.http);
    this.qa = new QAResource(this.http);
  }
}
