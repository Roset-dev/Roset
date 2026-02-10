/**
 * Provider Keys resource -- manage optional BYOK (Bring Your Own Key) extraction credentials.
 *
 * Roset uses managed keys by default for all extraction providers. Optionally
 * configure your own provider keys to use your own accounts instead.
 *
 * Provider keys are stored encrypted and scoped to the organization. Only the
 * presence of a key (not its value) is exposed through the API.
 *
 * @module resources/provider-keys
 */

import type { HttpClient } from "../client.js";

/**
 * A provider key status record.
 *
 * For security, the actual key value is never returned by the API. This record
 * only indicates whether a key has been configured for a given provider.
 */
export interface ProviderKeyRecord {
  /** Extraction provider name: `"reducto"`, `"openai"`, `"gemini"`, or `"whisper"`. */
  provider: string;

  /** Whether a key is currently configured for this provider. */
  configured: boolean;

  /** ISO 8601 timestamp of when the key was last set, or null if no key is configured. */
  updated_at: string | null;
}

/**
 * Resource for managing optional BYOK extraction provider credentials.
 *
 * Provides methods to set (create/update), list, and delete API keys for
 * extraction providers. When configured, these keys override Roset's managed
 * keys for the corresponding provider.
 */
export class ProviderKeysResource {
  constructor(private http: HttpClient) {}

  /**
   * Set (create or update) an extraction provider API key.
   *
   * If a key already exists for the provider, it is replaced. The key is
   * stored encrypted and never returned by the API after this call.
   *
   * @param params - Provider key parameters.
   * @param params.provider - Extraction provider name: `"reducto"`, `"openai"`, `"gemini"`, or `"whisper"`.
   * @param params.key - The API key value for the extraction provider.
   * @returns Success indicator.
   * @throws {ValidationError} If the provider name is unsupported or the key is empty.
   */
  async set(params: { provider: string; key: string }): Promise<{ success: boolean }> {
    return this.http.put<{ success: boolean }>("/v1/org/provider-keys", params);
  }

  /**
   * List all provider key statuses for the organization.
   *
   * Returns one record per supported provider indicating whether a key is
   * configured. Key values are never exposed.
   *
   * @returns Object containing an array of provider key status records.
   */
  async get(): Promise<{ keys: ProviderKeyRecord[] }> {
    return this.http.get<{ keys: ProviderKeyRecord[] }>("/v1/org/provider-keys");
  }

  /**
   * Delete an extraction provider API key.
   *
   * After deletion, processing jobs will use Roset's managed key for this provider.
   *
   * @param provider - Extraction provider name: `"reducto"`, `"openai"`, `"gemini"`, or `"whisper"`.
   * @throws {NotFoundError} If no key is configured for the given provider.
   */
  async delete(provider: string): Promise<void> {
    await this.http.delete(`/v1/org/provider-keys/${encodeURIComponent(provider)}`);
  }
}
