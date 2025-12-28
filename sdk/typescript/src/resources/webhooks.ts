import { HttpClient, generateIdempotencyKey } from "../http.js";
import { RosetClientConfig, RequestOptions, PaginatedResult } from "../types.js";

// ============================================================================
// Types
// ============================================================================

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

export type WebhookEvent = 
  | 'node.created'
  | 'node.updated'
  | 'node.deleted'
  | 'node.moved'
  | 'upload.completed'
  | 'share.created'
  | 'share.revoked'
  | 'commit.created'
  | '*';

export interface CreateWebhookOptions {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  description?: string;
  enabled?: boolean;
}

export interface UpdateWebhookOptions {
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  description?: string;
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  statusCode: number | null;
  success: boolean;
  attemptCount: number;
  durationMs: number; // Added
  createdAt: string;
  deliveredAt?: string;
  error?: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  response?: {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
  };
  attempts?: {
    statusCode: number;
    error?: string;
    createdAt: string;
  }[];
}

// ============================================================================
// Resource
// ============================================================================

/**
 * Webhooks Resource
 * Manage webhook endpoints and delivery
 */
export class WebhooksResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * List all webhooks
   */
  async list(options?: RequestOptions): Promise<Webhook[]> {
    const { items } = await this.http.get<{ items: Webhook[] }>(
      "/v1/webhooks",
      options
    );
    return items;
  }

  /**
   * Get a webhook by ID
   */
  async get(id: string, options?: RequestOptions): Promise<Webhook> {
    const { webhook } = await this.http.get<{ webhook: Webhook }>(
      `/v1/webhooks/${id}`,
      options
    );
    return webhook;
  }

  /**
   * Create a new webhook
   */
  async create(
    options: CreateWebhookOptions & RequestOptions
  ): Promise<Webhook> {
    const { webhook } = await this.http.post<{ webhook: Webhook }>(
      "/v1/webhooks",
      {
        url: options.url,
        events: options.events,
        secret: options.secret,
        description: options.description,
        enabled: options.enabled ?? true,
      },
      {
        ...options,
        idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
      }
    );
    return webhook;
  }

  /**
   * Update a webhook
   */
  async update(
    id: string,
    options: UpdateWebhookOptions & RequestOptions
  ): Promise<Webhook> {
    const { webhook } = await this.http.patch<{ webhook: Webhook }>(
      `/v1/webhooks/${id}`,
      {
        url: options.url,
        events: options.events,
        secret: options.secret,
        description: options.description,
        enabled: options.enabled,
      },
      options
    );
    return webhook;
  }

  /**
   * Delete a webhook
   */
  async delete(id: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/webhooks/${id}`, options);
  }

  /**
   * Test a webhook by sending a test event
   */
  async test(id: string, options?: RequestOptions): Promise<WebhookDelivery> {
    const { delivery } = await this.http.post<{ delivery: WebhookDelivery }>(
      `/v1/webhooks/${id}/test`,
      {},
      options
    );
    return delivery;
  }

  /**
   * List recent deliveries for a webhook
   */
  async listDeliveries(
    webhookId: string,
    page = 1,
    pageSize = 20,
    options?: RequestOptions
  ): Promise<PaginatedResult<WebhookDelivery>> {
    const query = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    return this.http.get<PaginatedResult<WebhookDelivery>>(
      `/v1/webhooks/${webhookId}/deliveries?${query.toString()}`,
      options
    );
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(
    webhookId: string,
    deliveryId: string,
    options?: RequestOptions
  ): Promise<WebhookDelivery> {
    const { delivery } = await this.http.post<{ delivery: WebhookDelivery }>(
      `/v1/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
      {},
      options
    );
    return delivery;
  }
  /**
   * Rotate the webhook signing secret
   */
  async rotateSecret(
    id: string,
    options?: RotateWebhookSecretOptions & RequestOptions
  ): Promise<Webhook> {
    const { webhook } = await this.http.post<{ webhook: Webhook }>(
      `/v1/webhooks/${id}/rotate-secret`,
      {
        gracePeriodHours: options?.gracePeriodHours,
      },
      options
    );
    return webhook;
  }
}

export interface RotateWebhookSecretOptions {
  gracePeriodHours?: number;
}
