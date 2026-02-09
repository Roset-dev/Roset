/**
 * API Keys resource -- create, list, and revoke organization API keys.
 *
 * API keys are used to authenticate SDK and CLI requests to the Roset API.
 * Keys are prefixed with `rsk_` and scoped to an organization. They support
 * optional scope restrictions and expiration dates, and can operate in `live`
 * or `test` mode.
 *
 * The full key value is only returned once at creation time and cannot be
 * retrieved later. Store it securely.
 *
 * @module resources/api-keys
 */

import type { HttpClient } from "../client.js";

/**
 * An API key record (does NOT include the full key value).
 *
 * After creation, only the key prefix is stored for identification.
 * The full key is returned exclusively in {@link CreateApiKeyResponse}.
 */
export interface ApiKeyRecord {
  /** Unique key identifier (UUID). */
  id: string;

  /** Human-readable name for this key (e.g. `"Production Backend"`, `"CI/CD Pipeline"`). */
  name: string;

  /** First characters of the key for identification (e.g. `"rsk_f164..."`). */
  key_prefix: string;

  /** Permission scopes granted to this key (e.g. `["files:read", "files:write"]`). */
  scopes: string[];

  /** Key mode: `"live"` for production or `"test"` for development. */
  mode: string;

  /** ISO 8601 timestamp of when this key was last used, or null if never used. */
  last_used_at: string | null;

  /** ISO 8601 timestamp of when this key expires, or null for no expiration. */
  expires_at: string | null;

  /** ISO 8601 timestamp of when this key was created. */
  created_at: string;
}

/**
 * Response from {@link ApiKeysResource.create}.
 *
 * This is the ONLY time the full key value is available. It is not stored
 * by Roset (only a SHA-256 hash is persisted) and cannot be retrieved later.
 */
export interface CreateApiKeyResponse {
  /** Unique key identifier (UUID). */
  id: string;

  /**
   * The full API key value, prefixed with `rsk_`.
   * Store this securely -- it cannot be retrieved again after this response.
   */
  key: string;

  /** Human-readable name for this key. */
  name: string;

  /** First characters of the key for identification. */
  key_prefix: string;

  /** Permission scopes granted to this key. */
  scopes: string[];

  /** Key mode: `"live"` or `"test"`. */
  mode: string;
}

/**
 * Resource for managing organization API keys.
 *
 * Provides methods to create new keys, list existing keys (without exposing
 * full key values), and revoke keys that are no longer needed.
 */
export class ApiKeysResource {
  constructor(private http: HttpClient) {}

  /**
   * Create a new API key for the organization.
   *
   * The response includes the full key value (`rsk_...`), which is only
   * available at creation time. Roset stores a SHA-256 hash of the key and
   * cannot return the full value again.
   *
   * @param params - Key creation parameters.
   * @param params.name - Human-readable name for identification (e.g. `"Backend Server"`).
   * @param params.scopes - Optional permission scopes. Omit for full access.
   * @param params.mode - Optional key mode: `"live"` (production) or `"test"` (development).
   *                       Defaults to `"live"`.
   * @param params.expires_at - Optional ISO 8601 expiration date. Omit for no expiration.
   * @returns The created key with its full value. Store the `key` field securely.
   * @throws {ValidationError} If the name is missing or invalid.
   */
  async create(params: {
    name: string;
    scopes?: string[];
    mode?: "live" | "test";
    expires_at?: string;
  }): Promise<CreateApiKeyResponse> {
    return this.http.post<CreateApiKeyResponse>("/v1/org/api-keys", params);
  }

  /**
   * List all API keys for the organization.
   *
   * Returns key metadata including prefix, scopes, and last-used timestamp.
   * Full key values are never returned by this endpoint.
   *
   * @returns Object containing an array of API key records.
   */
  async list(): Promise<{ api_keys: ApiKeyRecord[] }> {
    return this.http.get<{ api_keys: ApiKeyRecord[] }>("/v1/org/api-keys");
  }

  /**
   * Revoke (permanently delete) an API key.
   *
   * Once revoked, all requests authenticated with this key will be rejected
   * with a 401 Unauthorized error. This action cannot be undone.
   *
   * @param id - The key's unique identifier (UUID).
   * @throws {NotFoundError} If the key does not exist.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/org/api-keys/${id}`);
  }
}
