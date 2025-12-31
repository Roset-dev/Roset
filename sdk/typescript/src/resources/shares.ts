/**
 * Shares Resource - Share link management
 */

import type { HttpClient } from "../http.js";
import { generateIdempotencyKey } from "../http.js";
import type {
  RosetClientConfig,
  RequestOptions,
  Share,
  CreateShareOptions,
  ShareAccessResult,
} from "../types.js";

export class SharesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * List all active shares
   */
  async list(options?: RequestOptions): Promise<Share[]> {
    const { items } = await this.http.get<{ items: Share[] }>("/v1/shares", options);
    return items;
  }

  /**
   * Create a share link for a node
   *
   * @example
   * ```typescript
   * // Basic share (read-only, no expiry)
   * const share = await client.shares.create(nodeId);
   *
   * // Expiring share
   * const share = await client.shares.create(nodeId, { expiresIn: '7d' });
   *
   * // Password-protected share
   * const share = await client.shares.create(nodeId, {
   *   password: 'secret123',
   *   maxDownloads: 10,
   * });
   * ```
   */
  async create(nodeId: string, options?: CreateShareOptions & RequestOptions): Promise<Share> {
    let expiresAt = options?.expiresAt;

    // Parse expiresIn shorthand (e.g., '7d', '24h', '30m')
    if (options?.expiresIn && !expiresAt) {
      expiresAt = this.parseExpiry(options.expiresIn);
    }

    return this.http.post<Share>(
      "/v1/shares",
      {
        nodeId,
        scope: options?.scope ?? "read",
        expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
        password: options?.password,
        maxDownloads: options?.maxDownloads,
        recipient: options?.recipient,
      },
      {
        idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
        ...options,
      }
    );
  }

  /**
   * Get share information by token
   */
  async get(token: string, options?: RequestOptions): Promise<Share> {
    return this.http.get<Share>(`/v1/shares/${token}`, options);
  }

  /**
   * Revoke a share link
   */
  async revoke(token: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/shares/${token}`, options);
  }

  /**
   * List share links for a node
   */
  async listForNode(nodeId: string, options?: RequestOptions): Promise<Share[]> {
    const result = await this.http.get<{ items: Share[] }>(
      `/v1/nodes/${nodeId}/shares`,
      options
    );
    return result.items;
  }

  /**
   * Update a share (extend expiry)
   *
   * @example
   * ```typescript
   * // Extend by 7 days from now
   * await client.shares.update(shareId, { expiresIn: '7d' });
   *
   * // Set specific expiry
   * await client.shares.update(shareId, { expiresAt: '2024-12-31T23:59:59Z' });
   * ```
   */
  async update(
    shareId: string,
    options: { expiresAt?: string | Date; expiresIn?: string } & RequestOptions
  ): Promise<Share> {
    const body = {
      expiresAt: options.expiresAt instanceof Date 
        ? options.expiresAt.toISOString() 
        : options.expiresAt,
      expiresIn: options.expiresIn,
    };

    return this.http.patch<Share>(`/v1/shares/${shareId}`, body, options);
  }

  /**
   * Access shared content (public endpoint, no auth required)
   *
   * @example
   * ```typescript
   * // Get shared node info
   * const { node, children } = await client.shares.access(token);
   * ```
   */
  async access(
    token: string,
    options?: {
      download?: boolean;
      password?: string;
    } & RequestOptions
  ): Promise<ShareAccessResult> {
    const params = new URLSearchParams();
    if (options?.download) params.set("download", "true");
    if (options?.password) params.set("password", options.password);

    const query = params.toString();
    const path = `/v1/s/${token}${query ? `?${query}` : ""}`;

    return this.http.get<ShareAccessResult>(path, options);
  }

  /**
   * Build full share URL from token
   */
  buildShareUrl(token: string): string {
    return `https://console.roset.dev/share/${token}`;
  }

  /**
   * Parse expiry shorthand to Date
   */
  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([mhdwMy])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}. Use format like '7d', '24h', '30m'`);
    }

    const [, value, unit] = match;
    const amount = parseInt(value, 10);
    const now = new Date();

    switch (unit) {
      case "m":
        now.setMinutes(now.getMinutes() + amount);
        break;
      case "h":
        now.setHours(now.getHours() + amount);
        break;
      case "d":
        now.setDate(now.getDate() + amount);
        break;
      case "w":
        now.setDate(now.getDate() + amount * 7);
        break;
      case "M":
        now.setMonth(now.getMonth() + amount);
        break;
      case "y":
        now.setFullYear(now.getFullYear() + amount);
        break;
    }

    return now;
  }
}
