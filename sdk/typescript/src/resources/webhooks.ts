/**
 * Webhooks resource -- subscribe to processing lifecycle events.
 *
 * Webhooks let you receive HTTP POST callbacks when events occur in the Roset
 * processing pipeline. Subscribe to events like `file.created`, `job.completed`,
 * `job.failed`, `variant.ready`, etc. to build real-time integrations without
 * polling.
 *
 * Each webhook targets a URL and listens for one or more event types. Roset
 * retries failed deliveries with exponential backoff. You can inspect delivery
 * history and trigger test events for debugging.
 *
 * @module resources/webhooks
 */

import { webcrypto } from "node:crypto";
import type { HttpClient } from "../client.js";

// Node 18 doesn't expose crypto.subtle globally — use node:crypto's webcrypto.
const subtle = globalThis.crypto?.subtle ?? (webcrypto as unknown as Crypto).subtle;

// ────────────────────────────────────────────────────────
// Typed Webhook Events (discriminated union)
// ────────────────────────────────────────────────────────

export interface FileCreatedEvent {
  type: "file.created";
  data: { file_id: string; filename: string; space: string; content_type: string; size_bytes: number };
}

export interface FileProcessingStartedEvent {
  type: "file.processing.started";
  data: { file_id: string; job_id: string; content_type: string };
}

export interface FileProcessingCompletedEvent {
  type: "file.processing.completed";
  data: { file_id: string; job_id: string; provider: string; status: string; cache_hit: boolean; fallback_used: boolean };
}

export interface FileProcessingFailedEvent {
  type: "file.processing.failed";
  data: { file_id: string; job_id: string; error: { code: string; message: string; user_message: string }; legacy_error?: string; error_code?: string };
}

export interface FileVariantReadyEvent {
  type: "file.variant.ready";
  data: { file_id: string; variant_type: string };
}

export interface FileDeletedEvent {
  type: "file.deleted";
  data: { file_id: string };
}

export interface JobCompletedEvent {
  type: "job.completed";
  data: { job_id: string; file_id: string; provider: string; status: string };
}

export interface JobFailedEvent {
  type: "job.failed";
  data: { job_id: string; file_id: string; error: { code: string; message: string; user_message: string }; legacy_error?: string; error_code?: string };
}

export interface BatchCompletedEvent {
  type: "batch.completed";
  data: { batch_id: string; total: number; completed: number; failed: number; status: string };
}

export interface ConnectionSyncedEvent {
  type: "connection.synced";
  data: { connection_id: string; files_synced: number };
}

export interface WebhookTestEvent {
  type: "webhook.test";
  data: { file: { id: string; filename: string; status: string } };
}

/** Discriminated union of all webhook event types. */
export type WebhookEvent =
  | FileCreatedEvent
  | FileProcessingStartedEvent
  | FileProcessingCompletedEvent
  | FileProcessingFailedEvent
  | FileVariantReadyEvent
  | FileDeletedEvent
  | JobCompletedEvent
  | JobFailedEvent
  | BatchCompletedEvent
  | ConnectionSyncedEvent
  | WebhookTestEvent;

/** Raw webhook payload envelope as received in HTTP POST body. */
export interface WebhookPayload {
  id: string;
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/**
 * Verify an incoming webhook signature and parse the typed event.
 *
 * @param body - The raw request body string (must be the exact bytes received).
 * @param signature - The `X-Roset-Signature` header value (e.g. `"sha256=abcdef..."`).
 * @param secret - Your webhook signing secret.
 * @returns The parsed and typed webhook event.
 * @throws {WebhookVerificationError} If the signature is missing or invalid.
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<WebhookEvent> {
  if (!signature || !signature.startsWith("sha256=")) {
    throw new WebhookVerificationError("Missing or invalid signature format. Expected 'sha256=...'");
  }

  const expectedHex = signature.slice("sha256=".length);

  // Compute HMAC SHA-256 and verify using Web Crypto
  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  // Parse expected signature from hex to bytes
  if (expectedHex.length !== 64) {
    throw new WebhookVerificationError("Invalid webhook signature");
  }
  const expectedBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    expectedBytes[i] = parseInt(expectedHex.slice(i * 2, i * 2 + 2), 16);
  }

  // Use Web Crypto verify() for constant-time comparison
  const isValid = await subtle.verify(
    "HMAC",
    key,
    expectedBytes,
    encoder.encode(body),
  );

  if (!isValid) {
    throw new WebhookVerificationError("Invalid webhook signature");
  }

  const payload: WebhookPayload = JSON.parse(body);
  return { type: payload.type, data: payload.data } as WebhookEvent;
}

/**
 * A webhook subscription record.
 *
 * Represents a registered endpoint that receives HTTP POST callbacks when
 * subscribed events occur. Webhooks can be enabled/disabled without deletion.
 */
export interface WebhookRecord {
  /** Unique webhook identifier (UUID). */
  id: string;

  /** Target URL that receives HTTP POST callbacks. */
  url: string;

  /** Comma-separated list of subscribed event types (e.g. `"file.created,job.completed"`). */
  events: string;

  /** Whether the webhook is currently active. May be `1`/`0` (SQLite) or boolean. */
  enabled: number | boolean;

  /** ISO 8601 timestamp of when the webhook was created. */
  created_at: string;

  /** ISO 8601 timestamp of the last update. */
  updated_at: string;
}

/**
 * A record of a single webhook delivery attempt.
 *
 * Tracks whether the HTTP POST to the webhook URL succeeded, how many attempts
 * were made, and the HTTP response code received.
 */
export interface WebhookDeliveryRecord {
  /** Unique delivery identifier (UUID). */
  id: string;

  /** ID of the webhook this delivery belongs to. */
  webhook_id: string;

  /** The event type that triggered this delivery (e.g. `"job.completed"`). */
  event_type: string;

  /** JSON-encoded event payload that was sent. */
  payload: string;

  /** Delivery status: `"delivered"`, `"failed"`, `"pending"`. */
  status: string;

  /** Number of delivery attempts made (including retries). */
  attempts: number;

  /** HTTP response status code from the target URL, or null if no response was received. */
  response_code: number | null;

  /** ISO 8601 timestamp of when the delivery was created. */
  created_at: string;
}

/**
 * Resource for managing webhook subscriptions and inspecting delivery history.
 *
 * Provides methods to create, list, update, delete, and test webhook
 * subscriptions, as well as inspect past delivery attempts.
 */
export class WebhooksResource {
  constructor(private http: HttpClient) {}

  /**
   * Create a new webhook subscription.
   *
   * @param params - Webhook configuration.
   * @param params.url - The HTTPS URL that will receive HTTP POST callbacks.
   * @param params.events - Array of event types to subscribe to
   *                        (e.g. `["file.created", "job.completed", "job.failed"]`).
   * @returns The newly created webhook record.
   * @throws {ValidationError} If the URL is invalid or events array is empty.
   */
  async create(params: {
    url: string;
    events: string[];
  }): Promise<WebhookRecord> {
    return this.http.post<WebhookRecord>("/v1/webhooks", params);
  }

  /**
   * List all webhook subscriptions for the organization.
   *
   * @returns Object containing an array of all webhook records.
   */
  async list(): Promise<{ webhooks: WebhookRecord[] }> {
    return this.http.get<{ webhooks: WebhookRecord[] }>("/v1/webhooks");
  }

  /**
   * Retrieve a single webhook by ID.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @returns The full webhook record.
   * @throws {NotFoundError} If the webhook does not exist.
   */
  async get(id: string): Promise<WebhookRecord> {
    return this.http.get<WebhookRecord>(`/v1/webhooks/${id}`);
  }

  /**
   * Update a webhook subscription's URL, events, or enabled status.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @param params - Fields to update. Only provided fields are changed.
   * @param params.url - New target URL.
   * @param params.events - New set of subscribed event types.
   * @param params.enabled - Whether the webhook should be active.
   * @returns The updated webhook record.
   * @throws {NotFoundError} If the webhook does not exist.
   */
  async update(id: string, params: {
    url?: string;
    events?: string[];
    enabled?: boolean;
  }): Promise<WebhookRecord> {
    return this.http.patch<WebhookRecord>(`/v1/webhooks/${id}`, params);
  }

  /**
   * Delete a webhook subscription.
   *
   * Permanently removes the webhook. No further events will be delivered.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @throws {NotFoundError} If the webhook does not exist.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/webhooks/${id}`);
  }

  /**
   * List delivery history for a webhook with optional pagination.
   *
   * Useful for debugging delivery failures and inspecting payloads.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @param params - Optional pagination parameters.
   * @param params.limit - Maximum number of deliveries to return.
   * @param params.cursor - Pagination cursor from a previous response.
   * @returns Paginated list of delivery records.
   * @throws {NotFoundError} If the webhook does not exist.
   */
  async listDeliveries(id: string, params?: { limit?: number; cursor?: string }): Promise<{
    deliveries: WebhookDeliveryRecord[];
    next_cursor: string | null;
  }> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    return this.http.get(`/v1/webhooks/${id}/deliveries`, query);
  }

  /**
   * Send a test event to a webhook endpoint.
   *
   * Dispatches a synthetic event to the webhook's URL for verifying that
   * the endpoint is reachable and correctly processing payloads.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @returns Object indicating whether the test delivery was successful.
   * @throws {NotFoundError} If the webhook does not exist.
   */
  async test(id: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`/v1/webhooks/${id}/test`);
  }

  /**
   * Replay webhook events matching optional time range and event type filters.
   *
   * @param id - The webhook's unique identifier (UUID).
   * @param params - Optional filters for which events to replay.
   * @returns Object with the count of replayed events.
   */
  async replay(id: string, params?: {
    since?: string;
    until?: string;
    event_types?: string[];
  }): Promise<{ replayed: number }> {
    return this.http.post<{ replayed: number }>(`/v1/webhooks/${id}/replay`, params || {});
  }

  /**
   * Verify an incoming webhook signature and parse the typed event.
   *
   * Use this in your webhook handler to validate that the request came from Roset.
   *
   * @param body - The raw request body string.
   * @param signature - The `X-Roset-Signature` header value.
   * @param secret - Your webhook signing secret.
   * @returns The parsed and typed {@link WebhookEvent}.
   * @throws {WebhookVerificationError} If the signature is invalid.
   */
  static async verify(body: string, signature: string, secret: string): Promise<WebhookEvent> {
    return verifyWebhookSignature(body, signature, secret);
  }
}
